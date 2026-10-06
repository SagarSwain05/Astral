import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Award, AlertTriangle, ChevronRight } from "lucide-react";
import { asteroidApi } from "../../services/api";
import Countdown from "./Countdown";

const riskBadge = {
  high: "badge-high",
  moderate: "badge-moderate",
  low: "badge-low",
  minimal: "badge-minimal",
};

/**
 * Asteroid of the Day — the server picks the most notable object approaching
 * today and explains why it was selected.
 */
const AsteroidOfTheDay = () => {
  const { t } = useTranslation();
  const [asteroid, setAsteroid] = useState(null);

  useEffect(() => {
    asteroidApi
      .getFeatured()
      .then((res) => setAsteroid(res.data.data))
      .catch(() => setAsteroid(null));
  }, []);

  if (!asteroid) return null;

  const stats = [
    [t("common.diameter"), `${Math.round(asteroid.estimatedDiameterMax || 0)} m`],
    [t("common.distance"), `${asteroid.missDistanceLunar?.toFixed(2)} LD`],
    [t("common.velocity"), `${asteroid.relativeVelocityKmS?.toFixed(1)} km/s`],
    [t("common.riskScore"), `${asteroid.riskScore}/100`],
  ];

  return (
    <motion.div
      className="glass p-6 border border-accent-primary/20 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-accent-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 text-accent-primary">
            <Award className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {t("dashboard.asteroidOfTheDay")}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {asteroid.name}
            </h3>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${riskBadge[asteroid.riskCategory] || riskBadge.minimal}`}>
              {asteroid.riskCategory}
            </span>
            {asteroid.isPotentiallyHazardous && (
              <AlertTriangle className="w-5 h-5 text-risk-high" />
            )}
          </div>
          <ul className="text-sm text-white/60 space-y-1 mb-4">
            {asteroid.reasons?.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(([label, value]) => (
              <div key={label} className="bg-space-800/50 rounded-lg p-3">
                <p className="text-xs text-white/50">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:items-end">
          <Countdown target={asteroid.closeApproachDate} />
          <Link
            to={`/asteroid/${asteroid.neo_reference_id}`}
            className="btn-secondary inline-flex items-center gap-2 self-start lg:self-end"
          >
            {t("common.viewDetails")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default AsteroidOfTheDay;
