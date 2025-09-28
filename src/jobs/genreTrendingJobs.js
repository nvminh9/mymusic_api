const cron = require('node-cron');
const trendingSongService = require('../services/trendingSongService');
const genreTrendingService = require('../services/genreTrendingService');
const logger = require('../utils/logger');

class GenreTrendingJobs {

    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    /**
     * Start all trending calculation jobs
     */
    startAllJobs() {
        this.startOverallTrendingJobs();
        this.startGenreTrendingJobs();
        this.startCleanupJobs();
        this.startAnalyticsJobs();
        
        this.isRunning = true;
        logger.info('All enhanced trending jobs started');
    }

    /**
     * Overall trending jobs (existing)
     */
    startOverallTrendingJobs() {
        // Daily overall trending - every hour
        const dailyOverallJob = cron.schedule('0 * * * *', async () => {
            try {
                logger.info('Starting daily overall trending calculation...');
                await trendingSongService.updateTrendingSongs('daily');
                logger.info('Daily overall trending updated');
            } catch (error) {
                logger.error('Error updating daily overall trending:', error);
            }
        }, { scheduled: false });

        // Weekly overall trending - every 4 hours
        const weeklyOverallJob = cron.schedule('0 */4 * * *', async () => {
            try {
                logger.info('Starting weekly overall trending calculation...');
                await trendingSongService.updateTrendingSongs('weekly');
                logger.info('Weekly overall trending updated');
            } catch (error) {
                logger.error('Error updating weekly overall trending:', error);
            }
        }, { scheduled: false });

        this.jobs.set('dailyOverall', dailyOverallJob);
        this.jobs.set('weeklyOverall', weeklyOverallJob);
    }

    /**
     * Genre-specific trending jobs
     */
    startGenreTrendingJobs() {
        // Daily genre trending - every 2 hours (offset from overall)
        const dailyGenreJob = cron.schedule('30 */2 * * *', async () => {
            try {
                logger.info('Starting daily genre trending calculation...');
                await genreTrendingService.updateGenreTrending('daily');
                logger.info('Daily genre trending updated');
            } catch (error) {
                logger.error('Error updating daily genre trending:', error);
            }
        }, { scheduled: false });

        // Weekly genre trending - every 6 hours
        const weeklyGenreJob = cron.schedule('0 */6 * * *', async () => {
            try {
                logger.info('Starting weekly genre trending calculation...');
                await genreTrendingService.updateGenreTrending('weekly');
                logger.info('Weekly genre trending updated');
            } catch (error) {
                logger.error('Error updating weekly genre trending:', error);
            }
        }, { scheduled: false });

        // Monthly genre trending - twice daily
        const monthlyGenreJob = cron.schedule('0 6,18 * * *', async () => {
            try {
                logger.info('Starting monthly genre trending calculation...');
                await genreTrendingService.updateGenreTrending('monthly');
                logger.info('Monthly genre trending updated');
            } catch (error) {
                logger.error('Error updating monthly genre trending:', error);
            }
        }, { scheduled: false });

        // Yearly genre trending - daily at 4 AM
        const yearlyGenreJob = cron.schedule('0 4 * * *', async () => {
            try {
                logger.info('Starting yearly genre trending calculation...');
                await genreTrendingService.updateGenreTrending('yearly');
                logger.info('Yearly genre trending updated');
            } catch (error) {
                logger.error('Error updating yearly genre trending:', error);
            }
        }, { scheduled: false });

        this.jobs.set('dailyGenre', dailyGenreJob);
        this.jobs.set('weeklyGenre', weeklyGenreJob);
        this.jobs.set('monthlyGenre', monthlyGenreJob);
        this.jobs.set('yearlyGenre', yearlyGenreJob);
    }

