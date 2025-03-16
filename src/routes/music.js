const express = require('express');
const router = express.Router();

const musicController = require('../app/controllers/MusicController');

// Khai báo các route
router.get('/:file', musicController.hlsAudioStreaming)
router.get('/', musicController.index); // route '/' để ở dưới cùng

module.exports = router;