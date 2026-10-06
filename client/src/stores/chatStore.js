import { create } from "zustand";
import { io } from "socket.io-client";
import api from "../services/api";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export const useChatStore = create((set, get) => ({
  // Per-room state: { [room]: { messages, hasMore, isLoadingHistory, typingUsers, unreadCount, usersOnline } }
  rooms: {},
  isConnected: false,
  isOpen: false,
  activeRoom: "global",
  socket: null,

  // Helper to get room state with defaults
  getRoomState: (room) => {
    const roomState = get().rooms[room];
    return {
      messages: roomState?.messages || [],
      hasMore: roomState?.hasMore || false,
      isLoadingHistory: roomState?.isLoadingHistory || false,
      typingUsers: roomState?.typingUsers || [],
      unreadCount: roomState?.unreadCount || 0,
      usersOnline: roomState?.usersOnline || 0,
    };
  },

  // Update a specific room's state
  _updateRoom: (room, updates) => {
    set((state) => ({
      rooms: {
        ...state.rooms,
        [room]: {
          ...state.rooms[room],
          messages: state.rooms[room]?.messages || [],
          hasMore: state.rooms[room]?.hasMore || false,
          isLoadingHistory: state.rooms[room]?.isLoadingHistory || false,
          typingUsers: state.rooms[room]?.typingUsers || [],
          unreadCount: state.rooms[room]?.unreadCount || 0,
          usersOnline: state.rooms[room]?.usersOnline || 0,
          ...updates,
        },
      },
    }));
  },

  // Toggle sidebar
  toggleChat: () => {
    const wasOpen = get().isOpen;
    set({ isOpen: !wasOpen });
    if (!wasOpen) {
      const room = get().activeRoom;
      get()._updateRoom(room, { unreadCount: 0 });
    }
  },

  openChat: () => {
    set({ isOpen: true });
    const room = get().activeRoom;
    get()._updateRoom(room, { unreadCount: 0 });
  },
  closeChat: () => set({ isOpen: false }),

  setActiveRoom: (room) => {
    set({ activeRoom: room });
    get()._updateRoom(room, { unreadCount: 0 });
  },

  // Connect to /chat namespace with auth token
  connect: () => {
    const existing = get().socket;
    if (existing) return; // already connecting or connected

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("💬 Chat connected");
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    socket.on("connect_error", (err) => {
      console.log("💬 Chat auth error:", err.message);
      set({ isConnected: false });
    });

    socket.on("chat:message", (msg) => {
      const room = msg.room || "global";
      set((state) => {
        const roomState = state.rooms[room] || {
          messages: [],
          hasMore: false,
          isLoadingHistory: false,
          typingUsers: [],
          unreadCount: 0,
          usersOnline: 0,
        };
        const isActiveAndOpen = state.isOpen && state.activeRoom === room;
        return {
          rooms: {
            ...state.rooms,
            [room]: {
              ...roomState,
              messages: [...(roomState.messages || []), msg],
              unreadCount:
                isActiveAndOpen ? 0 : (roomState.unreadCount || 0) + 1,
            },
          },
        };
      });
    });

    socket.on("chat:users_online", (count) => {
      get()._updateRoom("global", { usersOnline: count });
    });

    socket.on("chat:room_users_online", ({ room, count }) => {
      get()._updateRoom(room, { usersOnline: count });
    });

    socket.on("chat:user_typing", ({ displayName, room }) => {
      const targetRoom = room || "global";
      set((state) => {
        const roomState = state.rooms[targetRoom] || { typingUsers: [] };
        if ((roomState.typingUsers || []).includes(displayName)) return state;
        return {
          rooms: {
            ...state.rooms,
            [targetRoom]: {
              ...roomState,
              typingUsers: [...(roomState.typingUsers || []), displayName],
            },
          },
        };
      });
    });

    socket.on("chat:user_stop_typing", ({ displayName, room }) => {
      const targetRoom = room || "global";
      set((state) => {
        const roomState = state.rooms[targetRoom] || { typingUsers: [] };
        return {
          rooms: {
            ...state.rooms,
            [targetRoom]: {
              ...roomState,
              typingUsers: (roomState.typingUsers || []).filter(
                (n) => n !== displayName,
              ),
            },
          },
        };
      });
    });

    socket.on("chat:error", (msg) => {
      console.error("💬 Chat error:", msg);
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, rooms: {} });
    }
  },

  // Join an asteroid chat room
  joinRoom: (room) => {
    const socket = get().socket;
    if (socket?.connected && room !== "global") {
      socket.emit("chat:join_room", room);
    }
  },

  // Leave an asteroid chat room
  leaveRoom: (room) => {
    const socket = get().socket;
    if (socket?.connected && room !== "global") {
      socket.emit("chat:leave_room", room);
    }
  },

  // Send a message to a specific room
  sendMessage: (message, room) => {
    const targetRoom = room || get().activeRoom;
    const socket = get().socket;
    if (socket?.connected && message.trim()) {
      socket.emit("chat:send", { message: message.trim(), room: targetRoom });
    }
  },

  // Typing indicators
  emitTyping: (room) => {
    const targetRoom = room || get().activeRoom;
    const socket = get().socket;
    if (socket?.connected) socket.emit("chat:typing", { room: targetRoom });
  },

  emitStopTyping: (room) => {
    const targetRoom = room || get().activeRoom;
    const socket = get().socket;
    if (socket?.connected)
      socket.emit("chat:stop_typing", { room: targetRoom });
  },

  // Load initial history via REST for a specific room
  loadHistory: async (room) => {
    const targetRoom = room || "global";
    get()._updateRoom(targetRoom, { isLoadingHistory: true });
    try {
      const res = await api.get("/api/chat/messages", {
        params: { limit: 50, room: targetRoom },
      });
      get()._updateRoom(targetRoom, {
        messages: res.data.data,
        hasMore: res.data.hasMore,
        isLoadingHistory: false,
      });
    } catch {
      get()._updateRoom(targetRoom, { isLoadingHistory: false });
    }
  },

  // Load older messages for a specific room
  loadOlderMessages: async (room) => {
    const targetRoom = room || get().activeRoom;
    const roomState = get().rooms[targetRoom];
    const msgs = roomState?.messages || [];
    if (!msgs.length || roomState?.isLoadingHistory) return;

    const oldest = msgs[0]?.createdAt;
    if (!oldest) return;

    get()._updateRoom(targetRoom, { isLoadingHistory: true });
    try {
      const res = await api.get("/api/chat/messages", {
        params: { before: oldest, limit: 50, room: targetRoom },
      });
      set((state) => {
        const current = state.rooms[targetRoom] || { messages: [] };
        return {
          rooms: {
            ...state.rooms,
            [targetRoom]: {
              ...current,
              messages: [...res.data.data, ...current.messages],
              hasMore: res.data.hasMore,
              isLoadingHistory: false,
            },
          },
        };
      });
    } catch {
      get()._updateRoom(targetRoom, { isLoadingHistory: false });
    }
  },
}));

export default useChatStore;
