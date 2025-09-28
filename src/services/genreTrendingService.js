const { Op, Sequelize } = require('sequelize');
const { Song, User, Genre, ListeningHistory, LikeSong, Article, TrendingSong } = require('../app/models/sequelize');

class GenreTrendingService {
    constructor() {
        // Genre-specific weights (có thể khác nhau cho từng thể loại)
        this.genreWeights = {
            // Pop music - focus on likes and shares
            1: { listenCount: 0.35, likeCount: 0.3, shareCount: 0.2, recentActivity: 0.1, growthRate: 0.05 },
            // Hip-hop - focus on listens and recent activity  
            2: { listenCount: 0.5, likeCount: 0.2, shareCount: 0.15, recentActivity: 0.1, growthRate: 0.05 },
            // Electronic - focus on listens and growth
            3: { listenCount: 0.45, likeCount: 0.2, shareCount: 0.1, recentActivity: 0.15, growthRate: 0.1 },
            // Default weights
            default: { listenCount: 0.4, likeCount: 0.25, shareCount: 0.15, recentActivity: 0.15, growthRate: 0.05 }
        };
    }

    /**
     * Get trending songs by genre
     */
    async getTrendingByGenre(genreId, period = 'daily', limit = 20, offset = 0) {
        try {
        const trendingSongs = await TrendingSong.findAll({
            where: { 
                genreId, 
                period 
            },
            include: [
            {
                model: Song,
                as: 'Song',
                include: [
                {
                    model: User,
                    attributes: ['userId', 'name', 'userName', 'userAvatar']
                },
                {
                    model: Genre,
                    attributes: ['genreId', 'name']
                }
                ]
            }
            ],
            order: [['genreRank', 'ASC']],
            limit,
            offset
        });

        return trendingSongs.map(item => ({
            overallRank: item.rank,
            genreRank: item.genreRank,
            trendingScore: parseFloat(item.trendingScore),
            listenCount: item.listenCount,
            likeCount: item.likeCount,
            shareCount: item.shareCount,
            calculatedAt: item.calculatedAt,
            song: {
                songId: item.Song.songId,
                name: item.Song.name,
                songImage: item.Song.songImage,
                songLink: item.Song.songLink,
                duration: item.Song.duration,
                createdAt: item.Song.createdAt,
                user: item.Song.User,
                genre: item.Song.Genre
            }
        }));
        } catch (error) {
            console.error('Error getting trending by genre:', error);
            throw error;
        }
    }

    /**
     * Get all genres with their trending stats
     */
    async getGenreTrendingSummary(period = 'daily', limit = 10) {
        try {
            const genresWithTrending = await Genre.findAll({
                include: [
                {
                    model: TrendingSong,
                    where: { period },
                    required: false,
                    attributes: [
                        [Sequelize.fn('COUNT', '*'), 'songCount'],
                        [Sequelize.fn('AVG', Sequelize.col('trendingScore')), 'avgScore'],
                        [Sequelize.fn('MAX', Sequelize.col('trendingScore')), 'maxScore'],
                        [Sequelize.fn('SUM', Sequelize.col('listenCount')), 'totalListens']
                    ]
                }
                ],
                attributes: ['genreId', 'name'],
                order: [[Sequelize.literal('songCount'), 'DESC']],
                limit: 20
            });

            const summary = [];

            for (const genre of genresWithTrending) {
                // Get top song in this genre
                const topSong = await this.getTrendingByGenre(genre.genreId, period, 1);
                
                summary.push({
                    genreId: genre.genreId,
                    genreName: genre.name,
                    stats: {
                        songCount: parseInt(genre.TrendingSongs?.[0]?.dataValues?.songCount || 0),
                        avgScore: parseFloat(genre.TrendingSongs?.[0]?.dataValues?.avgScore || 0).toFixed(4),
                        maxScore: parseFloat(genre.TrendingSongs?.[0]?.dataValues?.maxScore || 0).toFixed(4),
                        totalListens: parseInt(genre.TrendingSongs?.[0]?.dataValues?.totalListens || 0)
                    },
                    topSong: topSong[0] || null
                });
            }

            return summary.slice(0, limit);
        } catch (error) {
            console.error('Error getting genre trending summary:', error);
            throw error;
        }
    }

    /**
     * Calculate genre-specific trending scores
     */
    calculateGenreTrendingScore(metrics, genreId, period) {
        const weights = this.genreWeights[genreId] || this.genreWeights.default;
        const {
            listenCount = 0,
            likeCount = 0,
            shareCount = 0,
            recentListens = 0,
            previousListens = 0
        } = metrics;

        // Normalize values with genre-specific scaling
        const genreScaling = this.getGenreScaling(genreId);
        const normalizedListens = Math.log(listenCount * genreScaling.listen + 1);
        const normalizedLikes = Math.log(likeCount * genreScaling.like + 1);
        const normalizedShares = Math.log(shareCount * genreScaling.share + 1);
        
        // Recent activity boost
        const recentBoost = recentListens / Math.max(listenCount, 1);
        
        // Growth rate calculation
        const growthRate = previousListens > 0 
        ? (listenCount - previousListens) / previousListens 
        : listenCount > 0 ? 1 : 0;

        // Genre-specific time decay
        const timeDecay = this.getGenreTimeDecay(genreId, period);

        const score = (
        normalizedListens * weights.listenCount +
        normalizedLikes * weights.likeCount +
        normalizedShares * weights.shareCount +
        recentBoost * weights.recentActivity +
        Math.min(growthRate, 2) * weights.growthRate
        ) * timeDecay;

        return Math.round(score * 10000) / 10000;
    }

