const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const articleController = require('../app/controllers/ArticleController');

// Khai báo các route
router.post('/create', upload.fields([
    { name: 'mediaFiles' }
]), articleController.createArticle) // Đăng bài viết
router.delete('/:articleId', articleController.deleteArticle); // Xóa bài viết
router.post('/:articleId/like', articleController.createLikeArticle); // Thích bài viết
router.patch('/:articleId/unlike', articleController.unLikeArticle); // Hủy thích bài viết
router.get('/:articleId', articleController.index); // Chi tiết bài viết (route '/' để ở dưới cùng)

module.exports = router;