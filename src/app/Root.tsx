import { Outlet } from 'react-router';
import { Navbar } from './components/Navbar';
import { ScrollToTop } from './components/ScrollToTop';

export function Root() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <ScrollToTop />
      <Navbar />
      <Outlet />
    </div>
  );
}
