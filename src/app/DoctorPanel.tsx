// Doctor Panel — same UI as the standalone doctor app, now mounted at /doctor
// and protected so only accounts with role "doctor" can access it.
import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router';
import { getUser, isLoggedIn } from './lib/auth';
import { api } from './lib/api';
import { getSocket } from './lib/callClient';
import { Sidebar } from './components/doctor/Sidebar';
import { TopNav } from './components/doctor/TopNav';
import { DashboardPage } from './components/doctor/dashboard/DashboardPage';
import { AppointmentsPage } from './components/doctor/appointments/AppointmentsPage';
import { PatientsPage } from './components/doctor/patients/PatientsPage';
import { VideoSessionPage } from './components/doctor/video/VideoSessionPage';
import { ChatPage } from './components/doctor/chat/ChatPage';
import { AIAssistantPage } from './components/doctor/ai/AIAssistantPage';
import { MoodJourneyPage } from './components/doctor/mood/MoodJourneyPage';
import { PatientJournalsPage } from './components/doctor/journals/PatientJournalsPage';
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
import { IncomingCallRinger } from './components/IncomingCallRinger';

type Page =
  | 'dashboard' | 'appointments' | 'patients' | 'video'
  | 'chat' | 'ai' | 'mood' | 'journals' | 'notes' | 'reports' | 'analytics'
  | 'availability' | 'feedback' | 'documents' | 'notifications'
  | 'settings' | 'profile' | 'help' | 'security';

export function DoctorPanel() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // The Settings page has always had a Dark Mode toggle, but the panel kept
  // its own local state and never read it back — so the saved preference did
  // nothing and reset on every reload. Load it, and write it on change.
  useEffect(() => {
    api.get('/doctor/settings')
      .then(r => setDarkMode(!!r.data.settings?.darkMode))
      .catch(() => {});
  }, []);

  /* ── Live sidebar badges ──
     Polled, and refreshed immediately whenever the doctor navigates — so
     opening Messages or Notifications clears the count without waiting for
     the next poll. A new message or request brings the badge straight back. */
  const [badges, setBadges] = useState<Record<string, number>>({});

  const refreshBadges = useCallback(() => {
    api.get('/doctor/badges')
      .then(r => setBadges(r.data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBadges();
    const t = setInterval(refreshBadges, 20000);
    return () => clearInterval(t);
  }, [refreshBadges]);

  // Reading a page is what clears its badge, so re-check just after landing.
  useEffect(() => {
    const t = setTimeout(refreshBadges, 900);
    return () => clearTimeout(t);
  }, [currentPage, refreshBadges]);

  // A message arriving while the panel is open should bump the badge at once
  // rather than waiting up to 20 seconds for the poll.
  useEffect(() => {
    const sock = getSocket();
    const bump = () => refreshBadges();
    sock.on('chat:message', bump);
    return () => { sock.off('chat:message', bump); };
  }, [refreshBadges]);

  const toggleDark = () => {
    setDarkMode(prev => {
      const next = !prev;
      api.put('/doctor/settings', { darkMode: next }).catch(() => {});
      return next;
    });
  };

  // ── Route guard: doctors only ──
  const user = getUser();
  if (!isLoggedIn() || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role !== 'doctor') return <Navigate to="/dashboard" replace />;

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // The chrome used to hide whenever the video PAGE was open, which stranded
  // you in the lobby with no sidebar and no way back. It should only go away
  // during an actual call, where an immersive view is the point.
  const [inCall, setInCall] = useState(false);
  const isVideoPage = currentPage === 'video';
  const immersive = isVideoPage && inCall;

  // Leaving the video page should never leave the panel stuck in call mode.
  useEffect(() => { if (!isVideoPage) setInCall(false); }, [isVideoPage]);
  const colors = getColors(darkMode);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage onNavigate={handleNavigate} />;
      case 'appointments': return <AppointmentsPage onNavigate={handleNavigate} />;
      case 'patients': return <PatientsPage onNavigate={handleNavigate} />;
      case 'video': return <VideoSessionPage onNavigate={handleNavigate} onCallStateChange={setInCall} />;
      case 'chat': return <ChatPage onNavigate={handleNavigate} />;
      case 'ai': return <AIAssistantPage onNavigate={handleNavigate} />;
      case 'mood': return <MoodJourneyPage />;
      case 'journals': return <PatientJournalsPage />;
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
    <ThemeProvider darkMode={darkMode} onToggleDark={toggleDark}>
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
        {/* Ring on any screen; the video page handles its own ringing */}
        <IncomingCallRinger
          suppressed={immersive}
          theme={darkMode ? 'dark' : 'light'}
          onAccept={() => setCurrentPage('video')}
        />

        {/* Sidebar — hidden during video session */}
        {!immersive && (
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} badges={badges} />
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Nav — hidden during video session */}
          {!immersive && (
            <TopNav
              currentPage={currentPage}
              onNavigate={handleNavigate}
            />
          )}

          {/* Page Content */}
          <main
            style={{
              flex: 1,
              overflowY: immersive ? 'hidden' : 'auto',
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
