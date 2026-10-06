import express from "express";
import mongoose from "mongoose";
import { User, Broadcast } from "../models/index.js";
import { getNasaMetrics } from "../services/nasaService.js";
import { getCacheStatus } from "../services/cacheService.js";
import auth from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import { triggerManualFetch } from "../services/scheduler.js";
import { fetchTodayNeos, fetchAsteroidById } from "../services/nasaService.js";
import {
  calculateRiskScore,
  getRiskLevelInfo,
} from "../services/riskEngine.js";

const router = express.Router();

// @route   POST /api/admin/fetch
// @desc    Manually trigger asteroid data fetch
// @access  Private (Admin only)
router.post("/fetch", auth, adminAuth, async (req, res, next) => {
  try {
    const { type = "today" } = req.body;

    console.log(
      `🔄 Manual fetch triggered by ${req.user.email} (type: ${type})`,
    );

    // Run the fetch in background
    triggerManualFetch(type);

    res.json({
      success: true,
      message: `${type === "week" ? "Weekly" : "Daily"} fetch initiated. Check server logs for progress.`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/test-nasa
// @desc    Test NASA API connection
// @access  Private (Admin only)
router.get("/test-nasa", auth, adminAuth, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const neos = await fetchTodayNeos();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: "NASA API connection successful",
      data: {
        asteroidsFound: neos.length,
        responseTimeMs: duration,
        sampleAsteroid:
          neos[0] ?
            {
              name: neos[0].name,
              id: neos[0].neo_reference_id || neos[0].id,
              isHazardous: neos[0].is_potentially_hazardous_asteroid,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/test-risk/:id
// @desc    Test risk calculation for a specific asteroid
// @access  Private (Admin only)
router.get("/test-risk/:id", auth, adminAuth, async (req, res, next) => {
  try {
    const asteroid = await fetchAsteroidById(req.params.id);

    if (!asteroid) {
      return res.status(404).json({
        success: false,
        message: "Asteroid not found",
      });
    }

    const risk = calculateRiskScore(asteroid);
    const levelInfo = getRiskLevelInfo(risk.category);

    res.json({
      success: true,
      data: {
        asteroid: {
          name: asteroid.name,
          id: asteroid.neo_reference_id || asteroid.id,
          isHazardous: asteroid.is_potentially_hazardous_asteroid,
        },
        risk: {
          ...risk,
          levelInfo,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/stats
// @desc    Get system stats
// @access  Private (Admin only)
router.get("/stats", auth, adminAuth, async (req, res, next) => {
  try {
    const { Asteroid, User, Alert } = await import("../models/index.js");

    const [
      totalAsteroids,
      hazardousCount,
      totalUsers,
      totalAlerts,
      unreadAlerts,
    ] = await Promise.all([
      Asteroid.countDocuments(),
      Asteroid.countDocuments({ isPotentiallyHazardous: true }),
      User.countDocuments(),
      Alert.countDocuments(),
      Alert.countDocuments({ isRead: false }),
    ]);

    res.json({
      success: true,
      data: {
        asteroids: {
          total: totalAsteroids,
          hazardous: hazardousCount,
        },
        users: totalUsers,
        alerts: {
          total: totalAlerts,
          unread: unreadAlerts,
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/health
// @desc    System Health Console — API limits, latency, active users, infra status
// @access  Private (Admin only)
router.get("/health", auth, adminAuth, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

    const dbStart = Date.now();
    let dbPingMs = null;
    try {
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - dbStart;
    } catch {
      dbPingMs = null;
    }

    const [chatSockets, recentlyActive] = await Promise.all([
      io ? io.of("/chat").fetchSockets() : [],
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const mem = process.memoryUsage();

    res.json({
      success: true,
      data: {
        server: {
          uptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
          memoryMb: {
            rss: Math.round(mem.rss / 1048576),
            heapUsed: Math.round(mem.heapUsed / 1048576),
            heapTotal: Math.round(mem.heapTotal / 1048576),
          },
        },
        database: {
          status: dbStates[mongoose.connection.readyState] || "unknown",
          pingMs: dbPingMs,
        },
        cache: getCacheStatus(),
        nasa: getNasaMetrics(),
        realtime: {
          connectedClients: io ? io.engine.clientsCount : 0,
          chatUsers: chatSockets.length,
          activeUsers24h: recentlyActive,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/admin/broadcast
// @desc    Admin Alert Dispatch — push a (simulated) national alert to every client
// @access  Private (Admin only)
router.post("/broadcast", auth, adminAuth, async (req, res, next) => {
  try {
    const { title, message, level = "red", asteroidId, isSimulation = true } =
      req.body || {};

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }
    if (!["info", "warning", "red"].includes(level)) {
      return res.status(400).json({ success: false, message: "Invalid level" });
    }

    const io = req.app.get("io");

    const broadcast = await Broadcast.create({
      title: title.trim(),
      message: message.trim(),
      level,
      asteroidId: asteroidId || undefined,
      isSimulation: Boolean(isSimulation),
      issuedBy: req.user.id,
      issuedByName: req.user.displayName,
      recipients: io ? io.engine.clientsCount : 0,
    });

    if (io) {
      io.emit("ADMIN_BROADCAST", {
        id: broadcast._id,
        level: broadcast.level,
        title: broadcast.title,
        message: broadcast.message,
        asteroidId: broadcast.asteroidId,
        isSimulation: broadcast.isSimulation,
        issuedBy: broadcast.issuedByName,
        timestamp: broadcast.createdAt,
      });
    }

    console.log(`📢 ${level.toUpperCase()} broadcast by ${req.user.email}: ${title}`);

    res.status(201).json({ success: true, data: broadcast });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/broadcasts
// @desc    Broadcast history
// @access  Private (Admin only)
router.get("/broadcasts", auth, adminAuth, async (req, res, next) => {
  try {
    const broadcasts = await Broadcast.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users
// @desc    List users for role management
// @access  Private (Admin only)
router.get("/users", auth, adminAuth, async (req, res, next) => {
  try {
    const users = await User.find()
      .select("email displayName role lastLogin createdAt watched_asteroid_ids")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        watchlistCount: u.watched_asteroid_ids?.length || 0,
        watched_asteroid_ids: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Change a user's role (user | researcher | admin)
// @access  Private (Admin only)
router.put("/users/:id/role", auth, adminAuth, async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!["user", "researcher", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    if (String(req.user.id) === req.params.id && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true },
    ).select("email displayName role");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
