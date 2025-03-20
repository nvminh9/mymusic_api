const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const userController = require('../app/controllers/UserController');

// Khai báo các route
router.get('/profile/:userName', userController.getUserProfile); // Thông tin profile (thông tin, người theo dõi, đang theo dõi, số bài viết, các bài viết)
router.patch('/profile/:userName', upload.fields([
    { name: 'userAvatar', maxCount: 1 }
]), userController.updateUserInfo); // Cập nhật thông tin profile
router.get('/:userName/articles', userController.getUserArticles); // Danh sách bài viết của user
router.get('/:userName/musics', userController.getUserMusics); // Danh sách bài nhạc của user
router.get('/', userController.index); // route '/' để ở dưới cùng

module.exports = router;