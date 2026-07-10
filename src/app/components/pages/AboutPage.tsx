import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Heart, Shield, Star, Users, ArrowRight } from 'lucide-react';
import { CC } from '../../lib/colors';

const team = [
  { name: 'Dr. Maya Patel',  role: 'Chief Wellness Officer',  avatar: 'https://images.unsplash.com/photo-1573495804664-b1c0849525af?w=200&h=200&fit=crop&crop=face' },
  { name: 'James Osei',      role: 'Head of AI & Matching',   avatar: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7b5c1?w=200&h=200&fit=crop&crop=face' },
  { name: 'Anika Laurent',   role: 'Lead Counselor Network',  avatar: 'https://images.unsplash.com/photo-1714976694810-85add1a29c96?w=200&h=200&fit=crop&crop=face' },
];

const values = [
  { icon: Heart,  title: 'Compassion First',  desc: 'Every decision we make is guided by genuine care for your wellbeing and long-term growth.' },
  { icon: Shield, title: 'Complete Privacy',   desc: 'HIPAA-compliant, end-to-end encrypted, and built from day one with privacy as the foundation.' },
  { icon: Star,   title: 'Excellence Always', desc: 'We hold our counselors and technology to the highest standards of quality and safety.' },
  { icon: Users,  title: 'Human Connection', desc: 'Technology enhances human relationships — it never replaces them. That\'s our guiding principle.' },
];

export function AboutPage() {
  const navigate = useNavigate();
  return (
    <div style={{ backgroundColor: CC.luxuryBg, fontFamily: "'Inter', sans-serif" }}>
      {/* Hero */}
      <section style={{ padding: '130px 24px 100px', background: `linear-gradient(145deg, ${CC.darkForest}, ${CC.forestSage})`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="https://images.unsplash.com/photo-1778694276998-4cfd1f84bfe1?w=1920&q=60" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12 }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, rgba(40,70,58,0.93), rgba(53,92,77,0.88))` }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <span style={{ color: CC.terracotta, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Our Story</span>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,3rem)', color: 'white', margin: '16px 0', lineHeight: 1.2 }}>
            Building a world where everyone has access to meaningful mental wellness support.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', lineHeight: 1.7 }}>
            CounselConnect was founded on a simple belief: professional mental health support should be warm, accessible, and beautifully designed.
          </p>
        </motion.div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ display: 'block', height: 60, fill: CC.luxuryBg, width: '100%' }}>
            <path d="M0,40 C480,0 960,60 1440,20 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: CC.primaryText }}>What we stand for</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div key={v.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} transition={{ delay: i * 0.1 }}
                  style={{ padding: '24px', borderRadius: 24, backgroundColor: CC.lightIvory, boxShadow: '0 4px 20px rgba(53,92,77,0.06)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: `${CC.forestSage}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={20} color={CC.forestSage} />
                  </div>
                  <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 8 }}>{v.title}</h3>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', lineHeight: 1.7 }}>{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '60px 24px 100px', backgroundColor: CC.softSage }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: CC.primaryText }}>The team behind the mission</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {team.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.2 }} transition={{ delay: i * 0.12 }}
                style={{ padding: 24, borderRadius: 24, backgroundColor: CC.lightIvory, textAlign: 'center' }}>
                <img src={m.avatar} alt={m.name} style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', margin: '0 auto 16px' }} />
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText }}>{m.name}</p>
                <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginTop: 4 }}>{m.role}</p>
              </motion.div>
            ))}
          </div>
          <motion.button onClick={() => navigate('/register')} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }}
            whileHover={{ scale: 1.04, boxShadow: `0 12px 30px rgba(53,92,77,0.25)` }}
            style={{ marginTop: 48, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px', borderRadius: 40, background: `linear-gradient(135deg,${CC.forestSage},${CC.darkForest})`, color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            Join CounselConnect <ArrowRight size={18} />
          </motion.button>
        </div>
      </section>
    </div>
  );
}
