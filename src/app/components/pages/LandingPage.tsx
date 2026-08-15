import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, useInView } from 'motion/react';
import {
  ArrowRight, Star, Heart, Shield, Sparkles, Brain, Calendar,
  MessageCircle, TrendingUp, CheckCircle, ChevronRight, Play, ShieldCheck
} from 'lucide-react';
import { CC } from '../../lib/colors';
import { fileUrl } from '../../lib/api';

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: 'easeOut' },
};

function AnimatedStat({ end, suffix, label }: { end: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: CC.forestSage }}>
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm" style={{ color: CC.mutedOlive, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

const counselors = [
  {
    name: 'Dr. Sarah Chen', specialty: 'Anxiety & Depression', rating: 4.9, sessions: 1240,
    image: 'https://images.unsplash.com/photo-1573495804664-b1c0849525af?w=300&h=300&fit=crop&crop=face',
    badge: 'Top Rated',
  },
  {
    name: 'Dr. Marcus Wells', specialty: 'Trauma & PTSD', rating: 4.8, sessions: 980,
    image: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7b5c1?w=300&h=300&fit=crop&crop=face',
    badge: 'Expert',
  },
  {
    name: 'Dr. Amara Osei', specialty: 'Stress & Burnout', rating: 5.0, sessions: 760,
    image: 'https://images.unsplash.com/photo-1714976694810-85add1a29c96?w=300&h=300&fit=crop&crop=face',
    badge: 'New',
  },
];

const testimonials = [
  {
    name: 'Priya S.', role: 'Graduate Student',
    text: 'CounselConnect changed my life. The AI matching found me exactly the right counselor on the first try. I went from constant anxiety to feeling genuinely at peace.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1767884022240-b91fb555495a?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'James R.', role: 'Software Engineer',
    text: 'The mood tracking and journey timeline gave me real insight into my mental health patterns. My counselor uses the AI insights to personalize every session.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1526779259212-939e64788e3c?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'Layla M.', role: 'Teacher',
    text: 'I was hesitant at first, but the platform feels so warm and safe. The video sessions are seamless and Dr. Chen has been incredibly supportive through a tough year.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1771280686640-292260224fbd?w=80&h=80&fit=crop&crop=face',
  },
];

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Matching',
    desc: 'Our intelligent algorithm analyzes your unique needs, preferences, and goals to connect you with the ideal counselor within minutes.',
    color: CC.forestSage,
  },
  {
    icon: Activity,
    title: 'Mood Journey Tracking',
    desc: 'Visualize your emotional wellness progress with beautiful charts, daily check-ins, and AI-generated insights personalized to you.',
    color: CC.terracotta,
  },
  {
    icon: Video,
    title: 'Premium Video Sessions',
    desc: 'Crystal-clear video consultations from the comfort of your space — secure, private, and as effective as in-person therapy.',
    color: CC.darkForest,
  },
  {
    icon: Shield,
    title: 'Complete Privacy',
    desc: 'End-to-end encrypted sessions, HIPAA-compliant storage, and zero data sharing. Your journey stays truly yours.',
    color: CC.mutedOlive,
  },
];

