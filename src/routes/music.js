const express = require('express');
const router = express.Router();

const musicController = require('../app/controllers/MusicController');

router.use('/', musicController.index); // route '/' để ở dưới cùng

module.exports = router;