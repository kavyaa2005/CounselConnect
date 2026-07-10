import { useState } from 'react';
import { Globe, Bell, Shield, User, Smartphone, Accessibility, Palette, Lock } from 'lucide-react';
import { useTheme } from '../ThemeContext';

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
  const { c: colors, sh: shadows } = useTheme();
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState({
    emailNotifs: true, pushNotifs: true, smsNotifs: false, sessionReminders: true, aiAlerts: true, paymentAlerts: false,
    twoFactor: true, sessionTimeout: true, dataSharing: false, anonymousData: true,
    darkMode: false, compactView: false, animations: true,
    largeText: false, highContrast: false, screenReader: false,
    autoLogout: true, loginHistory: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
                {[
                  { label: 'First Name', value: 'Rachel' }, { label: 'Last Name', value: 'Morgan' },
                  { label: 'Email', value: 'dr.rachel@counselconnect.com' }, { label: 'Phone', value: '+1 234 567 8900' },
                ].map(field => (
                  <div key={field.label}>
                    <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{field.label}</label>
                    <input defaultValue={field.value} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Change Password</h4>
              {['Current Password', 'New Password', 'Confirm Password'].map(f => (
                <div key={f} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{f}</label>
                  <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Update Password
              </button>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 24 }}>Notification Preferences</h3>
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
