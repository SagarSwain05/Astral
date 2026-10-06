import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { History, Loader2, Star } from "lucide-react";
import { asteroidApi } from "../../services/api";

const formatYearDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * Approach History Timeline — every past & future Earth pass of one asteroid,
 * centred on the approach nearest to today.
 */
const ApproachTimeline = ({ asteroidId }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Parent remounts this component (key=asteroidId) for a new asteroid,
    // so state starts fresh without resetting it here
    let cancelled = false;
    asteroidApi
      .getHistory(asteroidId)
      .then((res) => !cancelled && setHistory(res.data.data))
      .catch(
        (err) =>
          !cancelled &&
          setError(err.response?.data?.message || t("timeline.error")),
      );
    return () => {
      cancelled = true;
    };
  }, [asteroidId, t]);

  // Show a window of ~12 passes around "now" unless expanded
  const visible = useMemo(() => {
    if (!history) return [];
    const list = history.approaches;
    if (showAll || list.length <= 12) return list;
    const firstFuture = list.findIndex((a) => a.isFuture);
    const pivot = firstFuture === -1 ? list.length : firstFuture;
    const start = Math.max(0, Math.min(pivot - 6, list.length - 12));
    return list.slice(start, start + 12);
  }, [history, showAll]);

  const maxDistance = useMemo(
    () => Math.max(1, ...visible.map((a) => a.missDistanceLunar)),
    [visible],
  );

  if (error) {
    return <div className="glass p-6 text-white/50 text-sm">{error}</div>;
  }

  if (!history) {
    return (
      <div className="glass p-6 flex items-center gap-3 text-white/50">
        <Loader2 className="w-5 h-5 animate-spin" />
        {t("timeline.loading")}
      </div>
    );
  }

  const closestDate = history.closestEver?.date;

  return (
    <motion.div
      className="glass p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap gap-4 justify-between mb-6">
        <div className="flex items-center gap-2 text-white/70">
          <History className="w-5 h-5 text-accent-primary" />
          {t("timeline.summary", { count: history.totalApproaches })}
        </div>
        {history.closestEver && (
          <div className="text-sm text-white/50">
            {t("timeline.closestEver")}:{" "}
            <span className="text-white font-semibold">
              {history.closestEver.missDistanceLunar.toFixed(2)} LD
            </span>{" "}
            ({formatYearDate(history.closestEver.date)})
          </div>
        )}
      </div>

      {/* Horizontal scrolling timeline; bar height = proximity */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-end gap-3 min-w-max h-48 border-b border-white/10">
          {visible.map((a) => {
            const proximity = 1 - a.missDistanceLunar / (maxDistance * 1.1);
            const isClosest = a.date === closestDate;
            return (
              <div
                key={a.date}
                className="flex flex-col items-center justify-end h-full w-14"
                title={`${formatYearDate(a.date)} · ${a.missDistanceLunar.toFixed(2)} LD · ${a.velocityKmS.toFixed(1)} km/s`}
              >
                {isClosest && <Star className="w-3 h-3 text-risk-moderate mb-1" />}
                <span className="text-[10px] text-white/50 mb-1 font-mono">
                  {a.missDistanceLunar.toFixed(1)}
                </span>
                <div
                  className={`w-3 rounded-t ${
                    a.isFuture ?
                      "bg-gradient-to-t from-accent-secondary to-accent-primary"
                    : "bg-white/25"
                  }`}
                  style={{ height: `${Math.max(6, proximity * 100)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 min-w-max mt-2">
          {visible.map((a) => (
            <div
              key={a.date}
              className={`w-14 text-center text-[11px] ${a.isFuture ? "text-accent-primary" : "text-white/40"}`}
            >
              {new Date(a.date).getFullYear()}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-white/40">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/25" />
            {t("timeline.past")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-primary" />
            {t("timeline.future")}
          </span>
          <span>{t("timeline.legend")}</span>
        </div>
        {history.approaches.length > 12 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-accent-primary hover:underline"
          >
            {showAll ? t("timeline.showLess") : t("timeline.showAll")}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ApproachTimeline;
