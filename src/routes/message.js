const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const messageController = require('../app/controllers/MessageController');

// Khai báo các route
router.post('/conversation/:conversationId/create', messageController.createMessage); // Tạo (gửi) tin nhắn
router.get('/conversation/:conversationId', messageController.getMessages); // Lấy các tin nhắn
router.get('/', messageController.index); // (route '/' để ở dưới cùng)

module.exports = router;