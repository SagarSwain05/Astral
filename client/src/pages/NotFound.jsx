import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
      <motion.div
        className="max-w-lg w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="glass p-12">
          {/* Animated 404 */}
          <motion.div
            className="text-8xl font-bold mb-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              404
            </span>
          </motion.div>

          <motion.div
            className="text-6xl mb-6"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            🪨
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-3">Lost in Space</h1>
          <p className="text-white/50 mb-8">
            The page you're looking for has drifted out of orbit. It might have
            been moved, deleted, or never existed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/asteroids"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Browse Asteroids
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
