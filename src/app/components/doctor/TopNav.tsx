import { useState, useRef, useEffect } from 'react';
import { Search, Bell, MessageSquare, Calendar, Moon, Sun, ChevronDown, Video } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { api } from '../../lib/api';
import { getUser, clearSession } from '../../lib/auth';

interface TopNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  appointments: 'Appointments',
  patients: 'Patient Management',
  video: 'Video Sessions',
  chat: 'Messages',
  mood: 'Mood Journey',
  notes: 'Counseling Notes',
  reports: 'Reports',
  analytics: 'Analytics',
  availability: 'Availability',
  documents: 'Documents',
  feedback: 'Feedback & Reviews',
  notifications: 'Notifications',
  ai: 'AI Assistant',
  settings: 'Settings',
  security: 'Privacy & Security',
  help: 'Help & Support',
  profile: 'My Profile',
};

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  const { c, sh, darkMode, toggleDarkMode } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const doctor = getUser();
  const doctorName = doctor?.name || `Dr. ${doctor?.firstName || ''}`.trim();
  const initials = (doctor ? `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}` : 'DR').toUpperCase() || 'DR';

  // Live notifications from the backend
  useEffect(() => {
    const load = () => api.get('/doctor/notifications')
      .then(res => setNotifications((res.data.notifications || []).slice(0, 5).map((n: any) => ({
        id: n.id, type: n.type, text: n.title, time: n.time, unread: !n.read,
      }))))
      .catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header style={{
      background: c.white,
      borderBottom: `1px solid ${c.border}`,
      padding: '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Left: Page breadcrumb */}
      <div style={{ minWidth: 160 }}>
        <h1 style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: 700, color: c.textPrimary, margin: 0, lineHeight: 1.2 }}>
          {pageTitles[currentPage] || 'Dashboard'}
        </h1>
        <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, marginTop: 1 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Center: Search */}
      <div style={{
        flex: 1,
        maxWidth: 360,
        margin: '0 24px',
        position: 'relative',
      }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} />
        <input
          placeholder="Search patients, appointments..."
          style={{
            width: '100%',
            padding: '8px 14px 8px 36px',
            borderRadius: 10,
            border: `1px solid ${c.border}`,
            fontFamily: 'Inter',
            fontSize: 13,
            color: c.textPrimary,
            background: c.background,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Start Session pill button */}
        <button
          onClick={() => onNavigate('video')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            borderRadius: 20,
            border: 'none',
            background: c.primary,
            color: 'white',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.primaryHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.primary; }}
        >
          <Video size={12} />
          Start Session
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.textSecondary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Calendar */}
        <button
          onClick={() => onNavigate('appointments')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.textSecondary,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Calendar size={15} />
        </button>

        {/* Messages */}
        <button
          onClick={() => onNavigate('chat')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: `1px solid ${c.border}`,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.textSecondary,
            position: 'relative',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <MessageSquare size={15} />
          <span style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: c.primary,
            border: `1.5px solid ${c.white}`,
          }} />
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              border: `1px solid ${c.border}`,
              background: showNotifications ? c.veryLightSage : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.textSecondary,
              position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: c.error,
                color: 'white',
                fontSize: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${c.white}`,
                fontFamily: 'Inter',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 44,
              width: 340,
              background: c.white,
              borderRadius: 14,
              border: `1px solid ${c.border}`,
              boxShadow: sh.modal,
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: c.textPrimary }}>Notifications</span>
                <span
                  onClick={() => {
                    setNotifications(prev => prev.map(x => ({ ...x, unread: false })));
                    api.post('/doctor/notifications/read', {}).catch(() => {});
                  }}
                  style={{ fontFamily: 'Inter', fontSize: 12, color: c.primary, cursor: 'pointer', fontWeight: 500 }}>Mark all read</span>
              </div>
              {!notifications.length && (
                <div style={{ padding: '24px 18px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12.5, color: c.textMuted }}>
                  No notifications yet
                </div>
              )}
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    // Reading it in the dropdown counts as reading it.
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                    api.post('/doctor/notifications/read', { ids: [n.id] }).catch(() => {});
                    setShowNotifications(false);
                    onNavigate('notifications');
                  }}
                  style={{
                  padding: '12px 18px',
                  borderBottom: `1px solid ${c.border}`,
                  background: n.unread ? c.veryLightSage : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 10,
                }}>
                  <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: n.unread ? c.primary : 'transparent',
                    marginTop: 5,
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, marginTop: 3 }}>{n.time}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 18px', textAlign: 'center' }}>
                <button
                  onClick={() => { setShowNotifications(false); onNavigate('notifications'); }}
                  style={{ fontFamily: 'Inter', fontSize: 13, color: c.primary, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 10px 4px 4px',
              borderRadius: 10,
              border: `1px solid ${c.border}`,
              background: showProfile ? c.veryLightSage : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: 11,
            }}>
              {initials}
            </div>
            <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{doctorName}</span>
            <ChevronDown size={13} color={c.textMuted} />
          </button>
          {showProfile && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 44,
              width: 190,
              background: c.white,
              borderRadius: 12,
              border: `1px solid ${c.border}`,
              boxShadow: sh.modal,
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              {[
                { label: 'My Profile', page: 'profile' },
                { label: 'Settings', page: 'settings' },
                { label: 'Help & Support', page: 'help' },
              ].map(item => (
                <button
                  key={item.page}
                  onClick={() => { setShowProfile(false); onNavigate(item.page); }}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: c.textPrimary,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'block',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: c.border }} />
              <button
                onClick={async () => { setShowProfile(false); try { await api.post('/auth/logout'); } catch { /* already gone */ } clearSession(); window.location.href = '/login'; }}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: c.error,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'block',
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
