import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Phone, Mail, FileText, X, BookOpen, Lock } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

function RiskBadge({ level }: { level: string }) {
  const { c } = useTheme();
  const configs = {
    low: { label: 'Low Risk', bg: '#E8F5E9', color: c.success, dot: c.success },
    medium: { label: 'Med Risk', bg: '#FFF9E6', color: c.warning, dot: c.warning },
    high: { label: 'High Risk', bg: '#FFEBEE', color: c.error, dot: c.error },
  };
  const cfg = configs[level as keyof typeof configs] || configs.low;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'Inter',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

const riskFromMood = (avg: number | null) => {
  if (avg == null) return 'medium';
  if (avg >= 6.5) return 'low';
  if (avg >= 4) return 'medium';
  return 'high';
};

const timeAgo = (iso?: string) => {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? '1 week ago' : `${w} weeks ago`;
};

export function PatientsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { c, sh } = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  // Real registered users from the backend
  useEffect(() => {
    api.get('/doctor/patients').then(res => {
      setPatients((res.data.patients || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.firstName,
        email: u.email,
        phone: u.phone || '—',
        issue: u.reason || 'General wellbeing',
        sessions: u.appointmentCount,
        lastVisit: timeAgo(u.lastMood?.createdAt || u.createdAt),
        moodTrend: 'stable',
        riskLevel: riskFromMood(u.avgMood),
        nextAppt: u.upcomingAppointment ? `${u.upcomingAppointment.date}, ${u.upcomingAppointment.time}` : 'Not scheduled',
        progress: u.avgMood != null ? Math.round(u.avgMood * 10) : 0,
      })));
    }).catch(() => {});
  }, []);

  // Full patient record (moods, notes, appointments) when selected
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    api.get(`/doctor/patients/${selected}`).then(res => setDetail(res.data.patient)).catch(() => {});
  }, [selected]);

  // Shared journal entries for the Journal tab
  const [journal, setJournal] = useState<any | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);
  useEffect(() => {
    if (!selected) { setJournal(null); return; }
    let cancelled = false;
    setJournalLoading(true);
    api.get(`/doctor/journals/${selected}`)
      .then(res => { if (!cancelled) setJournal(res.data); })
      .catch(() => { if (!cancelled) setJournal(null); })
      .finally(() => { if (!cancelled) setJournalLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  const moodHistory = (detail?.moods || []).slice(-7).map((m: any) => ({
    date: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: m.value * 2,
  }));

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.issue.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === selected);

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter', display: 'flex', gap: 24, height: '100%', boxSizing: 'border-box' }}>
      {/* Main list area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['table', 'cards'].map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v as 'table' | 'cards')}
                style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', background: viewMode === v ? c.primary : 'transparent', color: viewMode === v ? 'white' : c.textSecondary, textTransform: 'capitalize' }}
              >
                {v === 'table' ? 'Table View' : 'Card View'}
              </button>
            ))}
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} /> Add Patient
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} />
            <input
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.white, fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, cursor: 'pointer' }}>
            <Filter size={13} /> Filter
          </button>
        </div>

        {viewMode === 'table' ? (
          <div style={{ background: c.white, borderRadius: 18, border: `1px solid ${c.border}`, overflow: 'auto', boxShadow: sh.card, flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '2%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}`, background: c.background }}>
                  {['Patient', 'Issue', 'Sessions', 'Last Visit', 'Next Appt', 'Progress', 'Risk'].map(h => (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textMuted, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p.id === selected ? null : p.id)}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : 'none', cursor: 'pointer', background: selected === p.id ? c.veryLightSage : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { if (selected !== p.id) (e.currentTarget as HTMLTableRowElement).style.background = c.background; }}
                    onMouseLeave={(e) => { if (selected !== p.id) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                          {p.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.issue}</td>
                    <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, fontWeight: 600 }}>{p.sessions}</td>
                    <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 12, color: c.textMuted, whiteSpace: 'nowrap' }}>{p.lastVisit}</td>
                    <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nextAppt}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 4, background: c.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 4, background: p.progress >= 70 ? c.success : p.progress >= 40 ? c.warning : c.error }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'Inter', fontWeight: 600, color: c.textSecondary, flexShrink: 0 }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 14px', minWidth: 90 }}>
                      <RiskBadge level={p.riskLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, overflowY: 'auto' }}>
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => setSelected(p.id === selected ? null : p.id)}
                style={{
                  background: c.white, borderRadius: 18, padding: 18,
                  boxShadow: selected === p.id ? sh.hover : sh.card,
                  border: `1.5px solid ${selected === p.id ? c.primary : c.border}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 13 }}>
                      {p.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: c.textPrimary }}>{p.name}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>{p.email}</div>
                    </div>
                  </div>
                  <RiskBadge level={p.riskLevel} />
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, marginBottom: 12 }}>{p.issue}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: c.textMuted }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{p.progress}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: c.border, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 4, background: p.progress >= 70 ? c.success : c.warning }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: c.textMuted }}>
                  <span>{p.sessions} sessions</span>
                  <span>Last: {p.lastVisit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient Detail Panel - fixed width, doesn't collapse table */}
      {selectedPatient && (
        <div style={{
          width: 320,
          background: c.white,
          borderRadius: 18,
          padding: 22,
          boxShadow: sh.card,
          border: `1px solid ${c.border}`,
          flexShrink: 0,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 130px)',
          alignSelf: 'flex-start',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Patient Profile</h3>
            <button onClick={() => setSelected(null)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 18, margin: '0 auto 10px' }}>
              {selectedPatient.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: c.textPrimary }}>{selectedPatient.name}</div>
            <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{selectedPatient.issue}</div>
            <div style={{ marginTop: 8 }}>
              <RiskBadge level={selectedPatient.riskLevel} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 18, background: c.background, borderRadius: 9, padding: 3 }}>
            {['overview', 'journal', 'notes', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '7px 8px', borderRadius: 7, border: 'none', fontFamily: 'Inter', fontSize: 11, fontWeight: 500, cursor: 'pointer', background: activeTab === tab ? c.white : 'transparent', color: activeTab === tab ? c.textPrimary : c.textMuted, boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', textTransform: 'capitalize' }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: 12, borderRadius: 10, background: c.background, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: c.primary }}>{selectedPatient.sessions}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>Total Sessions</div>
                </div>
                <div style={{ flex: 1, padding: 12, borderRadius: 10, background: c.background, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: c.success }}>{selectedPatient.progress}%</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>Progress</div>
                </div>
              </div>
              {[
                { icon: Phone, label: 'Phone', value: selectedPatient.phone },
                { icon: Mail, label: 'Email', value: selectedPatient.email },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: c.background }}>
                  <Icon size={13} color={c.primary} />
                  <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>{label}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textPrimary, fontWeight: 500 }}>{value}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '9px 11px', borderRadius: 9, background: '#FFF9E6', border: `1px solid ${c.warning}20` }}>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.warning, fontWeight: 600, marginBottom: 3 }}>Next Appointment</div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textPrimary }}>{selectedPatient.nextAppt}</div>
              </div>
              <button onClick={() => onNavigate('notes')} style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FileText size={13} /> Add Session Notes
              </button>
              <div style={{ display: 'flex', gap: 7 }}>
                <button style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>Upload File</button>
                <button style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>View History</button>
              </div>
            </div>
          )}

          {activeTab === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {journalLoading && (
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0 }}>Loading journal…</p>
              )}

              {!journalLoading && journal && (
                <>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: 10, borderRadius: 10, background: c.background, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.primary }}>{journal.sharedCount}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>Shared</div>
                    </div>
                    <div style={{ flex: 1, padding: 10, borderRadius: 10, background: c.background, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.warning }}>{journal.privateCount}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>Private</div>
                    </div>
                    <div style={{ flex: 1, padding: 10, borderRadius: 10, background: c.background, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.success }}>{journal.totalWords}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>Words</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('journals')}
                    style={{
                      width: '100%', padding: '9px', borderRadius: 10, border: 'none', background: c.primary,
                      color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <BookOpen size={13} /> Open full journal &amp; export PDF
                  </button>

                  {journal.entries.length === 0 && (
                    <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0 }}>
                      {journal.privateCount > 0
                        ? 'All entries are marked private by this patient.'
                        : 'This patient has not written any journal entries yet.'}
                    </p>
                  )}

                  {journal.entries.slice(0, 4).map((e: any) => (
                    <div key={e.id} style={{ padding: '11px', borderRadius: 10, background: c.background, border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.moodEmoji} {e.title || 'Untitled'}
                        </span>
                        <span style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted, flexShrink: 0 }}>
                          {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p style={{
                        fontFamily: 'Inter', fontSize: 11.5, color: c.textSecondary, margin: 0, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{e.content}</p>
                    </div>
                  ))}

                  {journal.privateCount > 0 && journal.entries.length > 0 && (
                    <p style={{ fontFamily: 'Inter', fontSize: 10.5, color: c.textMuted, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Lock size={10} /> {journal.privateCount} private {journal.privateCount === 1 ? 'entry' : 'entries'} hidden
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(detail?.notes || []).length === 0 && (
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0 }}>No notes for this patient yet.</p>
              )}
              {(detail?.notes || []).map((n: any) => ({
                date: new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                text: n.content || n.title,
                type: 'Private',
              })).map((note: any, i: number) => (
                <div key={i} style={{ padding: '11px', borderRadius: 10, background: c.background, border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: c.textMuted }}>{note.date}</span>
                    <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 10, fontWeight: 600, fontFamily: 'Inter', background: note.type === 'Private' ? '#E8EAF6' : c.veryLightSage, color: note.type === 'Private' ? '#3F51B5' : c.primary }}>
                      {note.type}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {moodHistory.length === 0 && (
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0 }}>No mood entries yet.</p>
              )}
              {moodHistory.map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', borderRadius: 9, background: c.background }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>{m.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 70, height: 5, borderRadius: 4, background: c.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${m.score * 10}%`, borderRadius: 4, background: c.primary }} />
                    </div>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{m.score}/10</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
