const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { sequelize, Conversation, ConversationParticipant } = require('../../models/sequelize');
const { Op } = require('sequelize');
const { getListConversationsService, searchConversationService } = require("../../../services/conversationService");

class ConversationController {
    
    // [POST] /conversation (Tạo Conversation)
    /*
        Body:{
            type: 'dm' | 'group',
            participantIds: array of UUID (exclude the creator or include, both ok),
            title: (optional, for group),
            avatar: (optional, for group),
        }
        
        For DM: if a DM already exists between the two users, return it (avoid duplicate DMs)
    */
    async createConversation(req, res){
        const t = await sequelize.transaction();
        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id; // userId của người request

            const { type, participantIds = [], title, avatar } = req.body;

            // Check type
            if (!type || (type !== "dm" && type !== "group")) {
                await t.rollback();
                return res.status(400).json({ message: "Type must be 'dm' or 'group'" });
            }

            // Build participant list: include creator if not present
            const set = new Set(JSON.parse(participantIds).map((id) => id));
            set.add(authUserId);
            const participants = Array.from(set);

            if (type === "dm") {
            // For DM ensure exactly 2 participants
            if (participants.length !== 2) {
                await t.rollback();
                return res.status(400).json({ message: "DM must have exactly 2 participants" });
            }

            // Try find existing DM with same two participants
            // Approach: find conversation.type='dm' and participants set equals these two
            const candidates = await Conversation.findAll({
                where: { type: "dm" },
                include: [{
                    model: ConversationParticipant,
                    where: { userId: { [Op.in]: participants } },
                    attributes: ["userId"],
                }]
            });

            for (const c of candidates) {
                // Count participants for candidate
                const parts = await ConversationParticipant.count({ where: { conversationId: c.conversationId }});
                if (parts === 2) {
                    // Verify participant ids match
                    const rows = await ConversationParticipant.findAll({ where: { conversationId: c.conversationId }, attributes: ["userId"] });
                    const ids = rows.map(r => r.userId).sort();
                    const want = participants.slice().sort();
                    if (JSON.stringify(ids) === JSON.stringify(want)) {
                        await t.commit();
                        return res.status(200).json({ conversation: c });
                    }
                }
            }
            }

            // Create conversation
            const conv = await Conversation.create({
                type,
                title: type === "group" ? title || null : null,
                avatar: type === "group" ? avatar || null : null,
                createdBy: authUserId,
            }, { transaction: t });

            // Create participants
            const partRows = participants.map(uid => ({
                conversationId: conv.conversationId,
                userId: uid,
                role: uid === authUserId ? "admin" : "member",
            }));
            await ConversationParticipant.bulkCreate(partRows, { transaction: t });

            await t.commit();

            // Eager load participants (optional)
            const convWithParts = await Conversation.findByPk(conv.conversationId, {
                include: [{ model: ConversationParticipant }],
            });

            return res.status(201).json({ conversation: convWithParts });
        } catch (err) {
            await t.rollback();
            console.error(err);
            return res.status(500).json({ message: "Failed to create conversation" });
        }
    };

    // [GET]
    async index(req, res){
        // 
        return res.status(200).json('Conversation Controller Method Index');
    };

    // [GET] /conversation/list (Lấy các Conversation của user)
    async listConversation(req, res){
        const result = {};
    
        // Token
        const token = req.headers.authorization.split(' ')[1];
        // Lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const authUserId = decoded.id; // userId của người request

        // Fetch conversations where auth user is a participant
        try {
            // Service
            const listConversation = await getListConversationsService(authUserId);

            // Kiểm tra
            if(listConversation === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            };

            // Kết quả
            result.status = listConversation?.status ? listConversation?.status : 200;
            result.message = listConversation?.message ? listConversation?.message : 'No messages';
            result.data = listConversation?.data ? listConversation?.data : null;
            return res.status(listConversation?.status ? listConversation?.status : 200).json(result); 
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Failed to fetch conversations" });
        }
    };

    // [GET] /conversation/search?q&limit=10
    async searchConversation(req, res){
        const result = {};

        const { q = '' } = req.query;

        // Token
        const token = req.headers.authorization.split(' ')[1];
        // Lấy dữ liệu của auth user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const authUserId = decoded.id; // userId của người request

        try {
            // Service
            const searchConversationResult = await searchConversationService(q,authUserId);

            // Kiểm tra
            if(searchConversationResult === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            };

            // Kết quả
            result.status = searchConversationResult?.status ? searchConversationResult?.status : 200;
            result.message = searchConversationResult?.message ? searchConversationResult?.message : 'No messages';
            result.data = searchConversationResult?.data ? searchConversationResult?.data : null;
            return res.status(searchConversationResult?.status ? searchConversationResult?.status : 200).json(result); 
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Failed to search conversations" });
        }
    };
}

module.exports = new ConversationController;