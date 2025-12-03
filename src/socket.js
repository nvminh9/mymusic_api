const { Server } = require("socket.io");
const { Redis } = require("ioredis");
const { createAdapter } = require("@socket.io/redis-adapter");
const dotenv = require('dotenv');
dotenv.config();
const jwt = require("jsonwebtoken");
const { sequelize, Conversation, ConversationParticipant, Message, MessageStatus, User } = require("./app/models/sequelize");
const { Op } = require('sequelize');
const { v4: uuidv4 } = require("uuid");

// Determine if in a production env or not
const isProduction = process.env.DB_HOST !== 'localhost';

const REDIS_URL = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` || "redis://127.0.0.1:6379";
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

    // Redis Connection Options
    const redisConnectionOptions = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || '6379',
    };
    // (For production with SSL)
    // if(isProduction){
    //     redisConnectionOptions.tls = {
    //         rejectUnauthorized: false // Use this if you don't have a specific CA certificate
    //     }
    // }

    // Redis clients for adapter
    // const pubClient = new Redis(REDIS_URL);
    // const pubClient = new Redis({
    //     host: process.env.REDIS_HOST || '127.0.0.1',
    //     port: process.env.REDIS_PORT || '6379',
    //     // tls: {
    //     //     rejectUnauthorized: false // Use this if you don't have a specific CA certificate
    //     // }
    // });
    // const pubClient = Redis.createClient({
    //     host: process.env.REDIS_HOST || '127.0.0.1',
    //     port: process.env.REDIS_PORT || '6379'
    // });
    const pubClient = new Redis(redisConnectionOptions);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));

    // A separate Redis client for presence and other ops
    // const redis = new Redis(REDIS_URL);
    // const redis = new Redis({
    //     host: process.env.REDIS_HOST || '127.0.0.1',
    //     port: process.env.REDIS_PORT || '6379',
    //     // tls: {
    //     //     rejectUnauthorized: false // Use this if you don't have a specific CA certificate
    //     // }
    // });
    // const redis = Redis.createClient({
    //     host: process.env.REDIS_HOST || '127.0.0.1',
    //     port: process.env.REDIS_PORT || '6379'
    // });
    const redis = new Redis(redisConnectionOptions);

    // Handle Redis connection errors
    pubClient.on('error', (err) => {
        console.error('ioredis (pubClient) connection error:', err);
        // Optional: Implement a more robust logging mechanism or alerting here
    });
    redis.on('error', (err) => {
        console.error('ioredis (redis) connection error:', err);
        // Optional: Implement a more robust logging mechanism or alerting here
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
            io.to(`user:${payload.id}`).emit('presence', { userId: payload.id, online: true });

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

                // Check conversationId
                if(!conversationId){
                    await tx.rollback();
                    throw new Error("conversationId required")
                };

                // Check content
                if(!content?.trim()){
                    await tx.rollback();
                    throw new Error("No content entered");
                }

                // Validate participant
                const participant = await ConversationParticipant.findOne({
                    where: { conversationId, userId },
                    transaction: tx,
                });
                if(!participant){
                    throw new Error("Not a participant")
                };

                // Idempotency by clientMessageId in metadata
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

                // Persist message
                const messageId = uuidv4();
                const newMsg = await Message.create({
                    messageId,
                    conversationId,
                    senderId: userId,
                    content,
                    type,
                    metadata,
                }, { transaction: tx });

                // Load participants
                const participants = await ConversationParticipant.findAll({
                    where: { conversationId },
                    attributes: ["userId"],
                    transaction: tx,
                });
                const participantIds = participants.map(p => p.userId);

                // Create message_status rows (caveat large groups)
                if (participantIds.length <= STATUS_CREATE_THRESHOLD) {
                    const statuses = participantIds.map(uid => ({
                        messageId,
                        userId: uid,
                        conversationId,
                        deliveredAt: uid === userId ? new Date() : null,
                        readAt: uid === userId ? new Date() : null,
                    }));
                    await MessageStatus.bulkCreate(statuses, { transaction: tx });
                } else {
                    // *** For large groups: skip eager insertion; optionally push to background worker ***
                }

                // Update newestMessageCreatedAt in Conversation
                await Conversation.update(
                    { 
                        newestMessageCreatedAt: newMsg.dataValues.createdAt
                    },
                    {
                        where: {
                            conversationId: conversationId
                        }
                    }
                );

                await tx.commit();

                // Eager load sender info
                let savedMessage = await Message.findByPk(messageId, {
                    include: [
                        { model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"] },
                    ],
                });

                // Emit to conversation room (will propagate across instances via Redis adapter)
                io.to(`conversation:${conversationId}`).emit("message_created", { message: savedMessage });

                // Also emit notification to each participant's personal room for push/ UI updates
                participantIds.forEach(pid => {
                    io.to(`user:${pid}`).emit("conversation_new_message", {
                        conversationId,
                        message: savedMessage
                        // messageSummary: {
                        //     messageId,
                        //     conversationId,
                        //     senderId: userId,
                        //     content: (type === "text" ? (content?.slice(0, 200) || "") : `[${type}]`),
                        //     createdAt: savedMessage.createdAt,
                        // }
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
         * payload: [{ messageId, status: 'delivered'|'read' }, ...]
         */
        socket.on("message_ack", async (payload) => {
            try {
                if (!Array.isArray(payload)) return;
                if (payload.length === 0) return;
                
                const now = new Date();
                
                payload?.forEach(async (ackItem) => {
                    if (!ackItem.messageId || !ackItem.status) return;
                    
                    const { messageId, status } = ackItem;

                    if (status === "delivered") {
                        // optionally update conversation_participant.last_read_message_id
                        const msg = await Message.findByPk(messageId);

                        await MessageStatus.upsert({
                            messageId,
                            conversationId: msg ? msg.conversationId : null,
                            userId,
                            deliveredAt: now,
                        }, { where: { messageId, userId }});
                    } else if (status === "read") {
                        // optionally update conversation_participant.last_read_message_id
                        const msg = await Message.findByPk(messageId);
                        
                        await MessageStatus.upsert({
                            messageId,
                            conversationId: msg ? msg.conversationId : null,
                            userId,
                            readAt: now,
                        }, { where: { messageId, userId }});

                        
                        if (msg) {
                            await ConversationParticipant.update(
                                { lastReadMessageId: messageId },
                                { 
                                    where: { conversationId: msg.conversationId, userId } 
                                }
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
                });
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

        socket.on("conversation_read", async ({ conversationId, lastReadMessageId }) => {
            const userId = socket.user.userId;
            const now = new Date();
            // console.log(`Người dùng ${userId} đã xem tin nhắn cuộc trò chuyện ${conversationId}`);

            // Cập nhật MessageStatus cho các message chưa được xem của Conversation này (readAt = null)
            await MessageStatus.update(
                { readAt: now },
                {
                    where: {
                        conversationId,
                        userId: userId,
                        readAt: null
                    }
                }
            );

            // Lấy lastReadMessageId và cập nhật lastReadMessageId tương ứng cho thành viên trong ConversationParticipant
            // const lastReadMessageFromDB = await MessageStatus.findAll({
            //     where: {
            //         conversationId: conversationId,
            //         userId: userId,
            //         // readAt: now,
            //     },
            //     order: [
            //         ["readAt", "DESC"], // Mới nhất trước
            //     ],
            //     limit: 1,
            //     // attributes: ["messageId"]
            // });
            // const lastReadMessageId = lastReadMessageFromDB?.[0]?.dataValues?.messageId;
            // const lastReadMessageReadedAt= lastReadMessageFromDB?.[0]?.dataValues?.readAt;
            // // Update lastReadMessageId in ConversationParticipant
            // // console.log(lastReadMessageReadedAt);
            // if(!lastReadMessageReadedAt && userId === lastReadMessageFromDB?.[0]?.dataValues?.userId){
            //     await ConversationParticipant.update(
            //         { lastReadMessageId: lastReadMessageId },
            //         {
            //             where: {
            //                 conversationId: conversationId,
            //                 userId: userId,
            //             }
            //         }
            //     );
            // }

            // Cập nhật lastReadMessageId cho thành viên tương ứng trong ConversationParticipant
            await ConversationParticipant.update(
                { lastReadMessageId: lastReadMessageId },
                {
                    where: {
                        conversationId: conversationId,
                        userId: userId,
                    }
                }
            );

            // Thông báo tới các thành viên còn lại trong conversation
            // socket.to(`convrsation:${conversationId}`).emit("conversation_read_by", {
            //     userId: userId,
            //     conversationId: conversationId,
            //     deliveredAt: null,
            //     readAt: now,
            //     User: user,
            // });
            // Participants
            const participants = await ConversationParticipant.findAll({
                where: { 
                    conversationId 
                },
                attributes: ["userId"],
            });
            const participantIds = participants.map(p => p.userId);
            participantIds.forEach((participantId) => {
                // console.log('lastReadMessageId at Socket: ', lastReadMessageId)
                socket.to(`user:${participantId}`).emit("conversation_read_by", {
                    userId: userId,
                    conversationId: conversationId,
                    // readAt: lastReadMessageReadedAt,
                    readAt: now,
                    lastReadMessageId: lastReadMessageId,
                });
            });

            // Thông báo user này online
            socket.broadcast.emit("presence", { userId, online: true });
        });

        // Disconnect handling: remove from presence set
        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected ${socket.id} user:${userId} reason:${reason}`);
            try {
                const now = new Date();

                await redis.srem(`${PRESENCE_KEY}${userId}`, socket.id);
                // check if user has any sockets left
                const remaining = await redis.scard(`${PRESENCE_KEY}${userId}`);
                if (remaining === 0) {
                    // user offline
                    socket.broadcast.emit("presence", { userId, online: false, offlineAt: now });
                }
                // user offline (test)
                socket.broadcast.emit("presence", { userId, online: false, offlineAt: now });
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