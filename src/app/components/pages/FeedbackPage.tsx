import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, MessageSquareHeart, CheckCircle, Loader2, AlertCircle,
  EyeOff, Send, X, Calendar,
} from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const RATING_WORDS: Record<number, string> = {
  1: 'Not helpful',
  2: 'Could be better',
  3: 'It was okay',
  4: 'Really helpful',
  5: 'Exceptional',
};

function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          disabled={!onChange}
          style={{ background: 'none', border: 'none', padding: 0, cursor: onChange ? 'pointer' : 'default', lineHeight: 0 }}
        >
          <Star size={size}
            fill={n <= shown ? CC.terracotta : 'none'}
            color={n <= shown ? CC.terracotta : CC.mutedOlive}
            strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

export function FeedbackPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<any | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/feedback');
      setData(res.data);
    } catch (e: any) {
      setError(e?.message || 'Could not load your feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openFor(session: any) {
    setTarget(session);
    setRating(0);
    setComment('');
    setAnonymous(false);
    setFormError(null);
  }

  async function submit() {
    if (!target) return;
    if (rating === 0) { setFormError('Please choose a star rating'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/feedback', {
        counselorId: target.counselorId,
        appointmentId: target.appointmentId,
        rating,
        comment,
        anonymous,
      });
      setTarget(null);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 3500);
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Could not send your feedback');
    } finally {
      setSubmitting(false);
    }
  }

  const reviewable: any[] = data?.reviewable || [];
  const submitted: any[] = data?.submitted || [];

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
        <Loader2 size={18} className="animate-spin" color={CC.forestSage} />
        <span style={{ color: CC.mutedOlive, fontSize: '0.9rem' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Your voice matters</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 8 }}>
          Feedback &amp; Reviews
        </h1>
        <p style={{ color: CC.mutedOlive, fontSize: '0.9rem', marginBottom: 28, maxWidth: 560 }}>
          Rate your completed sessions. Your counselor sees your review, and it helps other
          people choose the right person to talk to.
        </p>
      </motion.div>

      <AnimatePresence>
        {justSent && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl mb-6"
            style={{ backgroundColor: 'rgba(53,92,77,0.08)', border: `1px solid ${CC.forestSage}33` }}>
            <CheckCircle size={17} color={CC.forestSage} />
            <p style={{ fontSize: '0.86rem', color: CC.primaryText }}>
              Thank you — your feedback has been shared with your counselor.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
          style={{ backgroundColor: 'rgba(217,119,87,0.08)', border: `1px solid ${CC.terracotta}44` }}>
          <AlertCircle size={17} color={CC.terracotta} />
          <p style={{ fontSize: '0.86rem', color: '#B44A28' }}>{error}</p>
        </div>
      )}

      {/* Awaiting review */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden mb-8"
        style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
            Sessions you can review
          </h2>
          <p style={{ fontSize: '0.8rem', color: CC.mutedOlive, marginTop: 2 }}>
            Completed sessions you haven't rated yet
          </p>
        </div>

        {reviewable.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ backgroundColor: CC.softSage }}>
              <MessageSquareHeart size={22} color={CC.mutedOlive} />
            </div>
            <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.95rem' }}>
              {submitted.length > 0 ? "You're all caught up" : 'No sessions to review yet'}
            </p>
            <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginTop: 6, maxWidth: 400, margin: '6px auto 0' }}>
              {submitted.length > 0
                ? 'You have reviewed every completed session. Thank you.'
                : 'Once a session is completed you can rate it here.'}
            </p>
          </div>
        ) : reviewable.map(s => (
          <div key={s.appointmentId} className="px-6 py-4 flex items-center gap-4 flex-wrap"
            style={{ borderBottom: `1px solid ${CC.softSage}66` }}>
            <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0" style={{ backgroundColor: CC.softSage }}>
              {s.counselorAvatar
                ? <img src={s.counselorAvatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ color: CC.forestSage, fontWeight: 700 }}>
                    {s.counselorName?.replace(/^Dr\.?\s*/i, '').slice(0, 1)}
                  </div>}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{s.counselorName}</p>
              <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} /> {s.date} at {s.time}
              </p>
            </div>
            <motion.button onClick={() => openFor(s)}
              className="px-5 py-2.5 rounded-xl text-sm text-white shrink-0 flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600, border: 'none', cursor: 'pointer' }}
              whileHover={{ scale: 1.03 }}>
              <Star size={14} /> Rate session
            </motion.button>
          </div>
        ))}
      </motion.div>

      {/* Past reviews */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl overflow-hidden"
        style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
            Your reviews
          </h2>
        </div>

        {submitted.length === 0 ? (
          <p className="px-6 py-10 text-center" style={{ color: CC.mutedOlive, fontSize: '0.87rem' }}>
            You haven't left any reviews yet.
          </p>
        ) : submitted.map(f => (
          <div key={f.id} className="px-6 py-5" style={{ borderBottom: `1px solid ${CC.softSage}66` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{f.counselorName}</p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <Stars value={f.rating} size={14} />
                  <span style={{ fontSize: '0.76rem', color: CC.mutedOlive }}>{f.dateLabel}</span>
                  {f.anonymous && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: CC.softSage, fontSize: '0.68rem', color: CC.mutedOlive, fontWeight: 600 }}>
                      <EyeOff size={9} /> Anonymous
                    </span>
                  )}
                </div>
              </div>
            </div>
            {f.comment && (
              <p style={{ fontSize: '0.86rem', color: CC.mutedOlive, marginTop: 10, lineHeight: 1.6 }}>
                "{f.comment}"
              </p>
            )}
            {f.replies?.length > 0 && f.replies.map((r: string, i: number) => (
              <div key={i} className="mt-3 p-3 rounded-xl" style={{ backgroundColor: CC.softSage }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: CC.forestSage, marginBottom: 3 }}>
                  Reply from CounselConnect
                </p>
                <p style={{ fontSize: '0.82rem', color: CC.primaryText }}>{r}</p>
              </div>
            ))}
          </div>
        ))}
      </motion.div>

      {/* ── Rating modal ── */}
      <AnimatePresence>
        {target && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => !submitting && setTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
              <div className="rounded-3xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: CC.lightIvory, width: 460, maxWidth: '100%', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>

                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Rate your session
                    </p>
                    <h3 style={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', marginTop: 2 }}>
                      {target.counselorName}
                    </h3>
                  </div>
                  {!submitting && (
                    <button onClick={() => setTarget(null)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}>
                      <X size={15} color="white" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <Stars value={rating} onChange={setRating} size={30} />
                    <p style={{ fontSize: '0.85rem', color: rating ? CC.primaryText : CC.mutedOlive, marginTop: 10, fontWeight: rating ? 600 : 400 }}>
                      {rating ? RATING_WORDS[rating] : 'Tap a star to rate'}
                    </p>
                  </div>

                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 7 }}>
                    Anything you'd like to add? <span style={{ fontWeight: 400, color: CC.mutedOlive }}>(optional)</span>
                  </label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
                    placeholder="What went well, or what could be better?"
                    style={{
                      width: '100%', padding: '13px 16px', borderRadius: 16, resize: 'none',
                      backgroundColor: CC.softSage, border: '1.5px solid transparent',
                      color: CC.primaryText, fontSize: '0.9rem', outline: 'none',
                      fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
                    }} />

                  <button onClick={() => setAnonymous(a => !a)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left mt-4"
                    style={{
                      backgroundColor: anonymous ? 'rgba(53,92,77,0.08)' : CC.softSage,
                      border: `1.5px solid ${anonymous ? CC.forestSage : 'transparent'}`,
                      cursor: 'pointer',
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: anonymous ? CC.forestSage : CC.mutedOlive }}>
                      <EyeOff size={15} color="white" />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: '0.83rem', fontWeight: 600, color: CC.primaryText }}>
                        {anonymous ? 'Posting anonymously' : 'Post with my name'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 1 }}>
                        {anonymous
                          ? 'Your counselor will see the review but not your name'
                          : 'Tap to hide your name from this review'}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full relative"
                      style={{ width: 42, height: 24, backgroundColor: anonymous ? CC.forestSage : CC.mutedOlive }}>
                      <div className="absolute rounded-full bg-white transition-all"
                        style={{ width: 18, height: 18, top: 3, left: anonymous ? 21 : 3 }} />
                    </div>
                  </button>

                  {formError && (
                    <p style={{ fontSize: '0.82rem', color: CC.terracotta, marginTop: 12 }}>{formError}</p>
                  )}

                  <motion.button onClick={submit} disabled={submitting}
                    className="w-full mt-5 py-3.5 rounded-2xl text-white text-sm flex items-center justify-center gap-2"
                    style={{
                      background: submitting ? CC.mutedOlive : `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`,
                      fontWeight: 600, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                    whileHover={!submitting ? { scale: 1.02 } : {}}>
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                      : <><Send size={15} /> Submit review</>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
