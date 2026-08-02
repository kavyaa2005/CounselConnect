import { useState, useEffect } from "react";
import { Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { getUser, isLoggedIn } from "../lib/auth";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { TopNav } from "./components/TopNav";
import { Dashboard } from "./components/Dashboard";
import { Users } from "./components/Users";
import { Counselors } from "./components/Counselors";
import { Applications } from "./components/Applications";
import { Appointments } from "./components/Appointments";
import { Sessions } from "./components/Sessions";
import { Feedback } from "./components/Feedback";
import { Reports } from "./components/Reports";
import { Analytics } from "./components/Analytics";
import { Payments } from "./components/Payments";
import { Notifications } from "./components/Notifications";
import { Settings } from "./components/Settings";
import { Profile } from "./components/Profile";
import { ErrorBoundary } from "./components/ErrorBoundary";

export type Page =
  | "dashboard" | "users" | "counselors" | "applications" | "appointments" | "sessions"
  | "feedback" | "reports" | "analytics" | "payments"
  | "notifications" | "settings" | "profile";

const pages: Page[] = [
  "dashboard", "users", "counselors", "applications", "appointments", "sessions",
  "feedback", "reports", "analytics", "payments",
  "notifications", "settings", "profile",
];

const pageComponents: Record<Page, React.ComponentType<any>> = {
  dashboard: Dashboard, users: Users, counselors: Counselors, applications: Applications,
  appointments: Appointments, sessions: Sessions,
  feedback: Feedback, reports: Reports, analytics: Analytics,
  payments: Payments, notifications: Notifications, settings: Settings, profile: Profile,
};

function AppInner() {
  const { isDark, t } = useTheme();
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pageAction, setPageAction] = useState<string | null>(null);

  // Apply / remove dark class on <html> for Tailwind dark: prefix
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function navigate(page: Page, action?: string) {
    setActivePage(page);
    setPageAction(action || null);
  }

  const PageComponent = pageComponents[activePage];

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: t.bg, fontFamily: "'Inter', sans-serif",
      transition: "background 0.3s ease, color 0.3s ease",
    }}>
      <ErrorBoundary page={`sidebar:${activePage}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          activePage={activePage}
          onNavigate={(p) => navigate(p)}
        />
      </ErrorBoundary>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <ErrorBoundary page={`topnav:${activePage}`}>
          <TopNav activePage={activePage} onNavigate={navigate} />
        </ErrorBoundary>

        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: t.bg }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ minHeight: "100%" }}
            >
              <ErrorBoundary page={activePage}>
                <PageComponent
                  pageAction={pageAction}
                  onActionConsumed={() => setPageAction(null)}
                  onNavigate={navigate}
                />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

// ── Route guard: admins only ──
export function AdminPanel() {
  const user = getUser();
  if (!isLoggedIn() || !user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return <Navigate to={user.role === "doctor" ? "/doctor" : "/dashboard"} replace />;
  }
  return <App />;
}
