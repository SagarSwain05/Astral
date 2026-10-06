import { create } from 'zustand';
import { asteroidApi, authApi } from '../services/api';

export const useAsteroidStore = create((set, get) => ({
    asteroids: [],
    todayAsteroids: [],
    watchlist: [],
    selectedAsteroid: null,
    stats: null,
    isLoading: false,
    error: null,

    // Fetch all asteroids with pagination
    fetchAsteroids: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
            const response = await asteroidApi.getAll(params);
            set({
                asteroids: response.data.data,
                isLoading: false,
            });
            return response.data;
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Failed to fetch asteroids',
                isLoading: false,
            });
            return null;
        }
    },

    // Fetch today's asteroids
    fetchTodayAsteroids: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await asteroidApi.getToday();
            set({
                todayAsteroids: response.data.data,
                isLoading: false,
            });
            return response.data.data;
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Failed to fetch today\'s asteroids',
                isLoading: false,
            });
            return [];
        }
    },

    // Fetch dashboard stats
    fetchStats: async () => {
        try {
            const response = await asteroidApi.getStats();
            set({ stats: response.data.data });
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            return null;
        }
    },

    // Fetch single asteroid
    fetchAsteroidById: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const response = await asteroidApi.getById(id);
            set({
                selectedAsteroid: response.data.data,
                isLoading: false,
            });
            return response.data.data;
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Failed to fetch asteroid',
                isLoading: false,
            });
            return null;
        }
    },

    // Fetch user's watchlist
    fetchWatchlist: async () => {
        try {
            const response = await authApi.getWatchlist();
            set({ watchlist: response.data.data });
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch watchlist:', error);
            return [];
        }
    },

    // Add to watchlist
    addToWatchlist: async (asteroidId) => {
        try {
            await authApi.addToWatchlist(asteroidId);
            await get().fetchWatchlist();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to add to watchlist',
            };
        }
    },

    // Remove from watchlist
    removeFromWatchlist: async (asteroidId) => {
        try {
            await authApi.removeFromWatchlist(asteroidId);
            set({
                watchlist: get().watchlist.filter((a) => a.neo_reference_id !== asteroidId),
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to remove from watchlist',
            };
        }
    },

    // Check if asteroid is in watchlist
    isInWatchlist: (asteroidId) => {
        return get().watchlist.some((a) => a.neo_reference_id === asteroidId);
    },

    // Clear selected asteroid
    clearSelectedAsteroid: () => set({ selectedAsteroid: null }),

    // Clear error
    clearError: () => set({ error: null }),
}));

export default useAsteroidStore;
