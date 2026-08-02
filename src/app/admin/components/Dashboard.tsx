import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, UserCheck, Calendar, CheckCircle, Clock, DollarSign,
  TrendingUp, TrendingDown, ArrowRight, Activity, Server,
  Wifi, HardDrive, AlertCircle, Star,
  ArrowUpRight, Plus, RefreshCw
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";
import { getUser } from "../../lib/auth";

// Presentation for each live stat, keyed by the `key` the API returns.
const STAT_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  users:      { icon: Users,       color: "#5E8B7E", bg: "linear-gradient(135deg,#F0F9F7,#E8F5F1)" },
  counselors: { icon: UserCheck,   color: "#2D6A4F", bg: "linear-gradient(135deg,#EAF5EE,#D8F0E0)" },
  today:      { icon: Calendar,    color: "#42A5F5", bg: "linear-gradient(135deg,#EBF4FF,#D6EAFF)" },
  completed:  { icon: CheckCircle, color: "#4CAF50", bg: "linear-gradient(135deg,#EAF7EA,#D4F0D4)" },
  pending:    { icon: Clock,       color: "#F59E0B", bg: "linear-gradient(135deg,#FEF9EE,#FEF0D3)" },
  revenue:    { icon: DollarSign,  color: "#D8A48F", bg: "linear-gradient(135deg,#FDF3EE,#FAEAD8)" },
};

const SYSTEM_ICONS: Record<string, any> = {
  "API Server": Server,
  "Data Store": HardDrive,
  "Auth Service": Wifi,
  "File Uploads": Activity,
};

