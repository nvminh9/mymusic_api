const express = require('express');
const router = express.Router();

const authController = require('../app/controllers/AuthController');

// Khai báo các route
router.post('/signup', authController.handleSignUp); // Đăng ký
router.post('/signin', authController.handleSignIn); // Đăng nhập
router.get('/signout', authController.handleSignout); // Đăng xuất
router.post('/google/signup', authController.handleSignUpWithGoogle); // Đăng ký với tài khoản Google
router.post('/google/signin', authController.handleSignInWithGoogle); // Đăng nhập với tài khoản Google
router.get('/', authController.index); // route '/' để ở dưới cùng

module.exports = router;