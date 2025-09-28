const express = require('express');
const router = express.Router();
const { query, body, param } = require('express-validator');

const trendingSongController = require('../app/controllers/TrendingSongController');

/**
 * Validation rules
 */
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

const validateSongId = param('songId')
  .isUUID()
  .withMessage('Song ID must be a valid UUID');

// Khai báo các route
router.get('/songs', [validatePeriod, validateLimit, validateOffset], trendingSongController.getTrendingSongs); // Lấy danh sách các bài nhạc thịnh hành
router.get('/summary', [query('limit').optional().isInt({ min: 1, max: 50 })], trendingSongController.getTrendingSummary); // Lấy tóm tắt xu hướng thịnh hành của các bài nhạc
router.get('/stats', [validatePeriod], trendingSongController.getTrendingStats); // Lấy số liệu thống kế của xu hướng thịnh hành (Lỗi)
router.get('/song/:songId/history',
  [
    validateSongId,
    validatePeriod,
    query('days').optional().isInt({ min: 1, max: 365 })
  ],
  trendingSongController.getSongTrendingHistory
); // Lấy lịch sử thịnh hành của bài nhạc

/**
 * Protected Routes (Admin only)
 */
// POST /api/trending/recalculate (Force recalculate trending)
router.post('/recalculate',
  [
    body('period')
      .optional()
      .isIn(['all', 'daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Period must be one of: all, daily, weekly, monthly, yearly')
  ],
  trendingSongController.recalculateTrending
);

module.exports = router;