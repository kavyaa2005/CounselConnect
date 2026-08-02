import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, Shield, Key, Bell, Clock, Users, Save,
  Eye, EyeOff, Copy, RefreshCw, Check, ChevronRight,
  Lock, X, Plus
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const tabs = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "api", label: "API Keys", icon: Key },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "roles", label: "Roles & Permissions", icon: Users },
];

const initialRoles = [
  { name: "Super Admin", users: 1, color: "#EF5350", perms: ["All Access", "Delete Data", "Billing", "API Keys"] },
  { name: "Admin", users: 3, color: "#5E8B7E", perms: ["Manage Users", "View Reports", "Settings", "Notifications"] },
  { name: "Support", users: 8, color: "#42A5F5", perms: ["View Users", "Manage Tickets", "Send Notifications"] },
  { name: "Counselor Manager", users: 2, color: "#F59E0B", perms: ["Manage Counselors", "View Sessions", "Approve Docs"] },
];

const allPermissions = [
  "All Access", "Delete Data", "Billing", "API Keys",
  "Manage Users", "View Reports", "Settings", "Notifications",
  "View Users", "Manage Tickets", "Send Notifications",
  "Manage Counselors", "View Sessions", "Approve Docs",
  "View Analytics", "Export Data", "Manage Appointments",
];

const presetColors = ["#EF5350", "#5E8B7E", "#42A5F5", "#F59E0B", "#8B5CF6", "#F97316"];

type Hours = Record<string, { open: boolean; from: string; to: string }>;

