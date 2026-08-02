import { useState, useEffect, useCallback } from 'react';
import { Globe, Bell, Shield, User, Smartphone, Accessibility, Palette, Lock, Check } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const settingsSections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'devices', label: 'Connected Devices', icon: Smartphone },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: enabled ? c.primary : c.border,
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

export function SettingsPage() {
  const { c: colors, sh: shadows, onToggleDark, darkMode } = useTheme();
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState({
    emailNotifs: true, pushNotifs: true, smsNotifs: false, sessionReminders: true, aiAlerts: true, paymentAlerts: false,
    twoFactor: false, sessionTimeout: true, dataSharing: false, anonymousData: true,
    darkMode: false, compactView: false, animations: true,
    largeText: false, highContrast: false, screenReader: false,
    autoLogout: true, loginHistory: true,
  });

  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedTag, setSavedTag] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flash = (tag: string) => {
    setSavedTag(tag);
    setTimeout(() => setSavedTag(null), 2200);
  };

  /* Load real profile + saved preferences */
  useEffect(() => {
    api.get('/doctor/profile')
      .then(r => {
        const p = r.data.profile || {};
        setProfile({
          firstName: p.firstName || '', lastName: p.lastName || '',
          email: p.email || '', phone: p.phone || '',
        });
      })
      .catch(() => {});
    api.get('/doctor/settings')
      .then(r => setSettings(s => ({ ...s, ...r.data.settings })))
      .catch(() => {});
  }, []);

  /* Toggling a preference persists it immediately */
  const toggle = useCallback(async (key: keyof typeof settings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await api.put('/doctor/settings', { [key]: next[key] });
      flash('prefs');
    } catch (e: any) {
      setSettings(settings);            // roll back on failure
      setError(e?.message || 'Could not save that preference');
      setTimeout(() => setError(null), 3000);
    }
  }, [settings]);

  async function saveProfile() {
    setBusy(true);
    setError(null);
    try {
      await api.put('/doctor/profile', profile);
      flash('profile');
    } catch (e: any) {
      setError(e?.message || 'Could not save your profile');
    } finally { setBusy(false); }
  }

  async function changePassword() {
    setPwdMsg(null);
    if (!pwd.current || !pwd.next) {
      setPwdMsg({ ok: false, text: 'Enter your current and new password' });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ ok: false, text: "New passwords don't match" });
      return;
    }
    setBusy(true);
    try {
      await api.put('/doctor/password', { currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      setPwdMsg({ ok: true, text: 'Password updated — use it next time you sign in.' });
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e?.message || 'Could not change password' });
    } finally { setBusy(false); }
  }

  const SavedTag = ({ tag }: { tag: string }) => (
    savedTag === tag ? (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 12,
        fontSize: 13, fontWeight: 600, color: colors.success, fontFamily: 'Inter',
      }}>
        <Check size={14} /> Saved
      </span>
    ) : null
  );

  const SettingRow = ({ label, desc, settingKey }: { label: string; desc: string; settingKey: keyof typeof settings }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${colors.border}` }}>
      <div>
        <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>{label}</div>
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <Toggle enabled={settings[settingKey]} onToggle={() => toggle(settingKey)} />
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter' }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: colors.white, borderRight: `1px solid ${colors.border}`, padding: '24px 16px', flexShrink: 0 }}>
        <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20, paddingLeft: 8 }}>Settings</h2>
        {settingsSections.map(sec => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                marginBottom: 4, fontFamily: 'Inter', fontSize: 14, fontWeight: activeSection === sec.id ? 600 : 400,
                color: activeSection === sec.id ? colors.primary : colors.textSecondary,
                background: activeSection === sec.id ? colors.veryLightSage : 'transparent',
                transition: 'all 0.2s', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (activeSection !== sec.id) (e.currentTarget as HTMLButtonElement).style.background = colors.background; }}
              onMouseLeave={(e) => { if (activeSection !== sec.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <Icon size={16} strokeWidth={1.8} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: colors.background, padding: '32px', overflowY: 'auto' }}>
        {activeSection === 'account' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>Account Settings</h3>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}`, marginBottom: 20 }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Profile Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {([
                  { label: 'First Name', key: 'firstName' as const },
                  { label: 'Last Name', key: 'lastName' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: 'Phone', key: 'phone' as const },
                ]).map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{field.label}</label>
                    <input
                      value={profile[field.key]}
                      onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box', background: colors.white }} />
                  </div>
                ))}
              </div>
              {error && (
                <p style={{ marginTop: 12, fontSize: 13, color: colors.error, fontFamily: 'Inter' }}>{error}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}>
                <button onClick={saveProfile} disabled={busy}
                  style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Saving…' : 'Save Changes'}
                </button>
                <SavedTag tag="profile" />
              </div>
            </div>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Change Password</h4>
              {([
                { label: 'Current Password', key: 'current' as const },
                { label: 'New Password', key: 'next' as const },
                { label: 'Confirm Password', key: 'confirm' as const },
              ]).map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{f.label}</label>
                  <input type="password" placeholder="••••••••"
                    value={pwd[f.key]}
                    onChange={e => setPwd(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box', background: colors.white }} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={changePassword} disabled={busy}
                  style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
                {pwdMsg && (
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'Inter', color: pwdMsg.ok ? colors.success : colors.error }}>
                    {pwdMsg.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              Notification Preferences <SavedTag tag="prefs" />
            </h3>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textMuted, marginTop: 0, marginBottom: 20 }}>
              Changes save automatically.
            </p>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <SettingRow label="Email Notifications" desc="Receive important updates via email" settingKey="emailNotifs" />
              <SettingRow label="Push Notifications" desc="Browser and mobile app notifications" settingKey="pushNotifs" />
              <SettingRow label="SMS Notifications" desc="Text message alerts for urgent items" settingKey="smsNotifs" />
              <SettingRow label="Session Reminders" desc="Reminders before scheduled sessions" settingKey="sessionReminders" />
              <SettingRow label="AI Alerts" desc="Mood and risk alerts from AI analysis" settingKey="aiAlerts" />
              <SettingRow label="Payment Alerts" desc="Notifications for payments and invoices" settingKey="paymentAlerts" />
            </div>
          </div>
        )}

        {activeSection === 'security' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>Security Settings</h3>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}`, marginBottom: 20 }}>
              <SettingRow label="Two-Factor Authentication" desc="Add an extra layer of security to your account" settingKey="twoFactor" />
              <SettingRow label="Session Timeout" desc="Auto-logout after 30 minutes of inactivity" settingKey="sessionTimeout" />
              <SettingRow label="Login History" desc="Record and review all login attempts" settingKey="loginHistory" />
              <SettingRow label="Auto-Logout" desc="Automatically sign out from inactive sessions" settingKey="autoLogout" />
            </div>
            <div style={{ background: '#FFEBEE', borderRadius: 20, padding: 20, border: `1px solid #FFCDD2` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.error, margin: 0, marginBottom: 8 }}>Danger Zone</h4>
              <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#C62828', margin: 0, marginBottom: 16 }}>These actions are irreversible. Please proceed with caution.</p>
              <button style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${colors.error}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: colors.error, cursor: 'pointer', fontWeight: 500 }}>
                Delete Account
              </button>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>Appearance</h3>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}`, marginBottom: 20 }}>
              <SettingRow label="Dark Mode" desc="Switch to dark theme for reduced eye strain" settingKey="darkMode" />
              <SettingRow label="Compact View" desc="Reduce spacing for more content per screen" settingKey="compactView" />
              <SettingRow label="Animations" desc="Enable smooth transitions and micro-interactions" settingKey="animations" />
            </div>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Theme Color</h4>
              <div style={{ display: 'flex', gap: 12 }}>
                {[colors.primary, '#7C6FFF', '#E91E8C', '#00BCD4', '#FF5722'].map((color, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: color, cursor: 'pointer', border: i === 0 ? `3px solid ${colors.textPrimary}` : 'none', boxShadow: shadows.card }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'accessibility' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>Accessibility</h3>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <SettingRow label="Large Text" desc="Increase font size throughout the application" settingKey="largeText" />
              <SettingRow label="High Contrast" desc="Increase contrast for better visibility" settingKey="highContrast" />
              <SettingRow label="Screen Reader Support" desc="Optimize interface for screen readers" settingKey="screenReader" />
            </div>
          </div>
        )}

        {!['account', 'notifications', 'security', 'appearance', 'accessibility'].includes(activeSection) && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>
              {settingsSections.find(s => s.id === activeSection)?.label}
            </h3>
            <div style={{ background: colors.white, borderRadius: 20, padding: 40, boxShadow: shadows.card, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 40 }}>⚙️</div>
              <p style={{ fontFamily: 'Inter', fontSize: 14, color: colors.textMuted, margin: 0 }}>Settings for this section coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
