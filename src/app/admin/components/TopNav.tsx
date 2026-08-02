import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Bell, Sun, Moon, Plus, Calendar, UserPlus, FileText, X,
  ChevronRight, Settings, LogOut, User, Home
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";
import { api } from "../../lib/api";
import { getUser, clearSession } from "../../lib/auth";
import type { Page } from "../App";

interface TopNavProps {
  activePage: Page;
  onNavigate: (page: Page, action?: string) => void;
}

type PageMeta = { crumbs: { label: string; page?: Page }[]; label: string };

// Falls back instead of throwing. A page present in App.tsx but missing here
// used to crash TopNav — and because TopNav renders outside the page area,
// that took down the entire admin shell rather than one screen.
const FALLBACK_META: PageMeta = { crumbs: [{ label: "Home", page: "dashboard" }], label: "" };

const titleCase = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

const pageMeta: Record<Page, PageMeta> = {
  dashboard:     { crumbs: [{ label: "Home", page: "dashboard" }], label: "Dashboard" },
  users:         { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Management" }], label: "Users" },
  counselors:    { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Management" }], label: "Counselors" },
  applications:  { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Management" }], label: "Applications" },
  appointments:  { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Management" }], label: "Appointments" },
  sessions:      { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Management" }], label: "Sessions" },
  feedback:      { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Insights" }], label: "Feedback" },
  reports:       { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Insights" }], label: "Reports" },
  analytics:     { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Insights" }], label: "Analytics" },
  payments:      { crumbs: [{ label: "Home", page: "dashboard" }, { label: "Finance" }], label: "Payments" },
  notifications: { crumbs: [{ label: "Home", page: "dashboard" }, { label: "System" }], label: "Notifications" },
  settings:      { crumbs: [{ label: "Home", page: "dashboard" }, { label: "System" }], label: "Settings" },
  profile:       { crumbs: [{ label: "Home", page: "dashboard" }], label: "My Profile" },
};

const metaFor = (page: Page): PageMeta =>
  pageMeta[page] || { ...FALLBACK_META, label: titleCase(String(page)) };


const searchIndex = [
  { label: "Dashboard", sub: "Overview & analytics", page: "dashboard" as Page, icon: "🏠" },
  { label: "Add New User", sub: "Create user account", page: "users" as Page, action: "add", icon: "👤" },
  { label: "Add Counselor", sub: "Register counselor", page: "counselors" as Page, action: "add", icon: "🩺" },
  { label: "Applications", sub: "Review counselor credentials", page: "applications" as Page, icon: "📋" },
  { label: "New Appointment", sub: "Schedule session", page: "appointments" as Page, action: "add", icon: "📅" },
  { label: "Analytics", sub: "Platform metrics", page: "analytics" as Page, icon: "📊" },
  { label: "Payments", sub: "Revenue & transactions", page: "payments" as Page, icon: "💳" },
  { label: "Notifications", sub: "Send notifications", page: "notifications" as Page, icon: "🔔" },
  { label: "Settings", sub: "Platform config", page: "settings" as Page, icon: "⚙️" },
];

export function TopNav({ activePage, onNavigate }: TopNavProps) {
  const { t, isDark, toggle } = useTheme();
  const { data: notifData, refetch: refetchNotifs } = useAdminData(adminApi.notifications);
  const admin = getUser();

  // Map platform notifications into the shape this dropdown renders
  const notifications = (notifData?.notifications || []).slice(0, 8).map((n: any) => ({
    id: n.id,
    icon: n.type === "alert" ? "\u26a0\ufe0f" : n.type === "warning" ? "\ud83d\udd14" : "\u2709\ufe0f",
    title: n.title,
    msg: n.message,
    time: new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    read: !!n.read,
    system: !!n.system,
    color: n.type === "alert" ? "#EF5350" : n.type === "warning" ? "#F59E0B" : "#5E8B7E",
  }));

  const adminName = admin?.name || [admin?.firstName, admin?.lastName].filter(Boolean).join(" ") || "Admin";
  const adminInitials = adminName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() || "").join("") || "AD";

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* already gone */ }
    clearSession();
    window.location.href = "/login";
  }

  async function markRead(id: string) {
    try { await adminApi.readNotification(id); await refetchNotifs(); } catch { /* non-critical */ }
  }

  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n: any) => !n.read).length;
  const meta = metaFor(activePage);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false); setSearchVal("");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function closeAll() { setShowNotif(false); setShowProfile(false); setShowQuick(false); }

  const filtered = searchVal
    ? searchIndex.filter(r => r.label.toLowerCase().includes(searchVal.toLowerCase()) || r.sub.toLowerCase().includes(searchVal.toLowerCase()))
    : searchIndex;

  return (
    <header
      style={{
        height: 64, background: t.nav, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
        position: "relative", zIndex: 20, boxShadow: t.isDark ? "0 1px 0 rgba(255,255,255,0.04)" : "0 1px 0 #F3F4F6",
        fontFamily: "'Inter', sans-serif", flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
        {meta.crumbs.map((crumb, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => crumb.page && onNavigate(crumb.page)}
              style={{
                fontSize: 12, color: crumb.page ? "#5E8B7E" : t.muted,
                cursor: crumb.page ? "pointer" : "default",
                background: "none", border: "none", padding: 0,
                fontFamily: "inherit", transition: "color 0.15s",
              }}
              onMouseEnter={e => { if (crumb.page) (e.target as HTMLElement).style.textDecoration = "underline"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = "none"; }}
            >{crumb.label}</button>
            <ChevronRight style={{ width: 12, height: 12, color: t.border, flexShrink: 0 }} />
          </span>
        ))}
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{meta.label}</span>
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ position: "relative" }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: t.input, border: `1px solid ${searchOpen ? "#5E8B7E" : t.inputBorder}`,
            borderRadius: 12, cursor: "text", transition: "all 0.25s",
            width: searchOpen ? 260 : 180,
          }}
          onClick={() => setSearchOpen(true)}
        >
          <Search style={{ width: 14, height: 14, color: t.muted, flexShrink: 0 }} />
          <input
            value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Search anything..."
            style={{ flex: 1, fontSize: 13, background: "transparent", outline: "none", color: t.text, border: "none" }}
            onFocus={() => setSearchOpen(true)}
          />
          {searchVal && <button onClick={() => setSearchVal("")}><X style={{ width: 12, height: 12, color: t.muted }} /></button>}
        </div>
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
              style={{
                position: "absolute", top: 44, left: 0, width: 280, background: t.card,
                borderRadius: 16, boxShadow: t.shadowHov, border: `1px solid ${t.border}`,
                overflow: "hidden", zIndex: 50,
              }}
            >
              <div style={{ padding: "8px 16px 6px", borderBottom: `1px solid ${t.divider}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.muted }}>
                  {searchVal ? "Results" : "Quick Access"}
                </p>
              </div>
              {filtered.map((r, i) => (
                <button key={i}
                  onClick={() => { onNavigate(r.page, r.action); setSearchOpen(false); setSearchVal(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: t.text, margin: 0 }}>{r.label}</p>
                    <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>{r.sub}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: t.muted }}>
                  No results for "{searchVal}"
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Add */}
      <div style={{ position: "relative" }}>
        <motion.button
          onClick={() => { closeAll(); setShowQuick(v => !v); }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
            borderRadius: 12, fontSize: 13, fontWeight: 600, color: "white", border: "none",
            background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          <span className="hidden md:inline">New</span>
        </motion.button>
        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
              style={{
                position: "absolute", right: 0, top: 44, width: 220, background: t.card,
                borderRadius: 16, boxShadow: t.shadowHov, border: `1px solid ${t.border}`,
                padding: 8, zIndex: 50,
              }}
            >
              {[
                { icon: UserPlus, label: "Add New User", page: "users" as Page, action: "add", color: "#5E8B7E" },
                { icon: Calendar, label: "New Appointment", page: "appointments" as Page, action: "add", color: "#42A5F5" },
                { icon: FileText, label: "Generate Report", page: "reports" as Page, action: "generate", color: "#D8A48F" },
              ].map(({ icon: Icon, label, page, action, color }) => (
                <button key={label}
                  onClick={() => { onNavigate(page, action); setShowQuick(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 500,
                    color: t.text, background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left", transition: "background 0.12s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 14, height: 14, color }} />
                  </div>
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dark Mode */}
      <motion.button onClick={toggle} whileTap={{ scale: 0.9 }}
        style={{
          width: 32, height: 32, borderRadius: 12, display: "flex", alignItems: "center",
          justifyContent: "center", border: `1px solid ${t.inputBorder}`, background: t.input,
          cursor: "pointer", color: t.textSec, transition: "all 0.2s",
        }}>
        <AnimatePresence mode="wait">
          {isDark
            ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <Sun style={{ width: 14, height: 14, color: "#F59E0B" }} />
              </motion.div>
            : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Moon style={{ width: 14, height: 14, color: t.textSec }} />
              </motion.div>
          }
        </AnimatePresence>
      </motion.button>

      {/* Notifications */}
      <div style={{ position: "relative" }}>
        <motion.button onClick={() => { closeAll(); setShowNotif(v => !v); }} whileTap={{ scale: 0.9 }}
          style={{
            position: "relative", width: 32, height: 32, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${t.inputBorder}`, background: t.input,
            cursor: "pointer", color: t.textSec,
          }}>
          <Bell style={{ width: 14, height: 14 }} />
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{
                position: "absolute", top: -4, right: -4, width: 16, height: 16,
                borderRadius: "50%", background: "#EF5350", color: "white",
                fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center",
                justifyContent: "center", border: "2px solid " + t.nav,
              }}>{unread}</motion.span>
          )}
        </motion.button>
        <AnimatePresence>
          {showNotif && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
              style={{
                position: "absolute", right: 0, top: 44, width: 320, background: t.card,
                borderRadius: 16, boxShadow: t.shadowHov, border: `1px solid ${t.border}`,
                overflow: "hidden", zIndex: 50,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${t.divider}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Notifications</span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: "#FEF2F2", color: "#EF5350", fontWeight: 700 }}>{unread} new</span>
                </div>
                <button onClick={() => setShowNotif(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X style={{ width: 14, height: 14, color: t.muted }} />
                </button>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {notifications.length === 0 && (
                  <p style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: t.muted, margin: 0 }}>
                    You're all caught up.
                  </p>
                )}
                {notifications.map((n: any) => (
                  <div key={n.id} onClick={() => !n.system && markRead(n.id)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${t.divider}`, background: !n.read ? (t.isDark ? "rgba(94,139,126,0.06)" : "#F9FFFE") : "transparent", cursor: "pointer" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: n.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{n.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: t.text, margin: 0 }}>{n.title}</p>
                        <span style={{ fontSize: 11, color: t.muted, flexShrink: 0 }}>{n.time}</span>
                      </div>
                      <p style={{ fontSize: 11, color: t.textSec, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.msg}</p>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5E8B7E", flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
              <button onClick={() => { onNavigate("notifications"); setShowNotif(false); }}
                style={{ width: "100%", padding: "12px", fontSize: 12, fontWeight: 600, color: "#5E8B7E", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                View all notifications →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile */}
      <div style={{ position: "relative" }}>
        <motion.button onClick={() => { closeAll(); setShowProfile(v => !v); }} whileTap={{ scale: 0.97 }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 6px",
            borderRadius: 12, border: `1px solid ${t.inputBorder}`, background: t.input,
            cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
          }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#5E8B7E,#2D6A4F)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{adminInitials}</div>
          <div className="hidden md:block" style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text, lineHeight: 1 }}>{admin?.firstName || adminName}</div>
            <div style={{ fontSize: 10, color: t.muted, lineHeight: 1, marginTop: 2 }}>{admin?.title || "Administrator"}</div>
          </div>
        </motion.button>
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
              style={{
                position: "absolute", right: 0, top: 44, width: 200, background: t.card,
                borderRadius: 16, boxShadow: t.shadowHov, border: `1px solid ${t.border}`,
                padding: 8, zIndex: 50,
              }}
            >
              <div style={{ padding: "8px 12px 12px", borderBottom: `1px solid ${t.divider}`, marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: 0 }}>{adminName}</p>
                <p style={{ fontSize: 11, color: t.muted, margin: "2px 0 0" }}>{admin?.email}</p>
              </div>
              {[{ icon: User, label: "My Profile", page: "profile" as Page }, { icon: Settings, label: "Settings", page: "settings" as Page }].map(({ icon: Icon, label, page }) => (
                <button key={label} onClick={() => { onNavigate(page); setShowProfile(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: t.text, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <Icon style={{ width: 14, height: 14, color: t.muted }} />{label}
                </button>
              ))}
              <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#EF5350", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderTop: `1px solid ${t.divider}`, marginTop: 4, paddingTop: 10, transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,83,80,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <LogOut style={{ width: 14, height: 14 }} />Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
