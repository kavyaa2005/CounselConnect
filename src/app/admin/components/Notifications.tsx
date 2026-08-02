import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Mail, Smartphone, Send, Clock, Users, CheckCircle, X, Calendar } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";

const statusColors: Record<string, { bg: string; color: string }> = {
  Sent: { bg: "#EAF7EA", color: "#4CAF50" },
  System: { bg: "#FFF9E8", color: "#F59E0B" },
  Read: { bg: "#F3F4F6", color: "#9CA3AF" },
};

const timezones = [
  "Asia/Kolkata (IST)", "America/New_York (EST)", "America/Los_Angeles (PST)",
  "Europe/London (GMT)", "Europe/Paris (CET)", "Asia/Tokyo (JST)",
  "Asia/Singapore (SGT)", "UTC",
];

export function Notifications({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.notifications);
  const { data: dash } = useAdminData(adminApi.dashboard);

  const history: any[] = data?.notifications || [];
  const counts = dash?.counts || { users: 0, counselors: 0 };

  const [channels, setChannels] = useState({ push: true, email: true, sms: false });
  const [target, setTarget] = useState("All users");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedTz, setSchedTz] = useState("Asia/Kolkata (IST)");
  const [schedSuccess, setSchedSuccess] = useState(false);

  useEffect(() => {
    if (pageAction === "add") { onActionConsumed?.(); }
  }, [pageAction]);

  function recipientCount(tgt: string) {
    if (tgt === "Counselors") return counts.counselors;
    if (tgt === "Admins") return 0;
    return counts.users;
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setSendError(null);
    try {
      await adminApi.sendNotification({
        title: title.trim(),
        message: body.trim(),
        audience: target,
        type: "info",
      });
      await refetch();
      setSent(true);
      setTimeout(() => { setSent(false); setTitle(""); setBody(""); }, 2500);
    } catch (e: any) {
      setSendError(e?.message || "Could not send notification");
    } finally { setBusy(false); }
  }

  async function handleSchedule() {
    if (!schedDate || !schedTime) return;
    setBusy(true);
    try {
      await adminApi.sendNotification({
        title: title.trim() || "Scheduled Notification",
        message: `${body.trim() || "Scheduled announcement."}\n\n(Scheduled for ${schedDate} at ${schedTime} ${schedTz.split(" ")[0]})`,
        audience: target,
        type: "info",
      });
      await refetch();
      setSchedSuccess(true);
      setTimeout(() => {
        setSchedSuccess(false);
        setShowScheduleModal(false);
        setSchedDate("");
        setSchedTime("");
      }, 2000);
    } finally { setBusy(false); }
  }

  async function handleDismiss(id: string) {
    await adminApi.deleteNotification(id);
    refetch();
  }

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading notifications…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load notifications</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Notification Center</h2>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>Send and manage platform notifications</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Compose */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl p-5 border" style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <h3 className="font-semibold mb-4" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Compose Notification</h3>

            {/* Target */}
            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: t.muted }}>SEND TO</label>
              <div className="flex flex-wrap gap-2">
                {["All users", "Counselors", "Admins"].map(tgt => (
                  <button key={tgt} onClick={() => setTarget(tgt)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={target === tgt ? {
                      background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                    } : { background: t.card2, color: t.textSec }}>
                    {tgt}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: t.muted }}>
                Will reach {recipientCount(target).toLocaleString()} recipient{recipientCount(target) === 1 ? "" : "s"}
              </p>
            </div>

            {/* Channels */}
            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: t.muted }}>CHANNELS</label>
              <div className="flex gap-3">
                {([
                  { key: "push", icon: Bell, label: "Push" },
                  { key: "email", icon: Mail, label: "Email" },
                  { key: "sms", icon: Smartphone, label: "SMS" },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setChannels(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all"
                    style={channels[key] ? {
                      background: "#F0F7F5", borderColor: "#5E8B7E", color: "#5E8B7E"
                    } : { borderColor: t.inputBorder, color: t.muted, background: t.input }}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: t.muted }}>NOTIFICATION TITLE</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Session Reminder"
                className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                style={{ ...inputStyle }}
                onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                onBlur={e => e.target.style.borderColor = t.inputBorder} />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: t.muted }}>MESSAGE BODY</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
                placeholder="Type your notification message..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none"
                style={{ ...inputStyle }}
                onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                onBlur={e => e.target.style.borderColor = t.inputBorder} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleSend}
                disabled={!title.trim() || !body.trim() || busy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <Send className="w-4 h-4" /> {busy ? "Sending…" : "Send Now"}
              </button>
              <button onClick={() => { setShowScheduleModal(true); setSchedSuccess(false); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: t.textSec, borderColor: t.border, background: t.card }}>
                <Clock className="w-4 h-4" /> Schedule
              </button>
            </div>

            <AnimatePresence>
              {sent && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: "#EAF7EA" }}>
                  <CheckCircle className="w-4 h-4" style={{ color: "#4CAF50" }} />
                  <span className="text-sm" style={{ color: "#2D6A4F" }}>
                    Notification delivered to {recipientCount(target).toLocaleString()} recipient(s).
                  </span>
                </motion.div>
              )}
              {sendError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: "#FEF2F2" }}>
                  <X className="w-4 h-4" style={{ color: "#EF5350" }} />
                  <span className="text-sm" style={{ color: "#EF5350" }}>{sendError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: t.border }}>
              <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Notification History</h3>
            </div>
            <div style={{ borderColor: t.divider }}>
              {history.length === 0 && (
                <p className="px-5 py-8 text-center text-sm" style={{ color: t.muted }}>
                  Nothing sent yet — announcements you broadcast will appear here.
                </p>
              )}
              {history.map((n: any, i: number) => {
                const label = n.system ? "System" : n.read ? "Read" : "Sent";
                const sc = statusColors[label];
                return (
                  <motion.div key={n.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.05 }}
                    className="flex items-start gap-4 px-5 py-4 border-b transition-colors group"
                    style={{ borderColor: t.border }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: n.system ? "#FFF9E8" : "#F0F7F5" }}>
                      <Bell className="w-4 h-4" style={{ color: n.system ? "#F59E0B" : "#5E8B7E" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm" style={{ color: t.text }}>{n.title}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                          style={{ background: sc.bg, color: sc.color }}>
                          {label}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 whitespace-pre-line" style={{ color: t.textSec }}>{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs flex items-center gap-1" style={{ color: t.muted }}>
                          <Users className="w-3 h-3" /> {n.audience}
                        </span>
                        <span className="text-xs" style={{ color: t.muted }}>
                          {new Date(n.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {!n.system && (
                      <button onClick={() => handleDismiss(n.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center  shrink-0"
                        style={{ background: "#FEF2F2" }} title="Delete">
                        <X className="w-3.5 h-3.5" style={{ color: "#EF5350" }} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="rounded-2xl p-5 border h-fit" style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-4" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Templates</h3>
          <div className="space-y-2">
            {[
              { name: "Session Reminder", desc: "Remind users about upcoming sessions", body: "You have a counseling session coming up. Please join a few minutes early." },
              { name: "New Counselor", desc: "Announce a newly verified counselor", body: "A new counselor has joined CounselConnect and is now accepting bookings." },
              { name: "Platform Maintenance", desc: "Warn about scheduled downtime", body: "CounselConnect will be briefly unavailable for scheduled maintenance. We'll be back shortly." },
              { name: "Wellness Check-in", desc: "Nudge users to log their mood", body: "How are you feeling today? Take a moment to log your mood and keep your streak going." },
              { name: "Policy Update", desc: "Notify about terms or privacy changes", body: "We've updated our terms and privacy policy. Please review the changes at your convenience." },
            ].map((tmpl, i) => (
              <motion.button key={tmpl.name}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                onClick={() => { setTitle(tmpl.name); setBody(tmpl.body); }}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all group"
                style={{ borderColor: t.border }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.hover; (e.currentTarget as HTMLElement).style.borderColor = "#5E8B7E40"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#F0F7F5" }}>
                  <Bell className="w-4 h-4" style={{ color: "#5E8B7E" }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: t.text }}>{tmpl.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.muted }}>{tmpl.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => { setShowScheduleModal(false); setSchedSuccess(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6">
              <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: t.card }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Schedule Notification</h3>
                    <p className="text-sm mt-0.5" style={{ color: t.muted }}>Set date, time, and timezone</p>
                  </div>
                  <button onClick={() => { setShowScheduleModal(false); setSchedSuccess(false); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: t.card2 }}>
                    <X className="w-4 h-4" style={{ color: t.textSec }} />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {schedSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#EBF5FF" }}>
                        <Calendar className="w-7 h-7" style={{ color: "#42A5F5" }} />
                      </div>
                      <p className="font-semibold" style={{ color: t.text }}>Notification Scheduled!</p>
                      <p className="text-sm text-center" style={{ color: t.muted }}>
                        Scheduled for {schedDate} at {schedTime}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Date</label>
                          <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                            style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Time</label>
                          <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                            style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Timezone</label>
                        <select value={schedTz} onChange={e => setSchedTz(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none"
                          style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}>
                          {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => { setShowScheduleModal(false); }}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                          style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                        <button onClick={handleSchedule} disabled={!schedDate || !schedTime}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                          <Calendar className="w-4 h-4" /> Schedule Notification
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
