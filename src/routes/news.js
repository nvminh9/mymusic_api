const express = require('express');
const router = express.Router();

const newsController = require('../app/controllers/NewsController');

router.use('/:newsID', newsController.show);
router.use('/', newsController.index); // route '/' để ở dưới cùng

module.exports = router;