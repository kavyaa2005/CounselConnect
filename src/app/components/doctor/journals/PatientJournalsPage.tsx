import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Download, Lock, Search, RefreshCw, FileText, Calendar,
  Tag as TagIcon, Info, ChevronRight,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';
import { getToken } from '../../../lib/auth';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

const fmt = (iso: string, withYear = true) =>
  iso ? new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}),
  }) : '—';

const initials = (n = '') =>
  n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

export function PatientJournalsPage({ patientId }: { patientId?: string | null } = {}) {
  const { c, sh } = useTheme();

  const [patients, setPatients] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(patientId || null);
  const [journal, setJournal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  /* ── list of patients with journal counts ── */
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/doctor/journals');
      const list = res.data.patients || [];
      setPatients(list);
      setSelected(prev => prev || patientId || list.find((p: any) => p.sharedCount > 0)?.id || list[0]?.id || null);
    } catch (e: any) {
      setError(e?.message || 'Could not load patient journals');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  /* ── the selected patient's shared entries ── */
  useEffect(() => {
    if (!selected) { setJournal(null); return; }
    let cancelled = false;
    setEntryLoading(true);
    api.get(`/doctor/journals/${selected}`)
      .then(r => { if (!cancelled) { setJournal(r.data); setOpenId(null); } })
      .catch(() => { if (!cancelled) setJournal(null); })
      .finally(() => { if (!cancelled) setEntryLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  /** PDF needs the auth header, so fetch as a blob rather than a plain link. */
  async function downloadPdf() {
    if (!selected) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/doctor/journals/${selected}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('The server could not generate the PDF');
      const blob = await res.blob();
      const name = (res.headers.get('content-disposition') || '')
        .split('filename=')[1]?.replace(/"/g, '') || 'journal-summary.pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  const current = patients.find(p => p.id === selected);
  const entries = (journal?.entries || []).filter((e: any) =>
    !search ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.content?.toLowerCase().includes(search.toLowerCase()) ||
    (e.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 10 }}>
        <RefreshCw size={16} className="animate-spin" color={c.primary} />
        <span style={{ color: c.textMuted, fontSize: 14 }}>Loading patient journals…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${c.primary}15, ${c.veryLightSage})`,
        borderRadius: 16, padding: '20px 28px', border: `1px solid ${c.mintAccent}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Patient Journals</h2>
            <p style={{ fontSize: 13, color: c.textSecondary, margin: '3px 0 0' }}>
              Reflections your patients have chosen to share with you
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={selected || ''} onChange={e => setSelected(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: 10, border: `1px solid ${c.border}`,
              fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white,
              outline: 'none', cursor: 'pointer', minWidth: 250,
            }}>
            {patients.length === 0 && <option value="">No patients yet</option>}
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.sharedCount} shared{p.privateCount ? ` · ${p.privateCount} private` : ''}
              </option>
            ))}
          </select>
          <button onClick={loadPatients} title="Refresh"
            style={{
              width: 38, height: 38, borderRadius: 10, border: `1px solid ${c.border}`,
              background: c.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <RefreshCw size={15} color={c.textSecondary} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: `${c.error}10`, border: `1px solid ${c.error}33`, borderRadius: 14, padding: 16 }}>
          <p style={{ margin: 0, color: c.error, fontSize: 13.5 }}>{error}</p>
        </div>
      )}

      {!current ? (
        <div style={{ background: c.white, borderRadius: 20, padding: 48, textAlign: 'center', border: `1px solid ${c.border}` }}>
          <BookOpen size={26} color={c.textMuted} style={{ marginBottom: 10 }} />
          <p style={{ fontWeight: 600, color: c.textPrimary, fontSize: 15, margin: 0 }}>No patients yet</p>
          <p style={{ color: c.textMuted, fontSize: 13.5, margin: '6px 0 0' }}>
            Once a client books a session or messages you, their shared journal appears here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary + download */}
          <div style={{
            background: c.white, borderRadius: 20, padding: 24,
            boxShadow: sh.card, border: `1px solid ${c.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: c.primary, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16,
                }}>
                  {initials(current.name)}
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: c.textPrimary, margin: 0 }}>{current.name}</h3>
                  <p style={{ fontSize: 12.5, color: c.textMuted, margin: '2px 0 0' }}>
                    {current.email}
                    {journal?.firstEntryAt && ` · journalling since ${fmt(journal.firstEntryAt)}`}
                  </p>
                </div>
              </div>

              <button onClick={downloadPdf} disabled={downloading || !journal?.sharedCount}
                title={journal?.sharedCount ? 'Download a PDF summary' : 'Nothing shared to export'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
                  borderRadius: 12, border: 'none', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600,
                  color: 'white', background: journal?.sharedCount ? c.primary : c.border,
                  cursor: journal?.sharedCount && !downloading ? 'pointer' : 'not-allowed',
                  opacity: downloading ? 0.7 : 1,
                }}>
                <Download size={16} />
                {downloading ? 'Preparing…' : 'Download PDF summary'}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 22 }}>
              {[
                { label: 'Shared entries', value: journal?.sharedCount ?? 0, color: c.primary },
                { label: 'Kept private', value: journal?.privateCount ?? 0, color: c.warning },
                { label: 'Words written', value: journal?.totalWords ?? 0, color: c.success },
                { label: 'Latest entry', value: journal?.lastEntryAt ? fmt(journal.lastEntryAt, false) : '—', color: '#7C6FFF' },
              ].map(s => (
                <div key={s.label} style={{ background: c.veryLightSage, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Themes */}
            {journal?.topTags?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <TagIcon size={13} color={c.textMuted} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.textSecondary }}>Recurring themes</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {journal.topTags.map((t: any) => (
                    <span key={t.tag} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12,
                      background: c.veryLightSage, color: c.primary, fontWeight: 600,
                      border: `1px solid ${c.mintAccent}`,
                    }}>
                      {t.tag} · {t.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy notice */}
            {journal?.privateCount > 0 && (
              <div style={{
                marginTop: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
                background: `${c.warning}10`, border: `1px solid ${c.warning}33`,
                borderRadius: 12, padding: '12px 14px',
              }}>
                <Lock size={15} color={c.warning} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: c.textSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: c.textPrimary }}>{journal.privateCount}</strong>{' '}
                  {journal.privateCount === 1 ? 'entry is' : 'entries are'} marked private by {current.name.split(' ')[0]}.
                  Their contents are not shown here or in the PDF — this is by design.
                </p>
              </div>
            )}
          </div>

          {/* Entries */}
          <div style={{ background: c.white, borderRadius: 20, boxShadow: sh.card, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${c.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <h3 style={{ fontSize: 15.5, fontWeight: 700, color: c.textPrimary, margin: 0 }}>
                Shared entries {entries.length > 0 && (
                  <span style={{ color: c.textMuted, fontWeight: 500 }}>({entries.length})</span>
                )}
              </h3>
              <div style={{ position: 'relative' }}>
                <Search size={14} color={c.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries…"
                  style={{
                    paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8, width: 230,
                    borderRadius: 10, border: `1px solid ${c.border}`, background: c.veryLightSage,
                    fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, outline: 'none',
                  }} />
              </div>
            </div>

            {entryLoading && (
              <p style={{ padding: '32px 24px', textAlign: 'center', color: c.textMuted, fontSize: 13.5, margin: 0 }}>
                Loading entries…
              </p>
            )}

            {!entryLoading && entries.length === 0 && (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <FileText size={24} color={c.textMuted} style={{ marginBottom: 10 }} />
                <p style={{ fontWeight: 600, color: c.textPrimary, fontSize: 14.5, margin: 0 }}>
                  {search ? 'No entries match your search'
                    : journal?.privateCount > 0
                      ? `${current.name.split(' ')[0]} has kept all entries private`
                      : `${current.name.split(' ')[0]} hasn't written any journal entries yet`}
                </p>
                <p style={{ color: c.textMuted, fontSize: 13, margin: '6px 0 0' }}>
                  {search ? 'Try a different word.' : 'Entries appear here as soon as they write and share one.'}
                </p>
              </div>
            )}

            {!entryLoading && entries.map((e: any, i: number) => {
              const open = openId === e.id;
              return (
                <div key={e.id}
                  style={{ borderBottom: i < entries.length - 1 ? `1px solid ${c.border}` : 'none' }}>
                  <button onClick={() => setOpenId(open ? null : e.id)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                      cursor: 'pointer', padding: '18px 24px', display: 'flex', gap: 14, alignItems: 'flex-start',
                      fontFamily: 'Inter',
                    }}>
                    <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{e.moodEmoji || '📝'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5, color: c.textPrimary }}>
                          {e.title || 'Untitled entry'}
                        </span>
                        {e.moodLabel && (
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: c.veryLightSage, color: c.primary, fontWeight: 600,
                          }}>{e.moodLabel}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Calendar size={11} color={c.textMuted} />
                        <span style={{ fontSize: 12, color: c.textMuted }}>{fmt(e.createdAt)}</span>
                        {e.tags?.length > 0 && (
                          <span style={{ fontSize: 12, color: c.primary }}>· {e.tags.join(' · ')}</span>
                        )}
                      </div>
                      {!open && (
                        <p style={{
                          margin: '8px 0 0', fontSize: 13, color: c.textSecondary, lineHeight: 1.55,
                          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {e.content}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} color={c.textMuted}
                      style={{ marginTop: 4, flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                  </button>

                  {open && (
                    <div style={{ padding: '0 24px 22px 60px' }}>
                      <div style={{
                        background: c.veryLightSage, borderRadius: 12, padding: '16px 18px',
                        borderLeft: `3px solid ${c.primary}`,
                      }}>
                        <p style={{
                          margin: 0, fontSize: 13.5, color: c.textPrimary,
                          lineHeight: 1.7, whiteSpace: 'pre-wrap',
                        }}>
                          {e.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clinical footnote */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0 4px' }}>
            <Info size={14} color={c.textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: c.textMuted, lineHeight: 1.5 }}>
              Journal entries are personal reflections, not clinical assessments. Treat any exported PDF as
              confidential patient information and store it in line with your practice's data policy.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
