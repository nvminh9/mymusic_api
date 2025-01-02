const express = require('express');
const router = express.Router();

const musicController = require('../app/controllers/MusicController');
const { route } = require('./news');

// Khai báo các route
router.get('/:file', musicController.hlsAudioStreaming)
router.use('/', musicController.index); // route '/' để ở dưới cùng

module.exports = router;