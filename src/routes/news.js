const express = require('express');
const router = express.Router();

const newsController = require('../app/controllers/NewsController');

// Khai báo các route
router.get('/:newsID', newsController.show);
router.get('/', newsController.index); // route '/' để ở dưới cùng

module.exports = router;