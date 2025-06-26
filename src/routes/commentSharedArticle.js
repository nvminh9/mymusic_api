const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig");

const commentSharedArticleController = require('../app/controllers/CommentSharedArticleController');

// Khai báo các route
// router.post('/create', upload.fields([
//     { name: 'mediaFiles' }
// ]), commentSharedArticleController.createComment) // Tạo bình luận (có thể có chữ, ảnh/video)
router.post('/create', commentSharedArticleController.createComment); // Tạo bình luận (có thể có chữ)
router.post('/:commentId/like', commentSharedArticleController.createLikeComment); // Thích bình luận
router.patch('/:commentId/unlike', commentSharedArticleController.unLikeComment); // Hủy thích bình luận
router.delete('/:commentId', commentSharedArticleController.deleteComment); // Xóa bình luận
router.patch('/:commentId', commentSharedArticleController.updateComment); // Cập nhật bình luận
router.get('/:commentId', commentSharedArticleController.index); // Chi tiết bình luận (route '/' để ở dưới cùng)

module.exports = router;