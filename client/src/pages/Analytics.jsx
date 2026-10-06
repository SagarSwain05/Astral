import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  RefreshCw,
  Table2,
  Gauge,
  Ruler,
  Crosshair,
  Activity,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { asteroidApi } from "../services/api";
import StatCard from "../components/Dashboard/StatCard";

// Chart colors validated for CVD separation on the dark surface (#0f172a).
// Risk levels always carry a text label, so color is never the only cue.
const RISK_COLORS = {
  minimal: "#34d399",
  low: "#fde047",
  moderate: "#fb923c",
  high: "#f43f5e",
};
const SERIES = {
  safe: "#818cf8",
  hazardous: "#f43f5e",
  scatterSafe: "#00d4ff",
};
const AXIS = { stroke: "rgba(255,255,255,0.35)", fontSize: 12 };
const GRID = "rgba(255,255,255,0.06)";

const tooltipStyle = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#fff",
  },
  labelStyle: { color: "rgba(255,255,255,0.7)" },
  itemStyle: { color: "#fff" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const ChartCard = ({ title, hint, children, delay = 0 }) => (
  <motion.div
    className="glass p-5 sm:p-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {hint && <p className="text-sm text-white/50 mt-1">{hint}</p>}
    <div className="mt-4">{children}</div>
  </motion.div>
);

const ScatterTooltip = ({ active, payload, t }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={tooltipStyle.contentStyle} className="px-3 py-2 text-sm">
      <p className="font-semibold">{p.name}</p>
      <p className="text-white/70">
        {t("common.distance")}: {p.distance} LD
      </p>
      <p className="text-white/70">
        {t("common.velocity")}: {p.velocity} km/s
      </p>
      <p className="text-white/70">
        {t("common.diameter")}: {p.diameter} m
      </p>
      <p className="text-white/70">
        {t("common.riskScore")}: {p.riskScore} ({p.riskCategory})
      </p>
    </div>
  );
};

