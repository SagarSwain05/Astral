import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Eye,
  Trash2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
  Star,
  Bell,
} from "lucide-react";
import AsteroidCard from "../components/Asteroid/AsteroidCard";
import useAsteroidStore from "../stores/asteroidStore";
import useAuthStore from "../stores/authStore";

const Watchlist = () => {
  const { watchlist, fetchWatchlist, removeFromWatchlist, isLoading } =
    useAsteroidStore();
  const { isAuthenticated } = useAuthStore();
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWatchlist();
    }
  }, [isAuthenticated]);

  const handleRemove = async (asteroidId) => {
    setRemovingId(asteroidId);
    await removeFromWatchlist(asteroidId);
    setRemovingId(null);
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
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
              <Eye className="w-10 h-10 text-accent-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Your Watchlist
            </h1>
            <p className="text-white/50 mb-8">
              Sign in to track your favorite asteroids and receive alerts when
              they approach Earth.
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
              Your Watchlist
            </h1>
            <p className="text-white/50">
              {watchlist.length} asteroid{watchlist.length !== 1 ? "s" : ""}{" "}
              being tracked
            </p>
          </div>
          <button
            onClick={() => fetchWatchlist()}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-4 mb-8 flex items-center gap-4 border-l-4 border-accent-primary"
        >
          <Bell className="w-6 h-6 text-accent-primary flex-shrink-0" />
          <div>
            <p className="text-white font-medium">Real-time Alerts Enabled</p>
            <p className="text-white/50 text-sm">
              You'll receive notifications when watched asteroids make close
              approaches.
            </p>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && watchlist.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-space-700 flex items-center justify-center">
              <Eye className="w-8 h-8 text-white/30" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              No Asteroids Yet
            </h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Start tracking asteroids by clicking the eye icon on any asteroid
              card.
            </p>
            <Link to="/asteroids" className="btn-primary">
              Browse Asteroids
            </Link>
          </motion.div>
        )}

        {/* Watchlist Grid */}
        {!isLoading && watchlist.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {watchlist.map((asteroid, index) => (
              <motion.div
                key={asteroid.neo_reference_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <AsteroidCard asteroid={asteroid} index={0} />

                {/* Remove button overlay */}
                <motion.button
                  onClick={() => handleRemove(asteroid.neo_reference_id)}
                  disabled={removingId === asteroid.neo_reference_id}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-risk-high/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-risk-high"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {removingId === asteroid.neo_reference_id ?
                    <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
