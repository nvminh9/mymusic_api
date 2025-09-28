const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const feedController = require('../app/controllers/FeedController');

// Khai báo các route
router.get('/', feedController.getFeed); // (route '/' để ở dưới cùng)

module.exports = router;