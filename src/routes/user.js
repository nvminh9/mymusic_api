const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/UserController');
// const { route } = require('./user');

// Khai báo các route

router.use('/', userController.index); // route '/' để ở dưới cùng

module.exports = router;