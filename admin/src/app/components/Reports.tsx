import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Download, TrendingUp, Users, Calendar, DollarSign, BarChart3, CheckCircle, Loader } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "../context/ThemeContext";

const monthlyReports = [
  { month: "Jan", users: 420, sessions: 680, revenue: 18400 },
  { month: "Feb", users: 580, sessions: 920, revenue: 22100 },
  { month: "Mar", users: 720, sessions: 1100, revenue: 27300 },
  { month: "Apr", users: 890, sessions: 1340, revenue: 31800 },
  { month: "May", users: 1050, sessions: 1580, revenue: 38200 },
  { month: "Jun", users: 1280, sessions: 1820, revenue: 44700 },
];

const reportTypes = [
  { icon: Users, label: "User Activity Report", desc: "Registration, logins, engagement metrics", color: "#5E8B7E", bg: "#F0F7F5" },
  { icon: Calendar, label: "Appointment Summary", desc: "Booking rates, completion, cancellations", color: "#42A5F5", bg: "#EBF5FF" },
  { icon: TrendingUp, label: "Counselor Performance", desc: "Ratings, sessions, availability trends", color: "#2D6A4F", bg: "#E8F5ED" },
  { icon: DollarSign, label: "Revenue Report", desc: "Income breakdown, refunds, growth", color: "#D8A48F", bg: "#FDF3EE" },
  { icon: BarChart3, label: "Platform Analytics", desc: "Traffic, peak hours, feature usage", color: "#FFC107", bg: "#FFF9E8" },
  { icon: FileText, label: "Compliance Report", desc: "Privacy, security, audit logs", color: "#EF5350", bg: "#FEF2F2" },
];

type GenerateState = "idle" | "loading" | "done";

export function Reports({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const [generateStates, setGenerateStates] = useState<Record<string, GenerateState>>(
    Object.fromEntries(reportTypes.map(r => [r.label, "idle"]))
  );

  function handleGenerate(label: string) {
    if (generateStates[label] !== "idle") return;
    setGenerateStates(prev => ({ ...prev, [label]: "loading" }));
    setTimeout(() => {
      setGenerateStates(prev => ({ ...prev, [label]: "done" }));
    }, 1500);
  }

  function handleReset(label: string) {
    setGenerateStates(prev => ({ ...prev, [label]: "idle" }));
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Reports</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>Generate and export platform reports</p>
        </div>
        <div className="flex items-center gap-2">
          {["PDF", "Excel", "CSV"].map(fmt => (
            <button key={fmt}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors"
              style={{ color: t.textSec, borderColor: t.border, background: t.card }}>
              <Download className="w-3 h-3" /> {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportTypes.map((r, i) => {
          const Icon = r.icon;
          const state = generateStates[r.label];
          return (
            <motion.div key={r.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3, boxShadow: t.shadowHov }}
              className="rounded-2xl p-5 border cursor-pointer group"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: r.bg }}>
                  <Icon className="w-6 h-6" style={{ color: r.color }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: t.text }}>{r.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.muted }}>{r.desc}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {state === "idle" && (
                    <motion.button key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => handleGenerate(r.label)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-white transition-opacity hover:opacity-90"
                      style={{ background: r.color }}>
                      Generate
                    </motion.button>
                  )}
                  {state === "loading" && (
                    <motion.div key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
                      style={{ background: t.card2, color: t.textSec }}>
                      <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: r.color }} />
                      <span style={{ color: r.color }}>Generating...</span>
                    </motion.div>
                  )}
                  {state === "done" && (
                    <motion.div key="done"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex items-center gap-2 py-2 rounded-xl px-3"
                      style={{ background: "#EAF7EA" }}>
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#4CAF50" }} />
                      <span className="text-xs font-medium flex-1" style={{ color: "#2D6A4F" }}>Report Generated!</span>
                      <button onClick={() => handleReset(r.label)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg text-white"
                        style={{ background: "#4CAF50" }}>
                        Download
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {state === "idle" && (
                  <button className="w-8 h-8 rounded-xl flex items-center justify-center border transition-colors"
                    style={{ borderColor: t.border, background: t.card2 }}>
                    <Download className="w-3.5 h-3.5" style={{ color: t.muted }} />
                  </button>
                )}
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
        <p className="text-xs mb-5" style={{ color: t.muted }}>Users, sessions, and revenue over 6 months</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyReports} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${t.border}`, background: t.card, color: t.text, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="users" name="New Users" fill="#5E8B7E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="sessions" name="Sessions" fill="#D8A48F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
