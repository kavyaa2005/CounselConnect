import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Smartphone, Wallet, Building2, CheckCircle, Clock,
  Receipt, ShieldCheck, RotateCcw, Loader2, AlertCircle, Info, X,
} from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const METHOD_ICONS: Record<string, any> = {
  card: CreditCard,
  upi: Smartphone,
  wallet: Wallet,
  netbanking: Building2,
};

export function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payingFor, setPayingFor] = useState<any | null>(null);
  const [method, setMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/billing');
      setData(res.data);
    } catch (e: any) {
      setError(e?.message || 'Could not load your billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function pay() {
    if (!payingFor) return;
    setProcessing(true);
    setPayError(null);
    try {
      const res = await api.post('/billing/pay', {
        appointmentId: payingFor.appointmentId,
        method,
      });
      setPayingFor(null);
      setReceipt(res.data.payment);
      await load();
    } catch (e: any) {
      setPayError(e?.message || 'Payment could not be completed');
    } finally {
      setProcessing(false);
    }
  }

  const summary = data?.summary || {};
  const outstanding: any[] = data?.outstanding || [];
  const payments: any[] = data?.payments || [];
  const methods: any[] = data?.methods || [];

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
        <Loader2 size={18} className="animate-spin" color={CC.forestSage} />
        <span style={{ color: CC.mutedOlive, fontSize: '0.9rem' }}>Loading your billing…</span>
      </div>
    );
  }

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Your account</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 8 }}>
          Payments &amp; Billing
        </h1>
      </motion.div>

      {/* Demo-mode notice — be upfront that no real money moves */}
      <div className="flex items-start gap-3 p-4 rounded-2xl mb-6"
        style={{ backgroundColor: CC.softSage, border: `1px solid ${CC.forestSage}22` }}>
        <ShieldCheck size={17} color={CC.forestSage} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: '0.83rem', color: CC.primaryText, lineHeight: 1.6 }}>
          <strong>Demo billing.</strong> Payments here are simulated — no card details are ever
          requested, sent or stored. Receipts and totals are real records so the flow works
          end to end.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
          style={{ backgroundColor: 'rgba(217,119,87,0.08)', border: `1px solid ${CC.terracotta}44` }}>
          <AlertCircle size={17} color={CC.terracotta} />
          <p style={{ fontSize: '0.86rem', color: '#B44A28' }}>{error}</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total spent', value: summary.totalSpentLabel || '—', sub: `${summary.paidCount || 0} paid`, color: CC.forestSage, icon: Receipt },
          { label: 'Awaiting payment', value: summary.outstandingTotalLabel || '—', sub: `${summary.outstandingCount || 0} session${summary.outstandingCount === 1 ? '' : 's'}`, color: CC.terracotta, icon: Clock },
          { label: 'Refunded', value: summary.refundedTotalLabel || '—', sub: `${summary.refundedCount || 0} refund${summary.refundedCount === 1 ? '' : 's'}`, color: CC.mutedOlive, icon: RotateCcw },
          { label: 'Receipts', value: String(payments.length), sub: 'All transactions', color: CC.darkForest, icon: CheckCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="p-5 rounded-2xl"
              style={{ backgroundColor: CC.lightIvory, boxShadow: '0 2px 16px rgba(53,92,77,0.06)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${s.color}15` }}>
                <Icon size={16} color={s.color} />
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: CC.primaryText }}>{s.value}</p>
              <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 2 }}>{s.label}</p>
              <p style={{ fontSize: '0.72rem', color: s.color, marginTop: 4, fontWeight: 600 }}>{s.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Outstanding */}
      {outstanding.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden mb-8"
          style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
          <div className="px-6 py-5" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
              Awaiting payment
            </h2>
            <p style={{ fontSize: '0.8rem', color: CC.mutedOlive, marginTop: 2 }}>
              Pay before your session so your counselor can confirm it.
            </p>
          </div>
          {outstanding.map(o => (
            <div key={o.appointmentId} className="px-6 py-4 flex items-center gap-4 flex-wrap"
              style={{ borderBottom: `1px solid ${CC.softSage}66` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(217,119,87,0.12)' }}>
                <Clock size={16} color={CC.terracotta} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{o.counselorName}</p>
                <p style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>
                  {o.sessionType === 'video' ? 'Video session' : 'Chat session'} · {o.date} at {o.time}
                </p>
              </div>
              <span style={{ fontWeight: 700, color: CC.primaryText, fontSize: '1rem' }}>{o.amountLabel}</span>
              <motion.button
                onClick={() => { setPayingFor(o); setPayError(null); setMethod('upi'); }}
                className="px-5 py-2.5 rounded-xl text-sm text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                whileHover={{ scale: 1.03 }}
              >
                Pay now
              </motion.button>
            </div>
          ))}
        </motion.div>
      )}

      {/* History */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl overflow-hidden"
        style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
            Payment history
          </h2>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ backgroundColor: CC.softSage }}>
              <Receipt size={22} color={CC.mutedOlive} />
            </div>
            <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.95rem' }}>No payments yet</p>
            <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginTop: 6 }}>
              {outstanding.length > 0
                ? 'Pay for a booked session above and the receipt appears here.'
                : 'Book a session with a counselor to get started.'}
            </p>
          </div>
        ) : payments.map(p => {
          const refunded = p.status === 'refunded';
          return (
            <button key={p.id} onClick={() => setReceipt(p)}
              className="w-full px-6 py-4 flex items-center gap-4 text-left"
              style={{ borderBottom: `1px solid ${CC.softSage}66`, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: refunded ? CC.softSage : 'rgba(53,92,77,0.1)' }}>
                {refunded ? <RotateCcw size={16} color={CC.mutedOlive} /> : <CheckCircle size={16} color={CC.forestSage} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{p.counselorName}</p>
                <p style={{ fontSize: '0.76rem', color: CC.mutedOlive }}>
                  {p.receiptNumber} · {p.dateLabel} · {p.methodLabel}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: refunded ? CC.mutedOlive : CC.primaryText,
                  textDecoration: refunded ? 'line-through' : 'none',
                }}>{p.amountLabel}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: refunded ? CC.mutedOlive : CC.forestSage }}>
                  {refunded ? 'Refunded' : 'Paid'}
                </p>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* ── Checkout ── */}
      <AnimatePresence>
        {payingFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => !processing && setPayingFor(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
              <div className="rounded-3xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: CC.lightIvory, width: 440, maxWidth: '100%', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>

                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Checkout
                    </p>
                    <h3 style={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', marginTop: 2 }}>
                      {payingFor.amountLabel}
                    </h3>
                  </div>
                  {!processing && (
                    <button onClick={() => setPayingFor(null)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}>
                      <X size={15} color="white" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <div className="p-3.5 rounded-2xl mb-5" style={{ backgroundColor: CC.softSage }}>
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.88rem' }}>{payingFor.counselorName}</p>
                    <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, marginTop: 2 }}>
                      {payingFor.sessionType === 'video' ? 'Video session' : 'Chat session'} · {payingFor.date} at {payingFor.time}
                    </p>
                  </div>

                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: CC.primaryText, marginBottom: 10 }}>
                    Payment method
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    {methods.map(m => {
                      const Icon = METHOD_ICONS[m.id] || CreditCard;
                      const on = method === m.id;
                      return (
                        <button key={m.id} onClick={() => setMethod(m.id)}
                          className="flex items-center gap-2.5 p-3 rounded-2xl text-left"
                          style={{
                            backgroundColor: on ? 'rgba(53,92,77,0.08)' : CC.softSage,
                            border: `1.5px solid ${on ? CC.forestSage : 'transparent'}`,
                            cursor: 'pointer',
                          }}>
                          <Icon size={16} color={on ? CC.forestSage : CC.mutedOlive} />
                          <div className="min-w-0">
                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText }}>{m.label}</p>
                            <p style={{ fontSize: '0.68rem', color: CC.mutedOlive }} className="truncate">{m.hint}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5"
                    style={{ backgroundColor: 'rgba(53,92,77,0.06)' }}>
                    <Info size={14} color={CC.forestSage} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, lineHeight: 1.5 }}>
                      Simulated payment — you won't be asked for card details and no money moves.
                    </p>
                  </div>

                  {payError && (
                    <p style={{ fontSize: '0.82rem', color: CC.terracotta, marginBottom: 12 }}>{payError}</p>
                  )}

                  <motion.button onClick={pay} disabled={processing}
                    className="w-full py-3.5 rounded-2xl text-white text-sm flex items-center justify-center gap-2"
                    style={{
                      background: processing ? CC.mutedOlive : `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`,
                      fontWeight: 600, border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                    whileHover={!processing ? { scale: 1.02 } : {}}>
                    {processing
                      ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                      : <>Pay {payingFor.amountLabel}</>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Receipt ── */}
      <AnimatePresence>
        {receipt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setReceipt(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
              <div className="rounded-3xl overflow-hidden pointer-events-auto"
                style={{ backgroundColor: CC.lightIvory, width: 400, maxWidth: '100%', boxShadow: '0 24px 70px rgba(0,0,0,0.3)' }}>

                <div className="px-6 py-6 text-center"
                  style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                    style={{ background: 'rgba(255,255,255,0.18)' }}>
                    {receipt.status === 'refunded'
                      ? <RotateCcw size={24} color="white" />
                      : <CheckCircle size={24} color="white" />}
                  </div>
                  <p style={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.3rem' }}>
                    {receipt.amountLabel}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.8rem', marginTop: 2 }}>
                    {receipt.status === 'refunded' ? 'Refunded' : 'Payment successful'}
                  </p>
                </div>

                <div className="p-6">
                  {[
                    ['Receipt', receipt.receiptNumber],
                    ['Counselor', receipt.counselorName],
                    ['Session', `${receipt.sessionDate || ''} ${receipt.sessionTime || ''}`.trim() || '—'],
                    ['Method', receipt.methodLabel],
                    ['Paid on', `${receipt.dateLabel || ''} ${receipt.timeLabel || ''}`.trim()],
                    ['Reference', receipt.gatewayReference],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-start py-2.5"
                      style={{ borderBottom: `1px solid ${CC.softSage}` }}>
                      <span style={{ fontSize: '0.8rem', color: CC.mutedOlive }}>{k}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, textAlign: 'right', maxWidth: 220 }}>
                        {v || '—'}
                      </span>
                    </div>
                  ))}

                  <button onClick={() => setReceipt(null)}
                    className="w-full mt-5 py-3 rounded-2xl text-sm"
                    style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
