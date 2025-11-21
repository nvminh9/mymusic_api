const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { sequelize, Conversation, ConversationParticipant, Message, User, MessageStatus } = require('../../models/sequelize');
const { Op } = require('sequelize');
const { encodeCursor, decodeCursor } = require('../../../utils/messageCursor');
// const { Redis } = require('ioredis');
const { getMessagesService } = require("../../../services/messageService");

// Redis publisher
// const redisClient = new Redis({
//     host: process.env.REDIS_HOST || '127.0.0.1',
//     port: process.env.REDIS_PORT || 6379,
// });

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
            const clientMessageId = metadata?.clientMessageId || null;
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
                metadata: metadata,
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

            // // *** Socket Emit ***
            // // Emit to conversation room (will propagate across instances via Redis adapter)
            // io.to(`conversation:${conversationId}`).emit("message_created", { message: savedMessage });

            // // Also emit notification to each participant's personal room for push/ UI updates
            // participantIds.forEach(pid => {
            //     io.to(`user:${pid}`).emit("conversation_new_message", {
            //         conversationId,
            //         messageSummary: {
            //             messageId,
            //             conversationId,
            //             senderId: senderId,
            //             content: (type === "text" ? (content?.slice(0, 200) || "") : `[${type}]`),
            //             createdAt: savedMessage.createdAt,
            //         }
            //     });
            // });

            // *** Publish to Redis for realtime fan-out: ***
            // Channel: conversation:{conversationId}
            const channel = `conversation:${conversationId}`;
            const payload = {
                action: "new_message",
                message: savedMessage, // Sequelize instance -> JSON serialization ok
            };

            // stringify without circulars
            // try {
            //     await redisClient.publish(channel, JSON.stringify(payload));
            //     // console.log("Line 138: Redis publish ", payload);
            // } catch (pubErr) {
            //     console.error("Redis publish failed:", pubErr);
            //     // Non-fatal: message persisted, we still return success
            // }

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
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id; // userId của người request
            
            // Params
            const { conversationId } = req.params;
            
            // Query params
            const rawCursor = req.query.cursor; // cursor
            const limit = Math.min(parseInt(req.query.limit || "20", 10), 100); // limit

            // Service
            const messages = await getMessagesService(conversationId, rawCursor, limit, authUserId);

            // Kiểm tra
            if(messages === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            const result = {...messages};
            // result.status = messages?.status ? messages?.status : 200;
            // result.message = messages?.message ? messages?.message : 'No messages';
            return res.status(messages?.status ? messages?.status : 200).json(result); 
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