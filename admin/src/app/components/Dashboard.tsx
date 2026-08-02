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

const userGrowthData = [
  { month: "Jan", users: 420, counselors: 32 },
  { month: "Feb", users: 580, counselors: 38 },
  { month: "Mar", users: 720, counselors: 45 },
  { month: "Apr", users: 890, counselors: 52 },
  { month: "May", users: 1050, counselors: 61 },
  { month: "Jun", users: 1280, counselors: 70 },
  { month: "Jul", users: 1420, counselors: 78 },
  { month: "Aug", users: 1690, counselors: 85 },
  { month: "Sep", users: 1840, counselors: 92 },
  { month: "Oct", users: 2100, counselors: 104 },
  { month: "Nov", users: 2380, counselors: 115 },
  { month: "Dec", users: 2640, counselors: 128 },
];

const appointmentData = [
  { day: "Mon", completed: 42, pending: 18, cancelled: 6 },
  { day: "Tue", completed: 38, pending: 22, cancelled: 4 },
  { day: "Wed", completed: 55, pending: 15, cancelled: 8 },
  { day: "Thu", completed: 48, pending: 28, cancelled: 5 },
  { day: "Fri", completed: 61, pending: 20, cancelled: 9 },
  { day: "Sat", completed: 35, pending: 10, cancelled: 3 },
  { day: "Sun", completed: 22, pending: 8, cancelled: 2 },
];

const sessionCategories = [
  { name: "Anxiety & Stress", value: 32, color: "#5E8B7E" },
  { name: "Depression", value: 24, color: "#2D6A4F" },
  { name: "Relationships", value: 18, color: "#D8A48F" },
  { name: "Trauma & PTSD", value: 14, color: "#42A5F5" },
  { name: "Career & Life", value: 12, color: "#FFC107" },
];

const stats = [
  { label: "Total Users", value: "12,847", change: "+8.2%", up: true, icon: Users, color: "#5E8B7E", bg: "linear-gradient(135deg,#F0F9F7,#E8F5F1)" },
  { label: "Active Counselors", value: "284", change: "+12.5%", up: true, icon: UserCheck, color: "#2D6A4F", bg: "linear-gradient(135deg,#EAF5EE,#D8F0E0)" },
  { label: "Today's Sessions", value: "147", change: "+3.4%", up: true, icon: Calendar, color: "#42A5F5", bg: "linear-gradient(135deg,#EBF4FF,#D6EAFF)" },
  { label: "Completed", value: "1,893", change: "+18.7%", up: true, icon: CheckCircle, color: "#4CAF50", bg: "linear-gradient(135deg,#EAF7EA,#D4F0D4)" },
  { label: "Pending", value: "63", change: "-4.1%", up: false, icon: Clock, color: "#F59E0B", bg: "linear-gradient(135deg,#FEF9EE,#FEF0D3)" },
  { label: "Revenue", value: "$48.2K", change: "+22.3%", up: true, icon: DollarSign, color: "#D8A48F", bg: "linear-gradient(135deg,#FDF3EE,#FAEAD8)" },
];

const recentActivities = [
  { id: 1, action: "New user registered", name: "Sarah Chen", time: "2 min ago", avatar: "SC", color: "#5E8B7E" },
  { id: 2, action: "Session completed", name: "Dr. James Park → M. Johnson", time: "15 min ago", avatar: "JP", color: "#2D6A4F" },
  { id: 3, action: "Payment received", name: "$150 from Mike Johnson", time: "32 min ago", avatar: "$", color: "#4CAF50" },
  { id: 4, action: "Counselor verified", name: "Dr. Lisa Wong", time: "1 hr ago", avatar: "LW", color: "#42A5F5" },
  { id: 5, action: "5★ review posted", name: "Emma Davis → Dr. Park", time: "2 hr ago", avatar: "★", color: "#FFC107" },
  { id: 6, action: "Appointment booked", name: "Alex Thompson", time: "3 hr ago", avatar: "AT", color: "#D8A48F" },
];

