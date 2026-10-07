import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, SatelliteDish } from "lucide-react";
import useUplinkStore from "../../stores/uplinkStore";

const timeAgo = (iso, t) => {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return t("uplink.justNow");
  if (mins < 60) return t("uplink.minutesAgo", { count: mins });
  return t("uplink.hoursAgo", { count: Math.round(mins / 60) });
};

const styles = {
  live: { dot: "bg-risk-minimal", text: "text-risk-minimal" },
  degraded: { dot: "bg-risk-moderate", text: "text-risk-moderate" },
  waking: { dot: "bg-risk-moderate", text: "text-risk-moderate" },
  connecting: { dot: "bg-white/40", text: "text-white/60" },
  offline: { dot: "bg-risk-high", text: "text-risk-high" },
};

/** Navbar pill: LIVE · synced 3m ago */
export const UplinkPill = () => {
  const { t } = useTranslation();
  const { status, lastSyncAt, syncing } = useUplinkStore();
  const [, tick] = useState(0);

  // Re-render every 30 s so "synced Xm ago" stays current
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const s = styles[status] || styles.connecting;
  const ago = timeAgo(lastSyncAt, t);

  return (
    <div
      className="hidden sm:flex lg:hidden xl:flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full bg-space-800/60 border border-white/10 text-xs"
      title={ago ? t("uplink.lastSync", { ago }) : undefined}
      role="status"
    >
      <span className="relative flex w-2 h-2">
        {status === "live" && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60 animate-ping`} />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${s.dot}`} />
      </span>
      <span className={`font-semibold uppercase tracking-wide ${s.text}`}>
        {t(`uplink.${status}`)}
      </span>
      {status === "live" && (syncing || ago) && (
        <span className="text-white/40 hidden xl:inline">
          · {syncing ? t("uplink.syncing") : ago}
        </span>
      )}
    </div>
  );
};

/** Slim banner shown only while the backend is cold-starting */
export const UplinkBanner = () => {
  const { t } = useTranslation();
  const { status } = useUplinkStore();

  return (
    <AnimatePresence>
      {(status === "waking" || status === "offline") && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-[72px] left-0 right-0 z-40 px-4"
          role="status"
        >
          <div className="max-w-3xl mx-auto mt-2 glass border border-risk-moderate/30 px-4 py-2 flex items-center gap-3 text-sm">
            {status === "waking" ?
              <Loader2 className="w-4 h-4 text-risk-moderate animate-spin flex-shrink-0" />
            : <SatelliteDish className="w-4 h-4 text-risk-high flex-shrink-0" />}
            <span className="text-white/80">
              {status === "waking" ? t("uplink.wakingMessage") : t("uplink.offlineMessage")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
