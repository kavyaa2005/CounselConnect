import { useState, useEffect } from 'react';
import { Bell, Calendar, MessageSquare, DollarSign, Star, AlertTriangle, Bot, Check, Clock, XCircle, Megaphone } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const filters = ['all', 'unread', 'today', 'requests', 'appointments', 'cancellations', 'messages', 'alerts'];

export function NotificationsPage() {
  const { c: colors, sh: shadows } = useTheme();
  const typeConfig: Record<string, { color: string; bg: string }> = {
    appointment: { color: colors.primary, bg: colors.veryLightSage },
    request: { color: colors.warning, bg: '#FFF9E6' },
    cancellation: { color: colors.error, bg: '#FFEBEE' },
    announcement: { color: '#7C6FFF', bg: '#EDE7F6' },
    message: { color: '#7C6FFF', bg: '#EDE7F6' },
    alert: { color: colors.error, bg: '#FFEBEE' },
    ai: { color: '#00BCD4', bg: '#E0F7FA' },
    payment: { color: colors.success, bg: '#E8F5E9' },
    review: { color: colors.warning, bg: '#FFF9E6' },
  };
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifList, setNotifList] = useState<any[]>([]);
  const iconFor: Record<string, any> = {
    appointment: Calendar, request: Clock, cancellation: XCircle,
    message: MessageSquare, review: Star, alert: AlertTriangle,
    ai: Bot, payment: DollarSign, announcement: Megaphone,
  };

  const [settings, setSettings] = useState<any>({});

  // Live notifications derived from real bookings, messages and reviews
  const load = () => {
    api.get('/doctor/notifications').then(res => {
      setNotifList((res.data.notifications || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        icon: iconFor[n.type] || Bell,
        title: n.title,
        desc: n.text,
        time: n.time,
        isToday: !!n.isToday,
        unread: !n.read,
        // A request left unanswered is the thing that actually needs the
        // doctor to do something, so it gets the urgent treatment.
        priority: n.type === 'alert' || n.actionable ? 'high' : 'normal',
        actionable: !!n.actionable,
      })));
    }).catch(() => {});
  };
  useEffect(() => {
    load();
    api.get('/doctor/settings').then(r => setSettings(r.data.settings || {})).catch(() => {});
  }, []);

  // Read state is persisted server-side, so it survives a refresh.
  const markRead = (id: string) => {
    setNotifList(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    api.post('/doctor/notifications/read', { ids: [id] }).catch(() => load());
  };

  const markAllRead = () => {
    setNotifList(prev => prev.map(n => ({ ...n, unread: false })));
    api.post('/doctor/notifications/read', {}).catch(() => load());
  };

  const toggleSetting = (key: string) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    api.put('/doctor/settings', { [key]: next[key] }).catch(() => setSettings(settings));
  };

  const filtered = notifList.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return n.unread;
    // Compared against a real timestamp server-side rather than sniffing the
    // humanised string for the word "day".
    if (activeFilter === 'today') return n.isToday;
    return n.type === activeFilter.replace(/s$/, '');
  });

  const unreadCount = notifList.filter(n => n.unread).length;

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
            disabled={!unreadCount}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: colors.primary, cursor: 'pointer', fontWeight: 500 }}
          >
            <Check size={14} /> {unreadCount ? `Mark all read (${unreadCount})` : 'All caught up'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!filtered.length && (
            <div style={{ background: colors.white, borderRadius: 16, padding: '36px 20px', border: `1px solid ${colors.border}`, textAlign: 'center', color: colors.textMuted, fontSize: 13.5 }}>
              {notifList.length ? 'Nothing matches this filter.' : 'No notifications yet.'}
            </div>
          )}
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
                      {notif.actionable ? 'Waiting on your response' : 'Urgent Action Required'}
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
            { key: 'pushNotifs', label: 'Push Notifications', desc: 'Mobile & browser alerts' },
            { key: 'emailNotifs', label: 'Email Notifications', desc: 'Sent to your email' },
            { key: 'smsNotifs', label: 'SMS Notifications', desc: 'Text message alerts' },
            { key: 'appointmentAlerts', label: 'Appointment Alerts', desc: 'New & updated bookings' },
            { key: 'messageAlerts', label: 'Message Alerts', desc: 'New patient messages' },
            { key: 'aiAlerts', label: 'AI Alerts', desc: 'Risk & mood alerts' },
            { key: 'paymentAlerts', label: 'Payment Alerts', desc: 'Transaction updates' },
          ].map((setting) => {
            const enabled = !!settings[setting.key];
            return (
              <div key={setting.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{setting.label}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{setting.desc}</div>
                </div>
                <div
                  role="switch"
                  aria-checked={enabled}
                  aria-label={setting.label}
                  onClick={() => toggleSetting(setting.key)}
                  style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? colors.primary : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 2.5, left: enabled ? 20 : 2.5, width: 17, height: 17, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
