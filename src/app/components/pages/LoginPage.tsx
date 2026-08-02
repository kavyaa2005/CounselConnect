import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, Heart, ArrowRight, Shield, CheckCircle, Star, Sparkles } from 'lucide-react';
import { CC } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';

// Where each role belongs once authenticated
const homeFor = (role?: string) =>
  role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/dashboard';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Please enter your email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email';
    if (!form.password) e.password = 'Please enter your password';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const loggedIn = await login(form.email, form.password);
      // Role-based redirect — one login page, three destinations
      navigate(homeFor(loggedIn.role));
    } catch (err: any) {
      setErrors({ password: err.message || 'Invalid email or password' });
    } finally {
      setLoading(false);
    }
  };

  // Already signed in? Skip the form and go straight to the right panel.
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: '100vh', backgroundColor: CC.darkForest, fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Full-screen background ── */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1772267692484-5e54d9645e12?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.18 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(53,92,77,0.6) 0%, transparent 70%),
              linear-gradient(170deg, rgba(40,70,58,0.97) 0%, rgba(53,92,77,0.93) 45%, rgba(40,70,58,0.97) 100%)
            `,
          }}
        />
      </div>

      <div
        className="absolute pointer-events-none"
        style={{ top: '15%', left: '8%', width: 480, height: 480, background: CC.terracotta, opacity: 0.06, borderRadius: '50%', filter: 'blur(100px)' }}
      />
      <div
        className="absolute pointer-events-none"
        style={{ bottom: '10%', right: '6%', width: 360, height: 360, background: CC.softSage, opacity: 0.07, borderRadius: '50%', filter: 'blur(90px)' }}
      />
      <svg className="absolute top-28 right-16 opacity-10 pointer-events-none" width="120" height="120" viewBox="0 0 120 120" fill="none">
        <path d="M60 10 C90 10, 110 40, 100 70 C90 100, 50 110, 30 90 C10 70, 20 20, 60 10Z" fill={CC.softSage} />
      </svg>
      <svg className="absolute bottom-20 left-12 opacity-8 pointer-events-none" width="80" height="80" viewBox="0 0 80 80" fill="none">
        <path d="M40 5 C65 5, 75 30, 65 50 C55 70, 25 75, 15 55 C5 35, 15 5, 40 5Z" fill={CC.terracotta} />
      </svg>

      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={{ minHeight: '100vh', padding: '96px 16px 48px' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="text-center mb-9"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
          >
            <Sparkles size={13} color={CC.terracotta} />
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Welcome Back
            </span>
          </motion.div>

          <h1
            style={{
              fontFamily: "'Poppins', sans-serif", fontWeight: 800,
              fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'white', lineHeight: 1.15, letterSpacing: '-0.02em',
            }}
          >
            Your healing space<br />
            <span style={{ color: '#f0b89a' }}>awaits you.</span>
          </h1>
          <p className="mt-3" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', maxWidth: 340, margin: '12px auto 0' }}>
            Sign in to continue your wellness journey.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.18, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 460 }}
        >
          <div
            className="rounded-3xl"
            style={{
              backgroundColor: 'rgba(253, 251, 248, 0.97)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              boxShadow: '0 48px 120px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.18)',
              padding: '40px 40px',
            }}
          >
            <div className="flex items-center gap-2.5 mb-8">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}
              >
                <Heart size={17} fill="white" color="white" />
              </div>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, fontSize: '1rem' }}>
                CounselConnect
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 7 }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} color={CC.mutedOlive} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="email" placeholder="your@email.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full outline-none transition-all duration-200"
                    style={{ paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14, borderRadius: 16, backgroundColor: errors.email ? 'rgba(217,119,87,0.06)' : CC.softSage, border: `1.5px solid ${errors.email ? CC.terracotta : 'transparent'}`, color: CC.primaryText, fontSize: '0.93rem' }}
                    onFocus={e => { e.target.style.border = `1.5px solid ${CC.forestSage}`; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = `0 0 0 3px rgba(53,92,77,0.08)`; }}
                    onBlur={e => { e.target.style.border = `1.5px solid ${errors.email ? CC.terracotta : 'transparent'}`; e.target.style.backgroundColor = errors.email ? 'rgba(217,119,87,0.06)' : CC.softSage; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ color: CC.terracotta, fontSize: '0.75rem', marginTop: 5 }}>
                    {errors.email}
                  </motion.p>
                )}
              </div>

              <div className="mb-4">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 7 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} color={CC.mutedOlive} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="Your password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full outline-none transition-all duration-200"
                    style={{ paddingLeft: 44, paddingRight: 48, paddingTop: 14, paddingBottom: 14, borderRadius: 16, backgroundColor: errors.password ? 'rgba(217,119,87,0.06)' : CC.softSage, border: `1.5px solid ${errors.password ? CC.terracotta : 'transparent'}`, color: CC.primaryText, fontSize: '0.93rem' }}
                    onFocus={e => { e.target.style.border = `1.5px solid ${CC.forestSage}`; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = `0 0 0 3px rgba(53,92,77,0.08)`; }}
                    onBlur={e => { e.target.style.border = `1.5px solid ${errors.password ? CC.terracotta : 'transparent'}`; e.target.style.backgroundColor = errors.password ? 'rgba(217,119,87,0.06)' : CC.softSage; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} color={CC.mutedOlive} /> : <Eye size={16} color={CC.mutedOlive} />}
                  </button>
                </div>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ color: CC.terracotta, fontSize: '0.75rem', marginTop: 5 }}>
                    {errors.password}
                  </motion.p>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    className="flex items-center justify-center transition-all duration-200 cursor-pointer"
                    style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: form.remember ? CC.forestSage : 'transparent', border: `1.5px solid ${form.remember ? CC.forestSage : CC.mutedOlive}` }}
                    onClick={() => setForm({ ...form, remember: !form.remember })}
                  >
                    {form.remember && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: CC.primaryText }}>Remember me</span>
                </label>
                <button
                  type="button"
                  style={{ fontSize: '0.82rem', color: CC.forestSage, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={async () => {
                    if (!form.email) { setErrors({ email: 'Enter your email first' }); return; }
                    try {
                      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }),
                      });
                      alert('If this email exists, a reset link has been sent.');
                    } catch { alert('Unable to process request.'); }
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2"
                style={{ padding: '16px 0', borderRadius: 16, background: loading ? CC.mutedOlive : `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: loading ? 'none' : `0 8px 28px rgba(53,92,77,0.28)`, transition: 'all 0.2s' }}
                whileHover={!loading ? { scale: 1.02, boxShadow: `0 14px 36px rgba(53,92,77,0.38)` } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent' }} />
                ) : (
                  <>Sign In <ArrowRight size={17} /></>
                )}
              </motion.button>

              <div className="flex items-center gap-3 my-5">
                <div style={{ flex: 1, height: 1, backgroundColor: CC.softSage }} />
                <span style={{ color: CC.mutedOlive, fontSize: '0.78rem' }}>or</span>
                <div style={{ flex: 1, height: 1, backgroundColor: CC.softSage }} />
              </div>

              <motion.button
                type="button"
                className="w-full flex items-center justify-center gap-3"
                style={{ padding: '14px 0', borderRadius: 16, backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, color: CC.primaryText, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                whileHover={{ scale: 1.02, backgroundColor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </motion.button>
            </form>

            <p className="mt-6 text-center" style={{ color: CC.mutedOlive, fontSize: '0.875rem' }}>
              New to CounselConnect?{' '}
              <Link to="/register" style={{ color: CC.forestSage, fontWeight: 700, textDecoration: 'none' }}>
                Begin your journey →
              </Link>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-8"
        >
          {[{ icon: Shield, text: 'HIPAA Compliant' }, { icon: CheckCircle, text: 'Verified Counselors' }, { icon: Star, text: '4.9 / 5 Rating' }].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={13} color="rgba(255,255,255,0.3)" />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