const NOTES_KEY = "cc_admin_notes";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDynamicDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function Dashboard({ onNavigate }: { onNavigate?: (p: any, a?: string) => void } = {}) {
  const { t } = useTheme();
  const admin = getUser();
  const { data, loading, error, refetch } = useAdminData(adminApi.dashboard);
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY) || "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function saveNotes() {
    localStorage.setItem(NOTES_KEY, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1800);
  }

  // ── Live data, with safe fallbacks while the request is in flight ──
  const stats = (data?.stats || []).map((s: any) => ({
    ...s,
    ...(STAT_STYLE[s.key] || STAT_STYLE.users),
  }));
  const userGrowthData    = data?.userGrowth || [];
  const appointmentData   = data?.appointmentWeek || [];
  const rawCategories     = data?.sessionCategories || [];
  const recentActivities  = data?.recentActivities || [];
  const upcomingSessions  = data?.upcomingSessions || [];
  const topCounselors     = data?.topCounselors || [];
  const systemStatus      = (data?.systemStatus || []).map((s: any) => ({
    ...s, icon: SYSTEM_ICONS[s.name] || Activity,
  }));
  const counts            = data?.counts || { users: 0, counselors: 0, appointments: 0, pendingCounselors: 0 };

  // Pie chart wants percentages; the API returns raw session counts.
  const categoryTotal = rawCategories.reduce((s: number, c: any) => s + c.value, 0) || 1;
  const sessionCategories = rawCategories.map((c: any) => ({
    ...c, pct: Math.round((c.value / categoryTotal) * 100),
  }));

  const pendingStat  = stats.find((s: any) => s.key === "pending");
  const todayStat    = stats.find((s: any) => s.key === "today");
  const revenueStat  = stats.find((s: any) => s.key === "revenue");
  const healthyCount = systemStatus.filter((s: any) => s.health >= 95).length;

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#5E8B7E" }} />
          <p className="text-sm" style={{ color: t.muted }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-6 border flex items-start gap-3 max-w-lg"
          style={{ background: t.card, borderColor: "#EF535030" }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#EF5350" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load the dashboard</p>
            <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
            <p className="text-xs mt-2" style={{ color: t.muted }}>
              Make sure the backend is running at <code>http://localhost:5000</code>.
            </p>
            <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: "#5E8B7E" }}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl shadow-xl border px-4 py-3 text-xs"
          style={{ background: t.card, borderColor: t.border }}>
          <p className="font-semibold mb-1" style={{ color: t.text }}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: <strong>{p.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #3a7066 0%, #2D6A4F 55%, #1e4a36 100%)" }}
      >
        {[
          { size: 280, x: "right-[-60px]", y: "top-[-80px]", op: 0.08 },
          { size: 160, x: "right-[120px]", y: "bottom-[-50px]", op: 0.06 },
          { size: 80, x: "right-[280px]", y: "top-[20px]", op: 0.1 },
        ].map((c, i) => (
          <div key={i}
            className={`absolute rounded-full border-2 border-white ${c.x} ${c.y} pointer-events-none`}
            style={{ width: c.size, height: c.size, opacity: c.op }}
          />
        ))}

        <div className="relative flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
                {getDynamicDate()}
              </span>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4CAF50" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>Live</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {getGreeting()}, {admin?.firstName || admin?.name || "Admin"} 👋
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
              You have{" "}
              <span className="font-semibold text-white underline decoration-dotted">
                {pendingStat?.value ?? 0} pending request{pendingStat?.value === "1" ? "" : "s"}
              </span>{" "}
              and{" "}
              <span className="font-semibold text-white underline decoration-dotted">
                {todayStat?.value ?? 0} session{todayStat?.value === "1" ? "" : "s"}
              </span>{" "}
              scheduled today.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => onNavigate?.("appointments")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.18)", color: "white", backdropFilter: "blur(8px)" }}>
                <Plus className="w-3.5 h-3.5" /> New Appointment
              </button>
              <button onClick={() => onNavigate?.("reports")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                <ArrowRight className="w-3.5 h-3.5" /> View Reports
              </button>
            </div>
          </div>

          <div className="hidden lg:flex gap-3 shrink-0">
            {[
              { label: "Total Revenue", value: revenueStat?.value ?? "$0", sub: `${counts.appointments} bookings` },
              { label: "Counselors", value: String(counts.counselors), sub: `${counts.pendingCounselors} awaiting review` },
              { label: "Registered Users", value: String(counts.users), sub: "All time" },
            ].map(card => (
              <div key={card.label}
                className="rounded-2xl px-4 py-3 min-w-[110px] text-center"
                style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(12px)" }}>
                <div className="text-xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>{card.value}</div>
                <div className="text-xs font-medium text-white/80 mt-0.5">{card.label}</div>
                <div className="text-xs text-white/50 mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.06 }}
              whileHover={{ y: -4, boxShadow: t.shadowHov }}
              className="rounded-2xl p-4 border cursor-default"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.bg }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-lg"
                  style={{
                    color: s.up ? "#4CAF50" : "#EF5350",
                    background: s.up ? "#EAF7EA" : "#FEF2F2"
                  }}>
                  {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>
                {s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: t.muted }}>{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-3 rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>User Growth</h3>
              <p className="text-xs mt-0.5" style={{ color: t.muted }}>Yearly users and counselors</p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button onClick={handleRefresh} whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: t.card2 }}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} style={{ color: t.muted }} />
              </motion.button>
              <span className="text-xs px-2.5 py-1 rounded-lg border" style={{ color: t.textSec, borderColor: t.border }}>
                {new Date().getFullYear()}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={userGrowthData} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="gUserGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5E8B7E" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#5E8B7E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCounselorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D8A48F" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#D8A48F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="users" stroke="#5E8B7E" strokeWidth={2.5} fill="url(#gUserGrad)" name="Users" dot={false} activeDot={{ r: 5, fill: "#5E8B7E" }} />
              <Area type="monotone" dataKey="counselors" stroke="#D8A48F" strokeWidth={2.5} fill="url(#gCounselorGrad)" name="Counselors" dot={false} activeDot={{ r: 5, fill: "#D8A48F" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="xl:col-span-2 rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Session Types</h3>
          <p className="text-xs mb-3" style={{ color: t.muted }}>Therapy category breakdown</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={sessionCategories} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                {sessionCategories.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {sessionCategories.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: t.muted }}>No sessions booked yet</p>
            )}
            {sessionCategories.map((cat: any) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-xs flex-1 truncate" style={{ color: t.textSec }}>{cat.name}</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: t.card2 }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="h-full rounded-full" style={{ background: cat.color }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: t.text }}>{cat.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Appointments + System ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="xl:col-span-3 rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Weekly Appointments</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>Status breakdown for this week</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={appointmentData} barSize={14} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey="completed" name="Completed" fill="#5E8B7E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#D8A48F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#EF5350" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="xl:col-span-2 rounded-2xl p-5 border flex flex-col"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>System Health</h3>
              <p className="text-xs mt-0.5" style={{ color: t.muted }}>Real-time monitoring</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: "#EAF7EA", color: "#4CAF50" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4CAF50" }} />
              {healthyCount}/{systemStatus.length} Healthy
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {systemStatus.map((sys: any, i: number) => {
              const Icon = sys.icon;
              return (
                <div key={sys.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: sys.color + "15" }}>
                    <Icon className="w-4 h-4" style={{ color: sys.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium" style={{ color: t.text }}>{sys.name}</span>
                      <span className="text-xs font-semibold" style={{ color: sys.color }}>{sys.health}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: t.card2 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sys.health}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: sys.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {counts.pendingCounselors > 0 ? (
            <button onClick={() => onNavigate?.("counselors")}
              className="mt-4 p-3 rounded-xl flex items-start gap-2.5 w-full text-left"
              style={{ background: "#FFF9E8", border: "1px solid #FFC10725" }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FFC107" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#92680B" }}>
                  {counts.pendingCounselors} counselor application{counts.pendingCounselors === 1 ? "" : "s"} pending
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Click to review and approve</p>
              </div>
            </button>
          ) : (
            <div className="mt-4 p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "#EAF7EA", border: "1px solid #4CAF5025" }}>
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#4CAF50" }} />
              <div>
                <p className="text-xs font-medium" style={{ color: "#2E7D32" }}>All systems operational</p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>No pending approvals</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Recent Activity</h3>
            <button onClick={() => onNavigate?.("notifications")}
              className="text-xs flex items-center gap-1 font-medium" style={{ color: "#5E8B7E" }}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.length === 0 && (
              <p className="text-xs" style={{ color: t.muted }}>No activity recorded yet</p>
            )}
            {recentActivities.map((a: any, i: number) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: a.color }}>
                  {a.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: t.text }}>{a.action}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: t.muted }}>{a.name}</p>
                </div>
                <span className="text-xs whitespace-nowrap shrink-0" style={{ color: t.muted }}>{a.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Upcoming Sessions</h3>
            <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: "#F0F7F5", color: "#5E8B7E" }}>
              Today
            </span>
          </div>
          <div className="space-y-2.5">
            {upcomingSessions.length === 0 && (
              <p className="text-xs" style={{ color: t.muted }}>No upcoming sessions</p>
            )}
            {upcomingSessions.map((s: any, i: number) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                onClick={() => onNavigate?.("appointments")}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                style={{ border: `1px solid ${t.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: s.color + "15" }}>
                  <span className="text-xs font-bold leading-none" style={{ color: s.color }}>
                    {String(s.time).split(":")[0] || "—"}
                  </span>
                  <span className="text-xs leading-none mt-0.5" style={{ color: s.color + "99" }}>
                    {String(s.time).toUpperCase().includes("PM") ? "PM" : "AM"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: t.text }}>{s.user}</p>
                  <p className="text-xs truncate" style={{ color: t.muted }}>{s.counselor}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                  style={{ background: s.color + "15", color: s.color }}>
                  {s.type}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <div className="rounded-2xl p-5 border"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <h3 className="font-semibold mb-3" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Top Counselors</h3>
            <div className="space-y-2.5">
              {topCounselors.length === 0 && (
                <p className="text-xs" style={{ color: t.muted }}>No counselor activity yet</p>
              )}
              {topCounselors.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-2.5">
                  <span className="text-xs font-bold w-4 text-center" style={{ color: t.muted }}>{i + 1}</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: c.color }}>{c.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: t.text }}>{c.name}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400" style={{ color: "#FFC107" }} />
                    <span className="text-xs font-semibold" style={{ color: t.text }}>{c.rating}</span>
                  </div>
                  <span className="text-xs" style={{ color: t.muted }}>{c.sessions}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 border"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Quick Notes</h3>
              <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "#FDF3EE", color: "#D8A48F" }}>Private</span>
            </div>
            <textarea
              value={notes}
              placeholder="Jot down anything you need to remember…"
              onChange={e => setNotes(e.target.value)}
              className="w-full h-24 text-xs p-3 rounded-xl resize-none outline-none transition-all focus:ring-2"
              style={{
                background: t.input,
                color: t.text,
                lineHeight: "1.8",
                border: `1px solid ${t.inputBorder}`,
              }}
              onFocus={e => e.target.style.borderColor = "#5E8B7E"}
              onBlur={e => e.target.style.borderColor = t.inputBorder}
            />
            <button onClick={saveNotes}
              className="mt-2 w-full py-1.5 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: notesSaved ? "#4CAF50" : "#5E8B7E" }}>
              {notesSaved ? "✓ Saved" : "Save Notes"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
