const { Server } = require("socket.io");
const { Redis } = require("ioredis");
const { createAdapter } = require("@socket.io/redis-adapter");
const dotenv = require('dotenv');
dotenv.config();
const jwt = require("jsonwebtoken");
const { sequelize, Conversation, ConversationParticipant, Message, MessageStatus, User } = require("./app/models/sequelize");
const { Op } = require('sequelize');
const { v4: uuidv4 } = require("uuid");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const STATUS_CREATE_THRESHOLD = parseInt(process.env.STATUS_CREATE_THRESHOLD || "500", 10);

// Presence keys prefix
const PRESENCE_KEY = "presence:user:"; // set of socket ids per user

function initSocket(server) {
    // create io
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        pingInterval: 25000,
        pingTimeout: 60000,
    });

    // Redis clients for adapter
    // const pubClient = new Redis(REDIS_URL);
    const pubClient = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379'
    });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));

    // A separate Redis client for presence and other ops
    // const redis = new Redis(REDIS_URL);
    const redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379'
    });

    // Middleware for auth during handshake
    io.use(async (socket, next) => {
        try {
            // Accept token from either "auth" on handshake or query param
            const token = socket.handshake.auth?.token?.split(" ")[1] || socket.handshake.query?.token?.split(" ")[1];
            
            // console.log("Line 47 socket: ", token);

            if (!token) return next(new Error("auth token required"));

            const payload = jwt.verify(token, JWT_SECRET);
            // console.log("payload", payload);

            // expected payload contains userId (payload.id)
            if (!payload || !payload.id) return next(new Error("invalid token payload"));

            socket.user = { userId: payload.id };
            // join personal room
            socket.join(`user:${payload.id}`);

            // add socket id to presence set
            await redis.sadd(`${PRESENCE_KEY}${payload.id}`, socket.id);

            // broadcast presence to followers/contacts if needed (simplified)
            // io.to(`user:${payload.id}`).emit('presence', { userId: payload.id, online: true });

            return next();
        } catch (err) {
            console.error("socket auth failed:", err.message || err);
            return next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.user.userId;
        console.log(`Socket connected: ${socket.id} user:${userId}`);

        // Optionally emit that user is online
        socket.broadcast.emit("presence", { userId, online: true });

        // JOIN conversation room
        socket.on("join_conversation", async ({ conversationId }) => {
            try {
                if (!conversationId) return socket.emit("error", { message: "conversationId required" });

                // check participant
                const isParticipant = await ConversationParticipant.findOne({
                    where: { conversationId, userId },
                });
                if (!isParticipant) return socket.emit("error", { message: "Not a participant" });

                await socket.join(`conversation:${conversationId}`);
                socket.emit("joined_conversation", { conversationId });
            } catch (err) {
                console.error("join_conversation error", err);
                socket.emit("error", { message: "Cannot join conversation" });
            }
        });

        socket.on("leave_conversation", async ({ conversationId }) => {
            try {
                await socket.leave(`conversation:${conversationId}`);
                socket.emit("left_conversation", { conversationId });
            } catch (err) {
                console.error("leave_conversation error", err);
            }
        });

        /**
         * send_message via socket
         * payload: { conversationId, content, type, metadata }
         * metadata may include clientMessageId for idempotency
         */
        socket.on("send_message", async (payload, ack) => {
            // ack is optional callback for acknowledgement
            const tx = await sequelize.transaction();
            try {
                const { conversationId, content, type = "text", metadata = {} } = payload;
                if (!conversationId) throw new Error("conversationId required");

                // validate participant
                const participant = await ConversationParticipant.findOne({
                    where: { conversationId, userId },
                    transaction: tx,
                });
                if (!participant) throw new Error("Not a participant");

                // idempotency by clientMessageId in metadata
                const clientMessageId = metadata.clientMessageId || null;
                if (clientMessageId) {
                    const existing = await Message.findOne({
                        where: {
                            senderId: userId,
                            metadata: { // JSONB contains
                                [Op.contains]: { clientMessageId }
                            }
                        },
                        transaction: tx,
                    });
                    if (existing) {
                        await tx.commit();
                        const existingFull = await Message.findByPk(existing.messageId, {
                            include: [{ model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"] }],
                        });
                        // ack back existing message
                        if (ack && typeof ack === "function") ack({ status: "ok", message: existingFull });
                        return;
                    }
                }

                // persist message
                const messageId = uuidv4();
                const newMsg = await Message.create({
                    messageId,
                    conversationId,
                    senderId: userId,
                    content,
                    type,
                    metadata,
                }, { transaction: tx });

                // load participants
                const participants = await ConversationParticipant.findAll({
                    where: { conversationId },
                    attributes: ["userId"],
                    transaction: tx,
                });
                const participantIds = participants.map(p => p.userId);

                // create message_status rows (caveat large groups)
                if (participantIds.length <= STATUS_CREATE_THRESHOLD) {
                    const statuses = participantIds.map(uid => ({
                        messageId,
                        userId: uid,
                        deliveredAt: uid === userId ? new Date() : null,
                        readAt: uid === userId ? new Date() : null,
                    }));
                    await MessageStatus.bulkCreate(statuses, { transaction: tx });
                } else {
                // For large groups: skip eager insertion; optionally push to background worker
                }

                await tx.commit();

                // eager load sender info
                const savedMessage = await Message.findByPk(messageId, {
                    include: [{ model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"] }],
                });

                // Emit to conversation room (will propagate across instances via Redis adapter)
                io.to(`conversation:${conversationId}`).emit("message_created", { message: savedMessage });

                // Also emit notification to each participant's personal room for push/ UI updates
                participantIds.forEach(pid => {
                    io.to(`user:${pid}`).emit("conversation_new_message", {
                        conversationId,
                        messageSummary: {
                        messageId,
                        conversationId,
                        senderId: userId,
                        content: (type === "text" ? (content?.slice(0, 200) || "") : `[${type}]`),
                        createdAt: savedMessage.createdAt,
                        }
                    });
                });

                // ack back to sender
                if (ack && typeof ack === "function") {
                    ack({ status: "ok", message: savedMessage });
                }
            } catch (err) {
                await tx.rollback();
                console.error("send_message error", err);
                if (ack && typeof ack === "function") ack({ status: "error", message: err.message });
            }
        });

        /**
         * Client acknowledges delivery/read
         * payload: { messageId, status: 'delivered'|'read' }
         */
        socket.on("message_ack", async ({ messageId, status }) => {
            try {
                if (!messageId || !status) return;
                const now = new Date();
                if (status === "delivered") {
                await MessageStatus.upsert({
                    messageId,
                    userId,
                    deliveredAt: now,
                }, { where: { messageId, userId }});
                } else if (status === "read") {
                await MessageStatus.upsert({
                    messageId,
                    userId,
                    readAt: now,
                }, { where: { messageId, userId }});

                // optionally update conversation_participant.last_read_message_id
                const msg = await Message.findByPk(messageId);
                if (msg) {
                    await ConversationParticipant.update(
                    { lastReadMessageId: messageId },
                    { where: { conversationId: msg.conversationId, userId } }
                    );
                }
                }

                // Broadcast update to other participants
                const msg = await Message.findByPk(messageId);
                if (msg) {
                    io.to(`conversation:${msg.conversationId}`).emit("message_status_update", {
                        messageId,
                        userId,
                        status,
                        at: now,
                    });
                }
            } catch (err) {
                console.error("message_ack error", err);
            }
        });

        // typing indicator
        socket.on("typing", ({ conversationId, isTyping }) => {
            if (!conversationId) return;
            socket.to(`conversation:${conversationId}`).emit("typing", {
                conversationId,
                userId,
                isTyping,
            });
        });

        // Disconnect handling: remove from presence set
        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected ${socket.id} user:${userId} reason:${reason}`);
            try {
                await redis.srem(`${PRESENCE_KEY}${userId}`, socket.id);
                // check if user has any sockets left
                const remaining = await redis.scard(`${PRESENCE_KEY}${userId}`);
                if (remaining === 0) {
                // user offline
                socket.broadcast.emit("presence", { userId, online: false });
                }
            } catch (err) {
                console.error("disconnect presence error", err);
            }
        });
    });

    return io;
}

module.exports = {
    initSocket
};