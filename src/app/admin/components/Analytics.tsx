import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Download, TrendingUp, Users, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData, exportCsv } from "../lib/adminApi";

const RANGE_MONTHS: Record<string, number> = { "3M": 3, "6M": 6, "1Y": 12 };
const ranges = ["3M", "6M", "1Y"];

export function Analytics(_props?: any) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.analytics);
  const { data: pay } = useAdminData(adminApi.payments);
  const [range, setRange] = useState("1Y");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  const growth: any[] = data?.growth || [];
  const retention = data?.retention || { totalUsers: 0, activeUsers: 0, returning: 0, completionRate: 0, cancellationRate: 0 };
  const weekly: any[] = data?.weekly || [];
  const moodDist: any[] = data?.moodDist || [];
  const monthlyRevenue: any[] = pay?.monthly || [];

  // Trim the growth series to the selected range, and merge in revenue by month
  const sliced = growth.slice(-(RANGE_MONTHS[range] || 12));
  const monthlyData = sliced.map((g: any) => {
    const rev = monthlyRevenue.find((m: any) => m.month === g.month);
    return { ...g, revenue: rev ? rev.revenue : 0 };
  });

  const specializationTotal = (data?.categories || []).reduce((s: number, c: any) => s + c.value, 0) || 1;
  const specializationData = (data?.categories || []).map((c: any) => ({
    ...c, pct: Math.round((c.value / specializationTotal) * 100),
  }));

  // Growth rate = new users this month vs the month before
  const last = growth[growth.length - 1];
  const prev = growth[growth.length - 2];
  const newThisMonth = last && prev ? last.users - prev.users : 0;
  const growthRate = prev && prev.users
    ? (((last.users - prev.users) / prev.users) * 100).toFixed(1)
    : "0.0";
  const revenuePerUser = retention.totalUsers && pay
    ? (pay.summary.totalRevenue / retention.totalUsers).toFixed(2)
    : "0.00";

  const kpiCards = [
    { label: "User Growth Rate", value: `${Number(growthRate) >= 0 ? "+" : ""}${growthRate}%`, sub: "vs last month", up: Number(growthRate) >= 0, icon: TrendingUp, color: "#5E8B7E", bg: "#F0F7F5" },
    { label: "Total Users", value: retention.totalUsers.toLocaleString(), sub: `+${newThisMonth} this month`, up: newThisMonth >= 0, icon: Users, color: "#42A5F5", bg: "#EBF5FF" },
    { label: "Session Completion", value: `${retention.completionRate}%`, sub: `${retention.cancellationRate}% cancelled`, up: retention.completionRate >= 50, icon: Calendar, color: "#4CAF50", bg: "#EAF7EA" },
    { label: "Revenue / User", value: `$${revenuePerUser}`, sub: `${retention.activeUsers} active users`, up: true, icon: DollarSign, color: "#D8A48F", bg: "#FDF3EE" },
  ];

  function handleExport() {
    exportCsv("analytics.csv", monthlyData.map((m: any) => ({
      Month: m.month, Users: m.users, Counselors: m.counselors,
      Appointments: m.appointments, Revenue: m.revenue,
    })));
    showToast("analytics.csv downloaded");
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading analytics…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load analytics</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl shadow-xl border px-4 py-3 text-xs min-w-32"
        style={{ background: t.card, borderColor: t.border }}>
        <p className="font-semibold mb-2" style={{ color: t.text }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="flex items-center justify-between gap-3" style={{ color: p.color }}>
            <span>{p.name}</span><strong>{p.value?.toLocaleString?.() ?? p.value}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Analytics</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>Platform growth and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: t.card2 }}>
            {ranges.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={range === r ? { background: t.card, color: t.text, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: t.muted }}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
            style={{ color: t.textSec, borderColor: t.border, background: t.card, cursor: "pointer" }}>
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-5 border"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold"
                  style={{ color: c.up ? "#4CAF50" : "#EF5350" }}>
                  {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{c.value}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: c.color }}>{c.sub}</div>
              <div className="text-xs mt-0.5" style={{ color: t.muted }}>{c.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Growth + Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-3 rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Platform Growth</h3>
          <p className="text-xs mb-5" style={{ color: t.muted }}>
            Cumulative users, counselors & appointments over the last {RANGE_MONTHS[range] || 12} months
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="users" stroke="#5E8B7E" strokeWidth={2.5} dot={false} name="Users" activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="appointments" stroke="#D8A48F" strokeWidth={2.5} dot={false} name="Appointments" activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="counselors" stroke="#42A5F5" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Counselors" activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="xl:col-span-2 rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Specialization Split</h3>
          <p className="text-xs mb-2" style={{ color: t.muted }}>Session types by category</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={specializationData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                {specializationData.map((e: any, i: number) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {specializationData.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: t.muted }}>No sessions booked yet</p>
            )}
            {specializationData.map((s: any) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs flex-1 truncate" style={{ color: t.textSec }}>{s.name}</span>
                <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: t.card2 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="h-full rounded-full" style={{ background: s.color }} />
                </div>
                <span className="text-xs font-semibold w-7 text-right" style={{ color: t.text }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Revenue + Peak Hours */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Revenue Trend</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>Monthly revenue growth (USD)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="aRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D8A48F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D8A48F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#D8A48F" strokeWidth={2.5} fill="url(#aRevGrad)" name="Revenue" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>This Week's Activity</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>Appointments by day and status</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={16} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey="completed" name="Completed" fill="#5E8B7E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#D8A48F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#EF5350" radius={[4, 4, 0, 0]} opacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Retention + Mood */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Engagement</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>How many registered users actually book sessions</p>
          <div className="space-y-3">
            {[
              { label: "Registered users", value: retention.totalUsers, of: retention.totalUsers, color: "#5E8B7E" },
              { label: "Booked at least one session", value: retention.activeUsers, of: retention.totalUsers, color: "#2D6A4F" },
              { label: "Returning (2+ sessions)", value: retention.returning, of: retention.totalUsers, color: "#D8A48F" },
            ].map(r => (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: t.textSec }}>{r.label}</span>
                  <span className="text-xs font-semibold" style={{ color: t.text }}>{r.value}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: t.card2 }}>
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${r.of ? (r.value / r.of) * 100 : 0}%` }}
                    transition={{ duration: 0.7 }}
                    className="h-full rounded-full" style={{ background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Mood Check-ins</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>Aggregate, anonymised mood entries across the platform</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={moodDist} barSize={28} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Entries" radius={[4, 4, 0, 0]}>
                {moodDist.map((m: any, i: number) => (
                  <Cell key={i} fill={["#EF5350", "#F59E0B", "#FFC107", "#5E8B7E", "#2D6A4F"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium text-white"
            style={{ background: "#1F2937" }}>
            <Download className="w-4 h-4" style={{ color: "#5E8B7E" }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
