import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, User, Brain, Calendar, Activity, MessageCircle,
  Video, Sparkles, Star, Settings, LogOut, ChevronRight, CreditCard,
  Menu, X, BookOpen, LifeBuoy, ShieldAlert
} from 'lucide-react';
import { CC } from '../lib/colors';
import { useAuth } from '../context/AuthContext';
import { isLoggedIn } from '../lib/auth';
import { IncomingCallRinger } from './IncomingCallRinger';

const sidebarGroups = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    title: 'Find Help',
    items: [
      { icon: Star, label: 'Find Counselor', path: '/dashboard/find-counselor' },
      { icon: Brain, label: 'AI Match', path: '/dashboard/ai-match' },
    ],
  },
  {
    title: 'My Wellness',
    items: [
      { icon: Activity, label: 'Mood Tracker', path: '/dashboard/mood' },
      { icon: BookOpen, label: 'Journey', path: '/dashboard/journey' },
      { icon: Sparkles, label: 'AI Summary', path: '/dashboard/summary' },
    ],
  },
  {
    title: 'Sessions',
    items: [
      { icon: Calendar, label: 'Appointments', path: '/dashboard/appointments' },
      { icon: Video, label: 'Video Sessions', path: '/dashboard/video' },
      { icon: MessageCircle, label: 'Messages', path: '/dashboard/chat' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: CreditCard, label: 'Payments', path: '/dashboard/billing' },
      { icon: Star, label: 'Feedback', path: '/dashboard/feedback' },
      { icon: BookOpen, label: 'Resources', path: '/dashboard/resources' },
      { icon: LifeBuoy, label: 'Help', path: '/dashboard/help' },
      { icon: User, label: 'Profile', path: '/dashboard/settings?tab=profile' },
      { icon: Settings, label: 'Settings', path: '/dashboard/settings?tab=notifications' },
    ],
  },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const displayName = user ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : '{displayName}';
  const handleLogout = async () => { await logout(); navigate('/'); };

  // Reset scroll whenever the route changes inside the dashboard
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // ── Route guard: signed-in users only; staff go to their own panel ──
  if (!isLoggedIn() || !user) return <Navigate to="/login" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div
      style={{
        display: 'flex',
        // A padded full-viewport box instead of margin-top: a top margin here
        // collapses through the Root wrapper and pushes the whole document
        // down, leaving a strip of empty page at the bottom.
        height: '100vh',
        paddingTop: 80,
        boxSizing: 'border-box',
        backgroundColor: CC.luxuryBg,
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Ring on any dashboard screen; the video page rings for itself */}
      <IncomingCallRinger
        suppressed={location.pathname.startsWith('/dashboard/video')}
        onAccept={() => navigate('/dashboard/video')}
      />

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ backgroundColor: 'rgba(35,49,45,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile toggle button ── */}
      <button
        className="fixed bottom-5 left-5 z-40 lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: CC.forestSage, color: 'white' }}
        onClick={() => setMobileSidebarOpen(prev => !prev)}
      >
        {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ x: mobileSidebarOpen ? 0 : 0 }}
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 252,
          height: '100%',
          backgroundColor: CC.darkForest,
          borderRight: `1px solid rgba(255,255,255,0.06)`,
          position: 'relative',
          zIndex: 20,
          // Mobile: absolute positioning
        }}
      >
        {/* User card */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, color: 'white', fontWeight: 700, fontSize: '0.95rem' }}
            >
              {(displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4ade80' }} />
                <p style={{ color: CC.mutedOlive, fontSize: '0.7rem' }}>Active session</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto sidebar-scroll">
          {sidebarGroups.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? 'mt-4' : ''}>
              <p
                className="px-3 mb-1.5"
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {group.title}
              </p>
              {group.items.map((item) => {
                const tab = new URLSearchParams(location.search).get('tab');
                const isActive = item.label === 'Profile'
                  ? location.pathname === '/dashboard/settings' && (tab === 'profile' || tab === null)
                  : item.label === 'Settings'
                  ? location.pathname === '/dashboard/settings' && tab !== null && tab !== 'profile'
                  : location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return <SidebarLink key={item.label} item={item} isActive={isActive} />;
              })}
            </div>
          ))}
        </nav>

        {/* ── Sidebar footer ── */}
        <div className="px-3 pt-3 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {/* Daily wellness tip */}
          <div
            className="p-3 rounded-xl mb-3"
            style={{ background: 'linear-gradient(135deg, rgba(217,119,87,0.15), rgba(53,92,77,0.15))', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p style={{ color: CC.terracotta, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              ✦ Daily Insight
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', lineHeight: 1.55, fontStyle: 'italic' }}>
              "Small consistent steps create the greatest transformations."
            </p>
          </div>

          {/* Session progress pill */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80', flexShrink: 0 }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', flex: 1 }}>14 sessions completed</p>
            <span style={{ color: CC.terracotta, fontSize: '0.68rem', fontWeight: 600 }}>82%</span>
          </div>
          <div className="w-full h-1 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: '82%', height: '100%', background: `linear-gradient(90deg, ${CC.forestSage}, ${CC.terracotta})`, borderRadius: 4 }} />
          </div>

          {/* Crisis support — pinned, not buried in a menu.
              Someone who needs this should never have to go looking for it. */}
          <Link
            to="/dashboard/emergency"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl mb-2"
            style={{
              backgroundColor: 'rgba(217,119,87,0.12)',
              border: `1px solid ${CC.terracotta}55`,
              textDecoration: 'none',
            }}
          >
            <ShieldAlert size={15} color={CC.terracotta} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: CC.terracotta, fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.3 }}>
                Need help now?
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
                Crisis lines &amp; support
              </div>
            </div>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.84rem' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(217,119,87,0.12)';
              (e.currentTarget as HTMLElement).style.color = CC.terracotta;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
            }}
          >
            <LogOut size={15} />
            <span style={{ fontWeight: 500 }}>Sign Out</span>
          </button>

          {/* Branding */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.6rem', marginTop: 8, letterSpacing: '0.05em' }}>
            CounselConnect · v2.1
          </p>
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      {/* Background set here too, so short pages don't leave a pale band */}
      <main ref={mainRef} className="flex-1 overflow-y-auto main-scroll"
        style={{ backgroundColor: CC.luxuryBg }}>
        <AnimatePresence>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function SidebarLink({
  item,
  isActive,
}: {
  item: { icon: any; label: string; path: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200"
      style={{
        backgroundColor: isActive ? `rgba(217,119,87,0.9)` : 'transparent',
        color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
        }
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 30, height: 30, borderRadius: 10,
          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
        }}
      >
        <Icon size={16} />
      </div>
      <span style={{ fontSize: '0.84rem', fontWeight: isActive ? 600 : 400, flex: 1 }}>
        {item.label}
      </span>
      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
      )}
    </Link>
  );
}
