import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, ShieldCheck, CheckCircle, XCircle, X, Mail, Phone, MapPin,
  Award, Clock, Eye, Search, AlertTriangle, Inbox, Languages, IndianRupee,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";
import { useMoney } from "../../lib/money";

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: "#FFF9E8", color: "#F59E0B", label: "Pending review" },
  approved: { bg: "#EAF7EA", color: "#4CAF50", label: "Approved" },
  rejected: { bg: "#FEF2F2", color: "#EF5350", label: "Rejected" },
};

export function Applications({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  // Currency follows the server (the gateway charges in ₹), never a literal '$'.
  const { money, symbol } = useMoney();
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.applications);

  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const applications: any[] = data?.applications || [];
  const counts = data?.counts || { pending: 0, approved: 0, rejected: 0, total: 0 };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200); };

  const filtered = applications
    .filter(a => filter === "all" || a.status === filter)
    .filter(a =>
      !search ||
      (a.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.specialty || "").toLowerCase().includes(search.toLowerCase())
    );

  async function approve() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await adminApi.approveApplication(selected.id, note);
      await refetch();
      setSelected(null);
      setNote("");
      flash(res.message || `${selected.fullName} approved`);
    } catch (e: any) {
      flash(e.message || "Could not approve");
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!selected) return;
    setBusy(true);
    try {
      await adminApi.rejectApplication(selected.id, note);
      await refetch();
      setSelected(null);
      setNote("");
      setConfirmReject(false);
      flash("Application rejected");
    } catch (e: any) {
      flash(e.message || "Could not reject");
    } finally { setBusy(false); }
  }

  async function openDoc(docId: string) {
    setDocError(null);
    try {
      await adminApi.openApplicationDoc(selected.id, docId);
    } catch (e: any) {
      setDocError(e.message || "Could not open the document. Allow pop-ups for this site.");
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading applications…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load applications</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: t.muted }}>
            If this keeps happening, check the backend is running on port 5000 and that you are still signed in.
          </p>
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
            className="fixed top-5 right-5 z-[120] px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
            style={{ background: "#2D6A4F" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>
            Counselor Applications
          </h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>
            Verify degrees and certifications before granting access
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or specialty..."
            className="pl-9 pr-4 py-2 text-sm rounded-xl border outline-none"
            style={{ background: t.input, borderColor: t.inputBorder, color: t.text, width: 280 }} />
        </div>
      </div>

      {/* Pending alert */}
      {counts.pending > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl border"
          style={{ background: t.card, borderColor: "#F59E0B30" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F59E0B" }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
              {counts.pending} application{counts.pending === 1 ? "" : "s"} awaiting credential review
            </p>
            <p className="text-xs mt-0.5" style={{ color: t.muted }}>
              Open each one to inspect the uploaded degree and certification files before approving.
            </p>
          </div>
          {filter !== "pending" && (
            <button onClick={() => setFilter("pending")}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white shrink-0"
              style={{ background: "#F59E0B" }}>
              Review now
            </button>
          )}
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          ["pending", counts.pending],
          ["approved", counts.approved],
          ["rejected", counts.rejected],
          ["all", counts.total],
        ] as const).map(([key, count]) => (
          <button key={key} onClick={() => setFilter(key as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize"
            style={filter === key
              ? { background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white" }
              : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
            {key}
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: filter === key ? "rgba(255,255,255,0.25)" : t.card2,
                color: filter === key ? "white" : t.muted,
              }}>{count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: t.card, borderColor: t.border }}>
          <Inbox className="w-10 h-10 mx-auto mb-3" style={{ color: t.muted }} />
          <p className="font-semibold text-sm" style={{ color: t.text }}>
            {applications.length === 0 ? "No applications yet" : `No ${filter} applications`}
          </p>
          <p className="text-xs mt-1.5 max-w-sm mx-auto" style={{ color: t.muted }}>
            {applications.length === 0
              ? "When a counselor applies through the public \"Join as Counselor\" page, their application lands here for review."
              : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {filtered.map((a, i) => {
            const st = statusStyle[a.status] || statusStyle.pending;
            return (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}
                onClick={() => { setSelected(a); setNote(""); setConfirmReject(false); setDocError(null); }}
                className="rounded-2xl p-5 border cursor-pointer"
                style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: a.color }}>
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: t.text }}>{a.fullName}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: t.muted }}>{a.email}</p>
                    <p className="text-xs mt-1.5" style={{ color: "#5E8B7E", fontWeight: 600 }}>{a.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: t.border }}>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: t.textSec }}>
                    <FileText className="w-3.5 h-3.5" />
                    {(a.documents || []).length} document{(a.documents || []).length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: t.muted }}>
                    <Clock className="w-3.5 h-3.5" /> {a.submittedLabel}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "#5E8B7E" }}>
                    <Eye className="w-3.5 h-3.5" /> Review
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Review drawer ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
              onClick={() => setSelected(null)} />

            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full z-50 shadow-2xl flex flex-col overflow-hidden"
              style={{ background: t.card, width: 460 }}>

              {/* Header */}
              <div className="relative shrink-0" style={{ background: `linear-gradient(135deg, ${selected.color}CC, ${selected.color})` }}>
                <div className="px-6 py-5">
                  <button onClick={() => setSelected(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.18)", border: "none", cursor: "pointer" }}>
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-3"
                    style={{ background: "rgba(255,255,255,0.2)" }}>
                    {selected.initials}
                  </div>
                  <h3 className="font-bold text-white text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {selected.fullName}
                  </h3>
                  <p className="text-sm text-white/75">{selected.specialty}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.muted }}>Status</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: (statusStyle[selected.status] || statusStyle.pending).bg,
                      color: (statusStyle[selected.status] || statusStyle.pending).color,
                    }}>
                    {(statusStyle[selected.status] || statusStyle.pending).label}
                  </span>
                </div>

                {/* ── Credentials: the whole point of this screen ── */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: t.muted }}>
                    Uploaded credentials
                  </p>
                  {(selected.documents || []).length === 0 && (
                    <p className="text-sm" style={{ color: t.muted }}>No documents were uploaded.</p>
                  )}
                  <div className="space-y-2">
                    {(selected.documents || []).map((d: any) => (
                      <button key={d.id} onClick={() => openDoc(d.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors"
                        style={{ borderColor: t.border, background: t.card2, cursor: "pointer" }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "#F0F7F5" }}>
                          <FileText className="w-4 h-4" style={{ color: "#5E8B7E" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: t.text }}>{d.originalName}</p>
                          <p className="text-xs" style={{ color: t.muted }}>{d.label} · {d.sizeLabel}</p>
                        </div>
                        <Eye className="w-4 h-4 shrink-0" style={{ color: "#5E8B7E" }} />
                      </button>
                    ))}
                  </div>
                  {docError && (
                    <p className="text-xs mt-2" style={{ color: "#EF5350" }}>{docError}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: t.muted }}>
                    Opens in a new tab. Documents are private and only visible to admins.
                  </p>
                </div>

                {/* Details */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: t.muted }}>
                    Application details
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: Award, label: "Qualification", value: selected.qualification },
                      { icon: ShieldCheck, label: "Licence number", value: selected.licenseNumber },
                      { icon: Clock, label: "Experience", value: selected.experience || "—" },
                      { icon: Mail, label: "Email", value: selected.email },
                      { icon: Phone, label: "Phone", value: selected.phone || "—" },
                      { icon: MapPin, label: "Location", value: selected.location || "—" },
                      { icon: Languages, label: "Languages", value: (selected.languages || []).join(", ") || "—" },
                      { icon: IndianRupee, label: "Session fee", value: money(selected.price) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: t.card2 }}>
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#5E8B7E" }} />
                        <span className="text-xs w-28 shrink-0" style={{ color: t.muted }}>{label}</span>
                        <span className="text-xs font-medium truncate" style={{ color: t.text }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.bio && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: t.muted }}>Bio</p>
                    <p className="text-sm leading-relaxed" style={{ color: t.textSec }}>{selected.bio}</p>
                  </div>
                )}

                {selected.status !== "pending" && selected.reviewNote && (
                  <div className="p-3 rounded-xl" style={{ background: t.card2 }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: t.muted }}>Review note</p>
                    <p className="text-sm" style={{ color: t.textSec }}>{selected.reviewNote}</p>
                  </div>
                )}

                {/* Decision note */}
                {selected.status === "pending" && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: t.muted }}>
                      Review note <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
                    </p>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                      placeholder="e.g. Licence verified against the RCI register"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                      style={{ background: t.input, borderColor: t.inputBorder, color: t.text }} />
                  </div>
                )}

                {/* Reject confirmation */}
                <AnimatePresence>
                  {confirmReject && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl overflow-hidden"
                      style={{ background: "#FEF2F2", border: "1px solid #EF535040" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: "#EF5350" }} />
                        <p className="text-sm font-semibold" style={{ color: "#EF5350" }}>Reject this application?</p>
                      </div>
                      <p className="text-xs mb-3" style={{ color: "#B91C1C" }}>
                        No counselor account will be created. {selected.fullName} will see your note when they check their status.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmReject(false)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                          style={{ color: "#6B7280", borderColor: "#D1D5DB", background: "white", cursor: "pointer" }}>
                          Keep
                        </button>
                        <button onClick={reject} disabled={busy}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                          style={{ background: "#EF5350", border: "none", cursor: "pointer" }}>
                          {busy ? "Rejecting…" : "Confirm reject"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              {selected.status === "pending" && !confirmReject && (
                <div className="px-6 py-4 border-t flex gap-2" style={{ borderColor: t.border }}>
                  <button onClick={approve} disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "#4CAF50", border: "none", cursor: "pointer" }}>
                    <CheckCircle className="w-4 h-4" />
                    {busy ? "Approving…" : "Approve & create account"}
                  </button>
                  <button onClick={() => setConfirmReject(true)} disabled={busy}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: "#EF5350", borderColor: "#EF5350", background: "transparent", cursor: "pointer" }}>
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selected.status === "approved" && (
                <div className="px-6 py-4 border-t" style={{ borderColor: t.border }}>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: "#EAF7EA" }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "#4CAF50" }} />
                    <p className="text-xs" style={{ color: "#2D6A4F" }}>
                      Approved — this counselor can sign in with the password they chose when applying.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