    /**
     * Get genre-specific scaling factors
     */
    getGenreScaling(genreId) {
        const scalings = {
            1: { listen: 1.0, like: 1.2, share: 1.1 }, // Pop - likes matter more
            2: { listen: 1.1, like: 0.9, share: 1.0 }, // Hip-hop - listens matter more
            3: { listen: 1.2, like: 0.8, share: 0.9 }, // Electronic - listens dominant
            default: { listen: 1.0, like: 1.0, share: 1.0 }
        };
        return scalings[genreId] || scalings.default;
    }

    /**
     * Get genre-specific time decay
     */
    getGenreTimeDecay(genreId, period) {
        // Some genres stay relevant longer
        const decayFactors = {
            1: { daily: 1.0, weekly: 0.95, monthly: 0.85, yearly: 0.75 }, // Pop
            2: { daily: 1.0, weekly: 0.9, monthly: 0.8, yearly: 0.7 },   // Hip-hop  
            3: { daily: 1.0, weekly: 0.92, monthly: 0.82, yearly: 0.72 }, // Electronic
            default: { daily: 1.0, weekly: 0.9, monthly: 0.8, yearly: 0.7 }
        };
        
        const factors = decayFactors[genreId] || decayFactors.default;
        return factors[period] || 1.0;
    }

    /**
     * Update trending songs by genre
     */
    async updateGenreTrending(period) {
        try {
            console.log(`Calculating genre trending for period: ${period}`);
            
            // Get all genres
            const genres = await Genre.findAll({
                attributes: ['genreId', 'name']
            });

            const allTrendingData = [];

            for (const genre of genres) {
                try {
                    const genreTrendingData = await this.calculateGenreTrendingSongs(
                        genre.genreId, 
                        period
                    );
                    allTrendingData.push(...genreTrendingData);
                } catch (error) {
                    console.error(`Error calculating trending for genre ${genre.name}:`, error);
                }
            }

            // Clear existing genre trending data for this period
            await TrendingSong.destroy({
                where: { 
                    period,
                    genreId: { [Op.ne]: null }
                }
            });

            // Insert new genre trending data
            if (allTrendingData.length > 0) {
                await TrendingSong.bulkCreate(allTrendingData);
                console.log(`Updated ${allTrendingData.length} genre trending records for ${period}`);
            }

            return allTrendingData;
        } catch (error) {
            console.error('Error updating genre trending:', error);
            throw error;
        }
    }

    /**
     * Calculate trending songs for a specific genre
     */
    async calculateGenreTrendingSongs(genreId, period, limit = 50) {
        try {
            const dateRange = this.getDateRange(period);
            
            // Get songs in this genre with metrics
            const songsInGenre = await Song.findAll({
                where: { genreId },
                attributes: ['songId']
            });

            const songIds = songsInGenre.map(s => s.songId);
            if (songIds.length === 0) return [];

            // Collect metrics for songs in this genre
            const metricsMap = await this.collectGenreMetrics(songIds, period);
            const trendingData = [];

            for (const [songId, metrics] of metricsMap) {
                const trendingScore = this.calculateGenreTrendingScore(
                    metrics, 
                    genreId, 
                    period
                );
                
                if (trendingScore > 0) {
                trendingData.push({
                    songId,
                    genreId,
                    trendingScore,
                    listenCount: metrics.listenCount || 0,
                    likeCount: metrics.likeCount || 0,
                    shareCount: metrics.shareCount || 0,
                    period,
                    calculatedAt: new Date()
                });
                }
            }

            // Sort by score and add genre rankings
            trendingData.sort((a, b) => b.trendingScore - a.trendingScore);
            trendingData.forEach((item, index) => {
                item.genreRank = index + 1;
                item.rank = 0; // Will be set when calculating overall rankings
            });

            return trendingData.slice(0, limit);
        } catch (error) {
            console.error(`Error calculating genre trending for ${genreId}:`, error);
            throw error;
        }
    }

