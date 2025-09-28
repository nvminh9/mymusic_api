const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const listeningHistoryController = require('../app/controllers/ListeningHistoryController');

// Khai báo các route
router.post('/create', listeningHistoryController.createListeningHistory); // Tạo Listening History
router.delete('/:listeningHistoryId', listeningHistoryController.deleteListeningHistory); // Xóa một lịch sử nghe
router.get('/data', listeningHistoryController.getListeningHistoryData); // Lấy danh sách các bài trong listening history
router.get('/', listeningHistoryController.index); // route '/' để ở dưới cùng

module.exports = router;