const Analytics = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useState({ startDate: "", endDate: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
      const res = await asteroidApi.getAnalytics(params);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const totals = data?.totals || {};
  const daily = (data?.daily || []).map((d) => ({
    ...d,
    safe: d.total - d.hazardous,
  }));
  const scatterSafe = (data?.scatter || []).filter((p) => !p.hazardous);
  const scatterHaz = (data?.scatter || []).filter((p) => p.hazardous);
  const isEmpty = !loading && (!data || !totals.count);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-accent-primary mb-2">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">ASTRAL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {t("analytics.title")}
          </h1>
          <p className="text-white/50">{t("analytics.subtitle")}</p>
        </motion.div>

        {/* Filter row — applies to every chart below */}
        <div className="glass p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm text-white/50 mb-1">
                {t("common.from")}
              </span>
              <input
                type="date"
                className="input-field"
                value={range.startDate}
                onChange={(e) =>
                  setRange((r) => ({ ...r, startDate: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="block text-sm text-white/50 mb-1">
                {t("common.to")}
              </span>
              <input
                type="date"
                className="input-field"
                value={range.endDate}
                min={range.startDate || undefined}
                onChange={(e) =>
                  setRange((r) => ({ ...r, endDate: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => setRange({ startDate: "", endDate: "" })}
            >
              {t("analytics.allData")}
            </button>
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("common.refresh")}</span>
            </button>
          </div>
        </div>

        {isEmpty ?
          <div className="glass p-12 text-center text-white/50">
            {t("analytics.noData")}
          </div>
        : <>
            {/* Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                icon={Layers}
                iconColor="text-accent-primary"
                bgColor="bg-accent-primary/20"
                label={t("analytics.objects")}
                value={totals.count ?? "—"}
              />
              <StatCard
                icon={Gauge}
                iconColor="text-accent-secondary"
                bgColor="bg-accent-secondary/20"
                label={t("analytics.avgRisk")}
                value={totals.avgRisk ? Math.round(totals.avgRisk) : "—"}
                subValue="/ 100"
                delay={0.05}
              />
              <StatCard
                icon={Activity}
                iconColor="text-sky-400"
                bgColor="bg-sky-400/20"
                label={t("analytics.avgVelocity")}
                value={totals.avgVelocity ? totals.avgVelocity.toFixed(1) : "—"}
                subValue="km/s"
                delay={0.1}
              />
              <StatCard
                icon={Ruler}
                iconColor="text-risk-moderate"
                bgColor="bg-risk-moderate/20"
                label={t("analytics.largest")}
                value={totals.maxDiameter ? Math.round(totals.maxDiameter) : "—"}
                subValue="m"
                delay={0.15}
              />
              <StatCard
                icon={Crosshair}
                iconColor="text-risk-high"
                bgColor="bg-risk-high/20"
                label={t("analytics.closest")}
                value={totals.minDistance ? totals.minDistance.toFixed(2) : "—"}
                subValue="LD"
                delay={0.2}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Risk distribution */}
              <ChartCard title={t("analytics.riskDistribution")} delay={0.1}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.riskDistribution || []}
                      margin={{ top: 20, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} {...AXIS} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} {...AXIS} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" name={t("analytics.objects")} radius={[4, 4, 0, 0]} maxBarSize={56}>
                        {(data?.riskDistribution || []).map((d) => (
                          <Cell key={d.category} fill={RISK_COLORS[d.category]} />
                        ))}
                        <LabelList dataKey="count" position="top" fill="rgba(255,255,255,0.8)" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Daily approaches */}
              <ChartCard title={t("analytics.dailyApproaches")} delay={0.15}>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(d) => d.slice(5)}
                        {...AXIS}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} {...AXIS} />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }} />
                      <Bar
                        dataKey="safe"
                        stackId="a"
                        name={t("analytics.objects")}
                        fill={SERIES.safe}
                        stroke="#0f172a"
                        strokeWidth={2}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="hazardous"
                        stackId="a"
                        name={t("common.hazardous")}
                        fill={SERIES.hazardous}
                        stroke="#0f172a"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Speed vs distance scatter */}
            <ChartCard
              title={t("analytics.scatterTitle")}
              hint={t("analytics.scatterHint")}
              delay={0.2}
            >
              <div className="h-80 sm:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 16 }}>
                    <CartesianGrid stroke={GRID} />
                    <XAxis
                      type="number"
                      dataKey="distance"
                      name={t("common.distance")}
                      unit=" LD"
                      tickLine={false}
                      {...AXIS}
                      label={{ value: `${t("common.distance")} (LD)`, position: "insideBottom", offset: -8, fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="velocity"
                      name={t("common.velocity")}
                      tickLine={false}
                      {...AXIS}
                      label={{ value: "km/s", angle: -90, position: "insideLeft", offset: 20, fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    />
                    <ZAxis type="number" dataKey="diameter" range={[40, 400]} />
                    <Tooltip content={<ScatterTooltip t={t} />} cursor={{ strokeDasharray: "3 3" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }} />
                    <Scatter
                      name={t("analytics.objects")}
                      data={scatterSafe}
                      fill={SERIES.scatterSafe}
                      fillOpacity={0.7}
                      stroke="#0f172a"
                      strokeWidth={2}
                      onClick={(p) => navigate(`/asteroid/${p.id}`)}
                      className="cursor-pointer"
                    />
                    <Scatter
                      name={t("common.hazardous")}
                      data={scatterHaz}
                      fill={SERIES.hazardous}
                      fillOpacity={0.85}
                      stroke="#0f172a"
                      strokeWidth={2}
                      shape="diamond"
                      onClick={(p) => navigate(`/asteroid/${p.id}`)}
                      className="cursor-pointer"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Size distribution */}
            <ChartCard title={t("analytics.sizeDistribution")} delay={0.25}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.sizeDistribution || []}
                    margin={{ top: 20, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} interval={0} {...AXIS} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} {...AXIS} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" name={t("analytics.objects")} fill={SERIES.safe} radius={[4, 4, 0, 0]} maxBarSize={56}>
                      <LabelList dataKey="count" position="top" fill="rgba(255,255,255,0.8)" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Table view — accessible alternative to the charts */}
            <div className="glass p-5 sm:p-6">
              <button
                className="flex items-center gap-2 text-sm text-accent-primary hover:underline"
                onClick={() => setShowTable((v) => !v)}
              >
                <Table2 className="w-4 h-4" />
                {t("analytics.dailyApproaches")} — table
              </button>
              {showTable && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-white/50">
                      <tr>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">{t("analytics.total")}</th>
                        <th className="py-2 pr-4">{t("common.hazardous")}</th>
                        <th className="py-2 pr-4">{t("analytics.avgRisk")}</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      {daily.map((d) => (
                        <tr key={d.date} className="border-t border-white/5">
                          <td className="py-2 pr-4 font-mono">{d.date}</td>
                          <td className="py-2 pr-4">{d.total}</td>
                          <td className="py-2 pr-4">{d.hazardous}</td>
                          <td className="py-2 pr-4">{d.avgRisk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        }
      </div>
    </div>
  );
};

export default Analytics;
