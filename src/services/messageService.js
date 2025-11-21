const dotenv = require('dotenv');
dotenv.config();
const { Conversation, ConversationParticipant, Message, User, MessageStatus } = require('../app/models/sequelize');
const { Op } = require('sequelize');
const { encodeCursor, decodeCursor } = require('../utils/messageCursor');

// Thực hiện lấy dữ liệu tin nhắn của conversation
const getMessagesService = async (conversationId, rawCursor, limit, authUserId) => {
    try{
        
        // *** LẤY CÁC TIN NHẮN (PHÂN TRANG) ***
        // 1) Check conversation exists and user is participant
        const conv = await Conversation.findByPk(conversationId);
        if (!conv) return { status: 404, message: "Conversation not found" };

        const isParticipant = await ConversationParticipant.findOne({
            where: { conversationId, userId: authUserId }
        });
        if (!isParticipant) return { status: 403, message: "Not a participant" };

        // 2) Decode cursor (if provided)
        // const rawCursor = req.query.cursor;
        let whereClause = { conversationId };
        
        if (rawCursor) {
            const decoded = decodeCursor(rawCursor);
            if (!decoded || !decoded.createdAt || !decoded.messageId) {
                return { status: 400, message: "Invalid cursor" };
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
                { model: User, as: "Sender", attributes: ["userId", "name", "userName", "userAvatar"], required: false },
                // { model: MessageStatus, as: "Statuses", required: false, include: [
                //     { model: User, attributes: ["userId", "name", "userName", "userAvatar"] }
                // ]} // include statuses
            ],
            raw: false,
        });
        // const messages = messagesFromDB;
        // const messages = messagesFromDB.map((message) => {
        //     message.dataValues.Statuses = message?.dataValues?.Statuses?.map((status) => {
        //         // Nếu là status của người gửi thì bỏ qua
        //         if(status.userId === message.senderId){
        //             return null;
        //         } else if(status.userId !== message.senderId && status.readAt !== null){
        //             // Nếu là status của thành viên khác và readAt khác null thì return
        //             return status;
        //         }
        //     });
        //     // Thêm seenBy vào messages
        //     // const seenBy = message.dataValues.Statuses?.filter(status => status !== null).map(status => status);
        //     const seenBy = message.dataValues.Statuses?.filter(Boolean);
        //     message.dataValues.seenBy = seenBy || [];
        //     // Bỏ đi Statuses không cần thiết
        //     delete message.dataValues.Statuses;
        //     // 
        //     return message;
        // });

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
        // const messagesChron = messages.slice().reverse().map(m => {
        //     // Plain object
        //     const obj = m.toJSON();
        //     // Rename Sender -> sender for client (if included)
        //     if (obj.Sender) {
        //         obj.sender = obj.Sender;
        //         delete obj.Sender;
        //     }
        //     return obj;
        // });
        const messagesChron = messages.slice().map(m => {
            // Plain object
            const obj = m.toJSON();
            // Rename Sender -> sender for client (if included)
            if (obj.Sender) {
                obj.sender = obj.Sender;
                delete obj.Sender;
            }
            return obj;
        });

        // *** LẤY THÔNG TIN CONVERSATION ***
        const conversationInfo = await Conversation.findAll({
            where: {
                conversationId: conversationId,
            },
            include: [
                // Các thành viên của Conversation
                {
                    model: ConversationParticipant,
                    attributes: ["role","lastReadMessageId","joinedAt"],
                    include: [{ model: User, attributes: ["userId","name","userName","userAvatar"] }],
                    as: 'participants'
                },
            ]
        });
        // Chỉnh sửa lại title, avatar cho Conversation info
        // (nếu là DM thì title và avatar là userName và userAvatar của user còn lại)
        // (nếu là Group thì title và avatar sẽ là title và avatar được lưu trong DB nếu có)
        conversationInfo.forEach((conversation) => {
            if(conversation.dataValues.type === 'dm'){
                // title
                conversation.dataValues.title = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userName;
                // avatar
                conversation.dataValues.avatar = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userAvatar;
            }
            // delete participants after complete
            delete conversation.dataValues.participants;
        });

        // *** LẤY THÔNG TIN TIN NHẮN CUỐI CÙNG MÀ CÁC THÀNH VIÊN XEM
        const lastReadMessageByParticipants = await ConversationParticipant.findAll({
            where: {
                conversationId: conversationId,
            },
            attributes: ["userId","lastReadMessageId"],
            include: [
                {
                    model: User,
                    attributes: ["userId","name","userName","userAvatar"]
                }
            ]
        });

        return { messages: messagesChron, conversation: conversationInfo?.[0] ? conversationInfo?.[0] : {}, lastReadMessagesEachParticipant: lastReadMessageByParticipants, nextCursor };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    getMessagesService
}