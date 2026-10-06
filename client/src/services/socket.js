import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  connect() {
    if (this.socket?.connected) return;

    try {
      this.socket = io(SOCKET_URL, {
        transports: ["polling", "websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        withCredentials: true,
      });

      // Attach listeners registered before the socket existed
      for (const [event, callback] of this.listeners) {
        this.socket.on(event, callback);
      }

      this.socket.on("connect", () => {
        console.log("🔌 Socket connected:", this.socket.id);
        this.retryCount = 0;
      });

      this.socket.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason);
      });

      this.socket.on("connect_error", (error) => {
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
          console.log(
            `🔌 Socket connection attempt ${this.retryCount}/${this.maxRetries}`,
          );
        } else {
          console.log(
            "🔌 Socket connection failed, continuing without real-time updates",
          );
          this.socket.disconnect();
        }
      });

      return this.socket;
    } catch (error) {
      console.error("🔌 Failed to initialize socket:", error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join user's personal notification room (server verifies the JWT)
  joinUserRoom(token) {
    if (!this.socket || !token) return;
    const join = () => this.socket.emit("join_user_room", { token });
    if (this.socket.connected) join();
    // Re-join after every (re)connect so alerts survive network blips
    this.socket.off("connect", this._joinHandler);
    this._joinHandler = join;
    this.socket.on("connect", join);
  }

  // Watch a specific asteroid
  watchAsteroid(asteroidId) {
    if (this.socket?.connected) {
      this.socket.emit("watch_asteroid", asteroidId);
    }
  }

  // Unwatch a specific asteroid
  unwatchAsteroid(asteroidId) {
    if (this.socket?.connected) {
      this.socket.emit("unwatch_asteroid", asteroidId);
    }
  }

  // Listen for events (queued until connect() if the socket is not created yet)
  on(event, callback) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
    }
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove listener
  off(event) {
    if (!this.listeners.has(event)) return;
    if (this.socket) {
      this.socket.off(event, this.listeners.get(event));
    }
    this.listeners.delete(event);
  }

  // Emit event
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
