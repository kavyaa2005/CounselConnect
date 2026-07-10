import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Heart, LayoutDashboard, LogOut } from 'lucide-react';
import { CC } from '../lib/colors';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Home',            path: '/' },
  { label: 'About',           path: '/about' },
  { label: 'Resources',       path: '/resources' },
  { label: 'Find Counselor',  path: '/dashboard/find-counselor' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  const transparentPaths = ['/', '/login'];
  const isTransparent = transparentPaths.includes(location.pathname) && !scrolled;

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: isTransparent ? 'transparent' : CC.lightIvory,
        boxShadow: isTransparent ? 'none' : '0 1px 30px rgba(53,92,77,0.07)',
        transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}
            >
              <Heart size={20} fill="white" color="white" />
            </div>
            <span
              className="text-xl tracking-tight"
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                color: isTransparent ? 'white' : CC.primaryText,
              }}
            >
              CounselConnect
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <NavLink key={item.label} item={item} isTransparent={isTransparent} />
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <span style={{ fontSize: '0.85rem', color: isTransparent ? 'rgba(255,255,255,0.75)' : CC.mutedOlive, fontWeight: 500 }}>
                  Hi, {user.firstName} 👋
                </span>
                <motion.button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`,
                    color: 'white',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.04, boxShadow: `0 8px 24px rgba(53,92,77,0.35)` }}
                  whileTap={{ scale: 0.97 }}
                >
                  <LayoutDashboard size={15} /> Dashboard
                </motion.button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm transition-all duration-300"
                  style={{
                    color: isTransparent ? 'rgba(255,255,255,0.7)' : CC.mutedOlive,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    border: `1.5px solid ${isTransparent ? 'rgba(255,255,255,0.3)' : CC.softSage}`,
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 rounded-full text-sm transition-all duration-300"
                  style={{
                    color: isTransparent ? 'white' : CC.forestSage,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    border: `1.5px solid ${isTransparent ? 'rgba(255,255,255,0.5)' : CC.forestSage}`,
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Login
                </button>
                <motion.button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2.5 rounded-full text-sm text-white transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${CC.terracotta}, #c4623e)`,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.04, boxShadow: `0 8px 24px rgba(217,119,87,0.35)` }}
                  whileTap={{ scale: 0.97 }}
                >
                  Get Started
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: isTransparent ? 'white' : CC.primaryText }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ backgroundColor: CC.lightIvory, borderTop: `1px solid ${CC.softSage}` }}
            className="lg:hidden overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="py-2 text-sm"
                  style={{ color: CC.primaryText, fontWeight: 500 }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-2">
                {user ? (
                  <>
                    <button
                      onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}
                      className="flex-1 py-2.5 rounded-full text-sm text-white"
                      style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 py-2.5 rounded-full text-sm border"
                      style={{ color: CC.mutedOlive, borderColor: CC.softSage, fontWeight: 600, background: 'none', cursor: 'pointer' }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { navigate('/login'); setMenuOpen(false); }}
                      className="flex-1 py-2.5 rounded-full text-sm border"
                      style={{ color: CC.forestSage, borderColor: CC.forestSage, fontWeight: 600, background: 'none', cursor: 'pointer' }}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => { navigate('/register'); setMenuOpen(false); }}
                      className="flex-1 py-2.5 rounded-full text-sm text-white"
                      style={{ background: CC.terracotta, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function NavLink({ item, isTransparent }: { item: { label: string; path: string }; isTransparent: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;

  return (
    <Link
      to={item.path}
      className="relative py-1 text-sm group"
      style={{
        color: isTransparent ? 'rgba(255,255,255,0.9)' : isActive ? CC.forestSage : CC.primaryText,
        fontWeight: 500,
        transition: 'color 0.2s ease',
      }}
    >
      {item.label}
      <span
        className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all duration-300"
        style={{
          width: isActive ? '100%' : '0%',
          background: isTransparent ? 'white' : CC.forestSage,
        }}
      />
      <span
        className="absolute bottom-0 left-0 h-0.5 rounded-full opacity-0 group-hover:opacity-100 group-hover:w-full transition-all duration-300"
        style={{
          width: '0%',
          background: isTransparent ? 'white' : CC.forestSage,
        }}
      />
    </Link>
  );
}
