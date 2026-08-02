// Help & Support: FAQ, plus raising and tracking a ticket.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, LifeBuoy, Bug, Lightbulb, MessageSquare, Send, Plus, X } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const CATEGORIES = [
  { id: 'question', label: 'A question', icon: LifeBuoy },
  { id: 'bug', label: 'Something is broken', icon: Bug },
  { id: 'suggestion', label: 'An idea', icon: Lightbulb },
  { id: 'billing', label: 'Payments', icon: MessageSquare },
  { id: 'account', label: 'My account', icon: MessageSquare },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: 'rgba(217,119,87,0.12)', color: '#B5541F', label: 'Open' },
  'in-progress': { bg: 'rgba(53,92,77,0.12)', color: '#355C4D', label: 'Being looked at' },
  resolved: { bg: 'rgba(76,175,80,0.14)', color: '#2E7D32', label: 'Resolved' },
  closed: { bg: 'rgba(0,0,0,0.06)', color: '#6B7280', label: 'Closed' },
};

export function SupportPage() {
  const [tab, setTab] = useState<'faq' | 'tickets'>('faq');
  const [faq, setFaq] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [openQ, setOpenQ] = useState<string | null>(null);

  const [tickets, setTickets] = useState<any[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ subject: '', category: 'question', message: '', severity: 'medium' });
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    api.get('/support/faq').then(r => setFaq(r.data.faq || [])).catch(() => {});
  }, []);

  const loadTickets = () =>
    api.get('/support/tickets').then(r => setTickets(r.data.tickets || [])).catch(() => {});
  useEffect(() => { if (tab === 'tickets') loadTickets(); }, [tab]);

  const submit = async () => {
    setFormError('');
    if (!draft.subject.trim()) { setFormError('Give it a subject'); return; }
    if (draft.message.trim().length < 10) { setFormError('Tell us a bit more — at least 10 characters'); return; }
    setSending(true);
    try {
      await api.post('/support/tickets', { ...draft, page: window.location.pathname });
      setDraft({ subject: '', category: 'question', message: '', severity: 'medium' });
      setComposing(false);
      loadTickets();
    } catch (e: any) {
      setFormError(e.message || 'Could not submit');
    } finally { setSending(false); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !open) return;
    try {
      const r = await api.post(`/support/tickets/${open.id}/reply`, { text: reply });
      setOpen(r.data.ticket);
      setReply('');
      loadTickets();
    } catch { /* ignore */ }
  };

  // Filter across both the question and the answer — people search for the
  // words in the answer as often as the question.
  const filteredFaq = faq
    .map(cat => ({
      ...cat,
      items: cat.items.filter((i: any) =>
        !search ||
        i.q.toLowerCase().includes(search.toLowerCase()) ||
        i.a.toLowerCase().includes(search.toLowerCase())),
    }))
    .filter(cat => cat.items.length);

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>We're here to help</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 20 }}>
          Help &amp; Support
        </h1>

        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ backgroundColor: CC.softSage, width: 'fit-content' }}>
          {([['faq', 'Common questions'], ['tickets', 'My requests']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-5 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: tab === k ? CC.lightIvory : 'transparent',
                color: tab === k ? CC.primaryText : CC.mutedOlive,
                border: 'none', cursor: 'pointer', fontWeight: tab === k ? 600 : 400,
                boxShadow: tab === k ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── FAQ ── */}
        {tab === 'faq' && (
          <>
            <div className="relative mb-5">
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: CC.mutedOlive }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search for an answer…"
                className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none"
                style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, color: CC.primaryText, fontSize: '0.9rem' }} />
            </div>

            {!filteredFaq.length && (
              <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: CC.lightIvory }}>
                <p style={{ color: CC.mutedOlive, fontSize: '0.9rem', marginBottom: 12 }}>
                  Nothing matches “{search}”.
                </p>
                <button onClick={() => { setTab('tickets'); setComposing(true); setDraft(d => ({ ...d, subject: search })); }}
                  className="px-4 py-2.5 rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  Ask us directly
                </button>
              </div>
            )}

            {filteredFaq.map(cat => (
              <div key={cat.category} className="mb-6">
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1rem', color: CC.primaryText, marginBottom: 10 }}>
                  {cat.category}
                </h2>
                <div className="flex flex-col gap-2">
                  {cat.items.map((item: any) => {
                    const key = `${cat.category}-${item.q}`;
                    const isOpen = openQ === key;
                    return (
                      <div key={key} className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${isOpen ? CC.forestSage : CC.softSage}` }}>
                        <button onClick={() => setOpenQ(isOpen ? null : key)}
                          className="w-full flex items-center gap-3 p-4 text-left"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: CC.primaryText }}>{item.q}</span>
                          <ChevronRight size={16} color={CC.mutedOlive}
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                        </button>
                        {isOpen && (
                          <p className="px-4 pb-4" style={{ fontSize: '0.88rem', color: CC.mutedOlive, lineHeight: 1.75 }}>
                            {item.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="p-5 rounded-2xl flex items-center gap-4 flex-wrap"
              style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}` }}>
              <div className="flex-1" style={{ minWidth: 200 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: CC.primaryText }}>Still stuck?</p>
                <p style={{ fontSize: '0.85rem', color: CC.mutedOlive }}>Send us a message and we'll get back to you.</p>
              </div>
              <button onClick={() => { setTab('tickets'); setComposing(true); }}
                className="px-4 py-2.5 rounded-xl text-white flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <Plus size={15} /> New request
              </button>
            </div>
          </>
        )}

        {/* ── Tickets ── */}
        {tab === 'tickets' && (
          <>
            {!composing && (
              <button onClick={() => setComposing(true)}
                className="w-full mb-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-white"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                <Plus size={16} /> New request
              </button>
            )}

            <AnimatePresence>
              {composing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-5">
                  <div className="p-5 rounded-2xl" style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.forestSage}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1rem', color: CC.primaryText }}>
                        What can we help with?
                      </p>
                      <button onClick={() => { setComposing(false); setFormError(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: CC.mutedOlive, display: 'flex' }}>
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const on = draft.category === cat.id;
                        return (
                          <button key={cat.id} onClick={() => setDraft(d => ({ ...d, category: cat.id }))}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                            style={{
                              backgroundColor: on ? CC.forestSage : CC.softSage,
                              color: on ? 'white' : CC.mutedOlive,
                              border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: on ? 600 : 400,
                            }}>
                            <Icon size={13} /> {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <input value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                      placeholder="A short summary"
                      className="w-full px-3.5 py-3 rounded-xl outline-none mb-3"
                      style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.9rem' }} />

                    <textarea value={draft.message} onChange={e => setDraft(d => ({ ...d, message: e.target.value }))}
                      rows={5}
                      placeholder={draft.category === 'bug'
                        ? 'What were you doing, what did you expect, and what happened instead?'
                        : 'Tell us what you need…'}
                      className="w-full px-3.5 py-3 rounded-xl outline-none resize-none mb-3"
                      style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.9rem', lineHeight: 1.65 }} />

                    {draft.category === 'bug' && (
                      <div className="flex gap-2 items-center mb-3">
                        <span style={{ fontSize: '0.82rem', color: CC.mutedOlive }}>How badly is it affecting you?</span>
                        {(['low', 'medium', 'high'] as const).map(s => (
                          <button key={s} onClick={() => setDraft(d => ({ ...d, severity: s }))}
                            className="px-3 py-1.5 rounded-full"
                            style={{
                              backgroundColor: draft.severity === s ? CC.forestSage : CC.softSage,
                              color: draft.severity === s ? 'white' : CC.mutedOlive,
                              border: 'none', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, textTransform: 'capitalize',
                            }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {formError && <p style={{ fontSize: '0.82rem', color: CC.terracotta, marginBottom: 10 }}>{formError}</p>}

                    <button onClick={submit} disabled={sending}
                      className="px-5 py-3 rounded-xl text-white flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: sending ? 'wait' : 'pointer', fontSize: '0.88rem', fontWeight: 700 }}>
                      <Send size={15} /> {sending ? 'Sending…' : 'Send request'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!tickets.length && !composing && (
              <div className="p-10 rounded-2xl text-center" style={{ backgroundColor: CC.lightIvory }}>
                <p style={{ fontSize: '1.8rem', marginBottom: 8 }}>📮</p>
                <p style={{ color: CC.mutedOlive, fontSize: '0.9rem' }}>
                  You haven't raised anything yet.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {tickets.map(t => {
                const st = STATUS_STYLE[t.status] || STATUS_STYLE.open;
                return (
                  <button key={t.id} onClick={() => setOpen(t)}
                    className="p-4 rounded-2xl text-left"
                    style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, cursor: 'pointer' }}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: CC.primaryText }}>{t.subject}</span>
                      <span className="px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, lineHeight: 1.6 }}>
                      {t.message.slice(0, 120)}{t.message.length > 120 ? '…' : ''}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 6 }}>
                      {t.ref} · {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {t.replies?.length ? ` · ${t.replies.length} repl${t.replies.length === 1 ? 'y' : 'ies'}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Ticket detail */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(null)}>
              <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full rounded-3xl overflow-hidden flex flex-col"
                style={{ maxWidth: 560, maxHeight: '85vh', backgroundColor: CC.lightIvory }}>
                <div className="p-5" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                        {open.subject}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, marginTop: 2 }}>
                        {open.ref} · {(STATUS_STYLE[open.status] || STATUS_STYLE.open).label}
                      </p>
                    </div>
                    <button onClick={() => setOpen(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: CC.mutedOlive, display: 'flex' }}>
                      <X size={17} />
                    </button>
                  </div>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                  <div className="p-3.5 rounded-2xl mb-3" style={{ backgroundColor: CC.softSage }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: CC.mutedOlive, marginBottom: 4 }}>You</p>
                    <p style={{ fontSize: '0.88rem', color: CC.primaryText, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{open.message}</p>
                  </div>
                  {(open.replies || []).map((r: any) => (
                    <div key={r.id} className="p-3.5 rounded-2xl mb-3"
                      style={{ backgroundColor: r.from === 'admin' ? 'rgba(53,92,77,0.09)' : CC.softSage,
                               borderLeft: r.from === 'admin' ? `3px solid ${CC.forestSage}` : 'none' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: r.from === 'admin' ? CC.forestSage : CC.mutedOlive, marginBottom: 4 }}>
                        {r.from === 'admin' ? 'CounselConnect support' : 'You'}
                      </p>
                      <p style={{ fontSize: '0.88rem', color: CC.primaryText, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{r.text}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${CC.softSage}` }}>
                  <input value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendReply()}
                    placeholder="Add a reply…"
                    className="flex-1 px-3.5 py-2.5 rounded-xl outline-none"
                    style={{ backgroundColor: CC.softSage, border: 'none', color: CC.primaryText, fontSize: '0.88rem' }} />
                  <button onClick={sendReply}
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: CC.forestSage, border: 'none', cursor: 'pointer' }}>
                    <Send size={16} color="white" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
