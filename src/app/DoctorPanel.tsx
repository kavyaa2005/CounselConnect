// Doctor Panel — same UI as the standalone doctor app, now mounted at /doctor
// and protected so only accounts with role "doctor" can access it.
import { useState } from 'react';
import { Navigate } from 'react-router';
import { getUser, isLoggedIn } from './lib/auth';
import { Sidebar } from './components/doctor/Sidebar';
import { TopNav } from './components/doctor/TopNav';
import { DashboardPage } from './components/doctor/dashboard/DashboardPage';
import { AppointmentsPage } from './components/doctor/appointments/AppointmentsPage';
import { PatientsPage } from './components/doctor/patients/PatientsPage';
import { VideoSessionPage } from './components/doctor/video/VideoSessionPage';
import { ChatPage } from './components/doctor/chat/ChatPage';
import { AIAssistantPage } from './components/doctor/ai/AIAssistantPage';
import { MoodJourneyPage } from './components/doctor/mood/MoodJourneyPage';
import { CounselingNotesPage } from './components/doctor/notes/CounselingNotesPage';
import { ReportsPage } from './components/doctor/reports/ReportsPage';
import { AnalyticsPage } from './components/doctor/analytics/AnalyticsPage';
import { AvailabilityPage } from './components/doctor/availability/AvailabilityPage';
import { FeedbackPage } from './components/doctor/feedback/FeedbackPage';
import { DocumentsPage } from './components/doctor/documents/DocumentsPage';
import { NotificationsPage } from './components/doctor/notifications/NotificationsPage';
import { SettingsPage } from './components/doctor/settings/SettingsPage';
import { ProfilePage } from './components/doctor/profile/ProfilePage';
import { HelpPage } from './components/doctor/help/HelpPage';
import { SecurityPage } from './components/doctor/security/SecurityPage';
import { ThemeProvider } from './components/doctor/ThemeContext';
import { getColors } from './components/doctor/colors';

type Page =
  | 'dashboard' | 'appointments' | 'patients' | 'video'
  | 'chat' | 'ai' | 'mood' | 'notes' | 'reports' | 'analytics'
  | 'availability' | 'feedback' | 'documents' | 'notifications'
  | 'settings' | 'profile' | 'help' | 'security';

export function DoctorPanel() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // ── Route guard: doctors only ──
  const user = getUser();
  if (!isLoggedIn() || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'doctor') return <Navigate to="/dashboard" replace />;

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const isVideoPage = currentPage === 'video';
  const colors = getColors(darkMode);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage onNavigate={handleNavigate} />;
      case 'appointments': return <AppointmentsPage onNavigate={handleNavigate} />;
      case 'patients': return <PatientsPage onNavigate={handleNavigate} />;
      case 'video': return <VideoSessionPage onNavigate={handleNavigate} />;
      case 'chat': return <ChatPage onNavigate={handleNavigate} />;
      case 'ai': return <AIAssistantPage onNavigate={handleNavigate} />;
      case 'mood': return <MoodJourneyPage />;
      case 'notes': return <CounselingNotesPage />;
      case 'reports': return <ReportsPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'availability': return <AvailabilityPage />;
      case 'feedback': return <FeedbackPage />;
      case 'documents': return <DocumentsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings': return <SettingsPage />;
      case 'profile': return <ProfilePage />;
      case 'help': return <HelpPage />;
      case 'security': return <SecurityPage />;
      default: return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  const getPageBackground = () => {
    if (['chat', 'notes', 'settings', 'video'].includes(currentPage)) {
      return colors.white;
    }
    return colors.background;
  };

  return (
    <ThemeProvider darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)}>
      <div
        className={darkMode ? 'dark theme-transition' : 'theme-transition'}
        style={{
          display: 'flex',
          height: '100vh',
          background: colors.background,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar — hidden during video session */}
        {!isVideoPage && (
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Nav — hidden during video session */}
          {!isVideoPage && (
            <TopNav
              currentPage={currentPage}
              onNavigate={handleNavigate}
            />
          )}

          {/* Page Content */}
          <main
            style={{
              flex: 1,
              overflowY: isVideoPage ? 'hidden' : 'auto',
              overflowX: 'hidden',
              background: getPageBackground(),
            }}
          >
            {renderPage()}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
