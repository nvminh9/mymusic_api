const express = require('express');
const router = express.Router();

const articleController = require('../app/controllers/ArticleController');

// Khai báo các route

router.get('/', articleController.index); // route '/' để ở dưới cùng

module.exports = router;