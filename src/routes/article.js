const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const articleController = require('../app/controllers/ArticleController');

// Khai báo các route
router.post('/create', upload.fields([
    // { name: 'photoFiles' },
    // { name: 'videoFiles' }
    { name: 'mediaFiles' }
]), articleController.createArticle) // Đăng bài viết
router.get('/', articleController.index); // route '/' để ở dưới cùng

module.exports = router;