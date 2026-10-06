import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Check,
  AlertTriangle,
  Info,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  Filter,
  X,
} from "lucide-react";
import useAlertStore from "../stores/alertStore";
import useAuthStore from "../stores/authStore";
import { Link } from "react-router-dom";

const Alerts = () => {
  const {
    alerts,
    unreadCount,
    fetchAlerts,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useAlertStore();
  const { isAuthenticated } = useAuthStore();
  const [filter, setFilter] = useState("all"); // all, unread, high-risk

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated]);

  const getAlertIcon = (type) => {
    switch (type) {
      case "CLOSE_APPROACH":
        return AlertTriangle;
      case "HIGH_RISK":
        return AlertTriangle;
      case "WATCHLIST":
        return Bell;
      default:
        return Info;
    }
  };

  const getAlertColor = (type, isRead) => {
    if (isRead) return "text-white/30";
    switch (type) {
      case "CLOSE_APPROACH":
        return "text-risk-moderate";
      case "HIGH_RISK":
        return "text-risk-high";
      case "WATCHLIST":
        return "text-accent-primary";
      default:
        return "text-white";
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "unread") return !alert.isRead;
    if (filter === "high-risk") return alert.type === "HIGH_RISK";
    return true;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 sm:p-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-risk-moderate/20 to-risk-high/20 flex items-center justify-center">
              <Bell className="w-10 h-10 text-risk-moderate" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Asteroid Alerts
            </h1>
            <p className="text-white/50 mb-8">
              Sign in to receive real-time notifications about close approaches
              and high-risk asteroids.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/login" className="btn-primary">
                Sign In
              </Link>
              <Link to="/register" className="btn-secondary">
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-risk-moderate" />
              Alerts
              {unreadCount > 0 && (
                <span className="text-lg px-3 py-1 rounded-full bg-risk-high/20 text-risk-high">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-white/50">
              Stay informed about asteroid activity
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-secondary flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark All Read
              </button>
            )}
            <button
              onClick={() => fetchAlerts()}
              disabled={isLoading}
              className="btn-ghost p-2.5"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {[
            { id: "all", label: "All Alerts" },
            { id: "unread", label: "Unread" },
            { id: "high-risk", label: "High Risk" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f.id ?
                  "bg-accent-primary text-space-900"
                : "bg-space-700/50 text-white/70 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-space-700 flex items-center justify-center">
              <BellOff className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Alerts</h2>
            <p className="text-white/50 max-w-md mx-auto">
              {filter === "all" ?
                "You're all caught up! We'll notify you when there's asteroid activity."
              : "No alerts match this filter."}
            </p>
          </motion.div>
        )}

        {/* Alerts List */}
        {!isLoading && filteredAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {filteredAlerts.map((alert, index) => {
                const Icon = getAlertIcon(alert.type);
                const iconColor = getAlertColor(alert.type, alert.isRead);

                return (
                  <motion.div
                    key={alert._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className={`glass p-4 flex items-start gap-4 cursor-pointer hover:bg-white/5 transition-colors ${
                      !alert.isRead ? "border-l-4 border-accent-primary" : ""
                    }`}
                    onClick={() => !alert.isRead && markAsRead(alert._id)}
                  >
                    <div className={`p-2 rounded-lg bg-space-700 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={`font-medium ${alert.isRead ? "text-white/50" : "text-white"}`}
                          >
                            {alert.title || "Alert"}
                          </p>
                          <p
                            className={`text-sm mt-1 ${alert.isRead ? "text-white/30" : "text-white/60"}`}
                          >
                            {alert.message}
                          </p>
                        </div>
                        <span className="text-xs text-white/40 whitespace-nowrap">
                          {formatDate(alert.createdAt)}
                        </span>
                      </div>
                      {alert.asteroidId && (
                        <Link
                          to={`/asteroid/${alert.asteroidId}`}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-accent-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Asteroid →
                        </Link>
                      )}
                    </div>
                    {!alert.isRead && (
                      <div className="w-2 h-2 rounded-full bg-accent-primary flex-shrink-0 mt-2" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
