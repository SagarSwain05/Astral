import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { Link, useNavigate } from "react-router-dom";

const Settings = () => {
  const { user, isAuthenticated, updateSettings, deleteAccount, logout } =
    useAuthStore();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [settings, setSettings] = useState({
    // Notifications
    emailAlerts: true,
    pushNotifications: true,
    alertThreshold: "moderate", // minimal, low, moderate, high
    dailyDigest: false,

    // Display
    darkMode: true,
    compactView: false,
    showRiskScores: true,
    distanceUnit: "km", // km, miles, ld

    // Privacy
    showProfile: true,
    shareWatchlist: false,
  });

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Load user settings on mount
  useEffect(() => {
    if (user?.alertSettings) {
      setSettings((prev) => ({
        ...prev,
        emailAlerts: user.alertSettings.emailNotifications ?? prev.emailAlerts,
        pushNotifications:
          user.alertSettings.pushNotifications ?? prev.pushNotifications,
        alertThreshold: user.alertSettings.riskThreshold ?? prev.alertThreshold,
      }));
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateSettings({
      emailNotifications: settings.emailAlerts,
      pushNotifications: settings.pushNotifications,
      riskThreshold: settings.alertThreshold,
    });
    setIsSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const result = await deleteAccount();
    setIsDeleting(false);
    if (result.success) {
      navigate("/");
    }
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
              <SettingsIcon className="w-10 h-10 text-accent-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
            <p className="text-white/50 mb-8">
              Sign in to customize your preferences.
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
              <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-accent-primary" />
              Settings
            </h1>
            <p className="text-white/50">Customize your Astral experience</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ?
              <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </motion.div>

        {/* Success Message */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 mb-6 flex items-center gap-3 border-l-4 border-green-500"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-white">Settings saved successfully!</p>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-risk-moderate/20">
                <Bell className="w-5 h-5 text-risk-moderate" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                <p className="text-sm text-white/50">
                  Configure how you receive alerts
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <ToggleSetting
                label="Email Alerts"
                description="Receive email notifications for close approaches"
                checked={settings.emailAlerts}
                onChange={(v) => handleChange("emailAlerts", v)}
              />
              <ToggleSetting
                label="Push Notifications"
                description="Get real-time browser notifications"
                checked={settings.pushNotifications}
                onChange={(v) => handleChange("pushNotifications", v)}
              />
              <ToggleSetting
                label="Daily Digest"
                description="Receive a daily summary of asteroid activity"
                checked={settings.dailyDigest}
                onChange={(v) => handleChange("dailyDigest", v)}
              />

              <div>
                <label className="block text-sm text-white mb-2">
                  Alert Threshold
                </label>
                <p className="text-xs text-white/50 mb-2">
                  Only notify for asteroids at or above this risk level
                </p>
                <select
                  value={settings.alertThreshold}
                  onChange={(e) =>
                    handleChange("alertThreshold", e.target.value)
                  }
                  className="input-field"
                >
                  <option value="minimal">All Asteroids</option>
                  <option value="low">Low Risk & Above</option>
                  <option value="moderate">Moderate Risk & Above</option>
                  <option value="high">High Risk Only</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent-primary/20">
                <Moon className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Display</h3>
                <p className="text-sm text-white/50">Customize the interface</p>
              </div>
            </div>

            <div className="space-y-4">
              <ToggleSetting
                label="Dark Mode"
                description="Use dark color scheme (recommended for space vibes)"
                checked={settings.darkMode}
                onChange={(v) => handleChange("darkMode", v)}
              />
              <ToggleSetting
                label="Compact View"
                description="Show more asteroids with smaller cards"
                checked={settings.compactView}
                onChange={(v) => handleChange("compactView", v)}
              />
              <ToggleSetting
                label="Show Risk Scores"
                description="Display numerical risk scores on cards"
                checked={settings.showRiskScores}
                onChange={(v) => handleChange("showRiskScores", v)}
              />

              <div>
                <label className="block text-sm text-white mb-2">
                  Distance Units
                </label>
                <select
                  value={settings.distanceUnit}
                  onChange={(e) => handleChange("distanceUnit", e.target.value)}
                  className="input-field"
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="miles">Miles</option>
                  <option value="ld">Lunar Distance (LD)</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Privacy</h3>
                <p className="text-sm text-white/50">Control your data</p>
              </div>
            </div>

            <div className="space-y-4">
              <ToggleSetting
                label="Public Profile"
                description="Allow others to see your profile"
                checked={settings.showProfile}
                onChange={(v) => handleChange("showProfile", v)}
              />
              <ToggleSetting
                label="Share Watchlist"
                description="Make your watchlist visible to others"
                checked={settings.shareWatchlist}
                onChange={(v) => handleChange("shareWatchlist", v)}
              />
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass p-6 border border-risk-high/30"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-risk-high/20">
                <AlertTriangle className="w-5 h-5 text-risk-high" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Danger Zone</h3>
                <p className="text-sm text-white/50">Irreversible actions</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-risk-high/10 rounded-xl">
              <div className="min-w-0">
                <p className="font-medium text-white">Delete Account</p>
                <p className="text-sm text-white/50">
                  Permanently delete your account and all data
                </p>
              </div>
              {!showDeleteConfirm ?
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-secondary text-risk-high border-risk-high/30 hover:bg-risk-high/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              : <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-risk-high text-white text-sm py-2 px-4 rounded-lg hover:bg-risk-high/80 flex items-center gap-2"
                  >
                    {isDeleting ?
                      <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                    Confirm Delete
                  </button>
                </div>
              }
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Toggle Setting Component
const ToggleSetting = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium text-white">{label}</p>
      <p className="text-sm text-white/50">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? "bg-accent-primary" : "bg-space-600"
      }`}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full"
        animate={{ left: checked ? "1.5rem" : "0.25rem" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

export default Settings;
