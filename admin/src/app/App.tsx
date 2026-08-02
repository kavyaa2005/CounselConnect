import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Sidebar } from "./components/Sidebar";
import { TopNav } from "./components/TopNav";
import { Dashboard } from "./components/Dashboard";
import { Users } from "./components/Users";
import { Counselors } from "./components/Counselors";
import { Appointments } from "./components/Appointments";
import { Sessions } from "./components/Sessions";
import { Messages } from "./components/Messages";
import { Feedback } from "./components/Feedback";
import { Reports } from "./components/Reports";
import { Analytics } from "./components/Analytics";
import { Payments } from "./components/Payments";
import { Notifications } from "./components/Notifications";
import { Settings } from "./components/Settings";
import { Profile } from "./components/Profile";

export type Page =
  | "dashboard" | "users" | "counselors" | "appointments" | "sessions"
  | "messages" | "feedback" | "reports" | "analytics" | "payments"
  | "notifications" | "settings" | "profile";

const pages: Page[] = [
  "dashboard", "users", "counselors", "appointments", "sessions",
  "messages", "feedback", "reports", "analytics", "payments",
  "notifications", "settings", "profile",
];

const pageComponents: Record<Page, React.ComponentType<any>> = {
  dashboard: Dashboard, users: Users, counselors: Counselors,
  appointments: Appointments, sessions: Sessions, messages: Messages,
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
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        activePage={activePage}
        onNavigate={(p) => navigate(p)}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <TopNav activePage={activePage} onNavigate={navigate} />

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
              <PageComponent
                pageAction={pageAction}
                onActionConsumed={() => setPageAction(null)}
              />
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
