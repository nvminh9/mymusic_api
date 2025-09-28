const cron = require('node-cron');
const trendingSongService = require('../services/trendingSongService');
const logger = require('../utils/logger');

class TrendingJobs {

    constructor() {
        this.jobs = new Map();
    }

    /**
     * Daily trending - Update every hour
     */
    startDailyTrendingJob() {
        const job = cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Starting daily trending calculation...');
            const result = await trendingSongService.updateTrendingSongs('daily');
            logger.info(`Daily trending updated: ${result.length} songs`);
        } catch (error) {
            logger.error('Error updating daily trending:', error);
        }
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.set('daily', job);
        logger.info('Daily trending job scheduled (every hour)');
    }

    /**
     * Weekly trending - Update every 4 hours
     */
    startWeeklyTrendingJob() {
        const job = cron.schedule('0 */4 * * *', async () => {
        try {
            logger.info('Starting weekly trending calculation...');
            const result = await trendingSongService.updateTrendingSongs('weekly');
            logger.info(`Weekly trending updated: ${result.length} songs`);
        } catch (error) {
            logger.error('Error updating weekly trending:', error);
        }
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.set('weekly', job);
        logger.info('Weekly trending job scheduled (every 4 hours)');
    }

    /**
     * Monthly trending - Update every 12 hours
     */
    startMonthlyTrendingJob() {
        const job = cron.schedule('0 */12 * * *', async () => {
        try {
            logger.info('Starting monthly trending calculation...');
            const result = await trendingSongService.updateTrendingSongs('monthly');
            logger.info(`Monthly trending updated: ${result.length} songs`);
        } catch (error) {
            logger.error('Error updating monthly trending:', error);
        }
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.set('monthly', job);
        logger.info('Monthly trending job scheduled (every 12 hours)');
    }

    /**
     * Yearly trending - Update daily at 2 AM
     */
    startYearlyTrendingJob() {
        const job = cron.schedule('0 2 * * *', async () => {
        try {
            logger.info('Starting yearly trending calculation...');
            const result = await trendingSongService.updateTrendingSongs('yearly');
            logger.info(`Yearly trending updated: ${result.length} songs`);
        } catch (error) {
            logger.error('Error updating yearly trending:', error);
        }
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.set('yearly', job);
        logger.info('Yearly trending job scheduled (daily at 2 AM)');
    }

    /**
     * Cleanup old trending data - Run daily at 3 AM
     */
    startCleanupJob() {
        const job = cron.schedule('0 3 * * *', async () => {
        try {
            logger.info('Starting trending data cleanup...');
            await this.cleanupOldTrendingData();
            logger.info('Trending data cleanup completed');
        } catch (error) {
            logger.error('Error during trending data cleanup:', error);
        }
        }, {
            scheduled: true,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.set('cleanup', job);
        logger.info('Cleanup job scheduled (daily at 3 AM)');
    }

    /**
     * Clean up old trending data to save space
     */
    async cleanupOldTrendingData() {
        const { TrendingSong } = require('../app/models/sequelize');
        const { Op } = require('sequelize');

        const retentionPeriods = {
            daily: 30,    // Keep 30 days of daily data
            weekly: 52,   // Keep 52 weeks of weekly data
            monthly: 24,  // Keep 24 months of monthly data
            yearly: 5     // Keep 5 years of yearly data
        };

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

        logger.info(`Cleaned up ${deletedCount} old ${period} trending records`);
        }
    }

    /**
     * Start all trending calculation jobs
     */
    startAllJobs() {
        this.startDailyTrendingJob();
        this.startWeeklyTrendingJob();
        this.startMonthlyTrendingJob();
        this.startYearlyTrendingJob();
        this.startCleanupJob();
        
        logger.info('All trending jobs started');
    }

    /**
     * Stop a specific job
     */
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            this.jobs.delete(jobName);
            logger.info(`Stopped ${jobName} trending job`);
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
        logger.info('All trending jobs stopped');
    }

    /**
     * Get job status
     */
    getJobStatus() {
        const status = {};
        for (const [jobName, job] of this.jobs) {
            status[jobName] = {
                running: job.running,
                scheduled: true
            };
        }
        return status;
    }

    /**
     * Force run a specific job (for testing)
     */
    async forceRunJob(jobName) {
        switch (jobName) {
            case 'daily':
                return await trendingSongService.updateTrendingSongs('daily');
            case 'weekly':
                return await trendingSongService.updateTrendingSongs('weekly');
            case 'monthly':
                return await trendingSongService.updateTrendingSongs('monthly');
            case 'yearly':
                return await trendingSongService.updateTrendingSongs('yearly');
            case 'cleanup':
                return await this.cleanupOldTrendingData(); 
        default:
            throw new Error(`Unknown job: ${jobName}`);
        }
    }
}

module.exports = new TrendingJobs();