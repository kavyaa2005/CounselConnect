// Crisis support.
//
// Design rules for this page, which differ from the rest of the app:
//   · Helplines come first. Not after a hero, not after an explanation.
//   · Nothing is hidden behind a tab, an accordion or a hover.
//   · Numbers are tel: links so one tap dials on a phone.
//   · It works logged out — the resources endpoint is deliberately public.
//   · Plain language. Someone reading this may not have much capacity for prose.

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, MessageSquare, ExternalLink, Heart, ChevronRight, User, Trash2, ShieldAlert } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';
import { isLoggedIn } from '../../lib/auth';

const REGIONS = [
  { id: 'IN', label: 'India' },
  { id: 'US', label: 'United States' },
  { id: 'UK', label: 'United Kingdom' },
  { id: 'INTL', label: 'Elsewhere' },
];

export function EmergencyPage() {
  const [region, setRegion] = useState(() => localStorage.getItem('cc_region') || 'IN');
  const [data, setData] = useState<any>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  const signedIn = isLoggedIn();
  const [contact, setContact] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', phone: '', notifyOnCrisis: false });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('cc_region', region);
    api.get(`/emergency/resources?region=${region}`)
      .then(r => setData(r.data))
      .catch(() => setData(null));
  }, [region]);

  useEffect(() => {
    if (!signedIn) return;
    // Record that crisis support was opened. Fire-and-forget — this must never
    // block or delay the page rendering.
    api.post('/emergency/log', { action: 'opened' }).catch(() => {});
    api.get('/emergency/contact')
      .then(r => {
        setContact(r.data.contact);
        if (r.data.contact) setForm(r.data.contact);
      })
      .catch(() => {});
  }, [signedIn]);

  const saveContact = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const r = await api.put('/emergency/contact', form);
      setContact(r.data.contact);
      setEditing(false);
    } catch (e: any) {
      setSaveError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const removeContact = async () => {
    try {
      await api.delete('/emergency/contact');
      setContact(null);
      setForm({ name: '', relationship: '', phone: '', notifyOnCrisis: false });
    } catch { /* ignore */ }
  };

  const dial = (h: any) => (h.link ? h.link : h.textOnly ? `sms:${h.number}` : `tel:${String(h.number).replace(/\s/g, '')}`);

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Straight to the point */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} color={CC.terracotta} />
            <span style={{ color: CC.terracotta, fontSize: '0.85rem', fontWeight: 700 }}>Immediate help</span>
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.8rem', color: CC.primaryText, marginBottom: 6 }}>
            If you need to talk to someone right now
          </h1>
          <p style={{ color: CC.mutedOlive, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 18 }}>
            These lines are free, confidential, and answered by trained people. You don't have to be in danger to call —
            being overwhelmed is reason enough.
          </p>
        </motion.div>

        {/* Region */}
        <div className="flex gap-2 flex-wrap mb-5">
          {REGIONS.map(r => (
            <button key={r.id} onClick={() => setRegion(r.id)}
              className="px-3.5 py-1.5 rounded-full"
              style={{
                backgroundColor: region === r.id ? CC.forestSage : CC.lightIvory,
                color: region === r.id ? 'white' : CC.mutedOlive,
                border: `1.5px solid ${region === r.id ? CC.forestSage : CC.softSage}`,
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Helplines — the whole point of the page */}
        <div className="flex flex-col gap-3 mb-7">
          {(data?.helplines || []).map((h: any, i: number) => {
            const isEmergency = h.tag === 'emergency';
            const isPrimary = h.tag === 'primary';
            return (
              <motion.a
                key={h.name}
                href={dial(h)}
                target={h.link ? '_blank' : undefined}
                rel={h.link ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  backgroundColor: isEmergency ? 'rgba(217,119,87,0.09)' : CC.lightIvory,
                  border: `1.5px solid ${isEmergency ? CC.terracotta : isPrimary ? CC.forestSage : CC.softSage}`,
                  textDecoration: 'none',
                  boxShadow: isPrimary ? '0 4px 20px rgba(53,92,77,0.10)' : 'none',
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isEmergency ? CC.terracotta : CC.forestSage }}>
                  {h.link ? <ExternalLink size={20} color="white" />
                    : h.textOnly ? <MessageSquare size={20} color="white" />
                    : <Phone size={20} color="white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                      {h.number}
                    </span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: CC.primaryText }}>{h.name}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginTop: 2, lineHeight: 1.5 }}>
                    {h.detail}
                    {h.hours ? ` · ${h.hours}` : ''}
                    {h.languages ? ` · ${h.languages}` : ''}
                  </p>
                </div>
                <ChevronRight size={18} color={CC.mutedOlive} className="flex-shrink-0" />
              </motion.a>
            );
          })}
        </div>

        {/* Honest about what this app is */}
        {data?.disclaimer && (
          <div className="p-4 rounded-2xl mb-7"
            style={{ backgroundColor: 'rgba(217,119,87,0.07)', border: `1px solid ${CC.terracotta}44` }}>
            <p style={{ fontSize: '0.83rem', color: CC.primaryText, lineHeight: 1.65 }}>{data.disclaimer}</p>
          </div>
        )}

        {/* Something to do right now */}
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: CC.primaryText, marginBottom: 4 }}>
          While you wait
        </h2>
        <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginBottom: 12 }}>
          Short exercises that can take the edge off. None take more than three minutes.
        </p>
        <div className="flex flex-col gap-2.5 mb-7">
          {(data?.grounding || []).map((g: any) => {
            const open = openExercise === g.id;
            return (
              <div key={g.id} className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${open ? CC.forestSage : CC.softSage}` }}>
                <button
                  onClick={() => setOpenExercise(open ? null : g.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Heart size={17} color={CC.forestSage} className="flex-shrink-0" />
                  <div className="flex-1">
                    <p style={{ fontWeight: 700, fontSize: '0.92rem', color: CC.primaryText }}>{g.title}</p>
                    <p style={{ fontSize: '0.8rem', color: CC.mutedOlive }}>{g.lead} · {g.duration}</p>
                  </div>
                  <ChevronRight size={16} color={CC.mutedOlive}
                    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {open && (
                  <div className="px-4 pb-4" style={{ paddingLeft: 48 }}>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {g.steps.map((s: string, i: number) => (
                        <li key={i} style={{ fontSize: '0.9rem', color: CC.primaryText, lineHeight: 2, marginBottom: 2 }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Emergency contact — signed-in only, since it's stored on the account */}
        {signedIn && (
          <>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: CC.primaryText, marginBottom: 4 }}>
              Your emergency contact
            </h2>
            <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginBottom: 12 }}>
              Someone you'd want reached if things got bad. Kept private — only you can see it.
            </p>

            {contact && !editing ? (
              <div className="p-4 rounded-2xl flex items-center gap-4"
                style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}` }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: CC.softSage }}>
                  <User size={18} color={CC.forestSage} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontWeight: 700, fontSize: '0.92rem', color: CC.primaryText }}>
                    {contact.name}{contact.relationship ? ` · ${contact.relationship}` : ''}
                  </p>
                  <a href={`tel:${String(contact.phone).replace(/\s/g, '')}`}
                    style={{ fontSize: '0.86rem', color: CC.forestSage, fontWeight: 600, textDecoration: 'none' }}>
                    {contact.phone}
                  </a>
                </div>
                <button onClick={() => setEditing(true)}
                  className="px-3 py-2 rounded-xl"
                  style={{ backgroundColor: CC.softSage, color: CC.primaryText, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Edit
                </button>
                <button onClick={removeContact} title="Remove"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: CC.mutedOlive, display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}` }}>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Their name"
                    className="px-3 py-2.5 rounded-xl outline-none"
                    style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.88rem' }} />
                  <input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                    placeholder="Relationship (optional)"
                    className="px-3 py-2.5 rounded-xl outline-none"
                    style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.88rem' }} />
                </div>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full px-3 py-2.5 rounded-xl outline-none mb-3"
                  style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.88rem' }} />
                {saveError && <p style={{ fontSize: '0.8rem', color: CC.terracotta, marginBottom: 8 }}>{saveError}</p>}
                <div className="flex gap-2">
                  <button onClick={saveContact} disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    {saving ? 'Saving…' : 'Save contact'}
                  </button>
                  {contact && (
                    <button onClick={() => { setEditing(false); setForm(contact); setSaveError(''); }}
                      className="px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: CC.softSage, color: CC.primaryText, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* International, always reachable */}
        {!!data?.international?.length && (
          <div className="mt-7 pt-6" style={{ borderTop: `1px solid ${CC.softSage}` }}>
            <p style={{ fontSize: '0.85rem', color: CC.mutedOlive, marginBottom: 10 }}>Outside these countries?</p>
            <div className="flex flex-col gap-2">
              {data.international.map((h: any) => (
                <a key={h.name} href={h.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ backgroundColor: CC.lightIvory, border: `1px solid ${CC.softSage}`, textDecoration: 'none' }}>
                  <ExternalLink size={15} color={CC.forestSage} />
                  <div className="flex-1">
                    <p style={{ fontWeight: 600, fontSize: '0.86rem', color: CC.primaryText }}>{h.name}</p>
                    <p style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>{h.detail}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
