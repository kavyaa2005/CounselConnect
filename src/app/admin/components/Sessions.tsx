import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Video, Clock, CheckCircle, Play, FileText, Star,
  PhoneOff, Monitor, X, ChevronRight, TrendingUp
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  Live: { bg: "#EAF7EA", color: "#4CAF50", label: "Live" },
  Completed: { bg: "#F0F7F5", color: "#5E8B7E", label: "Completed" },
  Upcoming: { bg: "#EBF5FF", color: "#42A5F5", label: "Upcoming" },
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs" style={{ color: "#9CA3AF" }}>Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-3 h-3"
          fill={i <= rating ? "#FFC107" : "none"}
          style={{ color: i <= rating ? "#FFC107" : "#E5E7EB" }} />
      ))}
    </div>
  );
}

export function Sessions(_props?: any) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.sessions);
  const { data: callData } = useAdminData(adminApi.calls);
  const [selected, setSelected] = useState<any | null>(null);

  const todaySessions: any[] = data?.today || [];
  const completedSessions: any[] = data?.completed || [];
  const k = data?.kpis || {};
  const calls: any[] = callData?.calls || [];
  const callStats = callData?.stats || { total: 0, connected: 0, missed: 0, totalMinutes: 0, avgDurationLabel: '—' };

  const sessionKpiData = [
    { label: "Today's Sessions", value: k.todayCount ?? 0, icon: Video, color: "#5E8B7E", bg: "#F0F7F5" },
    { label: "Live Right Now", value: k.liveCount ?? 0, icon: Play, color: "#4CAF50", bg: "#EAF7EA" },
    { label: "Completed Today", value: k.completedToday ?? 0, icon: CheckCircle, color: "#42A5F5", bg: "#EBF5FF" },
    { label: "Avg. Duration", value: k.avgDuration ?? "—", icon: Clock, color: "#D8A48F", bg: "#FDF3EE" },
    { label: "Avg. Rating", value: k.avgRating ?? "—", icon: Star, color: "#FFC107", bg: "#FFF9E8" },
    { label: "Total This Month", value: k.thisMonth ?? 0, icon: TrendingUp, color: "#8B5CF6", bg: "#F5F3FF" },
  ];

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading sessions…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load sessions</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <div>
        <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Sessions</h2>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>Live session monitoring and history</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {sessionKpiData.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-4 border"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="text-xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: t.muted }}>{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Today's Schedule */}
        <div className="xl:col-span-3 rounded-2xl border overflow-hidden"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
            <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Today's Schedule</h3>
            <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: "#F0F7F5", color: "#5E8B7E" }}>
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div>
            {todaySessions.length === 0 && (
              <p className="px-5 py-8 text-center text-sm" style={{ color: t.muted }}>
                No sessions scheduled for today.
              </p>
            )}
            {todaySessions.map((session: any, i: number) => {
              const sc = statusConfig[session.status] || statusConfig.Upcoming;
              return (
                <motion.div key={session.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-3.5 border-b transition-colors cursor-pointer group"
                  style={{ borderColor: t.border }}
                  onClick={() => setSelected(session)}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                  <div className="text-center w-14 shrink-0">
                    <div className="text-sm font-bold" style={{ color: t.text }}>{session.time}</div>
                    <div className="text-xs" style={{ color: t.muted }}>{session.duration}</div>
                  </div>

                  <div className="h-10 w-px shrink-0" style={{ background: session.status === "Live" ? "#5E8B7E40" : t.border }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium" style={{ color: t.text }}>{session.type}</span>
                      {session.status === "Live" && (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#EAF7EA", color: "#4CAF50" }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4CAF50" }} />
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: t.muted }}>
                      {session.user} · {session.counselor}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <Stars rating={session.rating} />
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 "
                    style={{ color: t.muted }} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Session Detail */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border overflow-hidden"
                style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
                  <div>
                    <p className="text-xs font-mono" style={{ color: t.muted }}>{selected.sessionRef}</p>
                    <h3 className="font-semibold" style={{ color: t.text }}>Session Details</h3>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: t.card2 }}>
                    <X className="w-3.5 h-3.5" style={{ color: t.muted }} />
                  </button>
                </div>
                <div className="p-5 space-y-2.5">
                  {[
                    { label: "Patient", value: selected.user },
                    { label: "Counselor", value: selected.counselor },
                    { label: "Type", value: selected.type },
                    { label: "Time", value: `${selected.time} · ${selected.duration}` },
                    { label: "Attendance", value: selected.attendance },
                    { label: "Recorded", value: selected.recorded ? "Yes" : "No" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: t.border }}>
                      <span className="text-xs" style={{ color: t.muted }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color: t.text }}>{value}</span>
                    </div>
                  ))}
                  {selected.notes && (
                    <div className="mt-3 p-3 rounded-xl" style={{ background: t.card2 }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5" style={{ color: "#5E8B7E" }} />
                        <span className="text-xs font-semibold" style={{ color: t.text }}>Session Notes</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: t.textSec }}>{selected.notes}</p>
                    </div>
                  )}
                  {selected.status === "Live" && (
                    <div className="pt-2 flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white"
                        style={{ background: "#5E8B7E" }}>
                        <Monitor className="w-3.5 h-3.5" /> View Session
                      </button>
                      <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold"
                        style={{ background: "#FEF2F2", color: "#EF5350" }}>
                        <PhoneOff className="w-3.5 h-3.5" /> End
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty"
                className="rounded-2xl border flex flex-col items-center justify-center h-48"
                style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
                <Video className="w-10 h-10 mb-2" style={{ color: t.muted }} />
                <p className="text-sm" style={{ color: t.muted }}>Click a session to view details</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Sessions */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: t.border }}>
              <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Recent Sessions</h3>
            </div>
            <div>
              {completedSessions.length === 0 && (
                <p className="px-5 py-6 text-center text-xs" style={{ color: t.muted }}>
                  No completed sessions yet.
                </p>
              )}
              {completedSessions.map((s: any, i: number) => (
                <motion.div key={s.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-5 py-3 border-b transition-colors cursor-pointer"
                  style={{ borderColor: t.border }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#F0F7F5" }}>
                    <CheckCircle className="w-4 h-4" style={{ color: "#5E8B7E" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: t.text }}>{s.user}</div>
                    <div className="text-xs" style={{ color: t.muted }}>{s.dateLabel || s.date} · {s.duration}</div>
                  </div>
                  <Stars rating={s.rating} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Video call log ── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
          style={{ borderColor: t.border }}>
          <div>
            <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>
              Video Call Log
            </h3>
            <p className="text-xs mt-0.5" style={{ color: t.muted }}>
              Every peer-to-peer call placed on the platform
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {[
              { label: 'Total', value: callStats.total, color: t.text },
              { label: 'Connected', value: callStats.connected, color: '#4CAF50' },
              { label: 'Missed', value: callStats.missed, color: '#EF5350' },
              { label: 'Minutes', value: callStats.totalMinutes, color: '#5E8B7E' },
              { label: 'Avg', value: callStats.avgDurationLabel, color: '#D8A48F' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
                <div style={{ color: t.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {calls.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm" style={{ color: t.muted }}>
            No video calls yet — they'll appear here as soon as someone places one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: t.card2, borderBottom: `1px solid ${t.border}` }}>
                  {['Client', 'Counselor', 'Started by', 'When', 'Duration', 'Status'].map(hd => (
                    <th key={hd} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: t.muted }}>{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.slice(0, 15).map((c: any, i: number) => {
                  const style =
                    c.status === 'ended' ? { bg: '#EAF7EA', color: '#4CAF50', label: 'Completed' } :
                    c.status === 'missed' ? { bg: '#FEF2F2', color: '#EF5350', label: 'Missed' } :
                    c.status === 'rejected' ? { bg: '#FFF9E8', color: '#F59E0B', label: 'Declined' } :
                    c.status === 'active' ? { bg: '#EAF7EA', color: '#22c55e', label: 'Live' } :
                    { bg: t.card2, color: t.muted, label: 'Not connected' };
                  return (
                    <motion.tr key={c.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.04 }}
                      className="border-b" style={{ borderColor: t.border }}>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: t.text }}>{c.userName}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: t.textSec }}>{c.doctorName}</td>
                      <td className="px-5 py-3 text-sm capitalize" style={{ color: t.textSec }}>{c.initiatedBy}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: t.textSec }}>{c.dateLabel}</td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: t.text }}>{c.durationLabel}</td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: style.bg, color: style.color }}>
                          {style.label}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
