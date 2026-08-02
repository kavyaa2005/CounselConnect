import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Video, Clock, CheckCircle, Play, FileText, Star,
  PhoneOff, Monitor, X, ChevronRight, TrendingUp
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const todaySessions = [
  { id: "S-1041", user: "Sarah Chen", counselor: "Dr. Sarah Lee", type: "Anxiety Management", time: "09:00", duration: "50 min", status: "Completed", rating: 5, notes: "Client showed significant progress with breathing techniques. Homework assigned: daily mindfulness journal. Follow-up in 2 weeks.", attendance: "Present", recorded: true },
  { id: "S-1042", user: "Michael Johnson", counselor: "Dr. James Park", type: "Depression Therapy", time: "10:30", duration: "50 min", status: "Live", rating: null, notes: null, attendance: "Present", recorded: true },
  { id: "S-1043", user: "Emma Davis", counselor: "Dr. Lisa Wong", type: "Trauma & PTSD", time: "11:00", duration: "60 min", status: "Upcoming", rating: null, notes: null, attendance: "—", recorded: false },
  { id: "S-1044", user: "David Wilson", counselor: "Dr. Robert Kim", type: "Couples Therapy", time: "13:00", duration: "80 min", status: "Upcoming", rating: null, notes: null, attendance: "—", recorded: false },
  { id: "S-1045", user: "Maria Garcia", counselor: "Dr. Sarah Lee", type: "Career Counseling", time: "14:30", duration: "50 min", status: "Upcoming", rating: null, notes: null, attendance: "—", recorded: false },
  { id: "S-1046", user: "James Martinez", counselor: "Dr. Jessica Taylor", type: "Grief Counseling", time: "15:00", duration: "50 min", status: "Upcoming", rating: null, notes: null, attendance: "—", recorded: false },
  { id: "S-1047", user: "Olivia Brown", counselor: "Dr. Michael Brown", type: "Child & Adolescent", time: "16:00", duration: "60 min", status: "Upcoming", rating: null, notes: null, attendance: "—", recorded: false },
];

const completedSessions = [
  { id: "S-1035", user: "Sophia Anderson", counselor: "Dr. Emma Williams", type: "Career Counseling", date: "Jun 26", duration: "50 min", rating: 4 },
  { id: "S-1036", user: "Liam Taylor", counselor: "Dr. Robert Kim", type: "Couples Therapy", date: "Jun 26", duration: "80 min", rating: 5 },
  { id: "S-1037", user: "Olivia Brown", counselor: "Dr. Michael Brown", type: "Child & Adolescent", date: "Jun 25", duration: "60 min", rating: 4 },
  { id: "S-1038", user: "William Lee", counselor: "Dr. David Martinez", type: "Addiction Therapy", date: "Jun 25", duration: "60 min", rating: 3 },
  { id: "S-1039", user: "Jennifer Smith", counselor: "Dr. Sarah Lee", type: "Anxiety Management", date: "Jun 24", duration: "50 min", rating: 5 },
];

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

const sessionKpiData = [
  { label: "Today's Sessions", value: todaySessions.length, icon: Video, color: "#5E8B7E", bg: "#F0F7F5" },
  { label: "Live Right Now", value: 1, icon: Play, color: "#4CAF50", bg: "#EAF7EA" },
  { label: "Completed Today", value: 1, icon: CheckCircle, color: "#42A5F5", bg: "#EBF5FF" },
  { label: "Avg. Duration", value: "58 min", icon: Clock, color: "#D8A48F", bg: "#FDF3EE" },
  { label: "Avg. Rating", value: "4.7★", icon: Star, color: "#FFC107", bg: "#FFF9E8" },
  { label: "Total This Month", value: "1,893", icon: TrendingUp, color: "#8B5CF6", bg: "#F5F3FF" },
];

export function Sessions(_props?: any) {
  const { t } = useTheme();
  const [selected, setSelected] = useState<typeof todaySessions[0] | null>(null);

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
              Jun 27, 2026
            </span>
          </div>
          <div>
            {todaySessions.map((session, i) => {
              const sc = statusConfig[session.status];
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

                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <p className="text-xs font-mono" style={{ color: t.muted }}>{selected.id}</p>
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
              {completedSessions.map((s, i) => (
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
                    <div className="text-xs" style={{ color: t.muted }}>{s.date} · {s.duration}</div>
                  </div>
                  <Stars rating={s.rating} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
