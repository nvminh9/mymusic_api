const express = require('express');
const router = express.Router();

const authController = require('../app/controllers/AuthController');
const { route } = require('./news');
// const { route } = require('./user');

// Khai báo các route
router.post('/signup', authController.handleSignUp); // Đăng ký
router.post('/signin', authController.handleSignIn); // Đăng nhập
router.use('/', authController.index); // route '/' để ở dưới cùng

module.exports = router;