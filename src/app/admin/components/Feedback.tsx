import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, CheckCircle, Trash2, MessageSquare, TrendingUp, X, Send } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";

interface FeedbackItem {
  id: string;
  user: string;
  avatar: string;
  color: string;
  counselor: string;
  rating: number;
  comment: string;
  date: string;
  status: string;
  type: string;
  replies: string[];
  flagged?: boolean;
}

const typeColors: Record<string, { bg: string; color: string }> = {
  Praise: { bg: "#EAF7EA", color: "#4CAF50" },
  Feedback: { bg: "#EBF5FF", color: "#42A5F5" },
  Complaint: { bg: "#FEF2F2", color: "#EF5350" },
};

const statusColors: Record<string, { bg: string; color: string }> = {
  Open: { bg: "#FFF9E8", color: "#FFC107" },
  Resolved: { bg: "#EAF7EA", color: "#4CAF50" },
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-3.5 h-3.5" fill={i <= rating ? "#FFC107" : "none"}
          style={{ color: i <= rating ? "#FFC107" : "#E5E7EB" }} />
      ))}
    </div>
  );
}

export function Feedback(_props?: any) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.feedback);
  const feedbackData: FeedbackItem[] = data?.items || [];
  const summary = data?.summary || {
    total: 0, average: "0.0", distribution: [], flagged: 0,
    open: 0, resolved: 0, complaints: 0, sentiment: [],
  };

  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [replyModal, setReplyModal] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = feedbackData.filter(f =>
    (filterType === "All" || f.type === filterType) &&
    (filterStatus === "All" || f.status === filterStatus)
  );

  const sentimentData = summary.sentiment;
  const ratingDistribution = summary.distribution.map((d: any) => d.star);
  const ratingCounts = summary.distribution.map((d: any) => d.count);
  const totalRatings = summary.total;
  const avgRating = summary.average;

  async function sendReply() {
    if (!replyText.trim() || !replyModal) return;
    setBusy(true);
    try {
      await adminApi.updateFeedback(replyModal.id, { reply: replyText.trim() });
      await refetch();
      setReplyModal(prev => prev
        ? { ...prev, replies: [...prev.replies, replyText.trim()], status: "Resolved" }
        : null);
      setReplyText("");
    } finally { setBusy(false); }
  }

  async function markResolved(id: string) {
    setBusy(true);
    try {
      await adminApi.updateFeedback(id, { status: "Resolved" });
      await refetch();
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await adminApi.deleteFeedback(id);
      await refetch();
    } finally {
      setDeleteConfirm(null);
      setDeletingId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading feedback…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load feedback</p>
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
        <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Feedback & Reviews</h2>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>Monitor user satisfaction and resolve complaints</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Rating Overview */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-4" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Rating Overview</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{avgRating}</div>
              <StarDisplay rating={Math.round(parseFloat(avgRating))} />
              <div className="text-xs mt-1" style={{ color: t.muted }}>{totalRatings} reviews</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingDistribution.map((r: number, i: number) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-xs w-2" style={{ color: t.textSec }}>{r}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: t.card2 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalRatings ? (ratingCounts[i] / totalRatings) * 100 : 0}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: "#FFC107" }}
                    />
                  </div>
                  <span className="text-xs w-4 text-right" style={{ color: t.textSec }}>{ratingCounts[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Sentiment Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 border"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold mb-3" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" outerRadius={50} dataKey="value" paddingAngle={4}>
                {sentimentData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, background: t.card, border: `1px solid ${t.border}`, color: t.text }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {sentimentData.map((s: any) => (
              <div key={s.name} className="text-center">
                <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}%</div>
                <div className="text-xs" style={{ color: t.muted }}>{s.name}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 border space-y-3"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>At a glance</h3>
          {[
            { label: "Total Reviews", value: String(summary.total), icon: Star, color: "#FFC107" },
            { label: "Complaints", value: String(summary.complaints), icon: MessageSquare, color: "#EF5350" },
            { label: "Resolved", value: String(summary.resolved), icon: CheckCircle, color: "#4CAF50" },
            { label: "Awaiting reply", value: String(summary.open), icon: TrendingUp, color: "#42A5F5" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: t.card2 }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="flex-1 text-sm" style={{ color: t.textSec }}>{label}</span>
              <span className="font-bold text-sm" style={{ color: t.text }}>{value}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: t.muted }}>Type:</span>
          {["All", "Praise", "Feedback", "Complaint"].map(typ => (
            <button key={typ} onClick={() => setFilterType(typ)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filterType === typ ? {
                background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
              } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
              {typ}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: t.muted }}>Status:</span>
          {["All", "Open", "Resolved"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filterStatus === s ? {
                background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
              } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-2xl p-8 border text-center"
            style={{ background: t.card, borderColor: t.border }}>
            <p className="text-sm" style={{ color: t.muted }}>
              {feedbackData.length === 0 ? "No reviews have been submitted yet." : "No reviews match these filters."}
            </p>
          </div>
        )}
        <AnimatePresence>
          {filtered.map((item, i) => (
            <motion.div key={item.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30, scale: 0.95 }}
              transition={{ delay: deletingId === item.id ? 0 : i * 0.06 }}
              className="rounded-2xl p-5 border transition-all"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: item.color || "#5E8B7E" }}>
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: t.text }}>{item.user}</span>
                      <span className="text-xs" style={{ color: t.muted }}>→ {item.counselor}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: (typeColors[item.type] || typeColors.Feedback).bg, color: (typeColors[item.type] || typeColors.Feedback).color }}>
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={item.rating} />
                      <span className="text-xs" style={{ color: t.muted }}>{item.date}</span>
                    </div>
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: t.textSec }}>{item.comment}</p>

                    {/* Replies */}
                    {item.replies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.replies.map((reply, ri) => (
                          <div key={ri} className="flex items-start gap-2 p-3 rounded-xl border-l-2"
                            style={{ background: t.card2, borderLeftColor: "#5E8B7E" }}>
                            <span className="text-xs font-semibold shrink-0" style={{ color: "#5E8B7E" }}>Admin:</span>
                            <p className="text-xs" style={{ color: t.textSec }}>{reply}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: (statusColors[item.status] || statusColors.Open).bg, color: (statusColors[item.status] || statusColors.Open).color }}>
                    {item.status}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.status === "Open" && (
                      <button className="px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: "#5E8B7E" }} disabled={busy}
                        onClick={() => markResolved(item.id)}>
                        Resolve
                      </button>
                    )}
                    <button onClick={() => { setReplyModal(item); setReplyText(""); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: t.card2, color: t.textSec }}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium" style={{ color: t.text }}>Delete?</span>
                        <button onClick={() => handleDelete(item.id)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-white"
                          style={{ background: "#EF5350" }}>Yes</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border"
                          style={{ color: t.textSec, borderColor: t.border }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: "#FEF2F2", color: "#EF5350" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setReplyModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: t.card }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Reply to Review</h3>
                  <button onClick={() => setReplyModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: t.card2 }}>
                    <X className="w-4 h-4" style={{ color: t.textSec }} />
                  </button>
                </div>

                <div className="p-3 rounded-xl mb-4" style={{ background: t.card2 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: t.text }}>{replyModal.user}</span>
                    <StarDisplay rating={replyModal.rating} />
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: t.textSec }}>{replyModal.comment}</p>
                </div>

                {replyModal.replies.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold" style={{ color: t.muted }}>Previous replies:</p>
                    {replyModal.replies.map((reply, ri) => (
                      <div key={ri} className="p-2.5 rounded-xl border-l-2"
                        style={{ background: t.card2, borderLeftColor: "#5E8B7E" }}>
                        <p className="text-xs" style={{ color: t.textSec }}>{reply}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Your Reply</label>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none resize-none transition-all"
                    style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}
                    onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                    onBlur={e => e.target.style.borderColor = t.inputBorder}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setReplyModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                  <button onClick={sendReply} disabled={!replyText.trim() || busy}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                    <Send className="w-4 h-4" /> {busy ? "Sending…" : "Send Reply"}
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
