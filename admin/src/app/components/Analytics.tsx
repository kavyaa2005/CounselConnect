import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Download, TrendingUp, Users, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const monthlyData = [
  { month: "Jan", users: 420, appointments: 680, revenue: 18400, counselors: 32 },
  { month: "Feb", users: 580, appointments: 920, revenue: 22100, counselors: 38 },
  { month: "Mar", users: 720, appointments: 1100, revenue: 27300, counselors: 45 },
  { month: "Apr", users: 890, appointments: 1340, revenue: 31800, counselors: 52 },
  { month: "May", users: 1050, appointments: 1580, revenue: 38200, counselors: 61 },
  { month: "Jun", users: 1280, appointments: 1820, revenue: 44700, counselors: 70 },
  { month: "Jul", users: 1420, appointments: 2040, revenue: 49300, counselors: 78 },
  { month: "Aug", users: 1690, appointments: 2280, revenue: 54100, counselors: 85 },
  { month: "Sep", users: 1840, appointments: 2520, revenue: 59800, counselors: 92 },
  { month: "Oct", users: 2100, appointments: 2760, revenue: 66400, counselors: 104 },
  { month: "Nov", users: 2380, appointments: 3020, revenue: 73200, counselors: 115 },
  { month: "Dec", users: 2640, appointments: 3280, revenue: 81400, counselors: 128 },
];

const peakHoursData = [
  { hour: "6AM", sessions: 8 }, { hour: "7AM", sessions: 14 }, { hour: "8AM", sessions: 28 },
  { hour: "9AM", sessions: 45 }, { hour: "10AM", sessions: 62 }, { hour: "11AM", sessions: 58 },
  { hour: "12PM", sessions: 42 }, { hour: "1PM", sessions: 38 }, { hour: "2PM", sessions: 55 },
  { hour: "3PM", sessions: 67 }, { hour: "4PM", sessions: 72 }, { hour: "5PM", sessions: 61 },
  { hour: "6PM", sessions: 48 }, { hour: "7PM", sessions: 35 }, { hour: "8PM", sessions: 22 },
];

const specializationData = [
  { name: "Anxiety & Stress", value: 28, color: "#5E8B7E" },
  { name: "Depression", value: 22, color: "#2D6A4F" },
  { name: "Relationships", value: 18, color: "#D8A48F" },
  { name: "Trauma & PTSD", value: 15, color: "#42A5F5" },
  { name: "Addiction", value: 10, color: "#F59E0B" },
  { name: "Career & Life", value: 7, color: "#EF5350" },
];

const kpiCards = [
  { label: "User Growth Rate", value: "+18.7%", sub: "vs last month", up: true, icon: TrendingUp, color: "#5E8B7E", bg: "#F0F7F5" },
  { label: "Total Users", value: "12,847", sub: "+2,340 this month", up: true, icon: Users, color: "#42A5F5", bg: "#EBF5FF" },
  { label: "Session Completion", value: "94.2%", sub: "+2.1% from prior", up: true, icon: Calendar, color: "#4CAF50", bg: "#EAF7EA" },
  { label: "Avg Revenue/User", value: "$48.30", sub: "+$5.20 vs last month", up: true, icon: DollarSign, color: "#D8A48F", bg: "#FDF3EE" },
];

const ranges = ["7D", "30D", "90D", "1Y"];

export function Analytics(_props?: any) {
  const { t } = useTheme();
  const [range, setRange] = useState("1Y");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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
          <div className="flex gap-1.5">
            {["PDF", "CSV"].map(fmt => (
              <button key={fmt}
                onClick={() => showToast(`Downloading ${fmt}...`)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
                style={{ color: t.textSec, borderColor: t.border, background: t.card, cursor: "pointer" }}>
                <Download className="w-3 h-3" /> {fmt}
              </button>
            ))}
          </div>
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
          <p className="text-xs mb-5" style={{ color: t.muted }}>Users & appointments over 12 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
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
                {specializationData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {specializationData.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs flex-1 truncate" style={{ color: t.textSec }}>{s.name}</span>
                <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: t.card2 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.value * 3.5}%` }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="h-full rounded-full" style={{ background: s.color }} />
                </div>
                <span className="text-xs font-semibold w-7 text-right" style={{ color: t.text }}>{s.value}%</span>
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
          <h3 className="font-semibold mb-0.5" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Peak Activity Hours</h3>
          <p className="text-xs mb-4" style={{ color: t.muted }}>Average sessions by hour of day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakHoursData} barSize={16} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" name="Sessions" fill="#5E8B7E" radius={[4, 4, 0, 0]}>
                {peakHoursData.map((entry, i) => (
                  <Cell key={i} fill={entry.sessions >= 60 ? "#2D6A4F" : "#5E8B7E"} />
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
