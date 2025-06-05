const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const commentController = require('../app/controllers/CommentController');

// Khai báo các route
// router.post('/create', upload.fields([
//     { name: 'mediaFiles' }
// ]), commentController.createComment) // Tạo bình luận (có thể có chữ, ảnh/video)
router.post('/create', commentController.createComment); // Tạo bình luận (có thể có chữ)
router.post('/:commentId/like', commentController.createLikeComment); // Thích bình luận
router.patch('/:commentId/unlike', commentController.unLikeComment); // Hủy thích bình luận
router.delete('/:commentId', commentController.deleteComment); // Xóa bình luận
router.get('/:commentId', commentController.index); // Chi tiết bình luận (route '/' để ở dưới cùng)

module.exports = router;