    /**
     * Cleanup and maintenance jobs
     */
    startCleanupJobs() {
        // Clean old trending data - daily at 5 AM
        const cleanupJob = cron.schedule('0 5 * * *', async () => {
            try {
                logger.info('Starting trending data cleanup...');
                await this.cleanupOldTrendingData();
                await this.optimizeDatabase();
                logger.info('Trending data cleanup completed');
            } catch (error) {
                logger.error('Error during cleanup:', error);
            }
        }, { scheduled: false });

        this.jobs.set('cleanup', cleanupJob);
    }

    /**
     * Analytics and reporting jobs
     */
    startAnalyticsJobs() {
        // Generate genre analytics report - daily at 6 AM
        const analyticsJob = cron.schedule('0 6 * * *', async () => {
            try {
                logger.info('Generating genre analytics report...');
                await this.generateGenreAnalyticsReport();
                logger.info('Genre analytics report generated');
            } catch (error) {
                logger.error('Error generating analytics report:', error);
            }
        }, { scheduled: false });

        // Update genre performance metrics - every 4 hours
        const metricsJob = cron.schedule('0 */4 * * *', async () => {
            try {
                logger.info('Updating genre performance metrics...');
                await this.updateGenreMetrics();
                logger.info('Genre performance metrics updated');
            } catch (error) {
                logger.error('Error updating genre metrics:', error);
            }
        }, { scheduled: false });

        this.jobs.set('analytics', analyticsJob);
        this.jobs.set('metrics', metricsJob);
    }

