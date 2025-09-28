const { Op, Sequelize } = require('sequelize');
const { Song, User, Genre, ListeningHistory, LikeSong, Article, TrendingSong } = require('../app/models/sequelize');

class TrendingSongService {

    constructor() {
        // Weights for trending score calculation
        this.weights = {
            listenCount: 0.4,      // 40% - Lượt nghe
            likeCount: 0.25,       // 25% - Lượt thích
            shareCount: 0.15,      // 15% - Lượt chia sẻ
            recentActivity: 0.15,  // 15% - Hoạt động gần đây
            growthRate: 0.05       // 5% - Tốc độ tăng trưởng
        };
    }

    /**
     * Calculate trending score for a song
     */
    calculateTrendingScore(metrics, period) {
        const {
            listenCount = 0,
            likeCount = 0, 
            shareCount = 0,
            recentListens = 0,
            previousListens = 0
        } = metrics;

        // Normalize values (log scale để tránh skew)
        const normalizedListens = Math.log(listenCount + 1);
        const normalizedLikes = Math.log(likeCount + 1);
        const normalizedShares = Math.log(shareCount + 1);
        
        // Recent activity boost (hoạt động gần đây)
        const recentBoost = recentListens / Math.max(listenCount, 1);
        
        // Growth rate calculation
        const growthRate = previousListens > 0 
        ? (listenCount - previousListens) / previousListens 
        : listenCount > 0 ? 1 : 0;

        // Apply time decay (bài cũ sẽ bị giảm điểm)
        const timeDecay = this.getTimeDecay(period);

        const score = (
            normalizedListens * this.weights.listenCount +
            normalizedLikes * this.weights.likeCount +
            normalizedShares * this.weights.shareCount +
            recentBoost * this.weights.recentActivity +
            Math.min(growthRate, 2) * this.weights.growthRate // Cap growth rate at 200%
        ) * timeDecay;

        return Math.round(score * 10000) / 10000; // 4 decimal places
    }

    /**
     * Get time decay factor based on period
     */
    getTimeDecay(period) {
        const decayFactors = {
            daily: 1.0,    // Không decay cho daily
            weekly: 0.9,   // 10% decay cho weekly  
            monthly: 0.8,  // 20% decay cho monthly
            yearly: 0.7    // 30% decay cho yearly
        };
        return decayFactors[period] || 1.0;
    }

    /**
     * Get date range for period
     */
    getDateRange(period) {
        const now = new Date();
        const ranges = {
        daily: {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            previous: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        },
        weekly: {
            start: new Date(now - 7 * 24 * 60 * 60 * 1000),
            previous: new Date(now - 14 * 24 * 60 * 60 * 1000)
        },
        monthly: {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            previous: new Date(now.getFullYear(), now.getMonth() - 1, 1)
        },
        yearly: {
            start: new Date(now.getFullYear(), 0, 1),
            previous: new Date(now.getFullYear() - 1, 0, 1)
        }
        };
        return ranges[period];
    }

