import { create } from 'zustand';
import { alertApi } from '../services/api';

export const useAlertStore = create((set, get) => ({
    alerts: [],
    unreadCount: 0,
    isLoading: false,

    // Fetch all alerts
    fetchAlerts: async (params = {}) => {
        set({ isLoading: true });
        try {
            const response = await alertApi.getAll(params);
            set({
                alerts: response.data.data,
                unreadCount: response.data.unreadCount,
                isLoading: false,
            });
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            return null;
        }
    },

    // Fetch unread alerts
    fetchUnreadAlerts: async () => {
        try {
            const response = await alertApi.getUnread();
            set({
                unreadCount: response.data.count,
            });
            return response.data.data;
        } catch (error) {
            return [];
        }
    },

    // Mark alert as read
    markAsRead: async (alertId) => {
        try {
            await alertApi.markRead(alertId);
            set({
                alerts: get().alerts.map((a) =>
                    a._id === alertId ? { ...a, isRead: true } : a
                ),
                unreadCount: Math.max(0, get().unreadCount - 1),
            });
        } catch (error) {
            console.error('Failed to mark alert as read:', error);
        }
    },

    // Mark all alerts as read
    markAllAsRead: async () => {
        try {
            await alertApi.markAllRead();
            set({
                alerts: get().alerts.map((a) => ({ ...a, isRead: true })),
                unreadCount: 0,
            });
        } catch (error) {
            console.error('Failed to mark all alerts as read:', error);
        }
    },

    // Add new alert (from socket)
    addAlert: (alert) => {
        set({
            alerts: [alert, ...get().alerts],
            unreadCount: get().unreadCount + 1,
        });
    },
}));

export default useAlertStore;
