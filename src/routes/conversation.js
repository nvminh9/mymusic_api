const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const conversationController = require('../app/controllers/ConversationController');

// Khai báo các route
router.post('/', conversationController.createConversation); // Tạo Conversation
router.get('/list', conversationController.listConversation); // Lấy các Conversation của user
router.get('/search', conversationController.searchConversation); // Tìm kiếm Conversation
router.get('/', conversationController.index); // (route '/' để ở dưới cùng)

module.exports = router;