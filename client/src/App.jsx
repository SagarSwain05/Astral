import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AsteroidDetail from "./pages/AsteroidDetail";
import AsteroidList from "./pages/AsteroidList";
import Watchlist from "./pages/Watchlist";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BroadcastBanner from "./components/shared/BroadcastBanner";
import NotFound from "./pages/NotFound";
import LoadingScreen from "./components/Common/LoadingScreen";
import ErrorBoundary from "./components/Common/ErrorBoundary";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import { ToastContainer } from "./components/Common/Toast";
import ChatSidebar from "./components/Chat/ChatSidebar";

// Heavy routes (Three.js scenes, charts) load on demand
const Visualization = lazy(() => import("./pages/Visualization"));
const ImpactVisualizer = lazy(() => import("./pages/ImpactVisualizer"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
import useAuthStore from "./stores/authStore";
import useAlertStore from "./stores/alertStore";
import useAsteroidStore from "./stores/asteroidStore";
import useUplinkStore from "./stores/uplinkStore";
import { UplinkBanner } from "./components/shared/UplinkStatus";
import socketService from "./services/socket";

function App() {
  const { checkAuth, user, token, isAuthenticated } = useAuthStore();
  const { addAlert } = useAlertStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, ...toast }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      await checkAuth();
      // Brief loading screen
      setTimeout(() => setIsInitializing(false), 800);
    };

    initApp();
    useUplinkStore.getState().start();

    // A finished NASA sync means fresh data — refresh what the user is viewing
    const refreshData = () => {
      const store = useAsteroidStore.getState();
      store.fetchTodayAsteroids();
      store.fetchAsteroids();
      store.fetchStats();
    };

    // Connect to socket
    socketService.connect();

    // Listen for real-time events
    socketService.on("NEW_HAZARDOUS_ASTEROID", (data) => {
      const a = data.asteroid || {};
      addToast({
        type: "warning",
        title: "High-Risk Asteroid Detected",
        message: `${a.name || "New asteroid"} — risk ${a.riskScore ?? "?"}/100, passing at ${a.missDistanceLunar?.toFixed(1) ?? "?"} LD`,
      });
    });

    socketService.on("DAILY_UPDATE", (data) => {
      useUplinkStore.getState().markSynced(data.stats?.processed);
      refreshData();
      addToast({
        type: "info",
        title: "NASA Data Synced",
        message: `${data.stats?.processed ?? 0} asteroids updated from NASA NeoWs`,
      });
    });

    socketService.on("WEEKLY_UPDATE", (data) => {
      useUplinkStore.getState().markSynced(data.stats?.processed);
      refreshData();
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    // Join user room for personal notifications
    if (isAuthenticated && token) {
      socketService.joinUserRoom(token);

      socketService.on("CLOSE_APPROACH_ALERT", (alert) => {
        console.log("🔔 Alert received:", alert);
        addAlert(alert);
        addToast({
          type: "warning",
          title: "Close Approach Alert",
          message: alert.message || "An asteroid is approaching",
        });
      });

      socketService.on("WATCHLIST_ALERT", (data) => {
        console.log("⭐ Watchlist alert:", data);
        addToast({
          type: "info",
          title: "Watchlist Update",
          message: data.message || "A watched asteroid has an update",
        });
      });
    }
  }, [isAuthenticated, token]);

  if (isInitializing) {
    return <LoadingScreen message="Initializing Astral..." />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-space-900 stars-bg flex flex-col">
          <Navbar />
          <BroadcastBanner />
          <UplinkBanner />

          <main className="flex-1">
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingScreen message="Loading..." />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/asteroids" element={<AsteroidList />} />
                <Route path="/asteroid/:id" element={<AsteroidDetail />} />
                <Route
                  path="/watchlist"
                  element={
                    <ProtectedRoute>
                      <Watchlist />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <Alerts />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="/visualization" element={<Visualization />} />
                <Route path="/impact" element={<ImpactVisualizer />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminConsole />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </AnimatePresence>
          </main>

          <Footer />

          {/* Global Chat Sidebar */}
          <ChatSidebar />

          {/* Toast notifications */}
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
