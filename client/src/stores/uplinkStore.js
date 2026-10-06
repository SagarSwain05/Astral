import { create } from "zustand";
import api from "../services/api";

const POLL_MS = 60000;
const SLOW_MS = 3500; // longer than this = backend is cold-starting

/**
 * Backend "uplink" health: last NASA sync, reachability and cold-start state.
 * Free hosting tiers sleep when idle, so the first request can take ~1 min.
 */
const useUplinkStore = create((set, get) => ({
  status: "connecting", // connecting | waking | live | degraded | offline
  lastSyncAt: null,
  lastSyncCount: null,
  syncing: false,
  _timer: null,

  check: async () => {
    const slowTimer = setTimeout(() => {
      if (get().status === "connecting") set({ status: "waking" });
    }, SLOW_MS);
    try {
      const res = await api.get("/api/status", { timeout: 90000 });
      const d = res.data.data;
      set({
        status: d.status === "operational" && d.nasa.reachable ? "live" : "degraded",
        lastSyncAt: d.lastSyncAt,
        lastSyncCount: d.lastSyncCount,
        syncing: d.syncing,
      });
    } catch {
      set({ status: "offline" });
      // Retry sooner than the regular poll while the server is unreachable
      setTimeout(() => get().check(), 10000);
    } finally {
      clearTimeout(slowTimer);
    }
  },

  start: () => {
    if (get()._timer) return;
    get().check();
    set({ _timer: setInterval(() => get().check(), POLL_MS) });
  },

  markSynced: (count) =>
    set({ lastSyncAt: new Date().toISOString(), lastSyncCount: count, syncing: false }),
}));

export default useUplinkStore;
