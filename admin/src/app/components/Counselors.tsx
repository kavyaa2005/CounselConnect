import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Star, CheckCircle, XCircle, Ban, LayoutGrid, List,
  Clock, Users, MessageSquare, Download, Plus,
  Search, Eye, X, TrendingUp, Calendar, MapPin, Mail, Phone,
  ChevronLeft, ChevronRight, Shield, Edit2, Save, AlertTriangle
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const counselorsData = [
  { id: 1, name: "Dr. Sarah Lee", email: "s.lee@counsel.com", phone: "+1 (555) 100-0001", specialty: "Anxiety & Stress", experience: "8 yrs", rating: 4.9, sessions: 342, status: "Verified", avatar: "SL", color: "#5E8B7E", availability: "Mon–Fri", location: "New York, NY", pending: false, revenue: "$28,400", bio: "Licensed clinical psychologist specializing in CBT and mindfulness-based therapy." },
  { id: 2, name: "Dr. James Park", email: "j.park@counsel.com", phone: "+1 (555) 100-0002", specialty: "Depression", experience: "12 yrs", rating: 4.7, sessions: 518, status: "Pending", avatar: "JP", color: "#2D6A4F", availability: "Tue–Sat", location: "Los Angeles, CA", pending: true, revenue: "$0", bio: "Experienced psychiatrist with focus on mood disorders and evidence-based treatments." },
  { id: 3, name: "Dr. Lisa Wong", email: "l.wong@counsel.com", phone: "+1 (555) 100-0003", specialty: "Trauma & PTSD", experience: "6 yrs", rating: 4.8, sessions: 287, status: "Verified", avatar: "LW", color: "#42A5F5", availability: "Mon–Thu", location: "Chicago, IL", pending: false, revenue: "$21,800", bio: "Trauma specialist trained in EMDR and somatic experiencing." },
  { id: 4, name: "Dr. Robert Kim", email: "r.kim@counsel.com", phone: "+1 (555) 100-0004", specialty: "Couples Therapy", experience: "15 yrs", rating: 4.6, sessions: 621, status: "Verified", avatar: "RK", color: "#D8A48F", availability: "Wed–Sun", location: "Houston, TX", pending: false, revenue: "$52,300", bio: "Certified Gottman Method couples therapist with extensive relationship counseling experience." },
  { id: 5, name: "Dr. Emma Williams", email: "e.williams@counsel.com", phone: "+1 (555) 100-0005", specialty: "Career Counseling", experience: "5 yrs", rating: 4.5, sessions: 156, status: "Pending", avatar: "EW", color: "#F59E0B", availability: "Mon–Fri", location: "Phoenix, AZ", pending: true, revenue: "$0", bio: "Career and life coach helping clients with professional transitions and burnout recovery." },
  { id: 6, name: "Dr. Michael Brown", email: "m.brown@counsel.com", phone: "+1 (555) 100-0006", specialty: "Child & Adolescent", experience: "10 yrs", rating: 4.9, sessions: 403, status: "Suspended", avatar: "MB", color: "#EF5350", availability: "Tue–Fri", location: "Philadelphia, PA", pending: false, revenue: "$18,200", bio: "Child psychologist specializing in developmental disorders and family therapy." },
  { id: 7, name: "Dr. Jessica Taylor", email: "j.taylor@counsel.com", phone: "+1 (555) 100-0007", specialty: "Grief Counseling", experience: "7 yrs", rating: 4.7, sessions: 234, status: "Verified", avatar: "JT", color: "#8B5CF6", availability: "Mon–Wed", location: "San Antonio, TX", pending: false, revenue: "$15,600", bio: "Grief and bereavement specialist with training in compassion-focused therapy." },
  { id: 8, name: "Dr. David Martinez", email: "d.martinez@counsel.com", phone: "+1 (555) 100-0008", specialty: "Addiction Therapy", experience: "9 yrs", rating: 4.4, sessions: 289, status: "Pending", avatar: "DM", color: "#F97316", availability: "Thu–Sun", location: "San Diego, CA", pending: true, revenue: "$0", bio: "Addiction counselor specializing in substance use disorders and relapse prevention." },
];

const statusConfig: Record<string, { bg: string; color: string; dot: string }> = {
  Verified: { bg: "#EAF7EA", color: "#4CAF50", dot: "#4CAF50" },
  Pending: { bg: "#FFF9E8", color: "#F59E0B", dot: "#F59E0B" },
  Suspended: { bg: "#FEF2F2", color: "#EF5350", dot: "#EF5350" },
};

