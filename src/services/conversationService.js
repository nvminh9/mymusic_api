const dotenv = require('dotenv');
dotenv.config();
const { Conversation, ConversationParticipant, User, Message, MessageStatus } = require('../app/models/sequelize');
const { Op } = require('sequelize');

// Thực hiện lấy danh sách các Conversations của user
const getListConversationsService = async (authUserId) => {
    try{
        // Kiểm tra có authUserId không
        if(!authUserId){
            return {
                message: 'Chưa truyền userId'
            };
        }

        // Lấy danh sách id của các conversation mà authUser có tham gia
        const conversationIds = await ConversationParticipant.findAll({
            where: {
                userId: authUserId
            },
            attributes: ["conversationId"],
        });

        // Lấy thông tin chi tiết các conversation trong conversationIds
        const conversationIdsSet = new Set();
        conversationIds.forEach((id) => {
            if(id.dataValues.conversationId){
                conversationIdsSet.add(id.dataValues.conversationId);
            }
        });
        const listConversation = await Conversation.findAll({
            where: {
                conversationId: [...conversationIdsSet]
            },
            include: [
                // Các thành viên của Conversation
                {
                    model: ConversationParticipant,
                    attributes: ["role","lastReadMessageId","joinedAt"],
                    include: [{ model: User, attributes: ["userId","name","userName","userAvatar"] }],
                    as: 'participants'
                },
                // Tin nhắn mới nhất của Conversation
                {
                    model: Message,
                    where: {
                        conversationId: [...conversationIdsSet],
                    },
                    order: [
                        ["createdAt", "DESC"],
                    ],
                    limit: 1,
                    as: 'newestMessage',
                    include: [
                        {
                            model: User,
                            attributes: ["userId","name","userName","userAvatar"],
                            as: 'Sender'
                        }
                    ]
                },
            ],
            order: [["newestMessageCreatedAt", "DESC"]]
        });

        // Các tin nhắn chưa xem của conversation
        const unseenMessages = await MessageStatus.findAll({
            where: {
                conversationId: [...conversationIdsSet],
                // userId: authUserId,
                readAt: null
            },
            attributes: ["messageId","userId","readAt","conversationId"]
        });

        // Duyệt lại listConversation và thêm, sửa thông tin
        listConversation.forEach((conversation) => {
            // Thêm vào mỗi Conversation trong listConversation thuộc tính unseenMessages
            conversation.dataValues.unseenMessages = [];
            unseenMessages.forEach((messages) => {
                if(conversation.dataValues.conversationId === messages.dataValues.conversationId){
                    conversation.dataValues?.unseenMessages?.push(messages.dataValues);
                }
            });
            // Chỉnh sửa lại title, avatar cho mỗi Conversation 
            // (nếu là DM thì title và avatar là userName và userAvatar của user còn lại)
            // (nếu là Group thì title và avatar sẽ là title và avatar được lưu trong DB nếu có)
            if(conversation.dataValues.type === 'dm'){
                // title
                conversation.dataValues.title = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userName;
                // avatar
                conversation.dataValues.avatar = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userAvatar;
            }
        });
        
        // Kết quả
        return {
            status: 200,
            message: 'Danh sách các cuộc trò chuyện',
            data: listConversation
        };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện tìm kiếm các cuộc trò chuyện
const searchConversationService = async (query, authUserId) => {
    try {
        // Lấy danh sách các conversation của user
        const userConversations = await ConversationParticipant.findAll({
            attributes: ["conversationId"],
            where: {
                userId: authUserId
            },
            raw: true
        });
        const conversationIds = userConversations.map((c) => c.conversationId);
        // Tìm cuộc trò chuyện mà thành viên có người đang cần tìm
        const matchedParticipant = await ConversationParticipant.findAll({
            // attributes: ["userId", "conversationId"],
            include: [
                {
                    model: User,
                    attributes: ["userName"],
                    where: {
                        userName: {
                            [Op.iLike]: `${query}%`
                        }
                    },
                    required: true
                }
            ],
            where: {
                conversationId: {
                    [Op.in]: conversationIds
                },
                userId: {
                    [Op.ne]: authUserId
                }
            },
            limit: 10
        });
        const targetConversationIds = matchedParticipant.map((p) => p.conversationId);
        const result = await Conversation.findAll({
            where: {
                conversationId: {
                    [Op.in]: targetConversationIds
                }
            },
            include: [
                // Các thành viên của Conversation
                {
                    model: ConversationParticipant,
                    attributes: ["role","lastReadMessageId","joinedAt"],
                    include: [{ model: User, attributes: ["userId","name","userName","userAvatar"] }],
                    as: 'participants'
                },
                // Tin nhắn mới nhất của Conversation
                {
                    model: Message,
                    where: {
                        // conversationId: [...conversationIdsSet],
                        conversationId: {
                            [Op.in]: targetConversationIds
                        }
                    },
                    order: [
                        ["createdAt", "DESC"],
                    ],
                    limit: 1,
                    as: 'newestMessage',
                    include: [
                        {
                            model: User,
                            attributes: ["userId","name","userName","userAvatar"],
                            as: 'Sender'
                        }
                    ]
                },
            ]
        });

        // Các tin nhắn chưa xem của conversation
        const unseenMessages = await MessageStatus.findAll({
            where: {
                conversationId: {
                    [Op.in]: targetConversationIds
                },
                readAt: null
            },
            attributes: ["messageId","userId","readAt","conversationId"]
        });

        // Duyệt lại listConversation và thêm, sửa thông tin
        result.forEach((conversation) => {
            // Thêm vào mỗi Conversation trong listConversation thuộc tính unseenMessages
            conversation.dataValues.unseenMessages = [];
            unseenMessages.forEach((messages) => {
                if(conversation.dataValues.conversationId === messages.dataValues.conversationId){
                    conversation.dataValues?.unseenMessages?.push(messages.dataValues);
                }
            });
            // Chỉnh sửa lại title, avatar cho mỗi Conversation 
            // (nếu là DM thì title và avatar là userName và userAvatar của user còn lại)
            // (nếu là Group thì title và avatar sẽ là title và avatar được lưu trong DB nếu có)
            if(conversation.dataValues.type === 'dm'){
                // title
                conversation.dataValues.title = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userName;
                // avatar
                conversation.dataValues.avatar = conversation.dataValues?.participants?.find((participant) => participant?.User?.userId !== authUserId)?.User?.userAvatar;
            }
        });

        // 
        return {
            status: 200,
            message: 'Kết quả tìm kiếm',
            data: result
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {    
    getListConversationsService,
    searchConversationService
}