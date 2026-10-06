import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  Activity,
  Database,
  Server,
  Satellite,
  Users,
  Siren,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DownloadCloud,
} from "lucide-react";
import { adminApi } from "../services/api";
import useAuthStore from "../stores/authStore";

const formatUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
};

const StatusPill = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      ok ? "bg-risk-minimal/15 text-risk-minimal" : "bg-risk-high/15 text-risk-high"
    }`}
  >
    {ok ?
      <CheckCircle2 className="w-3 h-3" />
    : <XCircle className="w-3 h-3" />}
    {label}
  </span>
);

const Metric = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-white/5 last:border-0">
    <span className="text-white/50">{label}</span>
    <span className="text-white font-mono text-right">{value}</span>
  </div>
);

const Panel = ({ icon: Icon, title, right, children, className = "" }) => (
  <motion.div
    className={`glass p-5 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="flex items-center gap-2 font-semibold text-white">
        <Icon className="w-5 h-5 text-accent-primary" />
        {title}
      </h2>
      {right}
    </div>
    {children}
  </motion.div>
);

const levelBadge = {
  red: "bg-risk-high/20 text-risk-high",
  warning: "bg-risk-moderate/20 text-risk-moderate",
  info: "bg-accent-secondary/20 text-indigo-300",
};

const AdminConsole = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [health, setHealth] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [users, setUsers] = useState([]);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    level: "red",
    title: "",
    message: "",
    asteroidId: "",
    isSimulation: true,
  });

  const loadHealth = useCallback(async () => {
    try {
      const res = await adminApi.getHealth();
      setHealth(res.data.data);
    } catch {
      setHealth(null);
    }
  }, []);

  const loadLists = useCallback(async () => {
    const [b, u] = await Promise.allSettled([
      adminApi.getBroadcasts(),
      adminApi.getUsers(),
    ]);
    if (b.status === "fulfilled") setBroadcasts(b.value.data.data);
    if (u.status === "fulfilled") setUsers(u.value.data.data);
  }, []);

  useEffect(() => {
    loadHealth();
    loadLists();
    const id = setInterval(loadHealth, 15000);
    return () => clearInterval(id);
  }, [loadHealth, loadLists]);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const dispatchAlert = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await adminApi.broadcast({
        ...form,
        asteroidId: form.asteroidId.trim() || undefined,
      });
      flash("ok", t("admin.sent", { count: res.data.data.recipients }));
      setForm((f) => ({ ...f, title: "", message: "", asteroidId: "" }));
      loadLists();
    } catch (err) {
      flash("error", err.response?.data?.message || "Dispatch failed");
    } finally {
      setSending(false);
    }
  };

  const triggerSync = async (type) => {
    try {
      await adminApi.triggerFetch(type);
      flash("ok", t("admin.syncStarted"));
      setTimeout(loadHealth, 4000);
    } catch (err) {
      flash("error", err.response?.data?.message || "Sync failed");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await adminApi.setUserRole(id, role);
      setUsers((list) => list.map((u) => (u._id === id ? { ...u, role } : u)));
    } catch (err) {
      flash("error", err.response?.data?.message || "Role update failed");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <ShieldAlert className="w-12 h-12 text-risk-high mx-auto mb-4" />
        <p className="text-white/70">Admin privileges required.</p>
      </div>
    );
  }

  const nasa = health?.nasa;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-risk-high mb-2">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Gov / Admin
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {t("admin.title")}
          </h1>
          <p className="text-white/50">{t("admin.subtitle")}</p>
        </motion.div>

        {notice && (
          <div
            role="status"
            className={`glass p-3 text-sm ${notice.type === "ok" ? "text-risk-minimal" : "text-risk-high"}`}
          >
            {notice.text}
          </div>
        )}

        {nasa?.usingDemoKey && (
          <div className="glass p-3 text-sm text-risk-moderate flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t("admin.demoKeyWarning")}
          </div>
        )}

        {/* System Health */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Panel
            icon={Server}
            title={t("admin.health")}
            right={
              <button onClick={loadHealth} className="p-1 rounded hover:bg-white/5" aria-label={t("common.refresh")}>
                <RefreshCw className="w-4 h-4 text-white/50" />
              </button>
            }
          >
            {health ?
              <>
                <Metric label={t("admin.uptime")} value={formatUptime(health.server.uptimeSeconds)} />
                <Metric label={t("admin.memory")} value={`${health.server.memoryMb.heapUsed} / ${health.server.memoryMb.rss} MB`} />
                <Metric label="Node" value={health.server.nodeVersion} />
                <Metric label="Env" value={health.server.environment} />
              </>
            : <p className="text-white/40 text-sm">{t("common.loading")}</p>}
          </Panel>

          <Panel icon={Database} title={`${t("admin.database")} & ${t("admin.cache")}`}>
            {health && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  <StatusPill ok={health.database.status === "connected"} label={`MongoDB ${health.database.status}`} />
                  <StatusPill ok={health.cache.backend === "redis"} label={health.cache.backend === "redis" ? "Redis" : "In-memory"} />
                </div>
                <Metric label={`DB ${t("admin.latency")}`} value={health.database.pingMs != null ? `${health.database.pingMs} ms` : "—"} />
                <Metric label="Cache hits / misses" value={`${health.cache.hits} / ${health.cache.misses}`} />
              </>
            )}
          </Panel>

          <Panel icon={Satellite} title={t("admin.nasaApi")}>
            {nasa && (
              <>
                <Metric label={t("admin.latency")} value={nasa.lastLatencyMs != null ? `${nasa.lastLatencyMs} ms (avg ${nasa.avgLatencyMs})` : "—"} />
                <Metric
                  label={t("admin.rateLimit")}
                  value={nasa.rateLimitRemaining != null ? `${nasa.rateLimitRemaining} / ${nasa.rateLimitLimit}` : "—"}
                />
                <Metric label={t("admin.calls")} value={`${nasa.totalCalls} / ${nasa.failedCalls}`} />
                {nasa.lastError && <p className="text-xs text-risk-high mt-2">{nasa.lastError}</p>}
              </>
            )}
          </Panel>

          <Panel icon={Activity} title="Realtime">
            {health && (
              <>
                <Metric label={t("admin.connected")} value={health.realtime.connectedClients} />
                <Metric label={t("admin.chatUsers")} value={health.realtime.chatUsers} />
                <Metric label={t("admin.active24h")} value={health.realtime.activeUsers24h} />
              </>
            )}
          </Panel>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Alert Dispatch */}
          <Panel icon={Siren} title={t("admin.dispatch")} className="lg:col-span-3 border border-risk-high/20">
            <p className="text-sm text-white/50 mb-4">{t("admin.dispatchHint")}</p>
            <form onSubmit={dispatchAlert} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t("admin.level")}>
                {[
                  ["red", t("admin.levelRed")],
                  ["warning", t("admin.levelWarning")],
                  ["info", t("admin.levelInfo")],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={form.level === value}
                    onClick={() => setForm((f) => ({ ...f, level: value }))}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      form.level === value ?
                        `${levelBadge[value]} border-current`
                      : "border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="input-field"
                placeholder={t("admin.alertTitle")}
                value={form.title}
                maxLength={120}
                required
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                className="input-field min-h-[100px]"
                placeholder={t("admin.alertMessage")}
                value={form.message}
                maxLength={1000}
                required
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder={t("admin.asteroidId")}
                value={form.asteroidId}
                onChange={(e) => setForm((f) => ({ ...f, asteroidId: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.isSimulation}
                  onChange={(e) => setForm((f) => ({ ...f, isSimulation: e.target.checked }))}
                  className="w-4 h-4"
                />
                {t("admin.simulation")}
              </label>
              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-risk-high text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                {t("admin.send")}
              </button>
            </form>
          </Panel>

          <div className="lg:col-span-2 space-y-6">
            {/* Data operations */}
            <Panel icon={DownloadCloud} title={t("admin.dataOps")}>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary text-sm" onClick={() => triggerSync("today")}>
                  {t("admin.syncToday")}
                </button>
                <button className="btn-secondary text-sm" onClick={() => triggerSync("week")}>
                  {t("admin.syncWeek")}
                </button>
              </div>
            </Panel>

            {/* Dispatch history */}
            <Panel icon={Siren} title={t("admin.history")}>
              {broadcasts.length === 0 ?
                <p className="text-sm text-white/40">{t("admin.noBroadcasts")}</p>
              : <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {broadcasts.map((b) => (
                    <li key={b._id} className="text-sm border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${levelBadge[b.level]}`}>
                          {b.level}
                        </span>
                        <span className="text-white font-medium">{b.title}</span>
                      </div>
                      <p className="text-white/50 text-xs mt-1">
                        {new Date(b.createdAt).toLocaleString()} · {b.issuedByName} · {b.recipients} clients
                        {b.isSimulation ? " · drill" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              }
            </Panel>
          </div>
        </div>

        {/* Users & roles */}
        <Panel icon={Users} title={t("admin.users")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-white/50">
                <tr>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">{t("nav.watchlist")}</th>
                  <th className="py-2 pr-4">{t("admin.lastLogin")}</th>
                  <th className="py-2 pr-4">{t("admin.role")}</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-white/5">
                    <td className="py-2 pr-4">{u.displayName}</td>
                    <td className="py-2 pr-4 text-white/60">{u.email}</td>
                    <td className="py-2 pr-4">{u.watchlistCount}</td>
                    <td className="py-2 pr-4 text-white/60">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : t("admin.never")}
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        className="bg-space-800 border border-white/10 rounded-lg px-2 py-1 text-sm"
                        value={u.role}
                        disabled={u._id === user?._id}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                      >
                        <option value="user">Public</option>
                        <option value="researcher">Researcher</option>
                        <option value="admin">Gov / Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default AdminConsole;
