import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MessageCircle, Mail, BookOpen, Video, Bug, HelpCircle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { colors as staticColors } from '../colors';

const faqs = [
  { q: 'How do I reschedule a patient appointment?', a: 'Go to Appointments → find the appointment → click the more options button (⋮) → select Reschedule. You can then pick a new time from available slots.' },
  { q: 'How do I enable Two-Factor Authentication?', a: 'Navigate to Settings → Security → Two-Factor Authentication. Scan the QR code with your authenticator app, then enter the 6-digit verification code.' },
  { q: 'How does the AI risk detection work?', a: 'Our AI continuously analyzes patient mood entries, session notes, and behavioral patterns to detect early warning signs of crisis, burnout, or relapse. Alerts appear in your AI Assistant panel.' },
  { q: 'Can patients see my private session notes?', a: 'No. Notes marked as Private are only visible to you. Notes marked as Shared can be viewed by the patient through their portal.' },
  { q: 'How do I export patient reports?', a: 'Go to Reports → select the patient and date range → click the Export button. You can choose PDF, Excel, or CSV formats.' },
  { q: 'How do I set up Google Calendar sync?', a: 'Go to Settings → Connected Apps → Google Calendar → click Connect. Sign in with your Google account to enable two-way calendar sync.' },
];

const supportCards = [
  { icon: MessageCircle, title: 'Live Chat', desc: 'Chat with support now', badge: 'Online', color: staticColors.primary },
  { icon: Mail, title: 'Email Support', desc: 'support@counselconnect.com', badge: null, color: '#7C6FFF' },
  { icon: Video, title: 'Video Tutorial', desc: 'Watch how-to guides', badge: '24 videos', color: staticColors.warning },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Browse documentation', badge: '180+ articles', color: staticColors.success },
];

export function HelpPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketText, setTicketText] = useState('');
  const [category, setCategory] = useState('');

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Hero Search */}
      <div style={{
        background: `linear-gradient(135deg, #2D4A3E, ${colors.primary})`,
        borderRadius: 24, padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <h2 style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: 800, color: 'white', margin: 0, marginBottom: 8 }}>How can we help you?</h2>
        <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: 0, marginBottom: 24 }}>Search our knowledge base or browse FAQs below</p>
        <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            placeholder="Search for help..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 20px 14px 44px', borderRadius: 14, border: 'none', fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box', boxShadow: shadows.modal }}
          />
        </div>
      </div>

      {/* Support Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {supportCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              style={{ background: colors.white, borderRadius: 18, padding: '20px', boxShadow: shadows.card, border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.hover; (e.currentTarget as HTMLDivElement).style.borderColor = card.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card; (e.currentTarget as HTMLDivElement).style.borderColor = colors.border; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, marginBottom: 14 }}>
                <Icon size={20} />
              </div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 4 }}>{card.title}</h4>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, margin: 0, marginBottom: card.badge ? 10 : 0 }}>{card.desc}</p>
              {card.badge && (
                <span style={{ padding: '3px 8px', borderRadius: 8, background: `${card.color}15`, color: card.color, fontSize: 11, fontWeight: 600 }}>{card.badge}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQs & Ticket */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* FAQs */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '24px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredFaqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < filteredFaqs.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}
                >
                  <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: colors.textPrimary, flex: 1 }}>{faq.q}</span>
                  {openFaq === i ? <ChevronDown size={16} color={colors.primary} /> : <ChevronRight size={16} color={colors.textMuted} />}
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: 16 }}>
                    <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Ticket */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '24px', boxShadow: shadows.card, border: `1px solid ${colors.border}`, height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Bug size={18} color={colors.primary} />
            <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Report an Issue</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                <option value="">Select category</option>
                {['Technical Issue', 'Billing', 'Feature Request', 'Patient Concern', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Description</label>
              <textarea
                value={ticketText}
                onChange={e => setTicketText(e.target.value)}
                placeholder="Describe your issue in detail..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, resize: 'vertical', minHeight: 100, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button style={{ width: '100%', padding: '11px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Submit Ticket
            </button>
          </div>
          <div style={{ marginTop: 20, padding: '12px', borderRadius: 12, background: colors.veryLightSage }}>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, margin: 0 }}>
              Average response time: <strong style={{ color: colors.primary }}>2–4 hours</strong> during business hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
