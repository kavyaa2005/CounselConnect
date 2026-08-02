import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Mail, Smartphone, Send, Clock, Users, CheckCircle, X, Calendar } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface HistoryItem {
  id: number;
  title: string;
  body: string;
  channel: string;
  recipients: number;
  sent: string;
  status: string;
}

const initialHistory: HistoryItem[] = [
  { id: 1, title: "Session Reminder", body: "Your session with Dr. Sarah Lee is in 1 hour.", channel: "Push + Email", recipients: 147, sent: "Jun 27, 2026 · 09:00", status: "Sent" },
  { id: 2, title: "Weekly Summary", body: "Here's your wellness summary for the week...", channel: "Email", recipients: 1284, sent: "Jun 26, 2026 · 10:00", status: "Sent" },
  { id: 3, title: "New Counselor Available", body: "Dr. Emma Williams is now accepting bookings.", channel: "Push", recipients: 892, sent: "Jun 25, 2026 · 14:00", status: "Sent" },
  { id: 4, title: "Payment Confirmation", body: "Your payment of $150 has been processed.", channel: "Email + SMS", recipients: 43, sent: "Jun 25, 2026 · 09:30", status: "Sent" },
  { id: 5, title: "Platform Maintenance", body: "Scheduled maintenance on Jun 30 from 2–4 AM.", channel: "Push + Email", recipients: 2640, sent: "Scheduled: Jun 29, 2026", status: "Scheduled" },
];

const templates = [
  { name: "Session Reminder", desc: "24h and 1h before session" },
  { name: "Payment Confirmation", desc: "After successful payment" },
  { name: "New Counselor", desc: "When a new counselor is verified" },
  { name: "Weekly Report", desc: "Every Monday at 9 AM" },
  { name: "Appointment Update", desc: "Rescheduled or cancelled" },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  Sent: { bg: "#EAF7EA", color: "#4CAF50" },
  Scheduled: { bg: "#EBF5FF", color: "#42A5F5" },
  Failed: { bg: "#FEF2F2", color: "#EF5350" },
};

const timezones = [
  "America/New_York (EST)", "America/Los_Angeles (PST)", "America/Chicago (CST)",
  "America/Denver (MST)", "Europe/London (GMT)", "Europe/Paris (CET)",
  "Asia/Tokyo (JST)", "Asia/Singapore (SGT)", "UTC"
];

export function Notifications({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [channels, setChannels] = useState({ push: true, email: true, sms: false });
  const [target, setTarget] = useState("All Users");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedTz, setSchedTz] = useState("America/New_York (EST)");
  const [schedSuccess, setSchedSuccess] = useState(false);

  function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSent(true);
    setHistory(prev => [{
      id: Date.now(),
      title: title.trim(),
      body: body.trim(),
      channel: [channels.push && "Push", channels.email && "Email", channels.sms && "SMS"].filter(Boolean).join(" + ") || "None",
      recipients: target === "All Users" ? 2640 : target === "Counselors" ? 284 : 500,
      sent: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "Sent",
    }, ...prev]);
    setTimeout(() => { setSent(false); setTitle(""); setBody(""); }, 3000);
  }

  function handleSchedule() {
    if (!schedDate || !schedTime) return;
    setSchedSuccess(true);
    const scheduled: HistoryItem = {
      id: Date.now(),
      title: title.trim() || "Scheduled Notification",
      body: body.trim() || "Scheduled notification body.",
      channel: [channels.push && "Push", channels.email && "Email", channels.sms && "SMS"].filter(Boolean).join(" + ") || "None",
      recipients: 0,
      sent: `Scheduled: ${schedDate} · ${schedTime} (${schedTz.split(" ")[0]})`,
      status: "Scheduled",
    };
    setHistory(prev => [scheduled, ...prev]);
    setTimeout(() => {
      setSchedSuccess(false);
      setShowScheduleModal(false);
      setSchedDate("");
      setSchedTime("");
    }, 2000);
  }

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

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
                {["All Users", "Active Users", "Counselors", "Admins", "Specific Users"].map(tgt => (
                  <button key={tgt} onClick={() => setTarget(tgt)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={target === tgt ? {
                      background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                    } : { background: t.card2, color: t.textSec }}>
                    {tgt}
                  </button>
                ))}
              </div>
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
                disabled={!title.trim() || !body.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <Send className="w-4 h-4" /> Send Now
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
                  <span className="text-sm" style={{ color: "#2D6A4F" }}>Notification sent successfully!</span>
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
              {history.map((n, i) => {
                const sc = statusColors[n.status];
                return (
                  <motion.div key={n.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-4 px-5 py-4 border-b transition-colors"
                    style={{ borderColor: t.border }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "#F0F7F5" }}>
                      <Bell className="w-4 h-4" style={{ color: "#5E8B7E" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm" style={{ color: t.text }}>{n.title}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                          style={{ background: sc.bg, color: sc.color }}>
                          {n.status}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: t.textSec }}>{n.body}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs" style={{ color: t.muted }}>{n.channel}</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: t.muted }}>
                          <Users className="w-3 h-3" /> {n.recipients.toLocaleString()}
                        </span>
                        <span className="text-xs" style={{ color: t.muted }}>{n.sent}</span>
                      </div>
                    </div>
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
            {templates.map((tmpl, i) => (
              <motion.button key={tmpl.name}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                onClick={() => setTitle(tmpl.name)}
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
