const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/UserController');

// Khai báo các route
router.get('/:userId/articles', userController.getUserArticles); // Danh sách bài viết của user
router.get('/profile/:userId', userController.getUserProfile); // Thông tin profile (người theo dõi, đang theo dõi, số bài viết)
router.get('/', userController.index); // route '/' để ở dưới cùng

module.exports = router;