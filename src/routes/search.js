const express = require('express');
const router = express.Router();

const searchController = require('../app/controllers/SearchController');

// Khai báo các route
// router.get('/search', searchController.search)
router.get('/autocomplete', searchController.getAutocomplete); // Gợi ý tìm kiếm
router.get('/history', searchController.getSearchHistoryData); // Lịch sử tìm kiếm
router.delete('/history/:searchHistoryId', searchController.deleteSearchHistory); // Xóa lịch sử tìm kiếm
router.get('/', searchController.index); // (route '/' để ở dưới cùng)

module.exports = router;