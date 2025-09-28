const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const trendingSongService = require('../../../services/trendingSongService');
const { validationResult } = require('express-validator');

class TrendingController {
    /**
     * Get trending songs for a specific period
     */
    // [GET] /trending/songs?period=<daily,weekly,monthly,yearly>&limit=<20>&offset=<0>&personalized=<false>
    async getTrendingSongs(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid parameters',
                    errors: errors.array()
                });
            }

            const { 
                period = 'daily', 
                limit = 20, 
                offset = 0,
                personalized
            } = req.query;
                        
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            let trendingSongs;
            
            if (( personalized === true || personalized === 'true' ) && userId) {
                trendingSongs = await trendingSongService.getPersonalizedTrending(
                    userId, 
                    period, 
                    parseInt(limit)
                );
                // console.log('personalized');
            } else {
                trendingSongs = await trendingSongService.getTrendingSongs(
                    period, 
                    parseInt(limit), 
                    parseInt(offset)
                );
                // console.log('not personalized');
            }

            return res.status(200).json({
                    status: 200,
                    message: `Trending songs for ${period}`,
                    data: {
                        period,
                        personalized: ( personalized === true || personalized === 'true' ) && !!userId,
                        total: trendingSongs.length,
                        songs: trendingSongs
                    }
            });
        } catch (error) {
            console.error('Error getting trending songs:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get trending summary for all periods
     */
    // [GET] /trending/summary?limit=<10>&personalized=<>
    async getTrendingSummary(req, res) {
        try {
            // const userId = req.user?.userId;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            const limit = parseInt(req.query.limit) || 10;

            const periods = ['daily', 'weekly', 'monthly', 'yearly'];
            const summary = {};

            for (const period of periods) {
                try {
                if (userId && req.query.personalized === 'true') {
                    summary[period] = await trendingSongService.getPersonalizedTrending(
                        userId, 
                        period, 
                        limit
                    );
                } else {
                    summary[period] = await trendingSongService.getTrendingSongs(
                        period, 
                        limit
                    );
                }
                } catch (error) {
                    console.error(`Error getting ${period} trending:`, error);
                    summary[period] = [];
                }
            }

            return res.status(200).json({
                status: 200,
                message: 'Trending summary',
                data: summary
            });
        } catch (error) {
            console.error('Error getting trending summary:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get trending stats for analytics
     */
    // [GET] /trending/stats?period=<daily>
    async getTrendingStats(req, res) {
        try {
            const { period = 'daily' } = req.query;
            
            const stats = await trendingSongService.getTrendingStats(period);
            
            return res.status(200).json({
                status: 200,
                message: `Trending stats for ${period}`,
                data: stats
            });
        } catch (error) {
            console.error('Error getting trending stats:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get song's trending history
     */
    // [GET] /trending/song/:songId/history?period=<daily>&days=<30>
    async getSongTrendingHistory(req, res) {
        try {
            const { songId } = req.params;
            const { period = 'daily', days = 30 } = req.query;

            const history = await trendingSongService.getSongTrendingHistory(
                songId, 
                period, 
                parseInt(days)
            );

            return res.status(200).json({
                    status: 200,
                    message: 'Song trending history',
                    data: {
                        songId,
                        period,
                        history
                }
            });
        } catch (error) {
            console.error('Error getting song trending history:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Force recalculate trending (For Admin only) (Chưa dùng đến) (Test)
     */    
    async recalculateTrending(req, res) {
        try {
            // Check if user is admin
            // if (!req.user || req.user.role !== 'admin') {
            //     return res.status(403).json({
            //         status: 403,
            //         message: 'Access denied'
            //     });
            // }

            const { period = 'all' } = req.body;
            const periods = period === 'all' 
                ? ['daily', 'weekly', 'monthly', 'yearly'] 
                : [period];

            const results = {};

            for (const p of periods) {
                try {
                    const trendingData = await trendingSongService.updateTrendingSongs(p);
                    results[p] = {
                        success: true,
                        count: trendingData.length
                    };
                } catch (error) {
                    results[p] = {
                        success: false,
                        error: error.message
                    };
                }
            }

            return res.status(200).json({
                status: 200,
                message: 'Trending recalculation completed',
                data: results
            });
        } catch (error) {
            console.error('Error recalculating trending:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new TrendingController();