    /**
     * Collect metrics for all songs in a period
     */
    async collectSongMetrics(period) {
        const dateRange = this.getDateRange(period);
        
        // Get listen counts
        const listenCounts = await ListeningHistory.findAll({
            attributes: [
                'songId',
                [Sequelize.fn('COUNT', '*'), 'listenCount'],
                [Sequelize.fn('COUNT', Sequelize.where(
                Sequelize.col('playedAt'), 
                Op.gte, 
                new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
                )), 'recentListens']
            ],
            where: {
                playedAt: {
                [Op.gte]: dateRange.start
                }
            },
            group: ['songId'],
            raw: true
        });

        // Get previous period listen counts for growth rate
        const previousListenCounts = await ListeningHistory.findAll({
            attributes: [
                'songId',
                [Sequelize.fn('COUNT', '*'), 'previousListens']
            ],
            where: {
                playedAt: {
                [Op.gte]: dateRange.previous,
                [Op.lt]: dateRange.start
                }
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
                status: 1, // Liked
                createdAt: {
                [Op.gte]: dateRange.start
                }
            },
            group: ['songId'],
            raw: true
        });

        // Get share counts (from articles mentioning songs)
        const shareCounts = await Article.findAll({
            attributes: [
                // Assume we extract songId from textContent or have a separate song_mentions table
                [Sequelize.literal(`
                CASE 
                    WHEN "textContent" ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' 
                    THEN 'extracted_song_id'
                    ELSE NULL 
                END
                `), 'songId'],
                [Sequelize.fn('COUNT', '*'), 'shareCount']
            ],
            where: {
                createdAt: {
                [Op.gte]: dateRange.start
                }
            },
            group: ['songId'],
            raw: true
        });

        // Combine all metrics
        const metricsMap = new Map();
        
        // Process listen counts
        listenCounts.forEach(item => {
            if (!metricsMap.has(item.songId)) {
                metricsMap.set(item.songId, {});
            }
            metricsMap.get(item.songId).listenCount = parseInt(item.listenCount);
            metricsMap.get(item.songId).recentListens = parseInt(item.recentListens);
        });

        // Process previous listen counts
        previousListenCounts.forEach(item => {
            if (!metricsMap.has(item.songId)) {
                metricsMap.set(item.songId, {});
            }
            metricsMap.get(item.songId).previousListens = parseInt(item.previousListens);
        });

        // Process like counts
        likeCounts.forEach(item => {
            if (!metricsMap.has(item.songId)) {
                metricsMap.set(item.songId, {});
            }
            metricsMap.get(item.songId).likeCount = parseInt(item.likeCount);
        });

        // Process share counts
        shareCounts.forEach(item => {
            if (item.songId && metricsMap.has(item.songId)) {
                metricsMap.get(item.songId).shareCount = parseInt(item.shareCount);
            }
        });

        return metricsMap;
    }

    /**
     * Calculate trending songs for a specific period
     */
    async calculateTrendingSongs(period, limit = 50) {
        try {
            console.log(`Calculating trending songs for period: ${period}`);
            
            const metricsMap = await this.collectSongMetrics(period);
            const trendingData = [];

            for (const [songId, metrics] of metricsMap) {
                const trendingScore = this.calculateTrendingScore(metrics, period);
                
                if (trendingScore > 0) { // Only include songs with positive score
                trendingData.push({
                    songId,
                    trendingScore,
                    listenCount: metrics.listenCount || 0,
                    likeCount: metrics.likeCount || 0,
                    shareCount: metrics.shareCount || 0,
                    period,
                    calculatedAt: new Date()
                });
                }
            }

            // Sort by trending score descending
            trendingData.sort((a, b) => b.trendingScore - a.trendingScore);
            
            // Add ranking
            trendingData.forEach((item, index) => {
                item.rank = index + 1;
            });

            // Limit results
            return trendingData.slice(0, limit);
        } catch (error) {
            console.error(`Error calculating trending songs for ${period}:`, error);
            throw error;
        }
    }

    /**
     * Update trending songs in database
     */
    async updateTrendingSongs(period) {
        try {
            const trendingData = await this.calculateTrendingSongs(period);
            
            // Clear existing data for this period
            await TrendingSong.destroy({
                where: { period }
            });

            // Insert new trending data
            if (trendingData.length > 0) {
                await TrendingSong.bulkCreate(trendingData);
                console.log(`Updated ${trendingData.length} trending songs for ${period}`);
            }

            return trendingData;
        } catch (error) {
            console.error(`Error updating trending songs for ${period}:`, error);
            throw error;
        }
    }

