import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ChevronUp, ChevronDown, Eye, Edit2, Ban, Trash2,
  X, Mail, Phone, Calendar, MapPin, Activity, FileText, Clock,
  UserCheck, Download, Plus, ChevronLeft, ChevronRight, CheckCircle
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData, exportCsv } from "../lib/adminApi";
import { fileUrl } from '../../lib/api';

const statusConfig: Record<string, { bg: string; color: string; dot: string }> = {
  Active: { bg: "#EAF7EA", color: "#4CAF50", dot: "#4CAF50" },
  Suspended: { bg: "#FEF2F2", color: "#EF5350", dot: "#EF5350" },
  Inactive: { bg: "#F3F4F6", color: "#9CA3AF", dot: "#D1D5DB" },
  Pending: { bg: "#FFF9E8", color: "#F59E0B", dot: "#F59E0B" },
};

type SortKey = "name" | "email" | "joined" | "status" | "sessions";

interface AddUserForm {
  name: string;
  email: string;
  phone: string;
  location: string;
  gender: string;
  password: string;
}

const emptyForm: AddUserForm = { name: "", email: "", phone: "", location: "", gender: "", password: "" };

export function Users({ pageAction, onActionConsumed }: { pageAction?: string | null; onActionConsumed?: () => void } = {}) {
  const { t } = useTheme();
  const { data, loading, error, refetch } = useAdminData(adminApi.users);
  const allUsers: any[] = data?.users || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "history" | "docs">("profile");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddUserForm>(emptyForm);
  const [addErrors, setAddErrors] = useState<Partial<AddUserForm>>({});
  const [addSuccess, setAddSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (pageAction === "add") { setShowAddModal(true); onActionConsumed?.(); }
  }, [pageAction]);

  // Pull the full record (appointments, documents) when the drawer opens
  useEffect(() => {
    if (!selectedUser) { setDetail(null); return; }
    let cancelled = false;
    adminApi.user(selectedUser.id)
      .then(r => { if (!cancelled) setDetail(r.data.user); })
      .catch(() => { if (!cancelled) setDetail(null); });
    return () => { cancelled = true; };
  }, [selectedUser?.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function setUserStatus(id: string, status: string) {
    setBusy(true);
    try {
      await adminApi.updateUser(id, { status });
      await refetch();
      setSelectedUser((p: any) => (p && p.id === id ? { ...p, status } : p));
      showToast(`User marked as ${status}`);
    } catch (e: any) {
      showToast(e.message || "Update failed");
    } finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await adminApi.deleteUser(id);
      await refetch();
      setConfirmDelete(null);
      setSelectedUser(null);
      showToast("User deleted");
    } catch (e: any) {
      showToast(e.message || "Delete failed");
    } finally { setBusy(false); }
  }

  function handleExport() {
    exportCsv("users.csv", allUsers.map(u => ({
      Name: u.name, Email: u.email, Phone: u.phone, Status: u.status,
      Sessions: u.sessions, Joined: u.joined, "Last Active": u.lastActive, Location: u.location,
    })));
  }

  const perPage = 8;

  const filtered = allUsers
    .filter(u =>
      (statusFilter === "All" || u.status === statusFilter) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const av = String(a[sortKey as keyof typeof a]);
      const bv = String(b[sortKey as keyof typeof b]);
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  }

  const statusCounts = Object.fromEntries(
    ["Active", "Inactive", "Suspended", "Pending"].map(s => [s, allUsers.filter(u => u.status === s).length])
  );

  function validateAddForm() {
    const errs: Partial<AddUserForm> = {};
    if (!addForm.name.trim()) errs.name = "Required";
    if (!addForm.email.trim()) errs.email = "Required";
    if (!addForm.phone.trim()) errs.phone = "Required";
    if (!addForm.location.trim()) errs.location = "Required";
    if (!addForm.gender) errs.gender = "Required";
    if (!addForm.password.trim()) errs.password = "Required";
    return errs;
  }

  async function handleAddUser() {
    const errs = validateAddForm();
    if (Object.keys(errs).length > 0) { setAddErrors(errs); return; }
    setBusy(true);
    try {
      await adminApi.createUser(addForm);
      await refetch();
      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddModal(false);
        setAddForm(emptyForm);
        setAddErrors({});
      }, 1600);
    } catch (e: any) {
      setAddErrors({ email: e.message || "Could not create user" });
    } finally { setBusy(false); }
  }

  function openAdd() {
    setAddForm(emptyForm);
    setAddErrors({});
    setAddSuccess(false);
    setShowAddModal(true);
  }

  const inputStyle = {
    background: t.input,
    borderColor: t.inputBorder,
    color: t.text,
  };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading users…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6" style={{ background: t.bg, minHeight: "100vh" }}>
        <div className="rounded-2xl p-5 border max-w-md" style={{ background: t.card, borderColor: "#EF535030" }}>
          <p className="font-semibold text-sm" style={{ color: t.text }}>Couldn't load users</p>
          <p className="text-xs mt-1" style={{ color: t.muted }}>{error}</p>
          <button onClick={refetch} className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#5E8B7E" }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      {/* Toast */}
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
          <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>User Management</h2>
          <p className="text-sm mt-0.5" style={{ color: t.muted }}>{allUsers.length} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm hover:opacity-80 transition-colors"
            style={{ color: t.textSec, borderColor: t.border, background: t.card }}>
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-4 gap-3">
        {(["Active", "Inactive", "Suspended", "Pending"] as const).map(s => {
          const c = statusConfig[s];
          return (
            <motion.button key={s}
              whileHover={{ y: -2 }}
              onClick={() => { setStatusFilter(statusFilter === s ? "All" : s); setPage(1); }}
              className="p-3.5 rounded-xl border text-left transition-all"
              style={{
                background: statusFilter === s ? c.bg + "33" : t.card,
                borderColor: statusFilter === s ? c.color + "40" : t.border,
                boxShadow: t.shadow,
              }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                <span className="text-xs font-medium" style={{ color: c.color }}>{s}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>
                {statusCounts[s]}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="rounded-2xl p-4 border flex flex-wrap items-center gap-3"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.muted }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none transition-all"
            style={{ ...inputStyle, borderColor: t.inputBorder }}
            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
            onBlur={e => e.target.style.borderColor = t.inputBorder}
          />
        </div>
        <div className="flex items-center gap-2">
          {["All", "Active", "Inactive", "Suspended", "Pending"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={statusFilter === s ? {
                background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
              } : { background: t.input, color: t.textSec }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: t.card2, borderBottom: `1px solid ${t.border}` }}>
                {[
                  { l: "User", k: "name" as SortKey },
                  { l: "Email", k: "email" as SortKey },
                  { l: "Phone", k: null },
                  { l: "Joined", k: "joined" as SortKey },
                  { l: "Sessions", k: "sessions" as SortKey },
                  { l: "Last Active", k: null },
                  { l: "Status", k: "status" as SortKey },
                  { l: "Actions", k: null },
                ].map(col => (
                  <th key={col.l}
                    onClick={() => col.k && toggleSort(col.k)}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider select-none"
                    style={{ color: t.muted, cursor: col.k ? "pointer" : "default" }}>
                    <div className="flex items-center gap-1">
                      {col.l}
                      {col.k && (sortKey === col.k
                        ? (sortAsc ? <ChevronUp className="w-3 h-3" style={{ color: "#5E8B7E" }} />
                          : <ChevronDown className="w-3 h-3" style={{ color: "#5E8B7E" }} />)
                        : <ChevronUp className="w-3 h-3 opacity-20" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: t.muted }}>
                      No users match your filters.
                    </td>
                  </tr>
                )}
                {paged.map((user: any, i: number) => {
                  const sc = statusConfig[user.status] || statusConfig.Active;
                  const bg = user.color;
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b transition-colors group cursor-pointer"
                      style={{ borderColor: t.border }}
                      onClick={() => { setSelectedUser(user); setDrawerTab("profile"); }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: bg }}>
                            {user.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: t.text }}>{user.name}</div>
                            <div className="text-xs" style={{ color: t.muted }}>{user.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{user.email}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{user.phone}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: t.textSec }}>{user.joined}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold" style={{ color: t.text }}>{user.sessions}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: t.muted }}>{user.lastActive}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: sc.bg, color: sc.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Always visible — hiding row actions behind a hover
                            makes them undiscoverable, and unusable on touch. */}
                        <div className="flex items-center gap-1"
                          onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setSelectedUser(user); setDrawerTab("profile"); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" title="View"
                            style={{ background: "#EBF5FF" }}>
                            <Eye className="w-3.5 h-3.5" style={{ color: "#42A5F5" }} />
                          </button>
                          <button onClick={() => { setSelectedUser(user); setDrawerTab("profile"); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" title="Edit"
                            style={{ background: "#F0F7F5" }}>
                            <Edit2 className="w-3.5 h-3.5" style={{ color: "#5E8B7E" }} />
                          </button>
                          <button disabled={busy}
                            onClick={() => setUserStatus(user.id, user.status === "Suspended" ? "Active" : "Suspended")}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                            title={user.status === "Suspended" ? "Reactivate" : "Suspend"}
                            style={{ background: "#FFF9E8" }}>
                            <Ban className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                          </button>
                          <button onClick={() => setConfirmDelete(user.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" title="Delete"
                            style={{ background: "#FEF2F2" }}>
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF5350" }} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: `1px solid ${t.border}` }}>
          <span className="text-xs" style={{ color: t.muted }}>
            Showing <strong style={{ color: t.text }}>{(page - 1) * perPage + 1}</strong>–<strong style={{ color: t.text }}>{Math.min(page * perPage, filtered.length)}</strong> of <strong style={{ color: t.text }}>{filtered.length}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-40"
              style={{ borderColor: t.border, background: t.card }}>
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: t.textSec }} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                style={page === i + 1 ? {
                  background: "#5E8B7E", color: "white"
                } : { color: t.textSec, background: t.input }}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-40"
              style={{ borderColor: t.border, background: t.card }}>
              <ChevronRight className="w-3.5 h-3.5" style={{ color: t.textSec }} />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-96 z-50 shadow-2xl flex flex-col overflow-hidden"
              style={{ background: t.card }}
            >
              {/* Drawer Header */}
              <div className="relative h-32 shrink-0"
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <button onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute -bottom-12 left-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 shadow-lg overflow-hidden"
                    style={{ background: selectedUser.color, borderColor: t.card }}>
                    {selectedUser.avatarUrl
                      ? <img src={fileUrl(selectedUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                      : selectedUser.avatar}
                  </div>
                </div>
              </div>

              {/* User Name */}
              <div className="px-6 pt-14 pb-4 border-b" style={{ borderColor: t.border }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{selectedUser.name}</h3>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: t.muted }}>
                      ID: {String(selectedUser.id).slice(0, 8)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1"
                    style={{ background: (statusConfig[selectedUser.status] || statusConfig.Active).bg, color: (statusConfig[selectedUser.status] || statusConfig.Active).color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: (statusConfig[selectedUser.status] || statusConfig.Active).dot }} />
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b" style={{ borderColor: t.border }}>
                {(["profile", "history", "docs"] as const).map(tb => (
                  <button key={tb} onClick={() => setDrawerTab(tb)}
                    className="flex-1 py-3 text-xs font-semibold capitalize transition-colors"
                    style={drawerTab === tb ? { color: "#5E8B7E", borderBottom: "2px solid #5E8B7E" } : { color: t.muted }}>
                    {tb === "docs" ? "Documents" : tb === "history" ? "Appointments" : "Profile"}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AnimatePresence mode="wait">
                  {drawerTab === "profile" && (
                    <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {[
                        { icon: Mail, label: "Email", value: selectedUser.email },
                        { icon: Phone, label: "Phone", value: selectedUser.phone },
                        { icon: MapPin, label: "Location", value: selectedUser.location },
                        { icon: Calendar, label: "Joined", value: selectedUser.joined },
                        { icon: UserCheck, label: "Gender", value: selectedUser.gender },
                        { icon: Activity, label: "Sessions", value: `${selectedUser.sessions} completed` },
                        { icon: Clock, label: "Last Active", value: selectedUser.lastActive },
                        { icon: Activity, label: "Mood entries", value: String(detail?.moodEntries ?? "—") },
                        { icon: FileText, label: "Journal entries", value: String(detail?.journalEntries ?? "—") },
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
                    </motion.div>
                  )}

                  {drawerTab === "history" && (
                    <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {!detail && <p className="text-xs" style={{ color: t.muted }}>Loading…</p>}
                      {detail && detail.history.length === 0 && (
                        <p className="text-xs" style={{ color: t.muted }}>No appointments booked yet.</p>
                      )}
                      {(detail?.history || []).map((a: any) => (
                        <div key={a.id} className="p-3.5 rounded-xl border" style={{ borderColor: t.border, background: t.card2 }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono" style={{ color: t.muted }}>{a.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={a.status === "Completed"
                                ? { background: "#EAF7EA", color: "#4CAF50" }
                                : a.status === "Cancelled"
                                ? { background: "#FEF2F2", color: "#EF5350" }
                                : { background: "#FFF9E8", color: "#F59E0B" }}>{a.status}</span>
                          </div>
                          <p className="text-sm font-medium" style={{ color: t.text }}>{a.type}</p>
                          <p className="text-xs mt-0.5" style={{ color: t.muted }}>{a.counselor} · {a.date}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {drawerTab === "docs" && (
                    <motion.div key="docs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
                      {!detail && <p className="text-xs" style={{ color: t.muted }}>Loading…</p>}
                      {detail && detail.documents.length === 0 && (
                        <p className="text-xs" style={{ color: t.muted }}>No documents uploaded for this user.</p>
                      )}
                      {(detail?.documents || []).map((doc: string) => (
                        <div key={doc} className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors"
                          style={{ borderColor: t.border, background: t.card2 }}
                          onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                          onMouseLeave={e => (e.currentTarget.style.background = t.card2)}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EBF5FF" }}>
                            <FileText className="w-4 h-4" style={{ color: "#42A5F5" }} />
                          </div>
                          <span className="flex-1 text-sm" style={{ color: t.text }}>{doc}</span>
                          <Download className="w-4 h-4" style={{ color: t.muted }} />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Drawer Actions */}
              <div className="px-6 py-4 border-t flex gap-2" style={{ borderColor: t.border }}>
                <button disabled={busy}
                  onClick={() => setUserStatus(selectedUser.id, selectedUser.status === "Active" ? "Inactive" : "Active")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                  {selectedUser.status === "Active" ? "Mark Inactive" : "Mark Active"}
                </button>
                <button disabled={busy}
                  onClick={() => setUserStatus(selectedUser.id, selectedUser.status === "Suspended" ? "Active" : "Suspended")}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{ color: "#F59E0B", borderColor: "#F59E0B" }}>
                  {selectedUser.status === "Suspended" ? "Unsuspend" : "Suspend"}
                </button>
                <button onClick={() => setConfirmDelete(selectedUser.id)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ color: "#EF5350", borderColor: "#EF5350" }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add User Modal (slide from right) */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => { setShowAddModal(false); setAddSuccess(false); }}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-[420px] z-[70] shadow-2xl flex flex-col overflow-hidden"
              style={{ background: t.card }}
            >
              {/* Modal Header */}
              <div className="relative shrink-0" style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg" style={{ fontFamily: "'Poppins', sans-serif" }}>Add New User</h3>
                      <p className="text-sm text-white/70 mt-0.5">Fill in the details below</p>
                    </div>
                    <button onClick={() => { setShowAddModal(false); setAddSuccess(false); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.15)" }}>
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  {addSuccess ? (
                    <motion.div key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center h-64 gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "#EAF7EA" }}>
                        <CheckCircle className="w-8 h-8" style={{ color: "#4CAF50" }} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg" style={{ color: t.text }}>User added successfully!</p>
                        <p className="text-sm mt-1" style={{ color: t.muted }}>The new user has been created.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-4">
                      {[
                        { key: "name" as keyof AddUserForm, label: "Full Name", placeholder: "e.g. Jane Doe", type: "text" },
                        { key: "email" as keyof AddUserForm, label: "Email Address", placeholder: "e.g. jane@email.com", type: "email" },
                        { key: "phone" as keyof AddUserForm, label: "Phone Number", placeholder: "e.g. +1 (555) 000-0000", type: "tel" },
                        { key: "location" as keyof AddUserForm, label: "Location", placeholder: "e.g. New York, NY", type: "text" },
                        { key: "password" as keyof AddUserForm, label: "Password", placeholder: "Min 8 characters", type: "password" },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{label}</label>
                          <input
                            type={type}
                            value={addForm[key]}
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
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Gender</label>
                        <select
                          value={addForm.gender}
                          onChange={e => { setAddForm(f => ({ ...f, gender: e.target.value })); setAddErrors(er => ({ ...er, gender: undefined })); }}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                          style={{ ...inputStyle, borderColor: addErrors.gender ? "#EF5350" : t.inputBorder }}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        {addErrors.gender && <p className="text-xs mt-1" style={{ color: "#EF5350" }}>{addErrors.gender}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!addSuccess && (
                <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: t.border }}>
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                    style={{ color: t.textSec, borderColor: t.border, background: t.card }}>
                    Cancel
                  </button>
                  <button onClick={handleAddUser} disabled={busy}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                    {busy ? "Saving…" : "Save User"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Delete Dialog */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            >
              <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: t.card }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#FEF2F2" }}>
                  <Trash2 className="w-7 h-7" style={{ color: "#EF5350" }} />
                </div>
                <h3 className="font-bold text-center text-lg mb-1" style={{ color: t.text }}>Delete User?</h3>
                <p className="text-sm text-center mb-6" style={{ color: t.textSec }}>
                  This will permanently remove the user and all associated data. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                  <button onClick={() => handleDelete(confirmDelete)} disabled={busy}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "#EF5350" }}>{busy ? "Deleting…" : "Delete Forever"}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
