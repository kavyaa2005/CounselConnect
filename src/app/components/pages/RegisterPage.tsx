import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, CheckCircle, Heart, Sparkles } from 'lucide-react';
import { CC } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';

/* ── Step config ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Your Story' },
  { id: 2, label: 'Connection' },
  { id: 3, label: 'Goals' },
  { id: 4, label: 'Account' },
];

const STEP_IMAGES = [
  'https://images.unsplash.com/photo-1763713383838-5cd702c13160?w=900&q=80',
  'https://images.unsplash.com/photo-1714976694867-bc0e012fab70?w=900&q=80',
  'https://images.unsplash.com/photo-1772267692484-5e54d9645e12?w=900&q=80',
  'https://images.unsplash.com/photo-1598826739205-d09823c3bc3d?w=900&q=80',
];

const S1 = [
  { emoji: '🌬️', title: 'Anxiety & Overwhelm',    desc: 'Find stillness in everyday chaos' },
  { emoji: '💙', title: 'Sadness or Low Mood',     desc: 'Lift the weight you\'ve been carrying' },
  { emoji: '💞', title: 'Relationship Challenges', desc: 'Build deeper connections' },
  { emoji: '🌱', title: 'Trauma & Healing',        desc: 'Process the past, reclaim your future' },
  { emoji: '✨', title: 'Self-Discovery',          desc: 'Know yourself on a deeper level' },
  { emoji: '🎯', title: 'Life Transitions',        desc: 'Navigate change with confidence' },
];

const S2_SESSION = [
  { emoji: '📹', title: 'Video Sessions',  desc: 'Face-to-face warmth, wherever you are' },
  { emoji: '💬', title: 'Text & Chat',     desc: 'Thoughtful conversations at your pace' },
  { emoji: '🌟', title: 'A Mix of Both',  desc: 'Video + chat — the full experience' },
];

const S2_FREQ = ['Once a week', 'Twice a week', 'Every two weeks', 'Flexible'];

const S3_GOALS = [
  'Manage anxiety', 'Improve sleep', 'Build confidence', 'Process grief',
  'Set boundaries', 'Reduce stress', 'Better relationships', 'Find purpose',
  'Overcome fear', 'Mindfulness', 'Self-esteem', 'Career transitions',
  'Heal from trauma', 'Work-life balance',
];

/* ── Compact Progress Bar ────────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div
      style={{
        position: 'sticky', top: 80, zIndex: 40,
        backgroundColor: 'rgba(250,248,244,0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${CC.softSage}`,
        padding: '12px 24px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <motion.div
                  animate={{
                    backgroundColor: step > s.id ? CC.forestSage : step === s.id ? CC.terracotta : 'transparent',
                    borderColor: step > s.id ? CC.forestSage : step === s.id ? CC.terracotta : CC.softSage,
                    scale: step === s.id ? 1.12 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {step > s.id
                    ? <CheckCircle size={13} color="white" />
                    : <span style={{ fontSize: '0.65rem', fontWeight: 700, color: step === s.id ? 'white' : CC.mutedOlive }}>{s.id}</span>
                  }
                </motion.div>
                <span style={{
                  fontSize: '0.6rem', whiteSpace: 'nowrap',
                  fontWeight: step === s.id ? 600 : 400,
                  color: step === s.id ? CC.forestSage : CC.mutedOlive,
                  letterSpacing: '0.01em',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '13px 6px 0', borderRadius: 2, backgroundColor: CC.softSage, overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: step > s.id + 1 ? '100%' : step === s.id + 1 ? '50%' : '0%' }}
                    transition={{ duration: 0.45 }}
                    style={{ height: '100%', backgroundColor: CC.forestSage, borderRadius: 2 }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Nav row ─────────────────────────────────────────────────── */
function NavRow({ onBack, onContinue, label = 'Continue', canContinue = true, loading = false }: {
  onBack?: () => void; onContinue: () => void; label?: string; canContinue?: boolean; loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
      {onBack && (
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px',
            borderRadius: 14, backgroundColor: CC.softSage, color: CC.primaryText,
            fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>
      )}
      <motion.button
        onClick={onContinue}
        disabled={!canContinue || loading}
        whileHover={canContinue && !loading ? { scale: 1.02, boxShadow: `0 10px 28px rgba(53,92,77,0.28)` } : {}}
        whileTap={canContinue && !loading ? { scale: 0.97 } : {}}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 0', borderRadius: 14,
          background: canContinue && !loading ? `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` : CC.mutedOlive,
          color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '0.9rem',
          border: 'none', cursor: canContinue && !loading ? 'pointer' : 'not-allowed',
          boxShadow: canContinue ? `0 6px 20px rgba(53,92,77,0.2)` : 'none',
        }}
      >
        {loading
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent' }} />
          : <>{label} <ArrowRight size={15} /></>
        }
      </motion.button>
    </div>
  );
}