    /**
     * Get trending songs from database
     */
    async getTrendingSongs(period, limit = 20, offset = 0) {
        try {
            const trendingSongs = await TrendingSong.findAll({
                where: { 
                    period,
                    genreId: null
                },
                include: [
                {
                    model: Song,
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
                order: [['rank', 'ASC']],
                limit,
                offset
            });

            return trendingSongs.map(item => ({
                rank: item.rank,
                trendingScore: item.trendingScore,
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
            console.error(`Error getting trending songs for ${period}:`, error);
            throw error;
        }
    }

    /**
     * Get personalized trending songs using embeddings
     */
    async getPersonalizedTrending(userId, period, limit = 20) {
        try {
            // Get user's embedding
            const user = await User.findByPk(userId, {
                attributes: ['embedding']
            });

            if (!user || !user.embedding) {
                // Fallback to general trending if no user embedding
                return await this.getTrendingSongs(period, limit);
            }

            // Get trending songs with embeddings
            const trendingSongs = await TrendingSong.findAll({
                where: { 
                    period,
                    genreId: null 
                },
                include: [
                {
                    model: Song,
                    where: {
                        embedding: {
                            [Op.ne]: null
                        }
                    },
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
                order: [['rank', 'ASC']],
                limit: limit * 2 // Get more to filter by similarity
            });

            // Calculate similarity scores (this would use your embedding model)
            const songsWithSimilarity = trendingSongs.map(item => {
                const similarity = this.calculateCosineSimilarity(
                user.embedding, 
                item.Song.embedding
                );
                
                return {
                ...item.toJSON(),
                similarity,
                personalizedScore: item.trendingScore * (0.7 + similarity * 0.3) // Blend trending + similarity
                };
            });

            // Sort by personalized score
            songsWithSimilarity.sort((a, b) => b.personalizedScore - a.personalizedScore);
            
            return songsWithSimilarity.slice(0, limit);
        } catch (error) {
            console.error('Error getting personalized trending:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    calculateCosineSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2) return 0;
        
        // Convert string embeddings to arrays if needed
        const vec1 = Array.isArray(embedding1) ? embedding1 : JSON.parse(embedding1);
        const vec2 = Array.isArray(embedding2) ? embedding2 : JSON.parse(embedding2);
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < Math.min(vec1.length, vec2.length); i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Get trending statistics for analytics
     */
    async getTrendingStats(period) {
        try {
            const dateRange = this.getDateRange(period);
            
            // Get basic trending stats from database
            const trendingStats = await TrendingSong.findOne({
                where: { period },
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'totalSongs'],
                    [Sequelize.fn('AVG', Sequelize.col('trendingScore')), 'avgScore'],
                    [Sequelize.fn('MAX', Sequelize.col('trendingScore')), 'maxScore'],
                    [Sequelize.fn('MIN', Sequelize.col('trendingScore')), 'minScore'],
                    [Sequelize.fn('SUM', Sequelize.col('listenCount')), 'totalListens'],
                    [Sequelize.fn('SUM', Sequelize.col('likeCount')), 'totalLikes'],
                    [Sequelize.fn('SUM', Sequelize.col('shareCount')), 'totalShares'],
                    [Sequelize.fn('MAX', Sequelize.col('calculatedAt')), 'lastCalculated']
                ],
                raw: true
            });

            // Get genre distribution
            const genreDistribution = await TrendingSong.findAll({
                where: { period },
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
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'count']
                ],
                group: ['Song.songId','Song.Genre.genreId', 'Song.Genre.name'],
                order: [[Sequelize.literal('count'), 'DESC']],
                limit: 10,
                raw: true
            });

            // Get top artists
            const topArtists = await TrendingSong.findAll({
                where: { period },
                include: [
                {
                    model: Song,
                    include: [
                        {
                            model: User,
                            attributes: ['userId', 'name', 'userName']
                        }
                    ]
                }
                ],
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'songCount'],
                    [Sequelize.fn('AVG', Sequelize.col('trendingScore')), 'avgScore'],
                    [Sequelize.fn('SUM', Sequelize.col('listenCount')), 'totalListens']
                ],
                group: ['Song.songId','Song.User.userId', 'Song.User.name', 'Song.User.userName'],
                order: [[Sequelize.literal('avgScore'), 'DESC']],
                limit: 10,
                raw: true
            });

            // Get trending movement (songs moving up/down)
            const trendingMovement = await this.getTrendingMovement(period);

            // Calculate growth rates for this period vs previous
            const growthStats = await this.calculateGrowthStats(period);

            return {
                period,
                overview: {
                    totalSongs: parseInt(trendingStats?.totalSongs || 0),
                    avgScore: parseFloat(trendingStats?.avgScore || 0).toFixed(4),
                    maxScore: parseFloat(trendingStats?.maxScore || 0).toFixed(4),
                    minScore: parseFloat(trendingStats?.minScore || 0).toFixed(4),
                    totalListens: parseInt(trendingStats?.totalListens || 0),
                    totalLikes: parseInt(trendingStats?.totalLikes || 0),
                    totalShares: parseInt(trendingStats?.totalShares || 0),
                    lastCalculated: trendingStats?.lastCalculated
                },
                genreDistribution: genreDistribution.map(item => ({
                    genreId: item['Song.Genre.genreId'],
                    genreName: item['Song.Genre.name'],
                    count: parseInt(item.count)
                })),
                topArtists: topArtists.map(item => ({
                    userId: item['Song.User.userId'],
                    name: item['Song.User.name'],
                    userName: item['Song.User.userName'],
                    songCount: parseInt(item.songCount),
                    avgScore: parseFloat(item.avgScore).toFixed(4),
                    totalListens: parseInt(item.totalListens)
                })),
                movement: trendingMovement,
                growth: growthStats
            };
        } catch (error) {
            console.error(`Error getting trending stats for ${period}:`, error);
            throw error;
        }
    }

    /**
     * Get trending movement (songs moving up/down in rankings)
     */
    async getTrendingMovement(period) {
        try {
        // Get current and previous calculations
        const latestCalculations = await TrendingSong.findAll({
            where: { period },
            attributes: ['songId', 'rank', 'calculatedAt'],
            order: [['calculatedAt', 'DESC']],
            limit: 100 // Top 100 for movement analysis
        });

        if (latestCalculations.length === 0) {
            return { moversUp: [], moversDown: [], newEntries: [] };
        }

        const latestTime = latestCalculations[0].calculatedAt;
        
        // Get previous calculation (approximation)
        const previousCalculations = await TrendingSong.findAll({
            where: {
                period,
                calculatedAt: {
                    [Op.lt]: latestTime
                }
            },
            attributes: ['songId', 'rank', 'calculatedAt'],
            order: [['calculatedAt', 'DESC']],
            limit: 100
        });

        const currentRankings = new Map();
        const previousRankings = new Map();

        latestCalculations.forEach(item => {
            currentRankings.set(item.songId, item.rank);
        });

        previousCalculations.forEach(item => {
            if (!previousRankings.has(item.songId)) {
                previousRankings.set(item.songId, item.rank);
            }
        });

        const moversUp = [];
        const moversDown = [];
        const newEntries = [];

        for (const [songId, currentRank] of currentRankings) {
            if (previousRankings.has(songId)) {
                const previousRank = previousRankings.get(songId);
                const movement = previousRank - currentRank; // Positive = moved up
                
                if (movement > 0) {
                    moversUp.push({ songId, currentRank, previousRank, movement });
                } else if (movement < 0) {
                    moversDown.push({ songId, currentRank, previousRank, movement: Math.abs(movement) });
                }
            } else {
                newEntries.push({ songId, currentRank });
            }
        }

        // Sort by movement magnitude
        moversUp.sort((a, b) => b.movement - a.movement);
        moversDown.sort((a, b) => b.movement - a.movement);

        return {
            moversUp: moversUp.slice(0, 10),
            moversDown: moversDown.slice(0, 10),
            newEntries: newEntries.slice(0, 10)
        };
        } catch (error) {
            console.error('Error getting trending movement:', error);
            return { moversUp: [], moversDown: [], newEntries: [] };
        }
    }

    /**
     * Calculate growth statistics compared to previous period
     */
    async calculateGrowthStats(period) {
        try {
            const dateRange = this.getDateRange(period);
            const previousDateRange = this.getPreviousDateRange(period);

            // Get current period metrics
            const currentMetrics = await ListeningHistory.findOne({
                where: {
                    playedAt: {
                        [Op.gte]: dateRange.start
                    }
                },
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'totalListens'],
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('songId'))), 'uniqueSongs'],
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('userId'))), 'activeUsers']
                ],
                raw: true
            });

            // Get previous period metrics
            const previousMetrics = await ListeningHistory.findOne({
                where: {
                    playedAt: {
                        [Op.gte]: previousDateRange.start,
                        [Op.lt]: dateRange.start
                    }
                },
                attributes: [
                    [Sequelize.fn('COUNT', '*'), 'totalListens'],
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('songId'))), 'uniqueSongs'],
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('userId'))), 'activeUsers']
                ],
                raw: true
            });

            const calculateGrowthRate = (current, previous) => {
                if (!previous || previous === 0) return current > 0 ? 100 : 0;
                return ((current - previous) / previous * 100).toFixed(2);
            };

            return {
                listenGrowth: calculateGrowthRate(
                    parseInt(currentMetrics?.totalListens || 0),
                    parseInt(previousMetrics?.totalListens || 0)
                ),
                songGrowth: calculateGrowthRate(
                    parseInt(currentMetrics?.uniqueSongs || 0),
                    parseInt(previousMetrics?.uniqueSongs || 0)
                ),
                userGrowth: calculateGrowthRate(
                    parseInt(currentMetrics?.activeUsers || 0),
                    parseInt(previousMetrics?.activeUsers || 0)
                )
            };
        } catch (error) {
            console.error('Error calculating growth stats:', error);
            return {
                listenGrowth: '0.00',
                songGrowth: '0.00',
                userGrowth: '0.00'
            };
        }
    }

    /**
     * Get previous date range for comparison
     */
    getPreviousDateRange(period) {
        const now = new Date();
        const ranges = {
        daily: {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        },
        weekly: {
            start: new Date(now - 14 * 24 * 60 * 60 * 1000),
            end: new Date(now - 7 * 24 * 60 * 60 * 1000)
        },
        monthly: {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(now.getFullYear(), now.getMonth(), 1)
        },
        yearly: {
            start: new Date(now.getFullYear() - 1, 0, 1),
            end: new Date(now.getFullYear(), 0, 1)
        }
        };
        return ranges[period];
    }

    /**
     * Get song trending history
     */
    async getSongTrendingHistory(songId, period, days = 30) {
        try {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const history = await TrendingSong.findAll({
            where: {
                songId,
                period,
                calculatedAt: {
                    [Op.gte]: cutoffDate
                }
            },
            attributes: [
                'rank',
                'trendingScore', 
                'listenCount',
                'likeCount',
                'shareCount',
                'calculatedAt'
            ],
            order: [['calculatedAt', 'ASC']]
        });

        // Calculate trend direction
        let trendDirection = 'stable';
        if (history.length >= 2) {
            const firstRank = history[0].rank;
            const lastRank = history[history.length - 1].rank;
            
            if (lastRank < firstRank) {
                trendDirection = 'up';
            } else if (lastRank > firstRank) {
                trendDirection = 'down';
            }
        }

        return {
            songId,
            period,
            days,
            trendDirection,
            dataPoints: history.length,
            history: history.map(item => ({
                rank: item.rank,
                trendingScore: parseFloat(item.trendingScore),
                listenCount: item.listenCount,
                likeCount: item.likeCount,
                shareCount: item.shareCount,
                date: item.calculatedAt.toISOString().split('T')[0]
            }))
        };
        } catch (error) {
            console.error('Error getting song trending history:', error);
            throw error;
        }
    }

    /**
     * Schedule trending calculation jobs
     */
    async scheduleUpdates() {
        const cron = require('node-cron');
        
        // Update daily trending every hour
        cron.schedule('0 * * * *', () => {
            this.updateTrendingSongs('daily');
        });

        // Update weekly trending every 4 hours  
        cron.schedule('0 */4 * * *', () => {
            this.updateTrendingSongs('weekly');
        });

        // Update monthly trending twice daily
        cron.schedule('0 */12 * * *', () => {
            this.updateTrendingSongs('monthly');
        });

        // Update yearly trending daily
        cron.schedule('0 2 * * *', () => {
            this.updateTrendingSongs('yearly');
        });

        console.log('Trending calculation jobs scheduled');
    }


}

module.exports = new TrendingSongService();