const defaultHours: Hours = {
  Mon: { open: true, from: "08:00", to: "18:00" },
  Tue: { open: true, from: "08:00", to: "18:00" },
  Wed: { open: true, from: "08:00", to: "18:00" },
  Thu: { open: true, from: "08:00", to: "18:00" },
  Fri: { open: true, from: "08:00", to: "17:00" },
  Sat: { open: true, from: "09:00", to: "13:00" },
  Sun: { open: false, from: "09:00", to: "13:00" },
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
      style={{ background: on ? "#5E8B7E" : "#E5E7EB" }}>
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

export function Settings(_props?: any) {
  const { t } = useTheme();
  const [activeTab, setActiveTab] = useState("org");
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [orgName, setOrgName] = useState("CounselConnect");
  const [orgEmail, setOrgEmail] = useState("admin@counselconnect.com");
  const [orgPhone, setOrgPhone] = useState("+1 (800) 000-1234");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    newUser: true, newAppt: true, payment: true, counselorVerif: true, systemAlerts: false, weeklyReport: true,
  });
  const [security, setSecurity] = useState({
    twoFA: true, sessionTimeout: true, ipWhitelist: false, auditLog: true, strongPassword: true,
  });
  const [hours, setHours] = useState<Hours>(defaultHours);
  const [roles, setRoles] = useState(initialRoles);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<typeof initialRoles[0] | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", color: "#5E8B7E", perms: [] as string[] });

  const apiKeys = [
    { id: 1, name: "Production API Key", key: "cc_prod_sk_a4b2c8d1e6f3g7h9i0j2k5l8m3n9", created: "Jan 15, 2026", lastUsed: "2 min ago" },
    { id: 2, name: "Development API Key", key: "cc_dev_sk_m3n6o9p2q5r8s1t4u7v0w3x6y9z2", created: "Mar 20, 2026", lastUsed: "Yesterday" },
  ];

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function copyKey(id: number, key: string) {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function openNewRole() {
    setEditingRole(null);
    setRoleForm({ name: "", color: "#5E8B7E", perms: [] });
    setShowRoleModal(true);
  }

  function openEditRole(role: typeof initialRoles[0]) {
    setEditingRole(role);
    setRoleForm({ name: role.name, color: role.color, perms: [...role.perms] });
    setShowRoleModal(true);
  }

  function saveRole() {
    if (!roleForm.name.trim()) return;
    if (editingRole) {
      setRoles(prev => prev.map(r => r.name === editingRole.name
        ? { ...r, name: roleForm.name, color: roleForm.color, perms: roleForm.perms }
        : r
      ));
    } else {
      setRoles(prev => [...prev, { name: roleForm.name, color: roleForm.color, perms: roleForm.perms, users: 0 }]);
    }
    setShowRoleModal(false);
  }

  function togglePerm(perm: string) {
    setRoleForm(f => ({
      ...f,
      perms: f.perms.includes(perm) ? f.perms.filter(p => p !== perm) : [...f.perms, perm]
    }));
  }

  const notifLabels: Record<string, { label: string; desc: string }> = {
    newUser: { label: "New User Registration", desc: "When a new user signs up" },
    newAppt: { label: "New Appointment Booked", desc: "When an appointment is created" },
    payment: { label: "Payment Received", desc: "When a payment is processed" },
    counselorVerif: { label: "Counselor Verification", desc: "When a counselor applies" },
    systemAlerts: { label: "System Alerts", desc: "Server downtime and critical events" },
    weeklyReport: { label: "Weekly Report Email", desc: "Every Monday at 9:00 AM" },
  };

  const securityLabels: Record<string, { label: string; desc: string }> = {
    twoFA: { label: "Two-Factor Authentication", desc: "Required for all admin logins" },
    sessionTimeout: { label: "Auto Session Timeout", desc: "30 min of inactivity" },
    ipWhitelist: { label: "IP Whitelist", desc: "Restrict to specific IP addresses" },
    auditLog: { label: "Audit Logging", desc: "Track all admin actions" },
    strongPassword: { label: "Strong Password Policy", desc: "8+ chars, uppercase, symbols" },
  };

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  return (
    <div className="p-6" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <div className="mb-5">
        <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>Manage platform configuration and preferences</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                style={activeTab === tab.id ? {
                  background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                } : { color: t.textSec }}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{tab.label}</span>
                {activeTab !== tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl p-6 border"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
            >
              {/* Organization */}
              {activeTab === "org" && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Organization Profile</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>CC</div>
                    <div>
                      <button className="px-4 py-2 rounded-xl border text-sm transition-colors"
                        style={{ color: t.text, borderColor: t.border, background: t.card2 }}>Upload Logo</button>
                      <p className="text-xs mt-1" style={{ color: t.muted }}>PNG or SVG, max 2MB</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Organization Name", value: orgName, set: setOrgName },
                      { label: "Admin Email", value: orgEmail, set: setOrgEmail },
                      { label: "Support Phone", value: orgPhone, set: setOrgPhone },
                    ].map(({ label, value, set }) => (
                      <div key={label} className={label === "Organization Name" ? "md:col-span-2" : ""}>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{label}</label>
                        <input value={value} onChange={e => set(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                          style={{ ...inputStyle }}
                          onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                          onBlur={e => e.target.style.borderColor = t.inputBorder} />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Timezone</label>
                      <select value={timezone} onChange={e => setTimezone(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none"
                        style={{ ...inputStyle }}>
                        <option>America/New_York (EST)</option>
                        <option>America/Los_Angeles (PST)</option>
                        <option>America/Chicago (CST)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Language</label>
                      <select className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none"
                        style={{ ...inputStyle }}>
                        <option>English (US)</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Security Settings</h3>
                  {(Object.keys(security) as (keyof typeof security)[]).map(key => {
                    const meta = securityLabels[key];
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                        style={{ borderColor: t.border }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: t.text }}>{meta.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: t.muted }}>{meta.desc}</p>
                        </div>
                        <Toggle on={security[key]} onChange={() => setSecurity(p => ({ ...p, [key]: !p[key] }))} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* API Keys */}
              {activeTab === "api" && (
                <div className="space-y-5">
                  <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>API Keys</h3>
                  <div className="p-4 rounded-xl flex items-start gap-2.5" style={{ background: "#FFFBEB", border: "1px solid #F59E0B25" }}>
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
                    <p className="text-xs" style={{ color: "#92680B" }}>
                      Keep your API keys secret. Never expose them in client-side code or public repositories.
                    </p>
                  </div>
                  {apiKeys.map(k => (
                    <div key={k.id} className="p-4 rounded-xl border" style={{ borderColor: t.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm" style={{ color: t.text }}>{k.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: t.muted }}>Created {k.created} · Last used {k.lastUsed}</p>
                        </div>
                        <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-colors"
                          style={{ color: "#EF5350", borderColor: t.border, background: t.card2 }}>
                          <RefreshCw className="w-3 h-3" /> Rotate
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs px-3 py-2 rounded-xl font-mono overflow-hidden"
                          style={{ background: t.card2, color: t.text }}>
                          {showKey[k.id] ? k.key : k.key.slice(0, 12) + "•".repeat(20)}
                        </code>
                        <button onClick={() => setShowKey(p => ({ ...p, [k.id]: !p[k.id] }))}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                          style={{ background: t.card2 }}>
                          {showKey[k.id] ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.muted }} />
                            : <Eye className="w-3.5 h-3.5" style={{ color: t.muted }} />}
                        </button>
                        <button onClick={() => copyKey(k.id, k.key)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                          style={{ background: t.card2 }}>
                          {copied === k.id
                            ? <Check className="w-3.5 h-3.5" style={{ color: "#4CAF50" }} />
                            : <Copy className="w-3.5 h-3.5" style={{ color: t.muted }} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#5E8B7E" }}>+ Generate New Key</button>
                </div>
              )}

              {/* Notifications */}
              {activeTab === "notifications" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Notification Preferences</h3>
                  {(Object.keys(notifs) as (keyof typeof notifs)[]).map(key => {
                    const meta = notifLabels[key];
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                        style={{ borderColor: t.border }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: t.text }}>{meta.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: t.muted }}>{meta.desc}</p>
                        </div>
                        <Toggle on={notifs[key]} onChange={() => setNotifs(p => ({ ...p, [key]: !p[key] }))} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Working Hours */}
              {activeTab === "hours" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Working Hours</h3>
                  {(Object.entries(hours) as [string, { open: boolean; from: string; to: string }][]).map(([day, h]) => (
                    <div key={day} className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: t.card2 }}>
                      <div className="w-8 text-sm font-semibold" style={{ color: t.text }}>{day}</div>
                      <Toggle on={h.open}
                        onChange={() => setHours(p => ({ ...p, [day]: { ...p[day], open: !p[day].open } }))} />
                      {h.open ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" value={h.from}
                            onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], from: e.target.value } }))}
                            className="px-3 py-1.5 text-sm rounded-xl border outline-none transition-all"
                            style={{ ...inputStyle }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                          <span className="text-xs" style={{ color: t.muted }}>to</span>
                          <input type="time" value={h.to}
                            onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], to: e.target.value } }))}
                            className="px-3 py-1.5 text-sm rounded-xl border outline-none transition-all"
                            style={{ ...inputStyle }}
                            onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                            onBlur={e => e.target.style.borderColor = t.inputBorder} />
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: t.muted }}>Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Roles */}
              {activeTab === "roles" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Roles & Permissions</h3>
                    <button onClick={openNewRole}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "#5E8B7E" }}>
                      <Plus className="w-4 h-4" /> New Role
                    </button>
                  </div>
                  {roles.map(role => (
                    <div key={role.name} className="p-4 rounded-xl border" style={{ borderColor: t.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: role.color + "20" }}>
                            <Users className="w-4 h-4" style={{ color: role.color }} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: t.text }}>{role.name}</p>
                            <p className="text-xs" style={{ color: t.muted }}>{role.users} member{role.users !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <button onClick={() => openEditRole(role)}
                          className="px-3 py-1.5 rounded-xl text-xs border font-medium transition-colors"
                          style={{ color: t.textSec, borderColor: t.border, background: t.card2 }}>
                          Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.perms.map(p => (
                          <span key={p} className="text-xs px-2.5 py-1 rounded-lg"
                            style={{ background: role.color + "12", color: role.color }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save */}
              <div className="mt-6 pt-5 border-t flex items-center gap-3" style={{ borderColor: t.border }}>
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <AnimatePresence>
                  {saved && (
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-sm font-medium"
                      style={{ color: "#4CAF50" }}>
                      <Check className="w-4 h-4" /> Saved successfully!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Role Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowRoleModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6">
              <div className="rounded-2xl p-6 max-w-lg w-full shadow-2xl" style={{ background: t.card }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-lg" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>
                    {editingRole ? "Edit Role" : "New Role"}
                  </h3>
                  <button onClick={() => setShowRoleModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: t.card2 }}>
                    <X className="w-4 h-4" style={{ color: t.textSec }} />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Role Name */}
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Role Name</label>
                    <input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Content Manager"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                      style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}
                      onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                      onBlur={e => e.target.style.borderColor = t.inputBorder} />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block uppercase tracking-wide" style={{ color: t.muted }}>Role Color</label>
                    <div className="flex gap-3">
                      {presetColors.map(color => (
                        <button key={color} onClick={() => setRoleForm(f => ({ ...f, color }))}
                          className="w-8 h-8 rounded-lg transition-all relative"
                          style={{ background: color, outline: roleForm.color === color ? `3px solid ${color}` : "none", outlineOffset: "2px" }}>
                          {roleForm.color === color && (
                            <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="text-xs font-semibold mb-2 block uppercase tracking-wide" style={{ color: t.muted }}>
                      Permissions ({roleForm.perms.length} selected)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {allPermissions.map(perm => {
                        const checked = roleForm.perms.includes(perm);
                        return (
                          <button key={perm} onClick={() => togglePerm(perm)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all"
                            style={checked ? {
                              background: roleForm.color + "15", borderColor: roleForm.color + "40", color: roleForm.color
                            } : { borderColor: t.border, color: t.textSec, background: t.card2 }}>
                            <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
                              style={{ background: checked ? roleForm.color : t.border }}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            {perm}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowRoleModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                      style={{ color: t.textSec, borderColor: t.border }}>Cancel</button>
                    <button onClick={saveRole} disabled={!roleForm.name.trim()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                      {editingRole ? "Update Role" : "Save Role"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
