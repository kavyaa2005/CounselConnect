import { useState, useEffect } from 'react';
import { Bell, Calendar, MessageSquare, DollarSign, Star, AlertTriangle, Bot, Check } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const filters = ['all', 'unread', 'today', 'appointments', 'messages', 'alerts'];

export function NotificationsPage() {
  const { c: colors, sh: shadows } = useTheme();
  const typeConfig: Record<string, { color: string; bg: string }> = {
    appointment: { color: colors.primary, bg: colors.veryLightSage },
    message: { color: '#7C6FFF', bg: '#EDE7F6' },
    alert: { color: colors.error, bg: '#FFEBEE' },
    ai: { color: '#00BCD4', bg: '#E0F7FA' },
    payment: { color: colors.success, bg: '#E8F5E9' },
    review: { color: colors.warning, bg: '#FFF9E6' },
  };
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifList, setNotifList] = useState<any[]>([]);
  const iconFor: Record<string, any> = { appointment: Calendar, message: MessageSquare, review: Star, alert: AlertTriangle, ai: Bot, payment: DollarSign };

  // Live notifications derived from real bookings, messages and reviews
  useEffect(() => {
    api.get('/doctor/notifications').then(res => {
      setNotifList((res.data.notifications || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        icon: iconFor[n.type] || Bell,
        title: n.title,
        desc: n.text,
        time: n.time,
        unread: !n.read,
        priority: n.type === 'alert' ? 'high' : 'normal',
      })));
    }).catch(() => {});
  }, []);

  const markRead = (id: string) => {
    setNotifList(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const markAllRead = () => {
    setNotifList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const filtered = notifList.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return n.unread;
    if (activeFilter === 'today') return !String(n.time).includes('day');
    return n.type === activeFilter.replace('s', '');
  });

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 28 }}>
      {/* Main Notifications */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${activeFilter === f ? colors.primary : colors.border}`, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', background: activeFilter === f ? colors.veryLightSage : 'transparent', color: activeFilter === f ? colors.primary : colors.textSecondary, fontWeight: activeFilter === f ? 600 : 400, textTransform: 'capitalize', transition: 'all 0.2s' }}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: colors.primary, cursor: 'pointer', fontWeight: 500 }}
          >
            <Check size={14} /> Mark all read
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(notif => {
            const Icon = notif.icon;
            const tc = typeConfig[notif.type] || typeConfig.appointment;
            return (
              <div
                key={notif.id}
                style={{
                  background: colors.white,
                  borderRadius: 16,
                  padding: '16px 20px',
                  boxShadow: shadows.card,
                  border: `1px solid ${notif.unread ? colors.primary + '30' : colors.border}`,
                  display: 'flex',
                  gap: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onClick={() => markRead(notif.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card; }}
              >
                {notif.unread && (
                  <div style={{ position: 'absolute', top: 20, right: 20, width: 8, height: 8, borderRadius: '50%', background: colors.primary }} />
                )}
                <div style={{ width: 44, height: 44, borderRadius: 14, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tc.color, flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Inter', fontWeight: notif.unread ? 700 : 600, fontSize: 14, color: colors.textPrimary }}>{notif.title}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, flexShrink: 0, marginLeft: 12 }}>{notif.time}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>{notif.desc}</p>
                  {notif.priority === 'high' && (
                    <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 8, background: '#FFEBEE', color: colors.error, fontSize: 11, fontWeight: 600 }}>
                      Urgent Action Required
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Settings */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ background: colors.white, borderRadius: 20, padding: '20px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Notification Settings</h3>
          {[
            { label: 'Push Notifications', desc: 'Mobile & browser alerts', enabled: true },
            { label: 'Email Notifications', desc: 'Sent to your email', enabled: true },
            { label: 'SMS Notifications', desc: 'Text message alerts', enabled: false },
            { label: 'Appointment Alerts', desc: 'New & updated bookings', enabled: true },
            { label: 'Message Alerts', desc: 'New patient messages', enabled: true },
            { label: 'AI Alerts', desc: 'Risk & mood alerts', enabled: true },
            { label: 'Payment Alerts', desc: 'Transaction updates', enabled: false },
          ].map((setting, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{setting.label}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{setting.desc}</div>
              </div>
              <div style={{ width: 40, height: 22, borderRadius: 11, background: setting.enabled ? colors.primary : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2.5, left: setting.enabled ? 20 : 2.5, width: 17, height: 17, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
