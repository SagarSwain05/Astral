import express from 'express';
import { Asteroid } from '../models/index.js';
import { cached } from '../services/cacheService.js';
import { runRangeFetch } from '../services/scheduler.js';
import { fetchAsteroidById } from '../services/nasaService.js';

const router = express.Router();

const SORTABLE_FIELDS = new Set([
    'closeApproachDate',
    'riskScore',
    'missDistanceKm',
    'missDistanceLunar',
    'relativeVelocityKmS',
    'estimatedDiameterMax',
    'name',
]);

const startOfUTCDay = (d) => {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const parseDay = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return isNaN(date.getTime()) ? null : date;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @route   GET /api/asteroids
// @desc    Get cached asteroids with filters (Sort & Filter Bar + Date Range Picker)
// @access  Public
router.get('/', async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'closeApproachDate',
            order = 'asc',
            riskCategory,
            hazardousOnly,
            minRiskScore,
            maxDistance,
            minDiameter,
            maxDiameter,
            minVelocity,
            maxVelocity,
            startDate,
            endDate,
            search,
        } = req.query;

        const query = {};

        if (riskCategory) {
            query.riskCategory = riskCategory;
        }

        if (hazardousOnly === 'true') {
            query.isPotentiallyHazardous = true;
        }

        if (minRiskScore) {
            query.riskScore = { $gte: parseInt(minRiskScore) };
        }

        if (maxDistance) {
            query.missDistanceLunar = { $lte: parseFloat(maxDistance) };
        }

        if (minDiameter || maxDiameter) {
            query.estimatedDiameterMax = {};
            if (minDiameter) query.estimatedDiameterMax.$gte = parseFloat(minDiameter);
            if (maxDiameter) query.estimatedDiameterMax.$lte = parseFloat(maxDiameter);
        }

        if (minVelocity || maxVelocity) {
            query.relativeVelocityKmS = {};
            if (minVelocity) query.relativeVelocityKmS.$gte = parseFloat(minVelocity);
            if (maxVelocity) query.relativeVelocityKmS.$lte = parseFloat(maxVelocity);
        }

        const start = parseDay(startDate);
        const end = parseDay(endDate);
        if (start || end) {
            query.closeApproachDate = {};
            if (start) query.closeApproachDate.$gte = start;
            if (end) {
                const endExclusive = new Date(end);
                endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
                query.closeApproachDate.$lt = endExclusive;
            }
        }

        if (search) {
            query.name = { $regex: escapeRegex(String(search).slice(0, 50)), $options: 'i' };
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const sortField = SORTABLE_FIELDS.has(sortBy) ? sortBy : 'closeApproachDate';
        const sortOptions = { [sortField]: order === 'desc' ? -1 : 1 };

        const [asteroids, total] = await Promise.all([
            Asteroid.find(query)
                .select('-raw_data')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Asteroid.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: asteroids,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasMore: skip + asteroids.length < total,
            },
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/asteroids/sync-range
// @desc    Pull a date window (max 7 days) from NASA into the cache
// @access  Public (NASA responses are cached, so repeat calls are cheap)
router.post('/sync-range', async (req, res, next) => {
    try {
        const start = parseDay(req.body?.startDate);
        const end = parseDay(req.body?.endDate) || start;

        if (!start) {
            return res.status(400).json({ success: false, message: 'startDate (YYYY-MM-DD) is required' });
        }

        const spanDays = Math.round((end - start) / 86400000);
        if (spanDays < 0 || spanDays > 6) {
            return res.status(400).json({ success: false, message: 'Date range must be between 1 and 7 days' });
        }

        const stats = await runRangeFetch(start, end);

        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/flybys
// @desc    Lightweight list for the 3D orbital view: every object whose close
//          approach falls within ±days of now, with JPL orbital elements
// @access  Public
router.get('/flybys', async (req, res, next) => {
    try {
        const days = Math.min(30, Math.max(1, parseInt(req.query.days) || 7));
        const data = await cached(`api:flybys:${days}`, 120, async () => {
            const now = Date.now();
            return Asteroid.find({
                closeApproachDate: {
                    $gte: new Date(now - days * 86400000),
                    $lte: new Date(now + days * 86400000),
                },
            })
                .select('neo_reference_id name isPotentiallyHazardous riskScore riskCategory estimatedDiameterMin estimatedDiameterMax closeApproachDate missDistanceKm missDistanceLunar relativeVelocityKmS absolute_magnitude_h orbit')
                .sort({ closeApproachDate: 1 })
                .limit(400)
                .lean();
        });
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/stats
// @desc    Get dashboard statistics
// @access  Public
router.get('/stats', async (req, res, next) => {
    try {
        const data = await cached('api:stats', 120, async () => {
            const today = startOfUTCDay(new Date());
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

            const [
                totalTracked,
                hazardousCount,
                todayApproaches,
                highRiskCount,
                closestToday,
                riskDistribution,
            ] = await Promise.all([
                Asteroid.countDocuments(),
                Asteroid.countDocuments({ isPotentiallyHazardous: true }),
                Asteroid.countDocuments({
                    closeApproachDate: { $gte: today, $lt: tomorrow },
                }),
                Asteroid.countDocuments({ riskCategory: 'high' }),
                Asteroid.findOne({
                    closeApproachDate: { $gte: today, $lt: tomorrow },
                })
                    .sort({ missDistanceKm: 1 })
                    .lean(),
                Asteroid.aggregate([
                    { $group: { _id: '$riskCategory', count: { $sum: 1 } } },
                ]),
            ]);

            return {
                totalTracked,
                hazardousCount,
                hazardous: hazardousCount,
                todayApproaches,
                highRiskCount,
                closestToday: closestToday ? {
                    name: closestToday.name,
                    distance: closestToday.missDistanceLunar?.toFixed(2) + ' LD',
                    distanceKm: Math.round(closestToday.missDistanceKm).toLocaleString() + ' km',
                    riskScore: closestToday.riskScore,
                } : null,
                riskDistribution: riskDistribution.reduce((acc, curr) => {
                    acc[curr._id || 'unknown'] = curr.count;
                    return acc;
                }, {}),
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/featured
// @desc    Asteroid of the Day — the most notable object approaching today
//          (highest risk score, falling back to the next upcoming approach)
// @access  Public
router.get('/featured', async (req, res, next) => {
    try {
        const data = await cached('api:featured', 600, async () => {
            const today = startOfUTCDay(new Date());
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

            let asteroid = await Asteroid.findOne({
                closeApproachDate: { $gte: today, $lt: tomorrow },
            })
                .select('-raw_data')
                .sort({ riskScore: -1, estimatedDiameterMax: -1 })
                .lean();

            if (!asteroid) {
                asteroid = await Asteroid.findOne({ closeApproachDate: { $gte: new Date() } })
                    .select('-raw_data')
                    .sort({ closeApproachDate: 1 })
                    .lean();
            }

            if (!asteroid) return null;

            const reasons = [];
            if (asteroid.isPotentiallyHazardous) reasons.push('Classified as potentially hazardous');
            if (asteroid.estimatedDiameterMax >= 300) reasons.push('Exceptionally large object');
            if (asteroid.missDistanceLunar <= 5) reasons.push('Passes within 5 lunar distances');
            if (asteroid.relativeVelocityKmS >= 20) reasons.push('Very high relative velocity');
            if (reasons.length === 0) reasons.push("Highest risk score among today's approaches");

            return { ...asteroid, reasons };
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/analytics
// @desc    Aggregates for the Analytics page (risk distribution, scatter, histograms)
// @access  Public
router.get('/analytics', async (req, res, next) => {
    try {
        const start = parseDay(req.query.startDate);
        const end = parseDay(req.query.endDate);
        const cacheKey = `api:analytics:${req.query.startDate || ''}:${req.query.endDate || ''}`;

        const data = await cached(cacheKey, 300, async () => {
            const match = {};
            if (start || end) {
                match.closeApproachDate = {};
                if (start) match.closeApproachDate.$gte = start;
                if (end) {
                    const endExclusive = new Date(end);
                    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
                    match.closeApproachDate.$lt = endExclusive;
                }
            }

            const [riskDistribution, daily, sizeBuckets, scatter, totals] = await Promise.all([
                Asteroid.aggregate([
                    { $match: match },
                    { $group: { _id: '$riskCategory', count: { $sum: 1 } } },
                ]),
                Asteroid.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$closeApproachDate' } },
                            total: { $sum: 1 },
                            hazardous: { $sum: { $cond: ['$isPotentiallyHazardous', 1, 0] } },
                            avgRisk: { $avg: '$riskScore' },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                Asteroid.aggregate([
                    { $match: match },
                    {
                        $bucket: {
                            groupBy: '$estimatedDiameterMax',
                            boundaries: [0, 25, 50, 100, 250, 500, 1000, 1e9],
                            default: 'unknown',
                            output: { count: { $sum: 1 } },
                        },
                    },
                ]),
                Asteroid.find(match)
                    .select('neo_reference_id name missDistanceLunar relativeVelocityKmS estimatedDiameterMax riskScore riskCategory isPotentiallyHazardous')
                    .sort({ closeApproachDate: 1 })
                    .limit(500)
                    .lean(),
                Asteroid.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            avgRisk: { $avg: '$riskScore' },
                            avgVelocity: { $avg: '$relativeVelocityKmS' },
                            maxDiameter: { $max: '$estimatedDiameterMax' },
                            minDistance: { $min: '$missDistanceLunar' },
                        },
                    },
                ]),
            ]);

            const bucketLabels = {
                0: '<25 m', 25: '25–50 m', 50: '50–100 m', 100: '100–250 m',
                250: '250–500 m', 500: '500 m–1 km', 1000: '>1 km', unknown: 'Unknown',
            };

            return {
                totals: totals[0] ? { ...totals[0], _id: undefined } : { count: 0 },
                riskDistribution: ['minimal', 'low', 'moderate', 'high'].map((cat) => ({
                    category: cat,
                    count: riskDistribution.find((r) => r._id === cat)?.count || 0,
                })),
                daily: daily.map((d) => ({
                    date: d._id,
                    total: d.total,
                    hazardous: d.hazardous,
                    avgRisk: Math.round(d.avgRisk || 0),
                })),
                sizeDistribution: sizeBuckets.map((b) => ({
                    range: bucketLabels[b._id] ?? String(b._id),
                    count: b.count,
                })),
                scatter: scatter.map((a) => ({
                    id: a.neo_reference_id,
                    name: a.name,
                    distance: Number((a.missDistanceLunar || 0).toFixed(2)),
                    velocity: Number((a.relativeVelocityKmS || 0).toFixed(2)),
                    diameter: Math.round(a.estimatedDiameterMax || 0),
                    riskScore: a.riskScore,
                    riskCategory: a.riskCategory,
                    hazardous: a.isPotentiallyHazardous,
                })),
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/today
// @desc    Get today's approaching asteroids
// @access  Public
router.get('/today', async (req, res, next) => {
    try {
        const today = startOfUTCDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const asteroids = await Asteroid.find({
            closeApproachDate: { $gte: today, $lt: tomorrow },
        })
            .select('-raw_data')
            .sort({ missDistanceKm: 1 })
            .lean();

        res.json({
            success: true,
            count: asteroids.length,
            data: asteroids,
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/hazardous/all
// @desc    Get all potentially hazardous asteroids
// @access  Public
router.get('/hazardous/all', async (req, res, next) => {
    try {
        const asteroids = await Asteroid.find({ isPotentiallyHazardous: true })
            .select('-raw_data')
            .sort({ riskScore: -1 })
            .lean();

        res.json({
            success: true,
            count: asteroids.length,
            data: asteroids,
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/:id/history
// @desc    Approach History Timeline — every recorded past & future Earth pass
// @access  Public
router.get('/:id/history', async (req, res, next) => {
    try {
        if (!/^\d+$/.test(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid asteroid id' });
        }

        const neo = await fetchAsteroidById(req.params.id);
        if (!neo) {
            return res.status(404).json({ success: false, message: 'Asteroid not found at NASA' });
        }

        const now = Date.now();
        const approaches = (neo.close_approach_data || [])
            .filter((a) => a.orbiting_body === 'Earth')
            .map((a) => {
                const date = new Date(a.epoch_date_close_approach || a.close_approach_date);
                return {
                    date: date.toISOString(),
                    missDistanceKm: parseFloat(a.miss_distance?.kilometers) || 0,
                    missDistanceLunar: parseFloat(a.miss_distance?.lunar) || 0,
                    velocityKmS: parseFloat(a.relative_velocity?.kilometers_per_second) || 0,
                    isFuture: date.getTime() > now,
                };
            });

        const closest = approaches.reduce(
            (best, a) => (!best || a.missDistanceKm < best.missDistanceKm ? a : best),
            null,
        );

        res.json({
            success: true,
            data: {
                id: neo.id,
                name: neo.name,
                firstObserved: neo.orbital_data?.first_observation_date,
                lastObserved: neo.orbital_data?.last_observation_date,
                orbitalPeriodDays: parseFloat(neo.orbital_data?.orbital_period) || null,
                totalApproaches: approaches.length,
                closestEver: closest,
                approaches,
            },
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/asteroids/:id
// @desc    Get single asteroid by neo_reference_id
// @access  Public
router.get('/:id', async (req, res, next) => {
    try {
        const asteroidDoc = await Asteroid.findOne({
            neo_reference_id: req.params.id,
        });

        if (!asteroidDoc) {
            return res.status(404).json({
                success: false,
                message: 'Asteroid not found',
            });
        }

        res.json({
            success: true,
            data: {
                ...asteroidDoc.toObject(),
                sizeComparison: asteroidDoc.getSizeComparison(),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