const upcomingSessions = [
  { id: 1, user: "Alex Thompson", counselor: "Dr. Sarah Lee", time: "10:00 AM", type: "Anxiety", color: "#5E8B7E" },
  { id: 2, user: "Maria Garcia", counselor: "Dr. James Park", time: "11:30 AM", type: "Depression", color: "#2D6A4F" },
  { id: 3, user: "David Wilson", counselor: "Dr. Lisa Wong", time: "2:00 PM", type: "Couples", color: "#42A5F5" },
  { id: 4, user: "Jennifer Smith", counselor: "Dr. Robert Kim", time: "3:30 PM", type: "Career", color: "#D8A48F" },
];

const topCounselors = [
  { name: "Dr. Sarah Lee", sessions: 342, rating: 4.9, avatar: "SL", color: "#5E8B7E" },
  { name: "Dr. Robert Kim", sessions: 312, rating: 4.8, avatar: "RK", color: "#D8A48F" },
  { name: "Dr. Lisa Wong", sessions: 287, rating: 4.8, avatar: "LW", color: "#42A5F5" },
  { name: "Dr. James Park", sessions: 264, rating: 4.7, avatar: "JP", color: "#2D6A4F" },
];

const systemStatus = [
  { name: "API Server", health: 99.9, color: "#4CAF50", icon: Server },
  { name: "Database", health: 98.7, color: "#4CAF50", icon: HardDrive },
  { name: "WebSocket", health: 87.3, color: "#FFC107", icon: Wifi },
  { name: "CDN", health: 100, color: "#4CAF50", icon: Activity },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDynamicDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function Dashboard() {
  const { t } = useTheme();
  const [notes, setNotes] = useState(
    "• Follow up with Dr. Park on pending verification\n• Review Q4 revenue projections\n• Platform maintenance scheduled Jun 30\n• Update terms & privacy policy"
  );
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
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
              {getGreeting()}, Admin 👋
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
              You have{" "}
              <span className="font-semibold text-white underline decoration-dotted">63 pending requests</span>{" "}
              and{" "}
              <span className="font-semibold text-white underline decoration-dotted">147 sessions</span>{" "}
              scheduled today.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.18)", color: "white", backdropFilter: "blur(8px)" }}>
                <Plus className="w-3.5 h-3.5" /> New Appointment
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                <ArrowRight className="w-3.5 h-3.5" /> View Reports
              </button>
            </div>
          </div>

          <div className="hidden lg:flex gap-3 shrink-0">
            {[
              { label: "Today's Revenue", value: "$1,840", sub: "+12% vs yesterday" },
              { label: "Active Sessions", value: "12", sub: "Right now" },
              { label: "New Users Today", value: "38", sub: "+6 from yesterday" },
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
        {stats.map((s, i) => {
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
              <span className="text-xs px-2.5 py-1 rounded-lg border" style={{ color: t.textSec, borderColor: t.border }}>2026</span>
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
                {sessionCategories.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {sessionCategories.map(cat => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-xs flex-1 truncate" style={{ color: t.textSec }}>{cat.name}</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: t.card2 }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${cat.value * 3}%` }}
                    transition={{ delay: 0.6, duration: 0.7 }}
                    className="h-full rounded-full" style={{ background: cat.color }}
                  />
                </div>
                <span className="text-xs font-semibold w-8 text-right" style={{ color: t.text }}>{cat.value}%</span>
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
              3/4 Healthy
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {systemStatus.map((sys, i) => {
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
          <div className="mt-4 p-3 rounded-xl flex items-start gap-2.5"
            style={{ background: "#FFF9E8", border: "1px solid #FFC10725" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FFC107" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "#92680B" }}>WebSocket latency detected</p>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Investigating • Est. resolution: 30 min</p>
            </div>
          </div>
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
            <button className="text-xs flex items-center gap-1 font-medium" style={{ color: "#5E8B7E" }}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((a, i) => (
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
            {upcomingSessions.map((s, i) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer"
                style={{ border: `1px solid ${t.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: s.color + "15" }}>
                  <span className="text-xs font-bold leading-none" style={{ color: s.color }}>{s.time.split(":")[0]}</span>
                  <span className="text-xs leading-none mt-0.5" style={{ color: s.color + "99" }}>AM</span>
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
              {topCounselors.map((c, i) => (
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
            <button className="mt-2 w-full py-1.5 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "#5E8B7E" }}>
              Save Notes
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
