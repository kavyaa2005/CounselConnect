import { useState } from 'react';
import { Eye, EyeOff, Brain, Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { colors, shadows } from '../colors';

interface LoginPageProps {
  onLogin: () => void;
}

type AuthStep = 'login' | 'forgot' | 'otp' | 'reset';

export function LoginPage({ onLogin }: LoginPageProps) {
  const [step, setStep] = useState<AuthStep>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('dr.rachel@counselconnect.com');
  const [password, setPassword] = useState('••••••••');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) {
      const next = document.getElementById(`otp-${idx + 1}`);
      if (next) (next as HTMLInputElement).focus();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      display: 'flex',
      fontFamily: 'Inter',
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1,
        background: `linear-gradient(145deg, #2D4A3E 0%, #3D6B59 40%, ${colors.primary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={24} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>CounselConnect</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>Doctor Portal</div>
          </div>
        </div>

        <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white', lineHeight: 1.2, margin: 0, marginBottom: 20 }}>
          Empowering<br />Mental Health<br />Professionals
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
          Access your patient management dashboard, AI-powered insights, and secure video counseling sessions in one unified platform.
        </p>

        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { icon: '🔒', title: 'HIPAA Compliant', desc: 'End-to-end encrypted sessions' },
            { icon: '🤖', title: 'AI-Powered Insights', desc: 'Smart patient mood analysis' },
            { icon: '📊', title: 'Advanced Analytics', desc: 'Track patient progress & outcomes' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        width: 520,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 56px',
        background: colors.white,
      }}>
        {step === 'login' && (
          <div>
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: colors.textPrimary, margin: 0, marginBottom: 8 }}>
                Welcome back, Doctor
              </h2>
              <p style={{ fontSize: 15, color: colors.textSecondary, margin: 0 }}>
                Sign in to your counselor dashboard
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 44px',
                      borderRadius: 12,
                      border: `1.5px solid ${colors.border}`,
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: colors.textPrimary,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border; }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Password</label>
                  <button
                    onClick={() => setStep('forgot')}
                    style={{ fontSize: 13, color: colors.primary, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 44px',
                      borderRadius: 12,
                      border: `1.5px solid ${colors.border}`,
                      fontFamily: 'Inter',
                      fontSize: 14,
                      color: colors.textPrimary,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.target.style.borderColor = colors.border; }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="remember" style={{ accentColor: colors.primary }} defaultChecked />
                <label htmlFor="remember" style={{ fontSize: 13, color: colors.textSecondary }}>Remember me for 30 days</label>
              </div>

              <button
                onClick={onLogin}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: 'none',
                  background: colors.primary,
                  color: 'white',
                  fontFamily: 'Inter',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = colors.primaryHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = colors.primary; }}
              >
                Sign In to Dashboard
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
                <span style={{ fontSize: 12, color: colors.textMuted }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
              </div>

              <button style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: `1.5px solid ${colors.border}`,
                background: 'transparent',
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: 500,
                color: colors.textPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Sign in with Google
              </button>
            </div>

            <div style={{ marginTop: 32, padding: 16, borderRadius: 12, background: colors.veryLightSage, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={16} color={colors.primary} />
              <span style={{ fontSize: 12, color: colors.textSecondary }}>
                Protected by HIPAA-compliant security. All data is encrypted in transit and at rest.
              </span>
            </div>
          </div>
        )}

        {step === 'forgot' && (
          <div>
            <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: colors.primary, fontWeight: 500, padding: 0, marginBottom: 32 }}>
              ← Back to login
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary, margin: 0, marginBottom: 8 }}>Reset Password</h2>
            <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: 32 }}>Enter your email to receive a 6-digit OTP</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Email Address</label>
              <input
                type="email"
                placeholder="dr.rachel@counselconnect.com"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={() => setStep('otp')}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Send OTP
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div>
            <button onClick={() => setStep('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: colors.primary, fontWeight: 500, padding: 0, marginBottom: 32 }}>
              ← Back
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary, margin: 0, marginBottom: 8 }}>Verify OTP</h2>
            <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: 8 }}>Enter the 6-digit code sent to your email</p>
            <p style={{ fontSize: 13, color: colors.primary, fontWeight: 600, margin: 0, marginBottom: 32 }}>dr.rachel@counselconnect.com</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              {otp.map((val, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  maxLength={1}
                  value={val}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  style={{
                    width: 52, height: 56, borderRadius: 12,
                    border: `1.5px solid ${val ? colors.primary : colors.border}`,
                    fontFamily: 'Inter', fontSize: 22, fontWeight: 700,
                    color: colors.textPrimary, textAlign: 'center',
                    outline: 'none', background: val ? colors.veryLightSage : 'transparent',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setStep('reset')}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
            >
              Verify Code
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: colors.textSecondary }}>
              Didn't receive code? <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, fontWeight: 600, fontSize: 13 }}>Resend OTP (60s)</button>
            </div>
          </div>
        )}

        {step === 'reset' && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: colors.textPrimary, margin: 0, marginBottom: 8 }}>New Password</h2>
            <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, marginBottom: 32 }}>Create a strong password for your account</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>New Password</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.textPrimary, marginBottom: 8 }}>Confirm Password</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button
                onClick={onLogin}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Reset Password & Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
