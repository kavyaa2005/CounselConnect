import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail, Phone, MapPin, Camera, Save, Lock,
  Smartphone, Clock, Check, ArrowUpRight, Eye, EyeOff, Bell
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const recentLogins = [
  { device: "MacBook Pro · Chrome 124", location: "New York, NY, USA", ip: "72.229.xxx.xxx", time: "Today · 09:15 AM", current: true },
  { device: "iPhone 15 Pro · Safari", location: "New York, NY, USA", ip: "72.229.xxx.xxx", time: "Yesterday · 08:42 PM", current: false },
  { device: "Windows PC · Edge 122", location: "Brooklyn, NY, USA", ip: "96.231.xxx.xxx", time: "Jun 25 · 02:30 PM", current: false },
];

const activityLog = [
  { action: "Suspended user Emma Davis (#U-003)", category: "Users", time: "2 hours ago", icon: "🚫" },
  { action: "Approved counselor Dr. Lisa Wong", category: "Counselors", time: "5 hours ago", icon: "✅" },
  { action: "Sent platform notification to 1,284 users", category: "Notifications", time: "Yesterday", icon: "🔔" },
  { action: "Generated Monthly Revenue Report", category: "Reports", time: "Yesterday", icon: "📊" },
  { action: "Updated working hours — Saturday closed", category: "Settings", time: "2 days ago", icon: "⚙️" },
  { action: "Added new API key (Development)", category: "Settings", time: "3 days ago", icon: "🔑" },
];

