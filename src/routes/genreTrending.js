const express = require('express');
const router = express.Router();
const { query, body, param } = require('express-validator');

const genreTrendingController = require('../app/controllers/GenreTrendingController');

// Validation rules
const validateGenreId = param('genreId')
  .isInt({ min: 1 })
  .withMessage('Genre ID must be a positive integer');

const validatePeriod = query('period')
  .optional()
  .isIn(['daily', 'weekly', 'monthly', 'yearly'])
  .withMessage('Period must be one of: daily, weekly, monthly, yearly');

const validateLimit = query('limit')
  .optional()
  .isInt({ min: 1, max: 100 })
  .withMessage('Limit must be between 1 and 100');

const validateOffset = query('offset')
  .optional()
  .isInt({ min: 0 })
  .withMessage('Offset must be a non-negative integer');

// Khai báo các route
/**
 * Public Routes (No Authentication required)
 */
router.get('/genre/:genreId', [validateGenreId, validatePeriod, validateLimit, validateOffset], genreTrendingController.getTrendingByGenre); // Lấy các bài nhạc thịnh hành theo thể loại
router.get('/genres/summary', [validatePeriod, validateLimit], genreTrendingController.getGenreTrendingSummary); // Lấy các bài nhạc thịnh hành của tất cả thể loại
router.get('/genres/compare', [validatePeriod], genreTrendingController.compareGenreTrending); // So sánh độ thịnh hành giữa các thể loại
/**
 * Protected Routes (Authentication required)
 */
router.get('/genres/personalized', [validatePeriod, validateLimit], genreTrendingController.getPersonalizedGenreTrending); // Get personalized genre trending
router.get('/user/genre-preferences', genreTrendingController.getUserGenrePreferences); // Get user's genre preferences

/**
 * Admin Routes
 */
// // POST /api/trending/genres/recalculate - Force recalculate genre trending
router.post('/genres/recalculate',
  [
    body('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Period must be one of: daily, weekly, monthly, yearly')
  ],
  genreTrendingController.recalculateGenreTrending
);

module.exports = router;