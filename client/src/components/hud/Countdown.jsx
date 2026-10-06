import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Timer } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

const splitDuration = (ms) => {
  const total = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

/**
 * Live T-minus countdown to a close approach.
 * compact: single-line chip for cards; otherwise a segmented HUD display.
 */
const Countdown = ({ target, compact = false, className = "" }) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) return null;

  const diff = new Date(target).getTime() - now;
  const passed = diff <= 0;
  const { days, hours, minutes, seconds } = splitDuration(diff);
  const prefix = passed ? "T+" : "T-";

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-xs ${
          passed ? "text-white/40" : "text-accent-primary"
        } ${className}`}
        title={passed ? t("countdown.passed") : t("countdown.untilApproach")}
      >
        <Timer className="w-3 h-3" />
        {prefix}
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  const segments = [
    [days, t("countdown.days")],
    [hours, t("countdown.hours")],
    [minutes, t("countdown.minutes")],
    [seconds, t("countdown.seconds")],
  ];

  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {passed ? t("countdown.passed") : t("countdown.untilApproach")}
      </p>
      <div className="flex items-center gap-2 font-mono">
        <span
          className={`text-lg font-bold ${passed ? "text-white/40" : "text-accent-primary"}`}
        >
          {prefix}
        </span>
        {segments.map(([value, label]) => (
          <div
            key={label}
            className="bg-space-800/80 border border-white/10 rounded-lg px-2 py-1 text-center min-w-[3rem]"
          >
            <div className="text-xl font-bold text-white">{pad(value)}</div>
            <div className="text-[10px] uppercase text-white/40">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Countdown;
