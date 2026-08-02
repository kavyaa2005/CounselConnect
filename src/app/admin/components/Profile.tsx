import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail, Phone, MapPin, Camera, Save, Lock,
  Smartphone, Clock, Check, ArrowUpRight, Eye, EyeOff, Bell
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { adminApi, useAdminData } from "../lib/adminApi";

const categoryColors: Record<string, string> = {
  user: "#42A5F5", doctor: "#4CAF50", admin: "#8B5CF6",
  Users: "#42A5F5", Counselors: "#4CAF50", Notifications: "#F59E0B",
  Reports: "#D8A48F", Settings: "#8B5CF6",
};

const roleIcons: Record<string, string> = { user: "👤", doctor: "🩺", admin: "🛡️" };

const initials = (n = "") =>
  n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "AD";

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
  const { data, loading, refetch } = useAdminData(adminApi.profile);
  const { data: audit } = useAdminData(adminApi.auditLog);
  const { data: dash } = useAdminData(adminApi.dashboard);

  const [tab, setTab] = useState<"personal" | "security" | "activity">("personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("Administrator");
  const [twoFA, setTwoFA] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Password form
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const p = data?.profile;
    if (!p) return;
    setName(p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim());
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setLocation(p.location || p.timezone || "");
    setBio(p.bio || "");
    setTitle(p.title || "Administrator");
  }, [data]);

  const auditEntries: any[] = audit?.entries || [];
  const counts = dash?.counts || { users: 0, counselors: 0, appointments: 0 };

  // "Days active" = how long this admin account has existed
  const createdAt = data?.profile?.createdAt;
  const daysActive = createdAt
    ? Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000))
    : 0;

  async function handleSaveProfile() {
    setBusy(true);
    setProfileError(null);
    try {
      const [first, ...rest] = name.trim().split(/\s+/);
      await adminApi.updateProfile({
        name: name.trim(), firstName: first || "", lastName: rest.join(" "),
        email, phone, bio,
      });
      await refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setProfileError(e?.message || "Could not save profile");
    } finally { setBusy(false); }
  }

  async function handleChangePassword() {
    setPwdMsg(null);
    if (!pwd.current || !pwd.next) {
      setPwdMsg({ ok: false, text: "Fill in your current and new password" });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ ok: false, text: "New passwords don't match" });
      return;
    }
    setBusy(true);
    try {
      await adminApi.changePassword({ currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: "", next: "", confirm: "" });
      setPwdMsg({ ok: true, text: "Password updated — use it next time you sign in." });
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e?.message || "Could not change password" });
    } finally { setBusy(false); }
  }

  const inputStyle = { background: t.input, borderColor: t.inputBorder, color: t.text };

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ background: t.bg, minHeight: "100vh" }}>
        <p className="text-sm" style={{ color: t.muted }}>Loading profile…</p>
      </div>
    );
  }

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
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", borderColor: t.card }}>
                {initials(name)}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-xl border-2 shadow flex items-center justify-center"
                style={{ background: t.card, borderColor: t.card }}>
                <Camera className="w-3.5 h-3.5" style={{ color: "#5E8B7E" }} />
              </div>
            </div>

            <h3 className="font-bold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>{name}</h3>
            <p className="text-xs mt-0.5 mb-3" style={{ color: t.muted }}>{title}</p>

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
                { label: "Users", value: String(counts.users) },
                { label: "Counselors", value: String(counts.counselors) },
                { label: "Days Active", value: String(daysActive) },
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
                      onClick={handleSaveProfile} disabled={busy}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                      <Save className="w-4 h-4" /> {busy ? "Saving…" : "Save Changes"}
                    </button>
                    <AnimatePresence>
                      {saved && (
                        <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-sm font-medium"
                          style={{ color: "#4CAF50" }}>
                          <Check className="w-4 h-4" /> Saved!
                        </motion.span>
                      )}
                      {profileError && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="text-sm font-medium" style={{ color: "#EF5350" }}>
                          {profileError}
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
                      {([
                        { key: "current" as const, label: "Current Password", show: showOldPwd, setShow: setShowOldPwd },
                        { key: "next" as const, label: "New Password", show: showNewPwd, setShow: setShowNewPwd },
                        { key: "confirm" as const, label: "Confirm New Password", show: showNewPwd, setShow: setShowNewPwd },
                      ]).map((p, i) => (
                        <div key={p.key} className={i === 2 ? "md:col-span-2" : ""}>
                          <label className="text-xs font-semibold mb-1.5 block uppercase tracking-wide" style={{ color: t.muted }}>{p.label}</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.muted }} />
                            <input type={p.show ? "text" : "password"} placeholder="••••••••"
                              value={pwd[p.key]}
                              onChange={e => setPwd(v => ({ ...v, [p.key]: e.target.value }))}
                              className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none transition-all"
                              style={{ ...inputStyle }}
                              onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                              onBlur={e => e.target.style.borderColor = t.inputBorder}
                            />
                            <button type="button" onClick={() => p.setShow(!p.show)}
                              className="absolute right-3 top-1/2 -translate-y-1/2">
                              {p.show ? <EyeOff className="w-3.5 h-3.5" style={{ color: t.muted }} />
                                : <Eye className="w-3.5 h-3.5" style={{ color: t.muted }} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={handleChangePassword} disabled={busy}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: "#5E8B7E" }}>
                        {busy ? "Updating…" : "Update Password"}
                      </button>
                      {pwdMsg && (
                        <span className="text-sm font-medium" style={{ color: pwdMsg.ok ? "#4CAF50" : "#EF5350" }}>
                          {pwdMsg.text}
                        </span>
                      )}
                    </div>
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
                    <p className="text-sm font-semibold mb-3" style={{ color: t.text }}>Recent Sign-ins</p>
                    <div className="space-y-2">
                      {auditEntries.filter((l: any) => l.role === "admin").length === 0 && (
                        <p className="text-xs" style={{ color: t.muted }}>No admin sign-ins recorded yet.</p>
                      )}
                      {auditEntries.filter((l: any) => l.role === "admin").slice(0, 5).map((l: any, i: number) => (
                        <div key={i} className="flex items-start justify-between p-3.5 rounded-xl" style={{ background: t.card2 }}>
                          <div className="flex items-start gap-3 min-w-0">
                            <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.muted }} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: t.text }}>{l.actor}</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: t.muted }}>{l.device}</p>
                              <p className="text-xs" style={{ color: t.muted }}>{l.ip || "local"} · {l.time}</p>
                            </div>
                          </div>
                          {i === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                              style={{ background: "#EAF7EA", color: "#4CAF50" }}>Most recent</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "activity" && (
                <div className="space-y-3">
                  <h3 className="font-semibold" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Platform Activity</h3>
                  <p className="text-xs" style={{ color: t.muted }}>Live audit trail of every sign-in across all three panels</p>
                  {auditEntries.length === 0 && (
                    <p className="text-sm py-6 text-center" style={{ color: t.muted }}>No activity recorded yet.</p>
                  )}
                  {auditEntries.slice(0, 20).map((a: any, i: number) => {
                    const color = categoryColors[a.role] || "#9CA3AF";
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.05 }}
                        className="flex items-center gap-3 p-3.5 rounded-xl border transition-colors"
                        style={{ borderColor: t.border }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                          style={{ background: color + "12" }}>
                          {roleIcons[a.role] || "•"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: t.text }}>{a.action} — {a.actor}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                              style={{ background: color + "15", color }}>
                              {a.role}
                            </span>
                            <span className="text-xs truncate" style={{ color: t.muted }}>{a.time}</span>
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
