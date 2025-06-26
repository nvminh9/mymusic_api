const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const sharedArticleController = require('../app/controllers/SharedArticleController');

// Khai báo các route
router.post('/:sharedArticleId/like', sharedArticleController.like); // Thích bài chia sẻ
router.patch('/:sharedArticleId/unlike', sharedArticleController.unlike); // Hủy thích bài chia sẻ
router.delete('/:sharedArticleId', sharedArticleController.delete); // Xóa bài chia sẻ
router.get('/:sharedArticleId', sharedArticleController.index); // (route '/' để ở dưới cùng)

module.exports = router;