/* ── Step shell: compact image banner + content ──────────────── */
function StepCard({ idx, question, subtext, children }: {
  idx: number; question: string; subtext: string; children: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: CC.lightIvory, boxShadow: '0 8px 40px rgba(53,92,77,0.10)' }}>
      {/* Compact photographic banner */}
      <div style={{ position: 'relative', height: 110, overflow: 'hidden' }}>
        <img
          src={STEP_IMAGES[idx]}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.05)', objectPosition: 'center 30%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(40,70,58,0.35) 0%, rgba(40,70,58,0.78) 100%)` }} />
        {/* Leaf accent */}
        <svg style={{ position: 'absolute', right: 14, top: 10, opacity: 0.18, pointerEvents: 'none' }} width="50" height="50" viewBox="0 0 60 60">
          <path d="M30 4C48 4, 58 20, 52 38 C46 56, 16 62, 8 46 C0 30, 12 4, 30 4Z" fill={CC.softSage} />
        </svg>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 20px 12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Step {idx + 1} of 4
          </p>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: 'white', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {question}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', marginTop: 2 }}>{subtext}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px 20px' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Selectable option card ──────────────────────────────────── */
function Opt({ emoji, title, desc, selected, onClick, horizontal = false }: {
  emoji: string; title: string; desc?: string;
  selected: boolean; onClick: () => void; horizontal?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      style={{
        width: '100%', textAlign: 'left',
        padding: horizontal ? '11px 14px' : '10px 13px',
        borderRadius: 14,
        backgroundColor: selected ? CC.forestSage : CC.lightIvory,
        border: `1.5px solid ${selected ? CC.forestSage : CC.softSage}`,
        boxShadow: selected ? `0 6px 18px rgba(53,92,77,0.18)` : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <span style={{ fontSize: horizontal ? '1.35rem' : '1.25rem', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: '0.82rem', color: selected ? 'white' : CC.primaryText, marginBottom: desc ? 1 : 0 }}>
          {title}
        </p>
        {desc && <p style={{ fontSize: '0.7rem', color: selected ? 'rgba(255,255,255,0.72)' : CC.mutedOlive, lineHeight: 1.4 }}>{desc}</p>}
      </div>
      {selected && (
        <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle size={11} color="white" />
        </div>
      )}
    </motion.button>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [form, setForm] = useState({ firstName: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);

  const toggleGoal = (g: string) =>
    setGoals(p => p.includes(g) ? p.filter(x => x !== g) : p.length < 5 ? [...p, g] : p);

  const step4Valid = form.firstName.trim() && form.email.includes('@') && form.password.length >= 6 && agreed;

  const finish = async () => {
    if (!step4Valid) return;
    setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        email: form.email,
        password: form.password,
        reason,
        sessionType,
        frequency,
        goals,
      });
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CC.luxuryBg, fontFamily: "'Inter', sans-serif", paddingTop: 80 }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '25%', right: '-5%', width: 320, height: 320, background: CC.softSage, opacity: 0.45, borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', left: '-4%', width: 250, height: 250, background: CC.terracotta, opacity: 0.06, borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <ProgressBar step={step} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 16px 32px', minHeight: 'calc(100vh - 148px)' }}>
        <div style={{ maxWidth: 580, width: '100%', margin: '0 auto' }}>
          <AnimatePresence mode="wait">

            {/* ── Step 1 — Why? ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.38 }}>
                <StepCard idx={0} question="What brings you here today?" subtext="Choose what resonates most — there's no wrong answer.">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {S1.map(o => (
                      <Opt key={o.title} emoji={o.emoji} title={o.title} desc={o.desc} selected={reason === o.title} onClick={() => setReason(o.title)} />
                    ))}
                  </div>
                  <NavRow onContinue={() => setStep(2)} canContinue={!!reason} />
                </StepCard>
              </motion.div>
            )}

            {/* ── Step 2 — Connection ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.38 }}>
                <StepCard idx={1} question="How would you like to connect?" subtext="You can always change this after joining.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {S2_SESSION.map(o => (
                      <Opt key={o.title} emoji={o.emoji} title={o.title} desc={o.desc} selected={sessionType === o.title} onClick={() => setSessionType(o.title)} horizontal />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: CC.primaryText, marginBottom: 8 }}>How often would you like to meet?</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {S2_FREQ.map(f => (
                      <motion.button key={f} onClick={() => setFrequency(f)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        style={{
                          padding: '7px 14px', borderRadius: 20,
                          backgroundColor: frequency === f ? CC.forestSage : CC.softSage,
                          color: frequency === f ? 'white' : CC.primaryText,
                          border: `1.5px solid ${frequency === f ? CC.forestSage : 'transparent'}`,
                          fontSize: '0.76rem', fontWeight: frequency === f ? 600 : 400, cursor: 'pointer',
                        }}
                      >{f}</motion.button>
                    ))}
                  </div>
                  <NavRow onBack={() => setStep(1)} onContinue={() => setStep(3)} canContinue={!!sessionType} />
                </StepCard>
              </motion.div>
            )}

            {/* ── Step 3 — Goals ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.38 }}>
                <StepCard idx={2} question="What matters most right now?" subtext={`Select up to 5 goals — we'll match you with the right specialist.${goals.length ? ` (${goals.length}/5)` : ''}`}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {S3_GOALS.map(g => {
                      const sel = goals.includes(g);
                      const maxed = goals.length >= 5 && !sel;
                      return (
                        <motion.button key={g} onClick={() => !maxed && toggleGoal(g)}
                          whileHover={!maxed ? { scale: 1.04 } : {}} whileTap={!maxed ? { scale: 0.96 } : {}}
                          style={{
                            padding: '7px 13px', borderRadius: 20,
                            backgroundColor: sel ? CC.forestSage : maxed ? `${CC.softSage}70` : CC.softSage,
                            color: sel ? 'white' : maxed ? `${CC.mutedOlive}80` : CC.primaryText,
                            border: `1.5px solid ${sel ? CC.forestSage : 'transparent'}`,
                            fontSize: '0.76rem', fontWeight: sel ? 600 : 400,
                            cursor: maxed ? 'default' : 'pointer',
                            boxShadow: sel ? `0 3px 10px rgba(53,92,77,0.18)` : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          {sel && <span style={{ marginRight: 3 }}>✓</span>}{g}
                        </motion.button>
                      );
                    })}
                  </div>
                  {goals.length > 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ fontSize: '0.72rem', color: CC.forestSage, fontWeight: 600, marginTop: 10 }}>
                      {goals.length === 5 ? '✨ Perfect — 5 goals selected!' : `${goals.length} goal${goals.length > 1 ? 's' : ''} selected`}
                    </motion.p>
                  )}
                  <NavRow onBack={() => setStep(2)} onContinue={() => setStep(4)} canContinue={goals.length > 0} />
                </StepCard>
              </motion.div>
            )}

            {/* ── Step 4 — Account ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.38 }}>
                <StepCard idx={3} question="Almost there — create your account." subtext="One step away from your very first session.">
                  {/* Selections summary */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {[reason, sessionType, ...goals.slice(0, 2)].filter(Boolean).map(tag => (
                      <span key={tag} style={{
                        padding: '4px 10px', borderRadius: 16, fontSize: '0.68rem', fontWeight: 600,
                        backgroundColor: `${CC.forestSage}10`, border: `1px solid ${CC.forestSage}28`, color: CC.forestSage,
                      }}>✓ {tag}</span>
                    ))}
                    {goals.length > 2 && (
                      <span style={{ padding: '4px 10px', borderRadius: 16, fontSize: '0.68rem', fontWeight: 600, backgroundColor: `${CC.terracotta}10`, border: `1px solid ${CC.terracotta}28`, color: CC.terracotta }}>
                        +{goals.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: 'First name', key: 'firstName' as const, type: 'text', ph: 'Alex' },
                      { label: 'Email address', key: 'email' as const, type: 'email', ph: 'your@email.com' },
                      { label: 'Password', key: 'password' as const, type: 'password', ph: 'At least 6 characters' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 5 }}>{f.label}</label>
                        <input
                          type={f.type} placeholder={f.ph} value={form[f.key]}
                          onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                          className="w-full outline-none"
                          style={{ padding: '11px 14px', borderRadius: 12, backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.88rem' }}
                          onFocus={e => { e.target.style.border = `1.5px solid ${CC.forestSage}`; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = `0 0 0 3px rgba(53,92,77,0.07)`; }}
                          onBlur={e => { e.target.style.border = '1.5px solid transparent'; e.target.style.backgroundColor = CC.softSage; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Agreement */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 2 }}
                    onClick={() => setAgreed(!agreed)}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      backgroundColor: agreed ? CC.forestSage : 'transparent',
                      border: `1.5px solid ${agreed ? CC.forestSage : CC.mutedOlive}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                    }}>
                      {agreed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: CC.mutedOlive, lineHeight: 1.5 }}>
                      I agree to the <span style={{ color: CC.forestSage, fontWeight: 600 }}>Terms of Service</span>,{' '}
                      <span style={{ color: CC.forestSage, fontWeight: 600 }}>Privacy Policy</span> &{' '}
                      <span style={{ color: CC.forestSage, fontWeight: 600 }}>HIPAA Agreement</span>.
                    </p>
                  </label>

                  <NavRow onBack={() => setStep(3)} onContinue={finish} label="Begin My Journey" canContinue={!!step4Valid} loading={loading} />
                </StepCard>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p style={{ color: CC.mutedOlive, fontSize: '0.82rem' }}>
              Already a member?{' '}
              <Link to="/login" style={{ color: CC.forestSage, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              {['🔒 HIPAA Compliant', '✓ SSL Encrypted', '★ 4.9 Rating'].map(t => (
                <span key={t} style={{ fontSize: '0.68rem', color: CC.mutedOlive, opacity: 0.7 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
