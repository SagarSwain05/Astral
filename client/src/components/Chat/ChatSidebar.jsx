import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Users,
  Loader2,
  ChevronDown,
  ArrowUp,
} from "lucide-react";
import useChatStore from "../../stores/chatStore";
import useAuthStore from "../../stores/authStore";
import useMediaQuery from "../../hooks/useMediaQuery";

const defaultRoomState = {
  messages: [],
  hasMore: false,
  isLoadingHistory: false,
  typingUsers: [],
  unreadCount: 0,
  usersOnline: 0,
};

const ChatSidebar = () => {
  const {
    isConnected,
    isOpen,
    toggleChat,
    sendMessage,
    emitTyping,
    emitStopTyping,
    loadHistory,
    loadOlderMessages,
    connect,
    disconnect,
  } = useChatStore();

  const room = "global";
  const roomState =
    useChatStore((state) => state.rooms[room]) || defaultRoomState;
  const {
    messages,
    usersOnline,
    typingUsers,
    hasMore,
    isLoadingHistory,
    unreadCount,
  } = roomState;

  const { isAuthenticated, user } = useAuthStore();
  const [input, setInput] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Connect chat namespace based on auth
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      loadHistory(room);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = "";
      return;
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!isOpen) return;
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
  }, [messages, isOpen]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;
    setShowScrollDown(!isNearBottom);

    // Load older when scrolled to top
    if (container.scrollTop < 40 && hasMore && !isLoadingHistory) {
      loadOlderMessages(room);
    }
  }, [hasMore, isLoadingHistory]);

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

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating toggle button */}
      <motion.button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary shadow-lg shadow-accent-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        whileTap={{ scale: 0.92 }}
      >
        {isOpen ?
          <X className="w-6 h-6 text-space-900" />
        : <>
            <MessageCircle className="w-6 h-6 text-space-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-risk-high rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        }
      </motion.button>

      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={toggleChat}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              x: isMobile ? 0 : 400,
              y: isMobile ? 200 : 0,
              opacity: 0,
            }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{
              x: isMobile ? 0 : 400,
              y: isMobile ? 200 : 0,
              opacity: 0,
            }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={`fixed z-40 flex flex-col bg-space-900/95 backdrop-blur-xl shadow-2xl ${
              isMobile ?
                "inset-x-0 bottom-0 top-auto h-[80vh] max-h-[720px] w-full rounded-t-3xl border-t border-white/10"
              : "top-0 right-0 h-full w-[360px] max-w-[90vw] border-l border-white/10"
            }`}
          >
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <span className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>
            )}
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-accent-primary" />
                  Global Chat
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="text-xs text-white/50">
                    {isConnected ? `${usersOnline} online` : "Connecting..."}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleChat}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
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
                  No messages yet. Say hello!
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
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-space-700 border border-white/10 rounded-full p-2 shadow-lg hover:bg-space-600 transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-5 py-1 text-xs text-white/40 shrink-0">
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
              className="px-4 py-3 border-t border-white/10 shrink-0"
              style={
                isMobile ?
                  {
                    paddingBottom:
                      "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
                  }
                : undefined
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder={
                    isConnected ? "Type a message..." : "Connecting..."
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
    </>
  );
};

export default ChatSidebar;