interface AddCounselorForm {
  name: string; email: string; phone: string; specialty: string;
  experience: string; location: string; bio: string;
}
const emptyForm: AddCounselorForm = { name: "", email: "", phone: "", specialty: "", experience: "", location: "", bio: "" };

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className="w-3 h-3"
          fill={i <= Math.round(rating) ? "#FFC107" : "none"}
          style={{ color: i <= Math.round(rating) ? "#FFC107" : "#E5E7EB" }} />
      ))}
      <span className="ml-1 text-xs font-semibold" style={{ color: "#374151" }}>{rating}</span>
    </div>
  );
}

export function Counselors({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const [counselors, setCounselors] = useState(counselorsData);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof counselorsData[0] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddCounselorForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<Partial<AddCounselorForm>>({});

  useEffect(() => {
    if (pageAction === "add") { setShowAddModal(true); onActionConsumed?.(); }
  }, [pageAction]);
  const [addSuccess, setAddSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<typeof counselorsData[0] | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState(false);

  const filtered = counselors.filter(c =>
    (filterStatus === "All" || c.status === filterStatus) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = counselors.filter(c => c.pending).length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAction(id: number, action: string) {
    const c = counselors.find(x => x.id === id);
    showToast(action === "approve" ? `✓ ${c?.name} approved successfully!` : `${c?.name} has been rejected.`);
    if (action === "approve") {
      setCounselors(prev => prev.map(x => x.id === id ? { ...x, status: "Verified", pending: false } : x));
    }
  }

  function handleSuspendConfirm() {
    if (!selected) return;
    setCounselors(prev => prev.map(c => c.id === selected.id ? { ...c, status: "Suspended" } : c));
    setSelected(prev => prev ? { ...prev, status: "Suspended" } : null);
    setSuspendConfirm(false);
    showToast(`${selected.name} has been suspended.`);
  }

  function startEdit() {
    if (selected) { setEditData({ ...selected }); setEditMode(true); }
  }

  function saveEdit() {
    if (!editData) return;
    setCounselors(prev => prev.map(c => c.id === editData.id ? editData : c));
    setSelected(editData);
    setEditMode(false);
    showToast("Profile updated successfully!");
  }

  function validateAdd() {
    const errs: Partial<AddCounselorForm> = {};
    if (!addForm.name.trim()) errs.name = "Required";
    if (!addForm.email.trim()) errs.email = "Required";
    if (!addForm.phone.trim()) errs.phone = "Required";
    if (!addForm.specialty.trim()) errs.specialty = "Required";
    if (!addForm.experience.trim()) errs.experience = "Required";
    if (!addForm.location.trim()) errs.location = "Required";
    return errs;
  }

  function handleAddCounselor() {
    const errs = validateAdd();
    if (Object.keys(errs).length > 0) { setAddErrors(errs); return; }
    setAddSuccess(true);
    setTimeout(() => { setAddSuccess(false); setShowAddModal(false); setAddForm(emptyForm); setAddErrors({}); }, 2000);
  }

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Counselors</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>
            {counselors.filter(c => c.status === "Verified").length} verified · {pendingCount} pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
            style={viewMode === "grid" ? { background: "#5E8B7E", color: "white", border: "none" } : { color: t.muted, borderColor: t.border, background: t.card }}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
            style={viewMode === "list" ? { background: "#5E8B7E", color: "white", border: "none" } : { color: t.muted, borderColor: t.border, background: t.card }}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowAddModal(true); setAddSuccess(false); setAddForm(emptyForm); setAddErrors({}); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
            <Plus className="w-4 h-4" /> Add Counselor
          </button>
        </div>
      </div>

      {/* Pending Alert */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl border"
            style={{ background: t.card, borderColor: "#F59E0B30" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F59E0B" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>
                {pendingCount} counselors awaiting verification
              </p>
              <p className="text-xs mt-0.5" style={{ color: t.muted }}>Review credentials and documentation before approval</p>
            </div>
            <button onClick={() => setFilterStatus("Pending")}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "#F59E0B" }}>
              Review Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search counselors..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all"
            style={{ ...inputStyle }}
            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
            onBlur={e => e.target.style.borderColor = t.inputBorder}
          />
        </div>
        <div className="flex items-center gap-2">
          {["All", "Verified", "Pending", "Suspended"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={filterStatus === s ? {
                background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
              } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map((c, i) => {
            const sc = statusConfig[c.status];
            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, boxShadow: t.shadowHov }}
                className="rounded-2xl p-5 border flex flex-col cursor-pointer"
                style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
                onClick={() => { setSelected(c); setEditMode(false); setSuspendConfirm(false); }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base"
                      style={{ background: c.color }}>{c.avatar}</div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: t.text }}>{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: t.muted }}>{c.specialty}</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
                    style={{ background: sc.bg, color: sc.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />{c.status}
                  </span>
                </div>
                <Stars rating={c.rating} />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: "Exp.", value: c.experience },
                    { label: "Sessions", value: c.sessions },
                    { label: "Revenue", value: c.revenue },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center py-2.5 rounded-xl" style={{ background: t.card2 }}>
                      <div className="text-xs font-bold" style={{ color: t.text }}>{value}</div>
                      <div className="text-xs mt-0.5" style={{ color: t.muted }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: t.muted }}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{c.location}</span>
                  <span className="ml-auto shrink-0">{c.availability}</span>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2" style={{ borderColor: t.border }}>
                  {c.pending ? (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleAction(c.id, "approve"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ background: "#4CAF50" }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleAction(c.id, "reject"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ background: "#EF5350" }}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={e => { e.stopPropagation(); setSelected(c); setEditMode(false); setSuspendConfirm(false); }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors"
                        style={{ color: "#5E8B7E", borderColor: "#5E8B7E" }}>
                        View Profile
                      </button>
                      <button onClick={e => e.stopPropagation()}
                        className="w-8 h-8 flex items-center justify-center rounded-xl border transition-colors"
                        style={{ borderColor: t.border }}>
                        <MessageSquare className="w-3.5 h-3.5" style={{ color: t.muted }} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* List */}
      {viewMode === "list" && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
          <table className="w-full">
            <thead style={{ background: t.card2, borderBottom: `1px solid ${t.border}` }}>
              <tr>
                {["Counselor", "Specialty", "Experience", "Rating", "Sessions", "Revenue", "Status", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: t.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const sc = statusConfig[c.status];
                return (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b transition-colors cursor-pointer group"
                    style={{ borderColor: t.border }}
                    onClick={() => { setSelected(c); setEditMode(false); setSuspendConfirm(false); }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: c.color }}>{c.avatar}</div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: t.text }}>{c.name}</div>
                          <div className="text-xs" style={{ color: t.muted }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{c.specialty}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{c.experience}</td>
                    <td className="px-5 py-3.5"><Stars rating={c.rating} /></td>
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: t.text }}>{c.sessions}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold" style={{ color: t.text }}>{c.revenue}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: sc.bg, color: sc.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />{c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        {c.pending ? (
                          <>
                            <button onClick={() => handleAction(c.id, "approve")}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: "#4CAF50" }}>Approve</button>
                            <button onClick={() => handleAction(c.id, "reject")}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: "#EF5350" }}>Reject</button>
                          </>
                        ) : (
                          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            style={{ color: "#5E8B7E", borderColor: "#5E8B7E" }}>View</button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Counselor Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
              onClick={() => { setSelected(null); setEditMode(false); setSuspendConfirm(false); }} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-96 z-50 shadow-2xl flex flex-col overflow-hidden"
              style={{ background: t.card }}
            >
              <div className="relative h-28 shrink-0"
                style={{ background: `linear-gradient(135deg, ${selected.color}CC, ${selected.color})` }}>
                <button onClick={() => { setSelected(null); setEditMode(false); setSuspendConfirm(false); }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="px-6 relative">
                <div className="absolute -top-10 left-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-bold border-4 shadow-lg"
                    style={{ background: selected.color, borderColor: t.card }}>
                    {selected.avatar}
                  </div>
                </div>
              </div>

              <div className="px-6 pt-14 pb-4 border-b" style={{ borderColor: t.border }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{selected.name}</h3>
                    <p className="text-xs" style={{ color: t.muted }}>{selected.specialty}</p>
                    <Stars rating={selected.rating} />
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: statusConfig[selected.status].bg, color: statusConfig[selected.status].color }}>
                    {selected.status}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {editMode && editData ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.muted }}>Edit Profile</p>
                    {(["name", "email", "phone", "specialty", "experience", "location"] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs font-medium mb-1 block capitalize" style={{ color: t.muted }}>{field}</label>
                        <input value={editData[field]}
                          onChange={e => setEditData({ ...editData, [field]: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                          style={{ ...inputStyle }}
                          onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                          onBlur={e => e.target.style.borderColor = t.inputBorder}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: t.muted }}>Bio</label>
                      <textarea value={editData.bio}
                        onChange={e => setEditData({ ...editData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-xl border outline-none resize-none"
                        style={{ ...inputStyle }}
                        onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                        onBlur={e => e.target.style.borderColor = t.inputBorder}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed" style={{ color: t.textSec }}>{selected.bio}</p>
                    {[
                      { icon: Mail, label: "Email", value: selected.email },
                      { icon: Phone, label: "Phone", value: selected.phone },
                      { icon: MapPin, label: "Location", value: selected.location },
                      { icon: Clock, label: "Experience", value: selected.experience },
                      { icon: Users, label: "Total Sessions", value: `${selected.sessions} sessions` },
                      { icon: TrendingUp, label: "Revenue Generated", value: selected.revenue },
                      { icon: Calendar, label: "Availability", value: selected.availability },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: t.card2 }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#F0F7F5" }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: "#5E8B7E" }} />
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: t.muted }}>{label}</div>
                          <div className="text-sm font-medium" style={{ color: t.text }}>{value}</div>
                        </div>
                      </div>
                    ))}

                    {/* Suspend Confirmation Inline */}
                    <AnimatePresence>
                      {suspendConfirm && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="p-4 rounded-xl border"
                          style={{ background: "#FEF2F2", borderColor: "#EF535040" }}>
                          <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#EF5350" }} />
                            <p className="text-sm font-medium" style={{ color: "#EF5350" }}>
                              Are you sure you want to suspend {selected.name}?
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setSuspendConfirm(false)}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                              style={{ color: "#6B7280", borderColor: "#D1D5DB" }}>Cancel</button>
                            <button onClick={handleSuspendConfirm}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                              style={{ background: "#EF5350" }}>Confirm Suspend</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t flex gap-2" style={{ borderColor: t.border }}>
                {selected.pending ? (
                  <>
                    <button onClick={() => { handleAction(selected.id, "approve"); setSelected(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#4CAF50" }}>
                      Approve
                    </button>
                    <button onClick={() => { handleAction(selected.id, "reject"); setSelected(null); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#EF5350" }}>
                      Reject
                    </button>
                  </>
                ) : editMode ? (
                  <>
                    <button onClick={() => setEditMode(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                      style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                    <button onClick={saveEdit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                      <Save className="w-4 h-4" /> Save Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={startEdit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                    {selected.status !== "Suspended" && (
                      <button onClick={() => setSuspendConfirm(!suspendConfirm)}
                        className="px-4 py-2.5 rounded-xl border text-sm font-semibold"
                        style={{ color: "#F59E0B", borderColor: "#F59E0B" }}>
                        Suspend
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Counselor Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => { setShowAddModal(false); setAddSuccess(false); }} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-[420px] z-[70] shadow-2xl flex flex-col overflow-hidden"
              style={{ background: t.card }}>
              <div style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>Add Counselor</h3>
                    <p className="text-sm text-white/70 mt-0.5">Fill in the counselor's details</p>
                  </div>
                  <button onClick={() => { setShowAddModal(false); setAddSuccess(false); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.15)" }}>
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  {addSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center h-64 gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#EAF7EA" }}>
                        <CheckCircle className="w-8 h-8" style={{ color: "#4CAF50" }} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg" style={{ color: t.text }}>Counselor added!</p>
                        <p className="text-sm mt-1" style={{ color: t.muted }}>Pending verification review.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      {[
                        { key: "name" as keyof AddCounselorForm, label: "Full Name", placeholder: "Dr. First Last" },
                        { key: "email" as keyof AddCounselorForm, label: "Email", placeholder: "doctor@email.com" },
                        { key: "phone" as keyof AddCounselorForm, label: "Phone", placeholder: "+1 (555) 000-0000" },
                        { key: "specialty" as keyof AddCounselorForm, label: "Specialty", placeholder: "e.g. Anxiety & Stress" },
                        { key: "experience" as keyof AddCounselorForm, label: "Experience (years)", placeholder: "e.g. 5 yrs" },
                        { key: "location" as keyof AddCounselorForm, label: "Location", placeholder: "City, State" },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{label}</label>
                          <input value={addForm[key]}
                            onChange={e => { setAddForm(f => ({ ...f, [key]: e.target.value })); setAddErrors(er => ({ ...er, [key]: undefined })); }}
                            placeholder={placeholder}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                            style={{ ...inputStyle, borderColor: addErrors[key] ? "#EF5350" : t.inputBorder }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = addErrors[key] ? "#EF5350" : t.inputBorder}
                          />
                          {addErrors[key] && <p className="text-xs mt-1" style={{ color: "#EF5350" }}>{addErrors[key]}</p>}
                        </div>
                      ))}
                      <div>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Bio</label>
                        <textarea value={addForm.bio}
                          onChange={e => setAddForm(f => ({ ...f, bio: e.target.value }))}
                          placeholder="Brief professional bio..."
                          rows={3}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none resize-none"
                          style={{ ...inputStyle }}
                          onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                          onBlur={e => e.target.style.borderColor = t.inputBorder}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {!addSuccess && (
                <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: t.border }}>
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                  <button onClick={handleAddCounselor}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>Save Counselor</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium text-white"
            style={{ background: "#1F2937" }}
          >
            <CheckCircle className="w-4 h-4" style={{ color: "#4CAF50" }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
