import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  Users,
} from "lucide-react";
import useChatStore from "../../stores/chatStore";
import useAuthStore from "../../stores/authStore";

const defaultRoomState = {
  messages: [],
  hasMore: false,
  isLoadingHistory: false,
  typingUsers: [],
  unreadCount: 0,
  usersOnline: 0,
};

const AsteroidChat = ({ asteroidId, asteroidName }) => {
  const room = `asteroid:${asteroidId}`;

  const {
    isConnected,
    sendMessage,
    emitTyping,
    emitStopTyping,
    loadHistory,
    loadOlderMessages,
    joinRoom,
    leaveRoom,
    connect,
  } = useChatStore();

  const roomState =
    useChatStore((state) => state.rooms[room]) || defaultRoomState;
  const { messages, typingUsers, hasMore, isLoadingHistory, usersOnline } =
    roomState;

  const { isAuthenticated, user } = useAuthStore();
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect and load history on mount, leave on unmount
  useEffect(() => {
    if (isAuthenticated && asteroidId) {
      connect();
      loadHistory(room);
    }
    return () => {
      if (asteroidId) {
        leaveRoom(room);
      }
    };
  }, [isAuthenticated, asteroidId]);

  // Join the room once the socket is actually connected
  useEffect(() => {
    if (isConnected && asteroidId) {
      joinRoom(room);
    }
  }, [isConnected, asteroidId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!isExpanded) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollDown(true);
    }
  }, [messages, isExpanded]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;
    setShowScrollDown(!isNearBottom);

    if (container.scrollTop < 40 && hasMore && !isLoadingHistory) {
      loadOlderMessages(room);
    }
  }, [hasMore, isLoadingHistory, room]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollDown(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input, room);
    setInput("");
    emitStopTyping(room);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    emitTyping(room);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitStopTyping(room), 2000);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name) => {
    return (name || "??")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAuthenticated) {
    return (
      <div className="glass p-6 text-center">
        <MessageCircle className="w-8 h-8 text-white/30 mx-auto mb-2" />
        <p className="text-white/50 text-sm">
          Log in to join the discussion about this asteroid.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="glass overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-accent-primary" />
          <div className="text-left">
            <h3 className="text-base font-semibold text-white">Discussion</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
              />
              <span className="text-xs text-white/50">
                {isConnected ?
                  `${usersOnline || 0} in this discussion`
                : "Connecting..."}
              </span>
              {messages.length > 0 && (
                <span className="text-xs text-white/40">
                  · {messages.length} messages
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && messages.length > 0 && (
            <span className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary text-xs rounded-full">
              {messages.length}
            </span>
          )}
          {isExpanded ?
            <ChevronUp className="w-5 h-5 text-white/50" />
          : <ChevronDown className="w-5 h-5 text-white/50" />}
        </div>
      </button>

      {/* Expandable chat area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="h-80 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth relative"
            >
              {/* Load more */}
              {isLoadingHistory && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                </div>
              )}
              {hasMore && !isLoadingHistory && (
                <button
                  onClick={() => loadOlderMessages(room)}
                  className="w-full text-center text-xs text-white/40 hover:text-white/70 py-1"
                >
                  <ArrowUp className="w-3 h-3 inline mr-1" /> Load older
                  messages
                </button>
              )}

              {messages.length === 0 && !isLoadingHistory && (
                <div className="text-center text-white/30 text-sm py-12">
                  No messages yet. Start the discussion about{" "}
                  <span className="text-accent-primary font-medium">
                    {asteroidName || "this asteroid"}
                  </span>
                  !
                </div>
              )}

              {messages.map((msg) => {
                const isOwn = msg.user === user?._id;
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isOwn ?
                          "bg-gradient-to-br from-accent-primary to-accent-secondary text-space-900"
                        : "bg-space-700 text-white/70"
                      }`}
                    >
                      {getInitials(msg.displayName)}
                    </div>

                    <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                      <div
                        className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <span className="text-xs font-medium text-white/70">
                          {isOwn ? "You" : msg.displayName}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isOwn ?
                            "bg-accent-primary/20 text-white rounded-tr-md"
                          : "bg-space-700/60 text-white/90 rounded-tl-md"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollDown && (
              <div className="relative">
                <button
                  onClick={scrollToBottom}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-space-700 border border-white/10 rounded-full p-2 shadow-lg hover:bg-space-600 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-white/70" />
                </button>
              </div>
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-5 py-1 text-xs text-white/40">
                {typingUsers.slice(0, 2).join(", ")}
                {typingUsers.length > 2 ?
                  ` +${typingUsers.length - 2}`
                : ""}{" "}
                typing...
              </div>
            )}

            {/* Input area */}
            <form
              onSubmit={handleSend}
              className="px-4 py-3 border-t border-white/10"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder={
                    isConnected ?
                      `Discuss ${asteroidName || "this asteroid"}...`
                    : "Connecting..."
                  }
                  disabled={!isConnected}
                  maxLength={500}
                  className="flex-1 bg-space-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent-primary/50 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={!isConnected || !input.trim()}
                  className="p-2.5 rounded-xl bg-accent-primary/80 hover:bg-accent-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-space-900" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AsteroidChat;