    /**
     * Clean up old trending data
     */
    async cleanupOldTrendingData() {
        const { TrendingSong } = require('../app/models/sequelize');
        const { Op } = require('sequelize');

        const retentionPeriods = {
            daily: 30,    // Keep 30 days
            weekly: 52,   // Keep 52 weeks  
            monthly: 24,  // Keep 24 months
            yearly: 5     // Keep 5 years
        };

        let totalDeleted = 0;

        for (const [period, retentionDays] of Object.entries(retentionPeriods)) {
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
            
            const deletedCount = await TrendingSong.destroy({
                where: {
                    period,
                    calculatedAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            totalDeleted += deletedCount;
            logger.info(`Cleaned up ${deletedCount} old ${period} trending records`);
        }

        return totalDeleted;
    }

    /**
     * Optimize database performance
     */
    async optimizeDatabase() {
        const { sequelize } = require('../app/models/sequelize');

        try {
            // Analyze trending tables
            await sequelize.query('ANALYZE "trendingSong";');
            
            // Reindex for better performance
            await sequelize.query('REINDEX TABLE "trendingSong";');
            
            logger.info('Database optimization completed');
        } catch (error) {
            logger.error('Database optimization failed:', error);
        }
    }

    /**
     * Generate daily genre analytics report
     */
    async generateGenreAnalyticsReport() {
        try {
            const period = 'daily';
            
            // Get genre comparison data
            const genreComparison = await genreTrendingService.compareGenreTrending(period);
            
            // Get trending summary
            const genreSummary = await genreTrendingService.getGenreTrendingSummary(period, 20);
            
            // Calculate insights
            const insights = this.calculateGenreInsights(genreComparison, genreSummary);
            
            const report = {
                date: new Date().toISOString().split('T')[0],
                period,
                summary: {
                    totalGenres: genreComparison.length,
                    mostDominantGenre: genreComparison[0]?.genreName || 'N/A',
                    avgSongsPerGenre: (genreComparison.reduce((sum, g) => sum + g.songCount, 0) / genreComparison.length).toFixed(2)
                },
                topPerformingGenres: genreComparison.slice(0, 5),
                insights,
                generatedAt: new Date().toISOString()
            };

            // Store report (you can save to database or file)
            await this.storeAnalyticsReport(report);
            
            logger.info('Genre analytics report generated successfully');
            return report;
        } catch (error) {
            logger.error('Error generating genre analytics report:', error);
            throw error;
        }
    }

    /**
     * Calculate genre insights
     */
    calculateGenreInsights(genreComparison, genreSummary) {
        const insights = [];

        // Find fastest growing genre
        const sortedByGrowth = genreComparison.sort((a, b) => b.dominanceScore - a.dominanceScore);
        if (sortedByGrowth.length > 0) {
            insights.push({
                type: 'growth',
                message: `${sortedByGrowth[0].genreName} is showing the strongest performance with ${sortedByGrowth[0].songCount} trending songs`,
                data: sortedByGrowth[0]
            });
        }

        // Find emerging genres (genres with high average scores but few songs)
        const emergingGenres = genreComparison.filter(g => 
            g.songCount < 10 && parseFloat(g.avgScore) > 50
        );
        
        if (emergingGenres.length > 0) {
            insights.push({
                type: 'emerging',
                message: `${emergingGenres[0].genreName} is an emerging genre with high engagement`,
                data: emergingGenres[0]
            });
        }

        // Find oversaturated genres
        const oversaturated = genreComparison.filter(g => g.songCount > 50);
        if (oversaturated.length > 0) {
            insights.push({
                type: 'saturation',
                message: `${oversaturated[0].genreName} has high competition with ${oversaturated[0].songCount} trending songs`,
                data: oversaturated[0]
            });
        }

        return insights;
    }

    /**
     * Store analytics report
     */
    async storeAnalyticsReport(report) {
        // You can implement storage to database or file system
        // For now, just log the key metrics
        logger.info('Analytics Report Summary:', {
            date: report.date,
            totalGenres: report.summary.totalGenres,
            dominantGenre: report.summary.mostDominantGenre,
            insights: report.insights.length
        });
    }

    /**
     * Update genre performance metrics
     */
    async updateGenreMetrics() {
        try {
            // Update cached genre statistics
            const periods = ['daily', 'weekly'];
            
            for (const period of periods) {
                const comparison = await genreTrendingService.compareGenreTrending(period);
                
                // Cache the results for quick API access
                await this.cacheGenreMetrics(period, comparison);
            }
            
            logger.info('Genre metrics updated successfully');
        } catch (error) {
            logger.error('Error updating genre metrics:', error);
        }
    }

    /**
     * Cache genre metrics for quick access
     */
    async cacheGenreMetrics(period, comparison) {
        // If you're using Redis
        const redis = require('../utils/cacheManager').redis;
        
        try {
            const cacheKey = `genre-metrics:${period}`;
            await redis.setEx(cacheKey, 14400, JSON.stringify({
                data: comparison,
                cachedAt: new Date().toISOString()
            })); // Cache for 4 hours
        } catch (error) {
            logger.error('Error caching genre metrics:', error);
        }
    }

    /**
     * Start all jobs with proper scheduling
     */
    startWithScheduling() {
        for (const [jobName, job] of this.jobs) {
            job.start();
            logger.info(`Started ${jobName} trending job`);
        }
    }

    /**
     * Stop all jobs
     */
    stopAllJobs() {
        for (const [jobName, job] of this.jobs) {
            job.stop();
            logger.info(`Stopped ${jobName} trending job`);
        }
        this.jobs.clear();
        this.isRunning = false;
        logger.info('All enhanced trending jobs stopped');
    }

    /**
     * Get comprehensive job status
     */
    getJobStatus() {
        const status = {
            isRunning: this.isRunning,
            totalJobs: this.jobs.size,
            jobs: {}
        };
        
        for (const [jobName, job] of this.jobs) {
        status.jobs[jobName] = {
            running: job.running,
            scheduled: true
        };
        }
        
        return status;
    }

    /**
     * Force run specific job category
     */
    async forceRunJobCategory(category) {
        switch (category) {
        case 'overall':
            await trendingSongService.updateTrendingSongs('daily');
            await trendingSongService.updateTrendingSongs('weekly');
            break;
        case 'genre':
            await genreTrendingService.updateGenreTrending('daily');
            await genreTrendingService.updateGenreTrending('weekly');
            break;
        case 'cleanup':
            await this.cleanupOldTrendingData();
            break;
        case 'analytics':
            await this.generateGenreAnalyticsReport();
            break;
        default:
            throw new Error(`Unknown job category: ${category}`);
        }
    }
}

module.exports = new GenreTrendingJobs();