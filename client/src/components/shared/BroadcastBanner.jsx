import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Siren, X } from "lucide-react";
import socketService from "../../services/socket";

const levelStyles = {
  red: "bg-risk-high/95 border-red-300 text-white",
  warning: "bg-risk-moderate/95 border-amber-200 text-space-900",
  info: "bg-accent-secondary/95 border-indigo-200 text-white",
};

/**
 * Full-width banner for admin-dispatched alerts (ADMIN_BROADCAST socket event).
 * Red alerts pulse and stay until dismissed.
 */
const BroadcastBanner = () => {
  const { t } = useTranslation();
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => {
    const handler = (data) => setBroadcast(data);
    socketService.on("ADMIN_BROADCAST", handler);
    return () => socketService.off("ADMIN_BROADCAST");
  }, []);

  return (
    <AnimatePresence>
      {broadcast && (
        <motion.div
          role="alert"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className={`fixed top-[72px] left-0 right-0 z-[60] border-b-2 shadow-2xl ${
            levelStyles[broadcast.level] || levelStyles.info
          } ${broadcast.level === "red" ? "animate-pulse-glow" : ""}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-start gap-3">
            <Siren
              className={`w-6 h-6 flex-shrink-0 mt-0.5 ${broadcast.level === "red" ? "animate-pulse" : ""}`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold uppercase tracking-wide text-sm">
                {broadcast.isSimulation && (
                  <span className="mr-2 px-1.5 py-0.5 rounded bg-black/25 text-[10px]">
                    {t("broadcast.simulation")}
                  </span>
                )}
                {broadcast.title}
              </p>
              <p className="text-sm opacity-90 break-words">
                {broadcast.message}
              </p>
              <p className="text-xs opacity-70 mt-1">
                {t("broadcast.issuedBy", { name: broadcast.issuedBy })} ·{" "}
                {new Date(broadcast.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => setBroadcast(null)}
              className="p-1 rounded hover:bg-black/20"
              aria-label={t("common.dismiss")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BroadcastBanner;