// Dummy icon imports used in features
function Video({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
function Activity({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function WaveDivider({ fill, bg }: { fill: string; bg: string }) {
  return (
    <div style={{ backgroundColor: bg }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full block" style={{ height: 80, fill }}>
        <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,20 L1440,80 L0,80 Z" />
      </svg>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: CC.luxuryBg, color: CC.primaryText, fontFamily: "'Inter', sans-serif" }}>
      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${CC.darkForest} 0%, ${CC.forestSage} 60%, #4a7c68 100%)` }}
      >
        {/* Decorative organic blobs */}
        <div
          className="absolute top-20 right-0 w-96 h-96 opacity-10 rounded-full"
          style={{ background: CC.softSage, filter: 'blur(60px)', transform: 'translate(20%, -10%)' }}
        />
        <div
          className="absolute bottom-10 left-0 w-80 h-80 opacity-15 rounded-full"
          style={{ background: CC.terracotta, filter: 'blur(50px)', transform: 'translate(-30%, 20%)' }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Sparkles size={14} color={CC.terracotta} />
                <span className="text-sm text-white opacity-90" style={{ fontWeight: 500 }}>
                  AI-Powered Mental Wellness Platform
                </span>
              </motion.div>

              <h1
                className="mb-6 leading-tight"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                  color: 'white',
                  lineHeight: 1.15,
                }}
              >
                Your Safe Space For Growth, Healing, and Meaningful{' '}
                <span style={{ color: '#f0b89a' }}>Conversations.</span>
              </h1>

              <p className="text-lg mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
                Connect with experienced counselors, track your emotional wellness journey,
                and receive personalized support through AI-powered guidance.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <motion.button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-2 px-8 py-4 rounded-full text-white"
                  style={{ background: `linear-gradient(135deg, ${CC.terracotta}, #c4623e)`, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '1rem' }}
                  whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(217,119,87,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Your Journey
                  <ArrowRight size={18} />
                </motion.button>

                <motion.button
                  onClick={() => navigate('/dashboard/find-counselor')}
                  className="flex items-center gap-2 px-8 py-4 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '1rem' }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Find My Counselor
                </motion.button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6">
                {[
                  { icon: Shield, text: 'HIPAA Compliant' },
                  { icon: CheckCircle, text: 'Verified Counselors' },
                  { icon: Star, text: '4.9 / 5 Rating' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon size={16} color={CC.softSage} />
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontWeight: 500 }}>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right – hero image */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Main image */}
                <div
                  className="rounded-3xl overflow-hidden"
                  style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.35)' }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1714976694867-bc0e012fab70?w=700&h=560&fit=crop"
                    alt="Counseling session"
                    className="w-full object-cover"
                    style={{ height: 480 }}
                  />
                  <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(40,70,58,0.3))' }} />
                </div>

                {/* Floating card 1 */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-6 -left-8 px-5 py-4 rounded-2xl"
                  style={{ backgroundColor: CC.lightIvory, boxShadow: '0 16px 40px rgba(0,0,0,0.15)', minWidth: 180 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: CC.softSage }}>
                      <Heart size={18} color={CC.forestSage} fill={CC.forestSage} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', color: CC.forestSage, fontFamily: "'Poppins', sans-serif" }}>98%</p>
                      <p style={{ fontSize: '0.72rem', color: CC.mutedOlive, fontWeight: 500 }}>Satisfaction Rate</p>
                    </div>
                  </div>
                </motion.div>

                {/* Floating card 2 */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -top-6 -right-6 px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: CC.terracotta, boxShadow: '0 12px 30px rgba(217,119,87,0.4)', color: 'white' }}
                >
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif" }}>12,000+</p>
                  <p style={{ fontSize: '0.7rem', opacity: 0.85 }}>Students Helped</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full block" style={{ height: 80, fill: CC.luxuryBg }}>
            <path d="M0,60 C480,0 960,80 1440,30 L1440,80 L0,80 Z" />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20" style={{ backgroundColor: CC.luxuryBg }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-10"
          >
            <AnimatedStat end={12000} suffix="+" label="Students Supported" />
            <AnimatedStat end={500} suffix="+" label="Verified Counselors" />
            <AnimatedStat end={98} suffix="%" label="Satisfaction Rate" />
            <AnimatedStat end={50000} suffix="+" label="Sessions Completed" />
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24" style={{ backgroundColor: CC.softSage }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: CC.terracotta, backgroundColor: 'rgba(217,119,87,0.1)', fontWeight: 600 }}>
              Why CounselConnect
            </span>
            <h2 className="mt-4" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', color: CC.primaryText }}>
              Everything you need to heal and grow
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-base" style={{ color: CC.mutedOlive, lineHeight: 1.7 }}>
              A holistic wellness platform built with care, expertise, and the technology to support your unique journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="p-7 rounded-3xl cursor-pointer"
                  style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${f.color}15` }}
                  >
                    <Icon size={22} color={f.color} />
                  </div>
                  <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText, marginBottom: 10 }}>
                    {f.title}
                  </h3>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', lineHeight: 1.7 }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <WaveDivider fill={CC.luxuryBg} bg={CC.softSage} />

      {/* ── HOW IT WORKS ── */}
      <section className="py-24" style={{ backgroundColor: CC.luxuryBg }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: CC.forestSage, backgroundColor: CC.softSage, fontWeight: 600 }}>
              Your Journey
            </span>
            <h2 className="mt-4" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', color: CC.primaryText }}>
              Start healing in 3 simple steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Tell us about yourself', desc: 'Complete a brief wellness assessment so our AI understands your unique needs, preferences, and goals.', color: CC.terracotta },
              { step: '02', title: 'Get matched instantly', desc: 'Our AI analyzes thousands of data points to recommend the perfect counselors tailored specifically for you.', color: CC.forestSage },
              { step: '03', title: 'Begin your journey', desc: 'Book sessions, track your mood, exchange messages, and watch your personal growth unfold over time.', color: CC.darkForest },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="mb-5">
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '3rem', color: `${item.color}25` }}>
                    {item.step}
                  </span>
                </div>
                <div className="w-12 h-1 rounded-full mb-4" style={{ backgroundColor: item.color }} />
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: CC.primaryText, marginBottom: 12 }}>
                  {item.title}
                </h3>
                <p style={{ color: CC.mutedOlive, lineHeight: 1.7, fontSize: '0.9rem' }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COUNSELORS ── */}
      <section className="py-24" style={{ backgroundColor: CC.lightIvory }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6"
          >
            <div>
              <span className="text-xs uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: CC.terracotta, backgroundColor: 'rgba(217,119,87,0.1)', fontWeight: 600 }}>
                Expert Team
              </span>
              <h2 className="mt-4" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: CC.primaryText }}>
                Meet our counselors
              </h2>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/appointments'}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm"
              style={{ border: `1.5px solid ${CC.forestSage}`, color: CC.forestSage, fontWeight: 600 }}
            >
              View All Counselors <ChevronRight size={16} />
            </button>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {counselors.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ scale: 1.02, y: -6 }}
                className="rounded-3xl overflow-hidden cursor-pointer"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 8px 32px rgba(53,92,77,0.08)' }}
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={fileUrl(c.image)} alt={c.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(35,49,45,0.6))' }} />
                  <span
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: CC.terracotta, fontWeight: 600 }}
                  >
                    {c.badge}
                  </span>
                </div>
                <div className="p-6">
                  <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: CC.primaryText }}>{c.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: CC.mutedOlive }}>{c.specialty}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5">
                      <Star size={14} fill={CC.terracotta} color={CC.terracotta} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: CC.primaryText }}>{c.rating}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: CC.mutedOlive }}>{c.sessions.toLocaleString()} sessions</span>
                  </div>
                  <motion.button
                    className="mt-4 w-full py-2.5 rounded-xl text-sm text-white"
                    style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.href = '/dashboard/appointments'}
                  >
                    Book Session
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24" style={{ backgroundColor: CC.softSage }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="text-center mb-14"
          >
            <span className="text-xs uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: CC.forestSage, backgroundColor: 'rgba(53,92,77,0.1)', fontWeight: 600 }}>
              Success Stories
            </span>
            <h2 className="mt-4" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: CC.primaryText }}>
              Lives transformed
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={16} fill={CC.terracotta} color={CC.terracotta} />
                  ))}
                </div>
                <p style={{ color: CC.primaryText, lineHeight: 1.75, fontSize: '0.95rem', marginBottom: 20 }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-xl object-cover" />
                  <div>
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{t.name}</p>
                    <p style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider fill={CC.luxuryBg} bg={CC.softSage} />

      {/* ── MOOD TRACKER PREVIEW ── */}
      <section className="py-24" style={{ backgroundColor: CC.luxuryBg }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Preview UI */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              className="order-2 lg:order-1"
            >
              <div
                className="rounded-3xl p-6 overflow-hidden"
                style={{ backgroundColor: CC.darkForest, boxShadow: '0 24px 64px rgba(40,70,58,0.3)' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>Mood Journey</p>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.8rem' }}>This week's emotional landscape</p>
                  </div>
                  <TrendingUp size={20} color={CC.terracotta} />
                </div>

                {/* Fake mood bar chart */}
                <div className="flex items-end gap-2 h-32 mb-4">
                  {[65, 72, 58, 80, 75, 88, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: false }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="flex-1 rounded-t-lg"
                      style={{ background: i === 6 ? CC.terracotta : `rgba(232,240,232,0.3)` }}
                    />
                  ))}
                </div>
                <div className="flex gap-2 justify-around">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <span key={d} style={{ color: CC.mutedOlive, fontSize: '0.7rem' }}>{d}</span>
                  ))}
                </div>

                <div
                  className="mt-5 p-4 rounded-2xl flex items-center gap-3"
                  style={{ backgroundColor: 'rgba(217,119,87,0.15)' }}
                >
                  <Sparkles size={18} color={CC.terracotta} />
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ fontWeight: 600, color: CC.terracotta }}>AI Insight: </span>
                    Your mood has improved 27% this week. Great progress!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              className="order-1 lg:order-2"
            >
              <span className="text-xs uppercase tracking-widest px-4 py-2 rounded-full" style={{ color: CC.terracotta, backgroundColor: 'rgba(217,119,87,0.1)', fontWeight: 600 }}>
                Mood Tracking
              </span>
              <h2 className="mt-5 mb-5" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: CC.primaryText }}>
                Understand your emotional patterns
              </h2>
              <p style={{ color: CC.mutedOlive, lineHeight: 1.8, marginBottom: 24 }}>
                Daily mood check-ins build a rich picture of your emotional journey. AI analyzes your patterns to surface insights your counselor uses to personalize your care.
              </p>
              {[
                'Daily mood check-ins with emoji emotion selector',
                'Beautiful weekly and monthly trend charts',
                'AI-powered patterns & recommendations',
                'Growth badges and milestone rewards',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 mb-3">
                  <CheckCircle size={16} color={CC.forestSage} />
                  <span style={{ color: CC.primaryText, fontSize: '0.9rem' }}>{item}</span>
                </div>
              ))}
              <motion.button
                onClick={() => window.location.href = '/register'}
                className="mt-8 px-8 py-4 rounded-full text-white flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                whileHover={{ scale: 1.04, boxShadow: `0 12px 32px rgba(53,92,77,0.25)` }}
                whileTap={{ scale: 0.97 }}
              >
                Start Tracking <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20" style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
          >
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: 'white', marginBottom: 16 }}>
              Your journey to wellness starts today
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', marginBottom: 36, lineHeight: 1.7 }}>
              Join 12,000+ students who are healing, growing, and thriving with CounselConnect.
            </p>
            <motion.button
              onClick={() => window.location.href = '/register'}
              className="px-10 py-4 rounded-full text-lg"
              style={{ backgroundColor: CC.terracotta, color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
              whileHover={{ scale: 1.05, boxShadow: '0 16px 40px rgba(217,119,87,0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              Begin Your Journey — It's Free
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── FOR COUNSELORS ── */}
      <section className="py-20" style={{ backgroundColor: CC.lightIvory }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl overflow-hidden"
            style={{ border: `1px solid ${CC.softSage}`, backgroundColor: 'white' }}
          >
            <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)' }}>
              <div style={{ padding: '44px 44px 44px 44px' }}>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                  style={{ backgroundColor: CC.softSage }}>
                  <ShieldCheck size={13} color={CC.forestSage} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: CC.forestSage, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    For professionals
                  </span>
                </span>

                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', color: CC.primaryText, lineHeight: 1.2 }}>
                  Are you a counselor?
                </h2>
                <p style={{ color: CC.mutedOlive, fontSize: '1rem', marginTop: 12, lineHeight: 1.65, maxWidth: 460 }}>
                  Apply to join our verified network. Upload your degree and certifications, and our team
                  reviews every application before approval — so clients always know who they're talking to.
                </p>

                <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-6">
                  {['Credential-verified', 'Set your own fee', 'Built-in video sessions'].map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <CheckCircle size={14} color={CC.forestSage} />
                      <span style={{ fontSize: '0.86rem', color: CC.primaryText }}>{t}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={() => window.location.href = '/join-as-counselor'}
                  className="mt-8 px-7 py-3.5 rounded-full inline-flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`,
                    color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600,
                    fontSize: '0.95rem', border: 'none', cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.04, boxShadow: '0 14px 34px rgba(53,92,77,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Apply to join <ArrowRight size={16} />
                </motion.button>
              </div>

              <div className="hidden md:block relative" style={{ backgroundColor: CC.softSage, minHeight: 300 }}>
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80"
                  alt="A counselor at work"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${CC.forestSage}22, transparent)` }} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-14" style={{ backgroundColor: CC.primaryText }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: CC.terracotta }}>
                  <Heart size={15} fill="white" color="white" />
                </div>
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: 'white' }}>CounselConnect</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                Connect. Heal. Grow. A premium mental wellness platform for students worldwide.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Find Counselor', 'Mood Tracker', 'Video Sessions', 'AI Matching'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Press'] },
              { title: 'Support', links: ['Help Center', 'Privacy Policy', 'Terms of Service', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>{col.title}</p>
                {col.links.map(link => (
                  <p key={link} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginBottom: 8, cursor: 'pointer' }}>{link}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>© 2026 CounselConnect. All rights reserved.</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Made with care for mental wellness.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
