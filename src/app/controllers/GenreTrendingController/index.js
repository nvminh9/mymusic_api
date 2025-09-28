const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const genreTrendingService = require('../../../services/genreTrendingService');
const { validationResult } = require('express-validator');

class GenreTrendingController {
    /**
     * Get trending songs by genre
     */
    // [GET] /genreTrending/genre/:genreId  (Lấy các bài nhạc thịnh hành theo thể loại)
    async getTrendingByGenre(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid parameters',
                    errors: errors.array()
                });
            }

            const { genreId } = req.params;
            const { 
                period = 'daily', 
                limit = 20, 
                offset = 0 
            } = req.query;

            const trendingSongs = await genreTrendingService.getTrendingByGenre(
                parseInt(genreId),
                period,
                parseInt(limit),
                parseInt(offset)
            );

            return res.status(200).json({
                status: 200,
                message: `Trending songs for genre ${genreId}`,
                data: {
                    genreId: parseInt(genreId),
                    genreName: trendingSongs?.[0]?.song?.genre?.name,
                    period,
                    total: trendingSongs.length,
                    songs: trendingSongs
                }
            });
        } catch (error) {
            console.error('Error getting trending by genre:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get genre trending summary
     */
    // [GET] /genreTrending/genres/summary  (Lấy các bài nhạc thịnh hành của tất cả thể loại)
    async getGenreTrendingSummary(req, res) {
        try {
            const { period = 'daily', limit = 10 } = req.query;

            const summary = await genreTrendingService.getGenreTrendingSummary(
                period,
                parseInt(limit)
            );

            return res.status(200).json({
                status: 200,
                message: 'Genre trending summary',
                data: {
                    period,
                    genres: summary
                }
            });
        } catch (error) {
            console.error('Error getting genre trending summary:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get personalized genre trending
     */
    // [GET] /genreTrending/genres/personalized - Get personalized genre trending
    async getPersonalizedGenreTrending(req, res) {
        try {
            // const userId = req.user?.userId;
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            if (!userId) {
                return res.status(401).json({
                    status: 401,
                    message: 'Authentication required'
                });
            }

            const { period = 'daily', limit = 20 } = req.query;

            const personalizedTrending = await genreTrendingService.getPersonalizedGenreTrending(
                userId,
                period,
                parseInt(limit)
            );

            return res.status(200).json({
                status: 200,
                message: 'Personalized genre trending',
                data: {
                    userId,
                    period,
                    songs: personalizedTrending
                }
            });
        } catch (error) {
            console.error('Error getting personalized genre trending:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Compare trending across genres
     */
    // [GET] /genreTrending/genres/compare  (So sánh độ thịnh hành giữa các thể loại)
    async compareGenreTrending(req, res) {
        try {
            const { period = 'daily' } = req.query;

            const comparison = await genreTrendingService.compareGenreTrending(period);

            return res.status(200).json({
                status: 200,
                message: 'Genre trending comparison',
                data: {
                    period,
                    comparison
                }
            });
        } catch (error) {
            console.error('Error comparing genre trending:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get user's genre preferences
     */
    // [GET] /genreTrending/user/genre-preferences - Get user's genre preferences
    async getUserGenrePreferences(req, res) {
        try {
            // const userId = req.user?.userId;
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            if (!userId) {
                return res.status(401).json({
                    status: 401,
                    message: 'Authentication required'
                });
            }

            const preferences = await genreTrendingService.getUserGenrePreferences(userId);

            return res.status(200).json({
                status: 200,
                message: 'User genre preferences',
                data: {
                    userId,
                    preferences
                }
            });
        } catch (error) {
            console.error('Error getting user genre preferences:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Force recalculate genre trending (Admin only)
     */
    async recalculateGenreTrending(req, res) {
        try {
            // if (!req.user || req.user.role !== 'admin') {
            //     return res.status(403).json({
            //         status: 403,
            //         message: 'Admin access required'
            //     });
            // }

            const { period = 'daily' } = req.body;

            const result = await genreTrendingService.updateGenreTrending(period);

            return res.status(200).json({
                status: 200,
                message: 'Genre trending recalculation completed',
                data: {
                    period,
                    recordsUpdated: result.length
                }
            });
        } catch (error) {
            console.error('Error recalculating genre trending:', error);
            return res.status(500).json({
                status: 500,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = new GenreTrendingController();