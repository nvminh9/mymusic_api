const express = require('express');
const router = express.Router();

const genreController = require('../app/controllers/GenreController');

// Khai báo các route
router.get('/list', genreController.getListOfGenre); // Lấy danh sách các thể loại âm nhạc
// router.get('/', articleController.index); // (route '/' để ở dưới cùng)

module.exports = router;