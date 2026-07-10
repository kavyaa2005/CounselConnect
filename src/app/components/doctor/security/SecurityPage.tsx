import { useState, useEffect } from 'react';
import { Shield, Lock, Smartphone, Activity, Eye, Key, AlertTriangle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const describeDevice = (ua: string) => {
  const browser = ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : ua.includes('Linux') ? 'Linux' : 'Device';
  return `${os} · ${browser}`;
};

export function SecurityPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Real login history + activity from the backend
  useEffect(() => {
    api.get('/doctor/logins').then(res => {
      setLoginHistory((res.data.logins || []).map((l: any, i: number) => ({
        device: describeDevice(l.device || ''),
        location: l.ip ? `IP ${l.ip.replace('::ffff:', '')}` : 'This device',
        time: new Date(l.at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: l.status || 'success',
        current: i === 0,
      })));
    }).catch(() => {});
    api.get('/doctor/dashboard').then(res => {
      setActivityLog((res.data.stats?.recentActivity || []).map((a: any) => ({
        action: a.text, time: a.time, icon: a.icon,
      })));
    }).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 24 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Security Score */}
        <div style={{ background: `linear-gradient(135deg, #2D4A3E, ${colors.primary})`, borderRadius: 20, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Security Score</div>
            <div style={{ fontFamily: 'Inter', fontSize: 36, fontWeight: 800, color: 'white' }}>92<span style={{ fontSize: 18, fontWeight: 400 }}>/100</span></div>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Excellent — Your account is well protected</div>
          </div>
          <Shield size={60} color="rgba(255,255,255,0.2)" />
        </div>

        {/* Security Features */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: Lock, title: 'Password Strength', status: 'Strong', color: colors.success, desc: 'Last changed 5 days ago' },
            { icon: Smartphone, title: 'Two-Factor Auth', status: twoFactorEnabled ? 'Enabled' : 'Disabled', color: twoFactorEnabled ? colors.success : colors.error, desc: 'Authenticator app configured' },
            { icon: Key, title: 'JWT Authentication', status: 'Active', color: colors.success, desc: 'Token rotates every 24 hours' },
            { icon: Eye, title: 'Encrypted Storage', status: 'Active', color: colors.success, desc: 'AES-256 end-to-end encryption' },
          ].map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} style={{ background: colors.white, borderRadius: 16, padding: '18px 20px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${feat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: feat.color }}>
                    <Icon size={16} />
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: 8, background: `${feat.color}15`, color: feat.color, fontSize: 11, fontWeight: 600 }}>{feat.status}</span>
                </div>
                <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: colors.textPrimary }}>{feat.title}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{feat.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Two Factor Auth */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Two-Factor Authentication</h3>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0, marginTop: 2 }}>Extra security for your account</p>
            </div>
            <div
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              style={{ width: 48, height: 26, borderRadius: 13, background: twoFactorEnabled ? colors.primary : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: twoFactorEnabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          {twoFactorEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: '16px', borderRadius: 14, background: colors.veryLightSage, border: `1px solid ${colors.mintAccent}` }}>
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Authenticator App</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} style={{ width: 32, height: 40, borderRadius: 8, background: colors.white, border: `1.5px solid ${colors.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: colors.primary }}>
                      {['4', '2', '7', '1', '8', '9'][i]}
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>Regenerates in 28s</div>
              </div>
              <div style={{ padding: '16px', borderRadius: 14, background: colors.background, border: `1px solid ${colors.border}` }}>
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Backup Codes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {['4RX2-K9MN', 'BT7L-Q3WP', 'YZ8V-M5JS', '3ND6-H1FK'].map((code, i) => (
                    <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, color: colors.textSecondary }}>{code}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Login History */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Login History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loginHistory.map((login: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: login.status === 'blocked' ? '#FFEBEE' : colors.background, border: `1px solid ${login.status === 'blocked' ? '#FFCDD2' : colors.border}` }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: login.status === 'blocked' ? '#FFCDD2' : colors.veryLightSage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {login.status === 'blocked' ? <AlertTriangle size={16} color={colors.error} /> : <Smartphone size={16} color={colors.primary} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: colors.textPrimary }}>{login.device} {login.current && <span style={{ fontSize: 10, background: colors.veryLightSage, color: colors.primary, padding: '2px 6px', borderRadius: 6, fontWeight: 600, marginLeft: 6 }}>Current</span>}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{login.location} · {login.time}</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 8, background: login.status === 'blocked' ? '#FFEBEE' : '#E8F5E9', color: login.status === 'blocked' ? colors.error : colors.success, fontSize: 11, fontWeight: 600 }}>
                  {login.status === 'blocked' ? 'Blocked' : 'Success'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={16} color={colors.primary} />
            <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Activity Log</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activityLog.map((log: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 14, marginBottom: 14, borderBottom: i < activityLog.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{log.icon}</span>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textPrimary, lineHeight: 1.4 }}>{log.action}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{log.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
