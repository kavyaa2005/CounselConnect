import { useState } from 'react';
import {
  LayoutDashboard, Calendar, Users, Video, MessageSquare,
  Heart, FileText, BarChart3, TrendingUp, Bot, BookOpen,
  Clock, FolderOpen, Star, Bell, Settings, Shield, HelpCircle,
  LogOut, HeartPulse, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import { api } from '../../lib/api';
import { getUser, clearSession } from '../../lib/auth';

const BADGE_COLOR = '#E8906A';

// Badges are looked up live by key. They used to be literal strings ('3',
// '5', '3') baked into this array, so they never changed no matter what was
// actually waiting.
const navSections = [
  {
    label: null,
    items: [
      { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboard, badge: null },
      { id: 'appointments',  label: 'Appointments',     icon: Calendar,        badgeKey: 'requests' },
      { id: 'patients',      label: 'Patients',         icon: Users,           badge: null },
      { id: 'video',         label: 'Video Sessions',   icon: Video,           badge: null },
      { id: 'chat',          label: 'Messages',         icon: MessageSquare,   badgeKey: 'messages' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: 'mood',      label: 'Mood Journey',      icon: Heart,     badge: null },
      { id: 'journals',  label: 'Patient Journals',  icon: BookOpen,  badge: null },
      { id: 'notes',     label: 'Counseling Notes',  icon: FileText,  badge: null },
      { id: 'reports',   label: 'Reports',           icon: BarChart3, badge: null },
      { id: 'analytics', label: 'Analytics',         icon: TrendingUp,badge: null },
      { id: 'ai',        label: 'AI Assistant',      icon: Bot,       badge: null },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { id: 'availability',  label: 'Availability',   icon: Clock,    badge: null },
      { id: 'documents',     label: 'Documents',      icon: FolderOpen,badge: null },
      { id: 'feedback',      label: 'Feedback',       icon: Star,     badge: null },
      { id: 'notifications', label: 'Notifications',  icon: Bell,     badgeKey: 'notifications' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings',          icon: Settings,   badge: null },
      { id: 'security', label: 'Privacy & Security',icon: Shield,     badge: null },
      { id: 'help',     label: 'Help & Support',    icon: HelpCircle, badge: null },
    ],
  },
];

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  /** Live counts, keyed to `badgeKey` above. */
  badges?: Record<string, number>;
}

export function Sidebar({ currentPage, onNavigate, badges = {} }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { c } = useTheme();
  const doctor = getUser();
  const doctorName = doctor?.name || `Dr. ${doctor?.firstName || ''}`.trim();
  const doctorTitle = doctor?.title || 'Counselor';
  const initials = (doctor ? `${doctor.firstName?.[0] || ''}${doctor.lastName?.[0] || ''}` : 'DR').toUpperCase() || 'DR';

  const W = collapsed ? 72 : 256;
  // Everything in the collapsed rail centres on one 44px square so the icons,
  // dividers, avatar and logout all share a vertical axis.
  const RAIL_ITEM = 44;

  return (
    <aside
      style={{
        background: c.white,
        borderRight: `1px solid ${c.border}`,
        width: W,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ─── Logo + Toggle ─── */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        // Collapsed: one centred column. Expanded: logo left, toggle right.
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '0 16px 0 20px',
        borderBottom: `1px solid ${c.border}`,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}>
        {/* Logo mark always visible */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          overflow: 'hidden',
          // flex:1 would push the mark to the left of a full-width child
          flex: collapsed ? '0 0 auto' : 1,
          minWidth: 0,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${c.primary} 0%, #4A9A72 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <HeartPulse size={18} color="white" strokeWidth={2} />
          </div>

          {!collapsed && (
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: 14,
                color: c.textPrimary,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                CounselConnect
              </div>
              <div style={{
                fontFamily: 'Inter',
                fontSize: 10,
                color: c.primary,
                fontWeight: 600,
                marginTop: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Doctor Portal
              </div>
            </div>
          )}
        </div>

        {/* Toggle button — proper pill in header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.background,
            color: c.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            marginLeft: collapsed ? 0 : 8,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = c.veryLightSage;
            el.style.color = c.primary;
            el.style.borderColor = c.primary;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = c.background;
            el.style.color = c.textMuted;
            el.style.borderColor = c.border;
          }}
        >
          {collapsed
            ? <PanelLeftOpen  size={15} strokeWidth={1.8} />
            : <PanelLeftClose size={15} strokeWidth={1.8} />
          }
        </button>
      </div>

      {/* ─── Nav sections ─── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: collapsed ? `8px ${(72 - RAIL_ITEM) / 2}px` : '8px 12px',
      }}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Section label — only when expanded */}
            {section.label && !collapsed && (
              <div style={{
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: 600,
                color: c.textMuted,
                letterSpacing: '0.08em',
                padding: '16px 10px 6px',
                userSelect: 'none',
              }}>
                {section.label}
              </div>
            )}

            {/* Spacing between sections when collapsed */}
            {section.label && collapsed && sIdx > 0 && (
              <div style={{ height: 1, background: c.border, margin: '10px 6px' }} />
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: collapsed ? RAIL_ITEM : '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: 0,
                    padding: collapsed ? 0 : '0 10px',
                    height: collapsed ? RAIL_ITEM : 40,
                    borderRadius: collapsed ? 12 : 8,
                    marginLeft: collapsed ? 'auto' : undefined,
                    marginRight: collapsed ? 'auto' : undefined,
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: 1,
                    fontFamily: 'Inter',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? c.primary : c.textSecondary,
                    background: isActive ? c.veryLightSage : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = c.veryLightSage;
                      el.style.color = c.textPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'transparent';
                      el.style.color = c.textSecondary;
                    }
                  }}
                >
                  {/* Left accent for active — expanded only. On the collapsed
                      rail the filled square already reads as selected, and a
                      3px sliver on a 44px pill just looks like a stray mark. */}
                  {isActive && !collapsed && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 22,
                      borderRadius: '0 3px 3px 0',
                      background: c.primary,
                    }} />
                  )}

                  {/* Icon + Label row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    // Centred only on the collapsed rail. Expanded, this row is
                    // full width, so centring pushed the icon and label into the
                    // middle of the item and left a ragged left edge — every row
                    // starting at a different x depending on its label length.
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 11,
                    overflow: 'hidden',
                    // `flex: 1` when collapsed put the icon at the LEFT of a
                    // full-width child even though the button itself was centred.
                    flex: collapsed ? '0 0 auto' : 1,
                    minWidth: 0,
                  }}>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.6}
                      style={{ flexShrink: 0 }}
                    />
                    {!collapsed && (
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Badge */}
                  {(item as any).badgeKey && badges[(item as any).badgeKey] > 0 && !collapsed && (
                    <div style={{
                      flexShrink: 0,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      background: BADGE_COLOR,
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      fontFamily: 'Inter',
                    }}>
                      {badges[(item as any).badgeKey] > 9 ? '9+' : badges[(item as any).badgeKey]}
                    </div>
                  )}

                  {/* Badge dot when collapsed */}
                  {(item as any).badgeKey && badges[(item as any).badgeKey] > 0 && collapsed && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: BADGE_COLOR,
                      border: `1.5px solid ${c.white}`,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ─── Bottom: Profile + Logout ─── */}
      <div style={{ borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
        {/* Doctor profile card */}
        <div
          onClick={() => onNavigate('profile')}
          title={collapsed ? `${doctorName} · ${doctorTitle}` : undefined}
          style={{
            // Collapsed: a plain centred avatar on the same 44px axis as the
            // nav icons. A bordered card around a single avatar in a 72px rail
            // reads as clutter and never lines up with anything.
            width: collapsed ? RAIL_ITEM : undefined,
            height: collapsed ? RAIL_ITEM : undefined,
            margin: collapsed ? '10px auto 0' : '10px 12px 0',
            padding: collapsed ? 0 : '10px 12px',
            borderRadius: collapsed ? 12 : 10,
            background: collapsed ? 'transparent' : c.background,
            border: collapsed ? 'none' : `1px solid ${c.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 0.15s',
            // Same fix as the nav rows: centre only on the collapsed rail.
            justifyContent: collapsed ? 'center' : 'flex-start',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = c.veryLightSage; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = collapsed ? 'transparent' : c.background; }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 13,
                color: c.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {doctorName}
              </div>
              <div style={{
                fontFamily: 'Inter',
                fontSize: 11,
                color: c.textMuted,
              }}>
                {doctorTitle}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={async () => { try { await api.post('/auth/logout'); } catch { /* already gone */ } clearSession(); window.location.href = '/login'; }}
          title={collapsed ? 'Logout' : undefined}
          style={{
            width: collapsed ? RAIL_ITEM : '100%',
            height: collapsed ? RAIL_ITEM : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            padding: collapsed ? 0 : '12px 22px',
            margin: collapsed ? '4px auto 10px' : undefined,
            borderRadius: collapsed ? 12 : 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 400,
            color: c.error,
            transition: 'background 0.15s',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${c.error}12`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut size={16} strokeWidth={1.8} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
