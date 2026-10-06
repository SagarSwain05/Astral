import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Bell,
  Moon,
  Sun,
  Save,
  Loader2,
  CheckCircle,
  Camera,
  LogOut,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { Link, useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, isAuthenticated, logout, updateProfile } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile({ displayName: formData.displayName });
    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
              <User className="w-10 h-10 text-accent-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Your Profile</h1>
            <p className="text-white/50 mb-8">
              Sign in to view and manage your profile.
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
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
            Your Profile
          </h1>
          <p className="text-white/50">Manage your account and preferences</p>
        </motion.div>

        {/* Success Message */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 mb-6 flex items-center gap-3 border-l-4 border-green-500"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-white">Profile updated successfully!</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="glass p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="text-4xl font-bold text-space-900">
                    {user?.displayName?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 p-2 rounded-full bg-space-700 border border-white/10 hover:bg-space-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">
                {user?.displayName}
              </h2>
              <p className="text-white/50 text-sm mb-4">{user?.email}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-primary">
                    {user?.watched_asteroid_ids?.length || 0}
                  </p>
                  <p className="text-xs text-white/50">Watching</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-risk-moderate">0</p>
                  <p className="text-xs text-white/50">Alerts</p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full mt-4 btn-secondary flex items-center justify-center gap-2 text-risk-high hover:bg-risk-high/10"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Account Information */}
            <div className="glass p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">
                  Account Information
                </h3>
                {!isEditing ?
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-accent-primary hover:underline"
                  >
                    Edit
                  </button>
                : <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-white/50 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn-primary text-sm py-1.5 px-4 flex items-center gap-2"
                    >
                      {isSaving ?
                        <Loader2 className="w-4 h-4 animate-spin" />
                      : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </div>
                }
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/50 mb-2">
                    Display Name
                  </label>
                  {isEditing ?
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          displayName: e.target.value,
                        }))
                      }
                      className="input-field"
                    />
                  : <div className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl">
                      <User className="w-5 h-5 text-white/40" />
                      <span className="text-white">{user?.displayName}</span>
                    </div>
                  }
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl">
                    <Mail className="w-5 h-5 text-white/40" />
                    <span className="text-white">{user?.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-white/40" />
                    <span className="text-white">
                      {formatDate(user?.createdAt)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">
                    Role
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-space-800/50 rounded-xl">
                    <Shield className="w-5 h-5 text-white/40" />
                    <span className="text-white capitalize">
                      {user?.role || "User"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="glass p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/watchlist"
                  className="p-4 bg-space-800/50 rounded-xl hover:bg-space-700/50 transition-colors"
                >
                  <p className="font-medium text-white">Your Watchlist</p>
                  <p className="text-sm text-white/50">
                    Manage tracked asteroids
                  </p>
                </Link>
                <Link
                  to="/alerts"
                  className="p-4 bg-space-800/50 rounded-xl hover:bg-space-700/50 transition-colors"
                >
                  <p className="font-medium text-white">Alert History</p>
                  <p className="text-sm text-white/50">
                    View all notifications
                  </p>
                </Link>
                <Link
                  to="/settings"
                  className="p-4 bg-space-800/50 rounded-xl hover:bg-space-700/50 transition-colors"
                >
                  <p className="font-medium text-white">Settings</p>
                  <p className="text-sm text-white/50">Configure preferences</p>
                </Link>
                <Link
                  to="/"
                  className="p-4 bg-space-800/50 rounded-xl hover:bg-space-700/50 transition-colors"
                >
                  <p className="font-medium text-white">Dashboard</p>
                  <p className="text-sm text-white/50">Back to home</p>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
