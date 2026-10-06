/**
 * Scheduler Service
 * Manages cron jobs for periodic data fetching and alert checking
 */

import cron from 'node-cron';
import { fetchTodayNeos, fetchWeekNeos, fetchRangeNeos } from './nasaService.js';
import { cacheDelPattern } from './cacheService.js';
import { calculateRiskScore } from './riskEngine.js';
import { checkAndDispatchAlerts, broadcastNewHazardousAsteroid } from './alertDispatcher.js';
import { Asteroid } from '../models/index.js';

let io = null;

// Last successful NASA sync, exposed via GET /api/status
const syncState = {
    lastSyncAt: null,
    lastSyncStats: null,
    syncing: false,
};

export const getSyncState = () => ({ ...syncState });

/**
 * Process and store asteroids from NASA data
 * @param {Array} neoData - Array of asteroid objects from NASA
 * @returns {Object} Stats about processed data
 */
export const processAndStoreAsteroids = async (neoData) => {
    const stats = {
        total: neoData.length,
        processed: 0,
        hazardous: 0,
        highRisk: 0,
        errors: 0,
    };

    console.log(`📊 Processing ${neoData.length} asteroids...`);

    for (const neo of neoData) {
        try {
            // Calculate risk score
            const risk = calculateRiskScore(neo);

            // Upsert to database
            const asteroid = await Asteroid.upsertFromNASA(neo, risk.score, risk.category);

            stats.processed++;

            if (asteroid.isPotentiallyHazardous) {
                stats.hazardous++;
            }

            if (risk.category === 'high') {
                stats.highRisk++;
                // Broadcast high-risk asteroids
                if (io) {
                    broadcastNewHazardousAsteroid(asteroid, io);
                }
            }
        } catch (error) {
            console.error(`❌ Failed to process asteroid ${neo.name}:`, error.message);
            stats.errors++;
        }
    }

    console.log(`✅ Processed: ${stats.processed}/${stats.total} | Hazardous: ${stats.hazardous} | High Risk: ${stats.highRisk}`);

    // Derived API responses (stats, analytics, featured) are now stale
    await cacheDelPattern('api:');

    if (stats.processed > 0) {
        syncState.lastSyncAt = new Date();
        syncState.lastSyncStats = stats;
    }

    return stats;
};

/**
 * Fetch and process today's asteroid data
 */
export const runDailyFetch = async () => {
    console.log('\n' + '='.repeat(50));
    console.log('🌅 Running daily asteroid data fetch...');
    console.log('='.repeat(50));

    try {
        // Fetch today's data
        const todayNeos = await fetchTodayNeos();

        if (todayNeos.length === 0) {
            console.log('⚠️ No asteroids fetched for today');
            return;
        }

        // Process and store
        const stats = await processAndStoreAsteroids(todayNeos);

        // Emit stats to connected clients
        if (io) {
            io.emit('DAILY_UPDATE', {
                type: 'daily_fetch_complete',
                stats,
                timestamp: new Date(),
            });
        }

        // Check for alerts
        await checkAndDispatchAlerts(io, 1);

        console.log('✅ Daily fetch complete!\n');
    } catch (error) {
        console.error('❌ Daily fetch failed:', error);
    }
};

/**
 * Fetch and process weekly asteroid data
 */
export const runWeeklyFetch = async () => {
    console.log('\n' + '='.repeat(50));
    console.log('📅 Running weekly asteroid data fetch...');
    console.log('='.repeat(50));

    try {
        const weekNeos = await fetchWeekNeos();

        if (weekNeos.length === 0) {
            console.log('⚠️ No asteroids fetched for the week');
            return;
        }

        const stats = await processAndStoreAsteroids(weekNeos);

        // Emit stats
        if (io) {
            io.emit('WEEKLY_UPDATE', {
                type: 'weekly_fetch_complete',
                stats,
                timestamp: new Date(),
            });
        }

        // Check for alerts with 7-day lookahead
        await checkAndDispatchAlerts(io, 7);

        console.log('✅ Weekly fetch complete!\n');
    } catch (error) {
        console.error('❌ Weekly fetch failed:', error);
    }
};

/**
 * Fetch and store an arbitrary date range (max 7 days per NASA request)
 * Used by the Date Range Picker to backfill historical / future windows.
 */
export const runRangeFetch = async (startDate, endDate) => {
    const neos = await fetchRangeNeos(startDate, endDate);
    if (neos.length === 0) {
        return { total: 0, processed: 0, hazardous: 0, highRisk: 0, errors: 0 };
    }
    return processAndStoreAsteroids(neos);
};

/**
 * Boot-time sync: the rolling week ahead plus the previous 7 days, so the
 * feed, analytics and history views are populated right after a cold start.
 */
export const runStartupSync = async () => {
    syncState.syncing = true;
    try {
        await runWeeklyFetch();
        const end = new Date();
        end.setUTCDate(end.getUTCDate() - 1);
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 6);
        console.log('📜 Backfilling the previous 7 days...');
        await runRangeFetch(start, end);
    } catch (error) {
        console.error('❌ Startup sync failed:', error);
    } finally {
        syncState.syncing = false;
    }
};

/**
 * Initialize cron jobs
 * @param {Object} socketIO - Socket.IO instance
 */
export const initScheduler = (socketIO) => {
    io = socketIO;

    console.log('⏰ Initializing scheduler...');

    // Daily fetch at 00:01 every day
    cron.schedule('1 0 * * *', () => {
        console.log('⏰ Cron: Daily fetch triggered');
        runDailyFetch();
    }, {
        timezone: 'UTC',
    });

    // Rolling 7-day fetch every day at 00:30 (keeps the week-ahead feed full)
    cron.schedule('30 0 * * *', () => {
        console.log('⏰ Cron: Weekly fetch triggered');
        runWeeklyFetch();
    }, {
        timezone: 'UTC',
    });

    // Check for alerts every 6 hours
    cron.schedule('0 */6 * * *', () => {
        console.log('⏰ Cron: Alert check triggered');
        checkAndDispatchAlerts(io, 1);
    }, {
        timezone: 'UTC',
    });

    console.log('✅ Scheduler initialized with cron jobs:');
    console.log('   📆 Daily fetch: 00:01 UTC');
    console.log('   📅 7-day fetch: 00:30 UTC');
    console.log('   🔔 Alert check: Every 6 hours');
};

/**
 * Manual trigger for fetching data (for API endpoint)
 */
export const triggerManualFetch = async (type = 'today') => {
    if (type === 'week') {
        return await runWeeklyFetch();
    }
    return await runDailyFetch();
};

export default {
    initScheduler,
    runDailyFetch,
    runWeeklyFetch,
    runRangeFetch,
    processAndStoreAsteroids,
    triggerManualFetch,
};
