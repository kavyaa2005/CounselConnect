import { useState, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Upload, FileText, X, CheckCircle, ArrowRight, ArrowLeft,
  ShieldCheck, Award, Search, AlertCircle, Sparkles, Eye, EyeOff,
} from 'lucide-react';
import { CC } from '../../lib/colors';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

const SPECIALTIES = [
  'Anxiety & Depression', 'Trauma & PTSD', 'Relationships & Couples',
  'Student & Academic Stress', 'Grief & Loss', 'Addiction & Recovery',
  'Child & Adolescent', 'Career & Life Transitions', 'Other',
];

const STEPS = [
  { id: 1, label: 'About you' },
  { id: 2, label: 'Practice' },
  { id: 3, label: 'Credentials' },
];

const MAX_MB = 8;
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp';

export function JoinAsCounselorPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    specialty: '', experience: '', qualification: '', licenseNumber: '',
    location: '', languages: '', bio: '', price: '',
  });
  const [degree, setDegree] = useState<File[]>([]);
  const [certs, setCerts] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Status lookup
  const [checkEmail, setCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const degreeInput = useRef<HTMLInputElement>(null);
  const certInput = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const addFiles = (list: FileList | null, kind: 'degree' | 'certs') => {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find(f => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setErrors(e => ({ ...e, files: `"${tooBig.name}" is larger than ${MAX_MB} MB` }));
      return;
    }
    setErrors(e => ({ ...e, files: '' }));
    if (kind === 'degree') setDegree(d => [...d, ...incoming].slice(0, 3));
    else setCerts(c => [...c, ...incoming].slice(0, 3));
  };

  const validateStep = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1) {
      const name = form.fullName.trim();
      if (!name) e.fullName = 'Please enter your full name';
      else if (name.length < 3) e.fullName = 'That name looks too short';
      else if (!/^[a-zA-Z.\-'\s]+$/.test(name)) e.fullName = 'Use letters only — no digits or symbols';

      if (!form.email.trim()) e.email = 'Please enter your email';
      else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim())) e.email = 'That email doesn\'t look right';

      // Phone is optional, but if given it must be usable for a callback.
      const digits = form.phone.replace(/\D/g, '');
      if (form.phone.trim() && (digits.length < 10 || digits.length > 15)) {
        e.phone = 'Enter a valid phone number (10–15 digits)';
      }

      if (!form.password) e.password = 'Choose a password';
      else if (form.password.length < 8) e.password = 'Use at least 8 characters';
      else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        e.password = 'Include at least one letter and one number';
      }

      if (!form.confirmPassword) e.confirmPassword = 'Re-enter your password';
      else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    }
    if (s === 2) {
      if (!form.specialty) e.specialty = 'Select your main specialty';
      if (!form.qualification.trim()) e.qualification = 'Enter your highest qualification';
      else if (form.qualification.trim().length < 2) e.qualification = 'That qualification looks too short';

      if (!form.licenseNumber.trim()) e.licenseNumber = 'Your licence / registration number is required';
      else if (form.licenseNumber.trim().length < 4) e.licenseNumber = 'Licence numbers are at least 4 characters';

      // Experience and fee are optional, but nonsense values shouldn't reach admin.
      if (form.experience.trim()) {
        const yrs = Number(form.experience);
        if (!Number.isFinite(yrs) || yrs < 0) e.experience = 'Enter experience as a number of years';
        else if (yrs > 60) e.experience = 'Please double-check — over 60 years?';
      }
      if (form.price.trim()) {
        const fee = Number(form.price);
        if (!Number.isFinite(fee) || fee < 0) e.price = 'Enter the fee as a number';
      }
      if (form.bio.trim() && form.bio.trim().length < 20) {
        e.bio = 'A short bio helps clients choose — at least 20 characters';
      }
    }
    if (s === 3) {
      if (degree.length === 0 && certs.length === 0) {
        e.files = 'Upload at least one degree or certification document';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(s => Math.min(3, s + 1)); };
  const back = () => setStep(s => Math.max(1, s - 1));

  async function submit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      degree.forEach(f => fd.append('degree', f));
      certs.forEach(f => fd.append('certifications', f));

      const res = await fetch(`${API_BASE}/applications`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Could not submit your application');
      setDone(true);
    } catch (err: any) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function lookupStatus() {
    if (!checkEmail.trim()) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${API_BASE}/applications/status?email=${encodeURIComponent(checkEmail)}`);
      const json = await res.json();
      setCheckResult(json.data);
    } catch {
      setCheckResult({ found: false });
    } finally {
      setChecking(false);
    }
  }

  const inputStyle = (err?: string) => ({
    width: '100%', padding: '13px 16px', borderRadius: 14,
    backgroundColor: err ? 'rgba(217,119,87,0.06)' : CC.softSage,
    border: `1.5px solid ${err ? CC.terracotta : 'transparent'}`,
    color: CC.primaryText, fontSize: '0.93rem', outline: 'none',
    fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' as const,
  });

  const Label = ({ children, required }: any) => (
    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 7 }}>
      {children}{required && <span style={{ color: CC.terracotta }}> *</span>}
    </label>
  );

  const Err = ({ msg }: { msg?: string }) =>
    msg ? <p style={{ color: CC.terracotta, fontSize: '0.75rem', marginTop: 5 }}>{msg}</p> : null;

  const FileRow = ({ file, onRemove }: { file: File; onRemove: () => void }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: CC.softSage }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: CC.forestSage }}>
        <FileText size={14} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '0.83rem', fontWeight: 600, color: CC.primaryText }} className="truncate">{file.name}</p>
        <p style={{ fontSize: '0.72rem', color: CC.mutedOlive }}>
          {file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / 1048576).toFixed(1)} MB`}
        </p>
      </div>
      <button onClick={onRemove} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(217,119,87,0.12)', border: 'none', cursor: 'pointer' }}>
        <X size={13} color={CC.terracotta} />
      </button>
    </div>
  );

  const Dropzone = ({ title, hint, files, onPick, inputRef, kind }: any) => (
    <div>
      <Label>{title}</Label>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl transition-colors"
        style={{
          padding: '26px 20px', border: `1.5px dashed ${CC.mutedOlive}`,
          background: CC.lightIvory, cursor: 'pointer',
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: CC.softSage }}>
          <Upload size={17} color={CC.forestSage} />
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: CC.primaryText }}>
          Click to upload
        </span>
        <span style={{ fontSize: '0.75rem', color: CC.mutedOlive, textAlign: 'center' }}>{hint}</span>
      </button>
      <input ref={inputRef} type="file" multiple accept={ACCEPTED} style={{ display: 'none' }}
        onChange={e => { onPick(e.target.files, kind); e.target.value = ''; }} />
      {files.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {files.map((f: File, i: number) => (
            <FileRow key={i} file={f}
              onRemove={() => kind === 'degree'
                ? setDegree(d => d.filter((_, j) => j !== i))
                : setCerts(c => c.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}
    </div>
  );

  /* ══════════ success ══════════ */
  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: CC.luxuryBg, paddingTop: 110, paddingBottom: 60 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mx-auto text-center px-6"
          style={{ maxWidth: 560 }}
        >
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6"
            style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
            <CheckCircle size={34} color="white" />
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '2rem', color: CC.primaryText }}>
            Application received
          </h1>
          <p style={{ color: CC.mutedOlive, marginTop: 12, fontSize: '1rem', lineHeight: 1.6 }}>
            Thank you, {form.fullName.split(' ')[0]}. Our team will verify your credentials and get back to you
            by email. Most reviews are completed within 2–3 working days.
          </p>

          <div className="rounded-2xl p-5 mt-8 text-left" style={{ background: 'white', border: `1px solid ${CC.softSage}` }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: CC.primaryText, marginBottom: 10 }}>What happens next</p>
            {[
              'An admin reviews the degree and certification documents you uploaded.',
              'Once approved, your counselor account is activated immediately.',
              `Sign in at any time with ${form.email} and the password you just chose.`,
            ].map((t, i) => (
              <div key={i} className="flex gap-3 mb-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: CC.softSage, fontSize: '0.7rem', fontWeight: 700, color: CC.forestSage }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: '0.85rem', color: CC.mutedOlive, lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>

          <Link to="/" className="inline-block mt-8 px-6 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, textDecoration: 'none' }}>
            Back to home
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ══════════ form ══════════ */
  return (
    <div style={{ minHeight: '100vh', background: CC.luxuryBg, paddingTop: 104, paddingBottom: 60 }}>
      <div className="px-6 mx-auto" style={{ maxWidth: 1080 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: CC.softSage }}>
            <Sparkles size={13} color={CC.terracotta} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: CC.forestSage, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              For mental health professionals
            </span>
          </span>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', color: CC.primaryText, lineHeight: 1.15 }}>
            Join CounselConnect as a<br />
            <span style={{ color: CC.forestSage }}>verified counselor</span>
          </h1>
          <p style={{ color: CC.mutedOlive, marginTop: 12, fontSize: '1rem', maxWidth: 520, margin: '12px auto 0' }}>
            Every counselor on the platform is credential-checked by our team. Share your qualifications
            and we'll take it from there.
          </p>
        </motion.div>

        <div className="grid gap-8" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)' }}>

          {/* ── Form card ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl"
            style={{ background: 'white', border: `1px solid ${CC.softSage}`, boxShadow: '0 4px 28px rgba(0,0,0,0.05)', padding: '32px 34px' }}>

            {/* Step rail */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: step >= s.id ? CC.forestSage : CC.softSage,
                        color: step >= s.id ? 'white' : CC.mutedOlive,
                        fontSize: '0.8rem', fontWeight: 700,
                      }}>
                      {step > s.id ? <CheckCircle size={15} /> : s.id}
                    </div>
                    <span className="hidden sm:block" style={{
                      fontSize: '0.8rem', fontWeight: step === s.id ? 700 : 500,
                      color: step >= s.id ? CC.primaryText : CC.mutedOlive,
                    }}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: step > s.id ? CC.forestSage : CC.softSage, borderRadius: 2 }} />
                  )}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1 */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="mb-4">
                    <Label required>Full name</Label>
                    <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                      placeholder="e.g. Dr. Ananya Rao" style={inputStyle(errors.fullName)} />
                    <Err msg={errors.fullName} />
                  </div>
                  <div className="mb-4">
                    <Label required>Email address</Label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="you@clinic.com" style={inputStyle(errors.email)} />
                    <Err msg={errors.email} />
                    <p style={{ fontSize: '0.73rem', color: CC.mutedOlive, marginTop: 5 }}>
                      You'll sign in with this once approved.
                    </p>
                  </div>
                  <div className="mb-4">
                    <Label>Phone</Label>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="+91 98765 43210" style={inputStyle()} />
                  </div>
                  <div className="mb-4">
                    <Label required>Create a password</Label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="At least 6 characters"
                        style={{ ...inputStyle(errors.password), paddingRight: 48 }} />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {showPass ? <EyeOff size={16} color={CC.mutedOlive} /> : <Eye size={16} color={CC.mutedOlive} />}
                      </button>
                    </div>
                    <Err msg={errors.password} />
                  </div>

                  <div>
                    <Label required>Confirm password</Label>
                    <input type={showPass ? 'text' : 'password'} value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      style={inputStyle(errors.confirmPassword)} />
                    <Err msg={errors.confirmPassword} />
                  </div>
                </motion.div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="mb-4">
                    <Label required>Main specialty</Label>
                    <select value={form.specialty} onChange={e => set('specialty', e.target.value)}
                      style={{ ...inputStyle(errors.specialty), cursor: 'pointer' }}>
                      <option value="">Select a specialty…</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Err msg={errors.specialty} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label required>Highest qualification</Label>
                      <input value={form.qualification} onChange={e => set('qualification', e.target.value)}
                        placeholder="M.Phil Clinical Psychology" style={inputStyle(errors.qualification)} />
                      <Err msg={errors.qualification} />
                    </div>
                    <div>
                      <Label>Years of experience</Label>
                      <input value={form.experience} onChange={e => set('experience', e.target.value)}
                        placeholder="7 years" style={inputStyle()} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label required>Licence / registration number</Label>
                    <input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)}
                      placeholder="e.g. RCI-A-45219" style={inputStyle(errors.licenseNumber)} />
                    <Err msg={errors.licenseNumber} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Location</Label>
                      <input value={form.location} onChange={e => set('location', e.target.value)}
                        placeholder="Bengaluru, IN" style={inputStyle()} />
                    </div>
                    <div>
                      <Label>Session fee (USD)</Label>
                      <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                        placeholder="70" style={inputStyle()} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>Languages spoken</Label>
                    <input value={form.languages} onChange={e => set('languages', e.target.value)}
                      placeholder="English, Hindi, Kannada" style={inputStyle()} />
                  </div>
                  <div className="mb-4">
                    <Label>Short bio</Label>
                    <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
                      placeholder="Tell clients about your approach…"
                      style={{ ...inputStyle(), resize: 'none' }} />
                  </div>
                </motion.div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="rounded-2xl p-4 mb-5 flex gap-3" style={{ background: CC.softSage }}>
                    <ShieldCheck size={18} color={CC.forestSage} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.82rem', color: CC.primaryText, lineHeight: 1.55 }}>
                      Your documents are stored privately and are only ever visible to our verification team.
                      They are never shown to clients or other counselors.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5">
                    <Dropzone
                      title="Degree certificate"
                      hint={`PDF, JPG, PNG or WEBP · up to ${MAX_MB} MB · max 3 files`}
                      files={degree} onPick={addFiles} inputRef={degreeInput} kind="degree"
                    />
                    <Dropzone
                      title="Professional certifications & licence"
                      hint="Licence certificate, specialised training, memberships"
                      files={certs} onPick={addFiles} inputRef={certInput} kind="certs"
                    />
                  </div>
                  <Err msg={errors.files} />

                  {serverError && (
                    <div className="rounded-2xl p-4 mt-5 flex gap-3" style={{ background: 'rgba(217,119,87,0.08)', border: `1px solid ${CC.terracotta}44` }}>
                      <AlertCircle size={17} color={CC.terracotta} style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: '0.85rem', color: '#B44A28' }}>{serverError}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav */}
            <div className="flex gap-3 mt-7">
              {step > 1 && (
                <button onClick={back}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: CC.softSage, color: CC.primaryText, border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={next}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: 'pointer' }}>
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button onClick={submit} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{
                    background: submitting ? CC.mutedOlive : `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`,
                    border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting ? 'Submitting…' : <>Submit application <ArrowRight size={15} /></>}
                </button>
              )}
            </div>
          </motion.div>

          {/* ── Side column ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="flex flex-col gap-5">

            <div className="rounded-3xl p-6" style={{ background: 'white', border: `1px solid ${CC.softSage}` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
                <Award size={19} color="white" />
              </div>
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                Why we verify
              </h3>
              <p style={{ fontSize: '0.86rem', color: CC.mutedOlive, marginTop: 8, lineHeight: 1.6 }}>
                Our clients are often reaching out at a vulnerable moment. Checking every counselor's
                qualifications is how we keep that trust — and it's why clients choose the platform.
              </p>
              <div className="flex flex-col gap-2.5 mt-5">
                {['Degree certificate', 'Professional licence number', 'Any specialised training'].map(t => (
                  <div key={t} className="flex items-center gap-2.5">
                    <CheckCircle size={14} color={CC.forestSage} />
                    <span style={{ fontSize: '0.83rem', color: CC.primaryText }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status checker */}
            <div className="rounded-3xl p-6" style={{ background: 'white', border: `1px solid ${CC.softSage}` }}>
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: CC.primaryText }}>
                Already applied?
              </h3>
              <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginTop: 6, marginBottom: 12 }}>
                Check where your application stands.
              </p>
              <div className="flex gap-2">
                <input value={checkEmail} onChange={e => setCheckEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupStatus()}
                  placeholder="your@email.com"
                  style={{ ...inputStyle(), padding: '10px 14px', fontSize: '0.85rem' }} />
                <button onClick={lookupStatus} disabled={checking}
                  className="px-4 rounded-xl shrink-0"
                  style={{ background: CC.forestSage, border: 'none', cursor: 'pointer' }}>
                  <Search size={15} color="white" />
                </button>
              </div>

              {checkResult && (
                <div className="mt-4 p-3.5 rounded-xl" style={{ background: CC.softSage }}>
                  {!checkResult.found ? (
                    <p style={{ fontSize: '0.83rem', color: CC.mutedOlive }}>
                      No application found for that email.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{
                          background: checkResult.status === 'approved' ? '#22c55e'
                            : checkResult.status === 'rejected' ? CC.terracotta : '#F59E0B',
                        }} />
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: CC.primaryText, textTransform: 'capitalize' }}>
                          {checkResult.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, marginTop: 5 }}>
                        {checkResult.status === 'pending' && 'Your credentials are being reviewed.'}
                        {checkResult.status === 'approved' && 'You can sign in now with your email and password.'}
                        {checkResult.status === 'rejected' && (checkResult.reviewNote || 'Please contact support for details.')}
                      </p>
                      {checkResult.status === 'approved' && (
                        <Link to="/login" style={{ fontSize: '0.8rem', fontWeight: 700, color: CC.forestSage, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
                          Go to sign in →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl p-5 flex items-center gap-3" style={{ background: CC.softSage }}>
              <Heart size={16} color={CC.forestSage} />
              <p style={{ fontSize: '0.8rem', color: CC.primaryText }}>
                Looking for support instead?{' '}
                <Link to="/register" style={{ color: CC.forestSage, fontWeight: 700, textDecoration: 'none' }}>
                  Sign up as a client
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
