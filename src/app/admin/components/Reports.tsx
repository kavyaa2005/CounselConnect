import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Download, TrendingUp, Users, Calendar, DollarSign, Star, CheckCircle, Loader } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";
import { useMoney } from "../../lib/money";

// Icon + palette per report id returned by the API
const REPORT_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  users:        { icon: Users,      color: "#5E8B7E", bg: "#F0F7F5" },
  counselors:   { icon: TrendingUp, color: "#2D6A4F", bg: "#E8F5ED" },
  appointments: { icon: Calendar,   color: "#42A5F5", bg: "#EBF5FF" },
  payments:     { icon: DollarSign, color: "#D8A48F", bg: "#FDF3EE" },
  feedback:     { icon: Star,       color: "#FFC107", bg: "#FFF9E8" },
};

type GenerateState = "idle" | "loading" | "done";

export function Reports(_props?: any) {
  // Currency follows the server (the gateway charges in ₹), never a literal '$'.
  const { money, symbol } = useMoney();
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.reports);
  const { data: analytics } = useAdminData(adminApi.analytics);

  const [states, setStates] = useState<Record<string, GenerateState>>({});
  const [failed, setFailed] = useState<string | null>(null);

  const reportTypes: any[] = data?.available || [];
  const highlights = data?.highlights || {};

  // Combine growth + revenue into one monthly series
  const growth: any[] = analytics?.growth || [];
  const monthlyReports = growth.slice(-6).map((g: any) => ({
    month: g.month,
    users: g.users,
    sessions: g.appointments,
  }));

  async function handleGenerate(id: string) {
    if (states[id] === "loading") return;
    setStates(p => ({ ...p, [id]: "loading" }));
    setFailed(null);
    try {
      await adminApi.downloadReport(id);
      setStates(p => ({ ...p, [id]: "done" }));
      setTimeout(() => setStates(p => ({ ...p, [id]: "idle" })), 3000);
    } catch (e: any) {
      setStates(p => ({ ...p, [id]: "idle" }));
      setFailed(e?.message || "Download failed");
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading reports…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load reports</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Reports</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>
            Export live platform data as CSV — generated on demand from the database
          </p>
        </div>
      </div>

      {failed && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#EF5350" }}>
          {failed}
        </div>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Users", value: highlights.totalUsers ?? 0, color: "#5E8B7E", bg: "#F0F7F5" },
          { label: "Counselors", value: highlights.totalCounselors ?? 0, color: "#2D6A4F", bg: "#E8F5ED" },
          { label: "Appointments", value: highlights.totalAppointments ?? 0, color: "#42A5F5", bg: "#EBF5FF" },
          { label: "Revenue", value: money(highlights.totalRevenue ?? 0), color: "#D8A48F", bg: "#FDF3EE" },
          { label: "Avg Rating", value: highlights.averageRating ?? "0.0", color: "#FFC107", bg: "#FFF9E8" },
          { label: "Completion", value: `${highlights.completionRate ?? 0}%`, color: "#8B5CF6", bg: "#F5F3FF" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 border"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: s.bg }}>
              <FileText className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="text-lg font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: t.muted }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportTypes.map((r: any, i: number) => {
          const style = REPORT_STYLE[r.id] || REPORT_STYLE.users;
          const Icon = style.icon;
          const state = states[r.id] || "idle";
          return (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3, boxShadow: t.shadowHov }}
              className="rounded-2xl p-5 border group"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: style.bg }}>
                  <Icon className="w-6 h-6" style={{ color: style.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: t.text }}>{r.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.muted }}>{r.description}</div>
                  <div className="text-xs mt-1 font-medium" style={{ color: style.color }}>
                    {r.rows} row{r.rows === 1 ? "" : "s"} · {r.format}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <AnimatePresence mode="wait">
                  {state === "idle" && (
                    <motion.button key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => handleGenerate(r.id)}
                      disabled={r.rows === 0}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: style.color }}>
                      <Download className="w-3.5 h-3.5" />
                      {r.rows === 0 ? "No data yet" : "Generate & Download"}
                    </motion.button>
                  )}
                  {state === "loading" && (
                    <motion.div key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                      style={{ background: t.card2 }}>
                      <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: style.color }} />
                      <span style={{ color: style.color }}>Generating…</span>
                    </motion.div>
                  )}
                  {state === "done" && (
                    <motion.div key="done"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl px-3"
                      style={{ background: "#EAF7EA" }}>
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#4CAF50" }} />
                      <span className="text-xs font-medium" style={{ color: "#2D6A4F" }}>Downloaded</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly Summary Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-2xl p-5 border"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <h3 className="font-semibold mb-1" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Monthly Summary</h3>
        <p className="text-xs mb-5" style={{ color: t.muted }}>Cumulative users and appointments over the last 6 months</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyReports} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${t.border}`, background: t.card, color: t.text, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="users" name="Users" fill="#5E8B7E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sessions" name="Appointments" fill="#D8A48F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
