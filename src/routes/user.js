const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const userController = require('../app/controllers/UserController');

// Khai báo các route
router.get('/profile/:userName', userController.getUserProfile); // Thông tin profile (thông tin, người theo dõi, đang theo dõi, số bài viết, các bài viết)
router.get('/profile/:userName/followers', userController.getFollowers); // Lấy danh sách người theo dõi
router.get('/profile/:userName/follows', userController.getFollows); // Lấy danh sách đang theo dõi
router.patch('/profile/:userName', upload.fields([
    { name: 'userAvatar', maxCount: 1 }
]), userController.updateUserInfo); // Cập nhật thông tin profile
router.post('/:userName/follow', userController.handleFollowUser); // Theo dõi người dùng
router.patch('/:userName/unfollow', userController.handleUnfollowUser) // Hủy theo dõi người dùng
router.get('/:userName/articles', userController.getUserArticles); // Danh sách bài viết của user
router.get('/:userName/musics', userController.getUserMusics); // Danh sách bài nhạc của user
router.get('/reference/search', userController.findReferenceUser); // Tìm kiếm người dùng có sự liên quan (theo dõi, đang theo dõi) với người đang tìm kiếm
router.get('/', userController.index); // route '/' để ở dưới cùng

module.exports = router;