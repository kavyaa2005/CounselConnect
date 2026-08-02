import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X, Calendar, Clock, User, UserCheck, RefreshCw, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";

const statusConfig: Record<string, { bg: string; color: string; icon: any }> = {
  Pending: { bg: "#FFF9E8", color: "#FFC107", icon: Clock },
  Completed: { bg: "#EAF7EA", color: "#4CAF50", icon: CheckCircle },
  Cancelled: { bg: "#FEF2F2", color: "#EF5350", icon: XCircle },
  Rescheduled: { bg: "#EBF5FF", color: "#42A5F5", icon: RefreshCw },
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}


export function Appointments({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.appointments);
  const { data: cData } = useAdminData(adminApi.counselors);
  const appointments: any[] = data?.appointments || [];
  const counselorOptions: any[] = cData?.counselors || [];

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<"reschedule" | "assign" | "cancel" | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [assignCounselor, setAssignCounselor] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (pageAction === "add") { setViewMode("list"); onActionConsumed?.(); }
  }, [pageAction]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function applyUpdate(id: string, body: any, msg: string) {
    setBusy(true);
    try {
      await adminApi.updateAppointment(id, body);
      await refetch();
      showToast(msg);
      closeModal();
    } catch (e: any) {
      showToast(e.message || "Update failed");
    } finally { setBusy(false); }
  }

  const handleReschedule = () => {
    if (!selectedAppt || !rescheduleDate) { showToast("Pick a new date first"); return; }
    applyUpdate(selectedAppt.id,
      { date: rescheduleDate, time: rescheduleTime || selectedAppt.time, status: "rescheduled" },
      "Appointment rescheduled");
  };

  const handleAssign = () => {
    if (!selectedAppt || !assignCounselor) { showToast("Pick a counselor first"); return; }
    applyUpdate(selectedAppt.id, { counselorId: assignCounselor }, "Counselor reassigned");
  };

  const handleCancel = () => {
    if (!selectedAppt) return;
    applyUpdate(selectedAppt.id, { status: "cancelled", cancelReason }, "Appointment cancelled");
  };

  const days = getCalendarDays(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function getApptForDay(day: number) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter(a => a.date === dateStr);
  }

  const filteredAppts = appointments.filter(a =>
    filterStatus === "All" || a.status === filterStatus
  ).filter(a => !selectedDay || a.date === `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`);

  const allFilteredAppts = appointments.filter(a => filterStatus === "All" || a.status === filterStatus);

  const statusCounts = Object.fromEntries(
    ["Pending", "Completed", "Cancelled", "Rescheduled"].map(s => [s, appointments.filter(a => a.status === s).length])
  );

  function closeModal() {
    setSelectedAppt(null);
    setModalAction(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setAssignCounselor("");
    setCancelReason("");
    setCancelConfirm(false);
  }

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading appointments…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load appointments</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
            style={{ background: "#2D6A4F" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Appointments</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>Manage and track all counseling appointments</p>
        </div>
        <div className="flex items-center gap-2">
          {["calendar", "list"].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode as any)}
              className="px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all"
              style={viewMode === mode ? {
                background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
              } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter with counts */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterStatus("All")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={filterStatus === "All" ? {
            background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
          } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
          All
          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: filterStatus === "All" ? "rgba(255,255,255,0.25)" : t.card2, color: filterStatus === "All" ? "white" : t.muted }}>
            {appointments.length}
          </span>
        </button>
        {["Pending", "Completed", "Cancelled", "Rescheduled"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={filterStatus === s ? {
              background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
            } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
            {s}
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: filterStatus === s ? "rgba(255,255,255,0.25)" : t.card2, color: filterStatus === s ? "white" : t.muted }}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Calendar */}
          <div className="xl:col-span-1 rounded-2xl p-5 border"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: t.card2 }}>
                <ChevronLeft className="w-4 h-4" style={{ color: t.textSec }} />
              </button>
              <span className="font-semibold text-sm" style={{ color: t.text }}>
                {MONTHS[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: t.card2 }}>
                <ChevronRight className="w-4 h-4" style={{ color: t.textSec }} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: t.muted }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} />;
                const dayAppts = getApptForDay(day);
                const today = new Date();
                const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
                const isSelected = selectedDay === day;
                return (
                  <button key={i} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all"
                    style={isSelected ? {
                      background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                    } : isToday ? {
                      background: t.card2, color: "#5E8B7E", border: "2px solid #5E8B7E"
                    } : { color: t.text }}>
                    <span className="text-xs font-medium">{day}</span>
                    {dayAppts.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayAppts.slice(0, 3).map((a: any, j: number) => (
                          <div key={j} className="w-1 h-1 rounded-full"
                            style={{ background: isSelected ? "white" : (statusConfig[a.status] || statusConfig.Pending).color }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day's Appointments */}
          <div className="xl:col-span-2 rounded-2xl p-5 border"
            style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <h3 className="font-semibold mb-4" style={{ color: t.text }}>
              {selectedDay ? `Appointments — ${MONTHS[calMonth]} ${selectedDay}, ${calYear}` : "All Appointments"}
            </h3>
            {filteredAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Calendar className="w-12 h-12 mb-3" style={{ color: t.muted }} />
                <p className="font-medium text-sm" style={{ color: t.muted }}>No appointments for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppts.map((appt, i) => {
                  const sc = statusConfig[appt.status] || statusConfig.Pending;
                  const StatusIcon = sc.icon;
                  return (
                    <motion.div key={appt.id}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer group"
                      style={{ border: `1px solid ${t.border}`, background: t.card2 }}
                      onClick={() => { setSelectedAppt(appt); setModalAction(null); }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.background = t.card2)}>
                      <div className="text-center min-w-12">
                        <div className="text-sm font-bold" style={{ color: t.text }}>{appt.time}</div>
                        <div className="text-xs mt-0.5" style={{ color: t.muted }}>{appt.duration}</div>
                      </div>
                      <div className="w-px h-10" style={{ background: t.border }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: t.text }}>{appt.type}</div>
                        <div className="text-xs mt-0.5" style={{ color: t.muted }}>{appt.user} → {appt.counselor}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{ background: sc.bg, color: sc.color }}>
                          <StatusIcon className="w-3 h-3" /> {appt.status}
                        </span>
                        <span className="text-xs" style={{ color: t.muted }}>{appt.ref}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ background: t.card2, borderColor: t.border }}>
                {["ID", "Patient", "Counselor", "Date & Time", "Type", "Duration", "Status", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: t.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFilteredAppts.map((a, i) => {
                const sc = statusConfig[a.status] || statusConfig.Pending;
                const StatusIcon = sc.icon;
                return (
                  <motion.tr key={a.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b transition-colors cursor-pointer"
                    style={{ borderColor: t.border }}
                    onClick={() => { setSelectedAppt(a); setModalAction(null); }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: t.muted }}>{a.ref}</td>
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: t.text }}>{a.user}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{a.counselor}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{a.date} {a.time}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{a.type}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{a.duration}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit"
                        style={{ background: sc.bg, color: sc.color }}>
                        <StatusIcon className="w-3 h-3" /> {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="px-2 py-1 rounded-lg text-xs border font-medium"
                        style={{ color: "#5E8B7E", borderColor: "#5E8B7E" }}
                        onClick={e => { e.stopPropagation(); setSelectedAppt(a); setModalAction(null); }}>Details</button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={closeModal} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: t.card }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <span className="text-xs font-mono" style={{ color: t.muted }}>{selectedAppt.ref}</span>
                    <h3 className="font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Appointment Details</h3>
                  </div>
                  <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: t.card2 }}>
                    <X className="w-4 h-4" style={{ color: t.textSec }} />
                  </button>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { icon: User, label: "Patient", value: selectedAppt.user },
                    { icon: UserCheck, label: "Counselor", value: selectedAppt.counselor },
                    { icon: Calendar, label: "Date", value: selectedAppt.dateLabel || selectedAppt.date },
                    { icon: Clock, label: "Time", value: `${selectedAppt.time} · ${selectedAppt.duration}` },
                    { icon: CheckCircle, label: "Type", value: selectedAppt.type },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: t.card2 }}>
                      <Icon className="w-4 h-4 shrink-0" style={{ color: "#5E8B7E" }} />
                      <div>
                        <div className="text-xs" style={{ color: t.muted }}>{label}</div>
                        <div className="text-sm font-medium" style={{ color: t.text }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline action panels */}
                <AnimatePresence>
                  {modalAction === "reschedule" && (
                    <motion.div key="reschedule" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 rounded-xl border" style={{ borderColor: t.border, background: t.card2 }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Reschedule Appointment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: t.muted }}>New Date</label>
                          <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                            style={{ ...inputStyle }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block" style={{ color: t.muted }}>New Time</label>
                          <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                            style={{ ...inputStyle }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setModalAction(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                          style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                        <button onClick={handleReschedule} disabled={busy}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                          style={{ background: "#5E8B7E" }}>
                          {busy ? "Saving…" : "Confirm Reschedule"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {modalAction === "assign" && (
                    <motion.div key="assign" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 rounded-xl border" style={{ borderColor: t.border, background: t.card2 }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Assign Counselor</p>
                      <select value={assignCounselor} onChange={e => setAssignCounselor(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border outline-none mb-3"
                        style={{ ...inputStyle }}>
                        <option value="">Select a counselor...</option>
                        {counselorOptions.map((c: any) => (
                          <option key={c.id} value={c.counselorId}>{c.name} — {c.specialty}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setModalAction(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                          style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                        <button onClick={handleAssign} disabled={busy}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                          style={{ background: "#5E8B7E" }}>{busy ? "Saving…" : "Assign"}</button>
                      </div>
                    </motion.div>
                  )}

                  {modalAction === "cancel" && (
                    <motion.div key="cancel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 rounded-xl border" style={{ borderColor: "#EF535040", background: "#FEF2F2" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" style={{ color: "#EF5350" }} />
                        <p className="text-sm font-semibold" style={{ color: "#EF5350" }}>Cancel Appointment</p>
                      </div>
                      <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                        placeholder="Reason for cancellation..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none mb-3"
                        style={{ background: "white", borderColor: "#EF535040", color: "#374151" }}
                        onFocus={e => e.target.style.borderColor = "#EF5350"}
                        onBlur={e => e.target.style.borderColor = "#EF535040"} />
                      <div className="flex gap-2">
                        <button onClick={() => setModalAction(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                          style={{ color: "#6B7280", borderColor: "#D1D5DB", background: "white" }}>Keep</button>
                        <button onClick={handleCancel} disabled={busy}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                          style={{ background: "#EF5350" }}>{busy ? "Cancelling…" : "Confirm Cancel"}</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedAppt.status !== "Completed" && (
                  <button disabled={busy}
                    onClick={() => applyUpdate(selectedAppt.id, { status: "completed" }, "Marked as completed")}
                    className="w-full mb-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "#4CAF50" }}>
                    Mark as Completed
                  </button>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setModalAction(modalAction === "reschedule" ? null : "reschedule")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
                    style={{ background: modalAction === "reschedule" ? "#2D6A4F" : "#5E8B7E" }}>
                    Reschedule
                  </button>
                  <button onClick={() => setModalAction(modalAction === "assign" ? null : "assign")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                    style={{ color: t.textSec, borderColor: t.border, background: modalAction === "assign" ? t.card2 : "transparent" }}>
                    Assign Counselor
                  </button>
                  <button onClick={() => setModalAction(modalAction === "cancel" ? null : "cancel")}
                    className="py-2.5 px-3 rounded-xl text-sm font-medium border"
                    style={{ color: "#EF5350", borderColor: "#EF5350", background: modalAction === "cancel" ? "#FEF2F2" : "transparent" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
