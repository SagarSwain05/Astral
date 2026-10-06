import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../services/api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const { user, token } = response.data.data;

          localStorage.setItem("token", token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || "Login failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Register
      register: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({
            email,
            password,
            displayName,
          });
          const { user, token } = response.data.data;

          localStorage.setItem("token", token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Registration failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Logout
      logout: () => {
        localStorage.removeItem("token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Check auth status
      checkAuth: async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await authApi.getProfile();
          set({
            user: response.data.data,
            token,
            isAuthenticated: true,
          });
        } catch (error) {
          localStorage.removeItem("token");
          set({ isAuthenticated: false, user: null, token: null });
        }
      },

      // Update profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.updateProfile(profileData);
          set({
            user: response.data.data,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Failed to update profile";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Update settings (alert settings are stored on the user model)
      updateSettings: async (settings) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.updateProfile({
            alertSettings: settings,
          });
          set({
            user: response.data.data,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Failed to update settings";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Delete account
      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await authApi.deleteAccount();
          localStorage.removeItem("token");
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          const message =
            error.response?.data?.message || "Failed to delete account";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
