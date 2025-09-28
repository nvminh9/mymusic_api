const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sequelize, Conversation, ConversationParticipant, Message, User, MessageStatus } = require('../../models/sequelize');
const { Op } = require('sequelize');
const { encodeCursor, decodeCursor } = require('../../../utils/messageCursor');
const { Redis } = require('ioredis');

// Redis publisher
const redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
});

class MessageController {
    
    // [POST] /message/conversation/:conversationId/create (Create Message)
    /*
        Body:{
            content: string
            type: 'text'|'image'|'audio'|'video'...
            metadata: object (optional) e.g. { repliedTo, attachments, clientMessageId }
        }
    */
   async createMessage(req, res){
        const t = await sequelize.transaction();
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const senderId = decoded.id; // userId của người request
            // const senderId = req.user.userId;

            const { conversationId } = req.params;
            const { content, type = "text", metadata = {} } = req.body;

            // Check conversationId
            if (!conversationId) {
                await t.rollback();
                return res.status(400).json({ message: "conversationId required" });
            }

            // Check content
            if(!content?.trim()){
                await t.rollback();
                return res.status(400).json({ message: "No content entered" });
            }

            // Check conversation exists
            const conv = await Conversation.findByPk(conversationId, { transaction: t });
            if (!conv) {
                await t.rollback();
                return res.status(404).json({ message: "Conversation not found" });
            }

            // Check sender is participant
            const participant = await ConversationParticipant.findOne({
                where: { conversationId, userId: senderId },
                transaction: t,
            });
            if (!participant) {
                await t.rollback();
                return res.status(403).json({ message: "Not a participant of this conversation" });
            }

            // Idempotency: if clientMessageId provided, check existing message with same metadata.clientMessageId & sender
            const clientMessageId = JSON.parse(metadata)?.clientMessageId || null;
            // console.log("Line 70: ", clientMessageId);
            if (clientMessageId) {
            const existing = await Message.findOne({
                where: {
                    senderId,
                    metadata: { [Op.contains]: { clientMessageId } }, // JSONB contains
                },
                transaction: t,
            });
            if (existing) {
                // Return existing message (idempotent)
                await t.commit();
                const resMessage = await Message.findByPk(existing.messageId, {
                    include: [{ model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"] }],
                });
                return res.status(200).json({ message: resMessage });
            }
            }

            // Create messageId (server side) if client didn't provide
            const messageId = uuidv4();

            // Persist message
            const message = await Message.create({
                messageId,
                conversationId,
                senderId,
                content,
                type,
                metadata: JSON.parse(metadata),
            }, { transaction: t });

            // OPTIONAL: Create message_status rows for participants (delivered_at = null initially)
            // If group is huge, avoid creating many rows in hot path. Here we create if participants <= threshold.
            const participants = await ConversationParticipant.findAll({
                where: { conversationId },
                attributes: ["userId"],
                transaction: t,
            });

            const participantIds = participants.map(p => p.userId);
            const STATUS_CREATE_THRESHOLD = 500; // tunable: if participants > threshold, use lazy strategy

            if (participantIds.length <= STATUS_CREATE_THRESHOLD) {
                const statuses = participantIds.map(uid => ({
                    messageId,
                    userId: uid,
                    deliveredAt: uid === senderId ? new Date() : null, // sender considered delivered
                    readAt: uid === senderId ? new Date() : null,
                }));
                // bulkCreate
                await MessageStatus.bulkCreate(statuses, { transaction: t });
            } else {
                // Lazy approach: don't insert per-user message_status rows to avoid heavy writes
                // We will rely on conversation_participant.last_read_message_id and other mechanisms.
                // You may add a lightweight record to indicate message exists.
            }

            await t.commit();

            // Eager load sender info for response & publish
            const savedMessage = await Message.findByPk(messageId, {
                include: [{ model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"] }],
            });

            // Publish to Redis for realtime fan-out:
            // Channel: conversation:{conversationId}
            const channel = `conversation:${conversationId}`;
            const payload = {
                action: "new_message",
                message: savedMessage, // Sequelize instance -> JSON serialization ok
            };

            // stringify without circulars
            try {
                await redisClient.publish(channel, JSON.stringify(payload));
                // console.log("Line 138: Redis publish ", payload);
            } catch (pubErr) {
                console.error("Redis publish failed:", pubErr);
                // Non-fatal: message persisted, we still return success
            }

            // Return created message
            return res.status(201).json({ message: savedMessage });
        } catch (err) {
            await t.rollback();
            console.error("Failed to send message:", err);
            return res.status(500).json({ message: "Failed to send message" });
        }
    };

    // [GET] /message/conversation/:conversationId?cursor=<>&limit=<> (Messages of conversation)
    /*
        Query:{
            cursor: JSON { createdAt, messageId } base64 encoded (optional),
            limit: integer (default 20)
        }
        
        Returns messages ordered DESC (newest first) and nextCursor for older messages.
    */
    async getMessages(req, res){
        try {
            const { conversationId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id; // userId của người request
            
            const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

            // 1) Check conversation exists and user is participant
            const conv = await Conversation.findByPk(conversationId);
            if (!conv) return res.status(404).json({ message: "Conversation not found" });

            const isParticipant = await ConversationParticipant.findOne({
                where: { conversationId, userId: authUserId }
            });
            if (!isParticipant) return res.status(403).json({ message: "Not a participant" });

            // 2) Decode cursor (if provided)
            const rawCursor = req.query.cursor;
            let whereClause = { conversationId };
            
            if (rawCursor) {
                const decoded = decodeCursor(rawCursor);
                // console.log(rawCursor);
                console.log(decoded);
                if (!decoded || !decoded.createdAt || !decoded.messageId) {
                    return res.status(400).json({ message: "Invalid cursor" });
                }
                const cursorCreatedAt = new Date(decoded.createdAt);
                const cursorMessageId = decoded.messageId;

                // We want rows strictly older than the cursor: (created_at, message_id) < (cursorCreatedAt, cursorMessageId)
                // Sequelize can't do row-wise comparison portably, so use equivalent logic:
                whereClause = {
                    conversationId,
                    [Op.or]: [
                        { createdAt: { [Op.lt]: cursorCreatedAt } },
                        {
                            [Op.and]: [
                                { createdAt: cursorCreatedAt },
                                { messageId: { [Op.lt]: cursorMessageId } }
                            ]
                        }
                    ]
                };
            }

            // 3) Query messages (newest first)
            const messages = await Message.findAll({
                where: whereClause,
                order: [
                    ["createdAt", "DESC"],
                    ["messageId", "DESC"]
                ],
                limit,
                include: [
                    // Include sender basic info (if you have User model properly)
                    { model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"], required: false }
                ],
                raw: false,
            });

            // 4) Build nextCursor
            let nextCursor = null;
            if (messages.length === limit) {
                const last = messages[messages.length - 1];
                // Cursor will point to last returned message; next fetch will get older than this
                nextCursor = encodeCursor({ createdAt: last.createdAt.toISOString(), messageId: last.messageId });
            }

            // 5) Return messages in chronological order expected by many clients:
            // Client often expects messages oldest -> newest in the page; but we returned newest-first.
            // We will return messages reversed so array is oldest->newest (optional, choose what client expects).
            const messagesChron = messages.slice().reverse().map(m => {
                // Plain object
                const obj = m.toJSON();
                // Rename Sender -> sender for client (if included)
                if (obj.Sender) {
                    obj.sender = obj.Sender;
                    delete obj.Sender;
                }
                return obj;
            });

            return res.json({ messages: messagesChron, nextCursor });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to fetch messages" });
        }
    };

    // [GET]
    async index(req, res){
        // 
        return res.status(200).json('Message Controller Method Index');
    };
}

module.exports = new MessageController;