const categoryColors: Record<string, string> = {
  Users: "#42A5F5", Counselors: "#4CAF50", Notifications: "#F59E0B",
  Reports: "#D8A48F", Settings: "#8B5CF6",
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

export function Profile(_props?: any) {
  const { t } = useTheme();
  const [tab, setTab] = useState<"personal" | "security" | "activity">("personal");
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState("admin@counselconnect.com");
  const [phone, setPhone] = useState("+1 (555) 000-0001");
  const [location, setLocation] = useState("New York, NY");
  const [bio, setBio] = useState("Platform administrator managing CounselConnect operations.");
  const [twoFA, setTwoFA] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Inter', sans-serif", background: t.bg, minHeight: "100vh" }}>
      <div>
        <h2 className="font-bold text-xl" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>My Profile</h2>
        <p className="text-sm mt-0.5" style={{ color: t.muted }}>Manage your account and security settings</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-1 rounded-2xl border overflow-hidden"
          style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
        >
          <div className="h-24 relative" style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full border-2 border-white" />
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full border-2 border-white" />
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="relative -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl border-4 shadow-lg flex items-center justify-center text-white text-2xl font-bold"
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", borderColor: t.card }}>AD</div>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-xl border-2 shadow flex items-center justify-center"
                style={{ background: t.card, borderColor: t.card }}>
                <Camera className="w-3.5 h-3.5" style={{ color: "#5E8B7E" }} />
              </button>
            </div>

            <h3 className="font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{name}</h3>
            <p className="text-xs mt-0.5 mb-3" style={{ color: t.muted }}>Super Administrator</p>

            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: "#4CAF50" }} />
              <span className="text-xs font-medium" style={{ color: "#4CAF50" }}>Active</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { icon: Mail, v: email },
                { icon: Phone, v: phone },
                { icon: MapPin, v: location },
              ].map(({ icon: Icon, v }) => (
                <div key={v} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.muted }} />
                  <span className="truncate" style={{ color: t.textSec }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2" style={{ borderColor: t.border }}>
              {[
                { label: "Reports", value: "24" },
                { label: "Actions", value: "342" },
                { label: "Days Active", value: "168" },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: t.card2 }}>
                  <div className="font-bold text-base" style={{ color: t.text }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Panel */}
        <div className="xl:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            {(["personal", "security", "activity"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)}
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                style={tab === tb ? {
                  background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                } : { background: t.card, color: t.textSec, border: `1px solid ${t.border}` }}>
                {tb === "activity" ? "Activity Log" : tb === "personal" ? "Personal Info" : "Security"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl p-6 border"
              style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}
            >
              {tab === "personal" && (
                <div className="space-y-4">
                  <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Full Name", value: name, set: setName },
                      { label: "Email Address", value: email, set: setEmail },
                      { label: "Phone Number", value: phone, set: setPhone },
                      { label: "Location", value: location, set: setLocation },
                    ].map(({ label, value, set }) => (
                      <div key={label}>
                        <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{label}</label>
                        <input value={value} onChange={e => set(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
                          style={{ ...inputStyle }}
                          onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                          onBlur={e => e.target.style.borderColor = t.inputBorder}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>Bio</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none"
                      style={{ ...inputStyle }}
                      onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                      onBlur={e => e.target.style.borderColor = t.inputBorder}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <AnimatePresence>
                      {saved && (
                        <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: "#4CAF50" }}>
                          <Check className="w-4 h-4" /> Saved!
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {tab === "security" && (
                <div className="space-y-5">
                  <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Security Settings</h3>

                  <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Change Password</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: "Current Password", show: showOldPwd, setShow: setShowOldPwd },
                        { label: "New Password", show: showNewPwd, setShow: setShowNewPwd },
                        { label: "Confirm New Password", show: showNewPwd, setShow: setShowNewPwd },
                      ].map((p, i) => (
                        <div key={i} className={i === 2 ? "md:col-span-2" : ""}>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{p.label}</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.muted }} />
                            <input type={p.show ? "text" : "password"} placeholder="••••••••"
                              className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none transition-all"
                              style={{ ...inputStyle }}
                              onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                              onBlur={e => e.target.style.borderColor = t.inputBorder}
                            />
                            <button onClick={() => p.setShow(!p.show)}
                              className="absolute right-3 top-1/2 -translate-y-1/2">
                              {p.show ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.muted }} />
                                : <Eye className="w-3.5 h-3.5" style={{ color: t.muted }} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "#5E8B7E" }}>Update Password</button>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      { icon: Smartphone, label: "Two-Factor Authentication", desc: twoFA ? "Enabled via authenticator app" : "Not configured", on: twoFA, set: setTwoFA },
                      { icon: Bell, label: "Email Security Alerts", desc: "Get notified of suspicious logins", on: emailAlerts, set: setEmailAlerts },
                    ].map(({ icon: Icon, label, desc, on, set }) => (
                      <div key={label} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: t.border }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F0F7F5" }}>
                          <Icon className="w-5 h-5" style={{ color: "#5E8B7E" }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: t.text }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: t.muted }}>{desc}</p>
                        </div>
                        <Toggle on={on} onChange={() => set(!on)} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Active Sessions</p>
                    <div className="space-y-2">
                      {recentLogins.map((l, i) => (
                        <div key={i} className="flex items-start justify-between p-3.5 rounded-xl" style={{ background: t.card2 }}>
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.muted }} />
                            <div>
                              <p className="text-sm font-medium" style={{ color: t.text }}>{l.device}</p>
                              <p className="text-xs mt-0.5" style={{ color: t.muted }}>{l.location} · {l.ip}</p>
                              <p className="text-xs" style={{ color: t.muted }}>{l.time}</p>
                            </div>
                          </div>
                          {l.current
                            ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#EAF7EA", color: "#4CAF50" }}>Current</span>
                            : <button className="text-xs font-medium" style={{ color: "#EF5350" }}>Revoke</button>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "activity" && (
                <div className="space-y-3">
                  <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Recent Activity</h3>
                  {activityLog.map((a, i) => {
                    const color = categoryColors[a.category] || "#9CA3AF";
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-3.5 rounded-xl border transition-colors"
                        style={{ borderColor: t.border }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                          style={{ background: color + "12" }}>
                          {a.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: t.text }}>{a.action}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: color + "15", color }}>
                              {a.category}
                            </span>
                            <span className="text-xs" style={{ color: t.muted }}>{a.time}</span>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: t.muted }} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
