import { Star, ThumbsUp, MessageCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';
import { useState, useEffect } from 'react';

export function FeedbackPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState<any[]>([]);
  const [thisMonth, setThisMonth] = useState(0);
  const [saving, setSaving] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Real patient feedback from the backend
  const load = () => {
    api.get('/doctor/feedback').then(res => {
      const d = res.data;
      setReviews((d.feedback || []).map((f: any) => ({
        id: f.id,
        patient: f.patientName,
        rating: f.rating,
        date: new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        text: f.comment,
        replied: !!f.reply,
        reply: f.reply || '',
        replyBy: f.replyBy || '',
      })));
      setAvg(d.avg);
      setTotal(d.total || 0);
      // Counted server-side against real timestamps. The old client-side version
      // parsed an already-formatted date string, which silently returned 0.
      setThisMonth(d.thisMonth || 0);
      setRatingBreakdown((d.distribution || []).map((x: any) => ({ stars: `${x.star}★`, count: x.count })));
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const postReply = async (id: string) => {
    const text = replyText.trim();
    if (!text) { setReplyError('Write something before posting'); return; }
    setSaving(true);
    setReplyError('');
    try {
      await api.post(`/doctor/feedback/${id}/reply`, { reply: text });
      setReplyingTo(null);
      setReplyText('');
      load();
    } catch (e: any) {
      setReplyError(e.message || 'Could not post that reply');
    } finally { setSaving(false); }
  };

  const positiveRate = total ? Math.round((reviews.filter(r => r.rating >= 4).length / total) * 100) : 0;
  const responseRate = total ? Math.round((reviews.filter(r => r.replied).length / total) * 100) : 0;

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 20 }}>
        {/* Rating Card */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '28px', boxShadow: shadows.card, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>{avg != null ? avg : '—'}</div>
          <div style={{ display: 'flex', gap: 4, margin: '12px 0 8px' }}>
            {[1, 2, 3, 4, 5].map(s => {
              // Half-filled at the .5 boundary so 4.5 doesn't read as 5.
              const filled = avg != null && s <= Math.round(avg);
              return <Star key={s} size={20} fill={filled ? colors.warning : 'none'} color={filled ? colors.warning : colors.border} />;
            })}
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary }}>{total} total review{total === 1 ? '' : 's'}</div>
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: avg != null && avg >= 4.5 ? colors.success : colors.textMuted, marginTop: 8, fontWeight: 600 }}>
            {total === 0 ? 'No reviews yet'
              : avg! >= 4.5 ? 'Excellent standing ✓'
              : avg! >= 4 ? 'Well rated'
              : avg! >= 3 ? 'Mixed feedback'
              : 'Needs attention'}
          </div>
        </div>

        {/* Rating Chart */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '24px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Rating Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ratingBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: colors.textMuted }} />
              <YAxis dataKey="stars" type="category" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} width={35} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 12 }} />
              <Bar dataKey="count" fill={colors.warning} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '20px', boxShadow: shadows.card, border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: ThumbsUp, label: 'Positive Rate', value: `${positiveRate}%`, color: colors.success },
            { icon: MessageCircle, label: 'Response Rate', value: `${responseRate}%`, color: '#7C6FFF' },
            { icon: TrendingUp, label: 'This Month', value: `+${thisMonth}`, color: colors.primary },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Patient Reviews</h3>
        {!reviews.length && (
          <div style={{ background: colors.white, borderRadius: 20, padding: '36px 24px', border: `1px solid ${colors.border}`, textAlign: 'center', color: colors.textMuted, fontSize: 13.5, lineHeight: 1.7 }}>
            No reviews yet. Patients can rate a session from their dashboard once it's marked complete.
          </div>
        )}
        {reviews.map((review: any) => (
          <div key={review.id} style={{ background: colors.white, borderRadius: 20, padding: '24px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 14 }}>
                  {review.patient.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{review.patient}</div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} fill={s <= review.rating ? colors.warning : colors.border} color={s <= review.rating ? colors.warning : colors.border} />
                    ))}
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>{review.date}</span>
            </div>
            <p style={{ fontFamily: 'Inter', fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>{review.text}</p>

            {review.replied && (
              <div style={{ marginTop: 16, padding: '14px', borderRadius: 12, background: colors.veryLightSage, borderLeft: `3px solid ${colors.primary}` }}>
                <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.primary, marginBottom: 4 }}>{review.replyBy || 'You'} · Replied</div>
                <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, margin: 0 }}>{review.reply}</p>
              </div>
            )}

            {!review.replied && replyingTo !== review.id && (
              <button
                onClick={() => { setReplyingTo(review.id); setReplyText(''); setReplyError(''); }}
                style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, cursor: 'pointer' }}
              >
                <MessageCircle size={13} /> Reply to Review
              </button>
            )}

            {replyingTo === review.id && (
              <div style={{ marginTop: 12 }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a professional reply..."
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1.5px solid ${colors.primary}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, resize: 'none', minHeight: 80, outline: 'none', boxSizing: 'border-box' }}
                />
                {replyError && <div style={{ fontSize: 11.5, color: colors.error, marginTop: 6 }}>{replyError}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button disabled={saving} onClick={() => postReply(review.id)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Posting…' : 'Post Reply'}
                  </button>
                  <button onClick={() => { setReplyingTo(null); setReplyText(''); setReplyError(''); }} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