    /**
     * Collect metrics for songs in a genre
     */
    async collectGenreMetrics(songIds, period) {
        const dateRange = this.getDateRange(period);
        
        // Get listen counts for these songs
        const listenCounts = await ListeningHistory.findAll({
            attributes: [
                'songId',
                [Sequelize.fn('COUNT', '*'), 'listenCount'],
                [Sequelize.fn('COUNT', Sequelize.where(
                Sequelize.col('playedAt'), 
                Op.gte, 
                new Date(Date.now() - 24 * 60 * 60 * 1000)
                )), 'recentListens']
            ],
            where: {
                songId: { [Op.in]: songIds },
                playedAt: { [Op.gte]: dateRange.start }
            },
            group: ['songId'],
            raw: true
        });

        // Get like counts
        const likeCounts = await LikeSong.findAll({
            attributes: [
                'songId',
                [Sequelize.fn('COUNT', '*'), 'likeCount']
            ],
            where: {
                songId: { [Op.in]: songIds },
                status: 1,
                createdAt: { [Op.gte]: dateRange.start }
            },
            group: ['songId'],
            raw: true
        });

        // Combine metrics
        const metricsMap = new Map();
        
        listenCounts.forEach(item => {
            metricsMap.set(item.songId, {
                listenCount: parseInt(item.listenCount),
                recentListens: parseInt(item.recentListens)
            });
        });

        likeCounts.forEach(item => {
            if (metricsMap.has(item.songId)) {
                metricsMap.get(item.songId).likeCount = parseInt(item.likeCount);
            }
        });

        return metricsMap;
    }

    /**
     * Get date range for period
     */
    getDateRange(period) {
        const now = new Date();
        const ranges = {
        daily: { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        weekly: { start: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        monthly: { start: new Date(now.getFullYear(), now.getMonth(), 1) },
        yearly: { start: new Date(now.getFullYear(), 0, 1) }
        };
        return ranges[period];
    }

    /**
     * Get personalized genre trending based on user preferences
     */
    async getPersonalizedGenreTrending(userId, period = 'daily', limit = 20) {
        try {
            // Get user's preferred genres from listening history
            const userGenrePreferences = await this.getUserGenrePreferences(userId);
            
            const personalizedResults = [];

            for (const genrePreference of userGenrePreferences) {
                const genreTrending = await this.getTrendingByGenre(
                genrePreference.genreId,
                period,
                Math.ceil(limit * genrePreference.weight)
                );

                personalizedResults.push(...genreTrending.map(item => ({
                ...item,
                personalizedScore: item.trendingScore * genrePreference.weight
                })));
            }

            // Sort by personalized score
            personalizedResults.sort((a, b) => b.personalizedScore - a.personalizedScore);
            
            return personalizedResults.slice(0, limit);
        } catch (error) {
            console.error('Error getting personalized genre trending:', error);
            throw error;
        }
    }

    /**
     * Analyze user's genre preferences
     */
    async getUserGenrePreferences(userId) {
        try {
            const genreListeningStats = await ListeningHistory.findAll({
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'listenCount']
                ],
                include: [
                    {
                        model: Song,
                        include: [
                            {
                                model: Genre,
                                attributes: ['genreId', 'name']
                            }
                        ]
                    }
                ],
                where: {
                    userId,
                    playedAt: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                },
                group: ['Song.Genre.genreId', 'Song.Genre.name'],
                order: [[Sequelize.literal('listenCount'), 'DESC']],
                limit: 5,
                raw: true
            });

            const totalListens = genreListeningStats.reduce(
                (sum, item) => sum + parseInt(item.listenCount), 
                0
            );

            return genreListeningStats.map(item => ({
                genreId: item['Song.Genre.genreId'],
                genreName: item['Song.Genre.name'],
                listenCount: parseInt(item.listenCount),
                weight: parseInt(item.listenCount) / totalListens
            }));
        } catch (error) {
            console.error('Error getting user genre preferences:', error);
            return [];
        }
    }

    /**
     * Compare trending across genres
     */
    async compareGenreTrending(period = 'daily') {
        try {
            const genreComparison = await TrendingSong.findAll({
                where: { 
                    period,
                    genreId: { [Op.ne]: null }
                },
                include: [
                    {
                        model: Genre,
                        attributes: ['genreId', 'name']
                    }
                ],
                attributes: [
                    'genreId',
                    [Sequelize.fn('COUNT', '*'), 'songCount'],
                    [Sequelize.fn('AVG', Sequelize.col('trendingScore')), 'avgScore'],
                    [Sequelize.fn('MAX', Sequelize.col('trendingScore')), 'maxScore'],
                    [Sequelize.fn('SUM', Sequelize.col('listenCount')), 'totalListens']
                ],
                group: ['genreId', 'Genre.genreId', 'Genre.name'],
                order: [[Sequelize.literal('avgScore'), 'DESC']],
                raw: true
            });

            return genreComparison.map(item => ({
                genreId: item.genreId,
                genreName: item['Genre.name'],
                songCount: parseInt(item.songCount),
                avgScore: parseFloat(item.avgScore).toFixed(4),
                maxScore: parseFloat(item.maxScore).toFixed(4),
                totalListens: parseInt(item.totalListens),
                dominanceScore: (
                parseInt(item.songCount) * 0.4 + 
                parseFloat(item.avgScore) * 0.6
                ).toFixed(4)
            }));
        } catch (error) {
            console.error('Error comparing genre trending:', error);
            throw error;
        }
    }
}

module.exports = new GenreTrendingService();
