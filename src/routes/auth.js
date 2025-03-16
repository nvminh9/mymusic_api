const express = require('express');
const router = express.Router();

const authController = require('../app/controllers/AuthController');

// Khai báo các route
router.post('/signup', authController.handleSignUp); // Đăng ký
router.post('/signin', authController.handleSignIn); // Đăng nhập
router.get('/signout', authController.handleSignout); // Đăng xuất
router.get('/', authController.index); // route '/' để ở dưới cùng

module.exports = router;