import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Users, UserCheck, Calendar, Video, MessageSquare,
  Star, BarChart3, TrendingUp, CreditCard, Bell, Settings, User,
  LogOut, Heart, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "./ui/utils";
import { useTheme } from "../context/ThemeContext";

type Page =
  | "dashboard" | "users" | "counselors" | "appointments" | "sessions"
  | "messages" | "feedback" | "reports" | "analytics" | "payments"
  | "notifications" | "settings" | "profile";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navGroups = [
  {
    label: "Overview",
    items: [{ id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { id: "users" as Page, label: "Users", icon: Users },
      { id: "counselors" as Page, label: "Counselors", icon: UserCheck },
      { id: "appointments" as Page, label: "Appointments", icon: Calendar },
      { id: "sessions" as Page, label: "Sessions", icon: Video },
      { id: "messages" as Page, label: "Messages", icon: MessageSquare, badge: 5 },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "feedback" as Page, label: "Feedback", icon: Star },
      { id: "reports" as Page, label: "Reports", icon: BarChart3 },
      { id: "analytics" as Page, label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Finance",
    items: [{ id: "payments" as Page, label: "Payments", icon: CreditCard }],
  },
  {
    label: "System",
    items: [
      { id: "notifications" as Page, label: "Notifications", icon: Bell, badge: 3 },
      { id: "settings" as Page, label: "Settings", icon: Settings },
    ],
  },
];

function NavItem({ id, label, icon: Icon, badge, isActive, collapsed, onClick }: {
  id: Page; label: string; icon: React.ElementType; badge?: number;
  isActive: boolean; collapsed: boolean; onClick: () => void;
}) {
  const { t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "w-full flex items-center rounded-xl transition-colors duration-150 relative overflow-hidden",
          collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5"
        )}
        style={isActive
          ? { background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }
          : { background: hovered ? t.hover : "transparent" }
        }
      >
        <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")}
          style={{ color: isActive ? "white" : t.textSec }} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left"
              style={{ color: isActive ? "white" : t.text }}
            >{label}</motion.span>
          )}
        </AnimatePresence>
        {!collapsed && badge ? (
          <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
            style={{ background: "#D8A48F" }}>{badge}</span>
        ) : null}
        {collapsed && badge ? (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white" style={{ background: "#D8A48F" }} />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {collapsed && hovered && (
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
            className="absolute left-14 top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg shadow-xl text-xs font-medium pointer-events-none whitespace-nowrap"
            style={{ background: "#1F2937", color: "white" }}
          >
            {label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45" style={{ background: "#1F2937" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle, activePage, onNavigate }: SidebarProps) {
  const { t } = useTheme();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 248 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full shrink-0 z-30"
      style={{
        background: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        boxShadow: t.shadow,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center h-16 px-4 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div key="exp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm leading-none" style={{ color: t.text }}>
                  Counsel<span style={{ color: "#5E8B7E" }}>Connect</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: t.muted }}>Admin Portal</div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto shadow-sm"
              style={{ background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)" }}>
              <Heart className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {!collapsed && (
          <motion.button onClick={onToggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: t.muted, background: t.hover }}>
            <PanelLeftClose className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {collapsed && (
        <motion.button onClick={onToggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mx-auto mt-3 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#5E8B7E", background: t.hover, border: `1px solid ${t.border}` }}>
          <PanelLeftOpen className="w-4 h-4" />
        </motion.button>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest overflow-hidden"
                  style={{ color: t.muted }}>{group.label}</motion.p>
              )}
            </AnimatePresence>
            {collapsed && <div className="my-2 mx-2" style={{ borderTop: `1px solid ${t.border}` }} />}
            <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
              {group.items.map(item => (
                <NavItem key={item.id} {...item}
                  isActive={activePage === item.id}
                  collapsed={collapsed}
                  onClick={() => onNavigate(item.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="py-3 px-2 space-y-0.5" style={{ borderTop: `1px solid ${t.border}` }}>
        <NavItem id="profile" label="My Profile" icon={User}
          isActive={activePage === "profile"} collapsed={collapsed} onClick={() => onNavigate("profile")} />
        <motion.button whileTap={{ scale: 0.97 }}
          className={cn("w-full flex items-center rounded-xl transition-colors duration-150 group hover:bg-red-50/10",
            collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 py-2.5"
          )}>
          <LogOut className="w-4 h-4 shrink-0" style={{ color: "#EF5350" }} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ color: "#EF5350" }}>Logout</motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}
