import { createBrowserRouter } from 'react-router';
import { Root } from './Root';
import { DoctorPanel } from './DoctorPanel';
import { AdminPanel } from './admin/App';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { JoinAsCounselorPage } from './components/pages/JoinAsCounselorPage';
import { AboutPage } from './components/pages/AboutPage';
import { EmergencyPage } from './components/pages/EmergencyPage';
import { SupportPage } from './components/pages/SupportPage';
import { MyFilesPage } from './components/pages/MyFilesPage';
import { ResourcesPage } from './components/pages/ResourcesPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHomePage } from './components/pages/DashboardHomePage';
import { AIMatchingPage } from './components/pages/AIMatchingPage';
import { MoodTrackerPage } from './components/pages/MoodTrackerPage';
import { ChatPage } from './components/pages/ChatPage';
import { VideoPage } from './components/pages/VideoPage';
import { JourneyPage } from './components/pages/JourneyPage';
import { AISummaryPage } from './components/pages/AISummaryPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { FindCounselorPage } from './components/pages/FindCounselorPage';
import { AppointmentsPage } from './components/pages/AppointmentsPage';
import { BillingPage } from './components/pages/BillingPage';
import { FeedbackPage } from './components/pages/FeedbackPage';

export const router = createBrowserRouter([
  {
    // Doctor panel lives outside Root so it doesn't get the public Navbar
    path: '/doctor',
    Component: DoctorPanel,
  },
  {
    // Admin panel — its own shell, no public Navbar
    path: '/admin',
    Component: AdminPanel,
  },
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      { path: 'join-as-counselor', Component: JoinAsCounselorPage },
      { path: 'about', Component: AboutPage },
      { path: 'resources', Component: ResourcesPage },
      // Public on purpose: someone in crisis may be signed out.
      { path: 'emergency', Component: EmergencyPage },
      { path: 'help', Component: SupportPage },
      {
        path: 'dashboard',
        Component: DashboardLayout,
        children: [
          { index: true, Component: DashboardHomePage },
          { path: 'ai-match', Component: AIMatchingPage },
          { path: 'mood', Component: MoodTrackerPage },
          { path: 'chat', Component: ChatPage },
          { path: 'video', Component: VideoPage },
          { path: 'journey', Component: JourneyPage },
          { path: 'summary', Component: AISummaryPage },
          { path: 'settings', Component: SettingsPage },
          { path: 'find-counselor', Component: FindCounselorPage },
          { path: 'appointments', Component: AppointmentsPage },
          { path: 'billing', Component: BillingPage },
          { path: 'feedback', Component: FeedbackPage },
          { path: 'emergency', Component: EmergencyPage },
          { path: 'resources', Component: ResourcesPage },
          { path: 'files', Component: MyFilesPage },
          { path: 'help', Component: SupportPage },
        ],
      },
    ],
  },
]);
