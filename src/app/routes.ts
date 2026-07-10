import { createBrowserRouter } from 'react-router';
import { Root } from './Root';
import { DoctorPanel } from './DoctorPanel';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterPage } from './components/pages/RegisterPage';
import { AboutPage } from './components/pages/AboutPage';
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

export const router = createBrowserRouter([
  {
    // Doctor panel lives outside Root so it doesn't get the public Navbar
    path: '/doctor',
    Component: DoctorPanel,
  },
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      { path: 'about', Component: AboutPage },
      { path: 'resources', Component: ResourcesPage },
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
        ],
      },
    ],
  },
]);
