import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, Bot, Download, Edit3, Lock, Eye, Bold, Italic, Underline, List, Quote, Trash2, X, Mic } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const SUGGESTED_TAGS = ['CBT', 'Assessment', 'PTSD', 'Burnout', 'Mindfulness', 'Crisis', 'Intake', 'Progress'];
const typeFilters = ['All', 'Private', 'Shared'];

const mapNote = (n: any) => ({
  id: n.id,
  patientId: n.patientId || null,
  patient: n.patientName || 'General',
  date: new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  title: n.title,
  category: n.tags?.[0] || 'General',
  tags: n.tags || [],
  // Reflects the stored flag — every note used to render as "Private"
  // regardless of what was saved, which made the Private/Shared filter useless.
  type: n.shared ? 'shared' : 'private',
  preview: (n.content || '').slice(0, 90) + ((n.content || '').length > 90 ? '…' : ''),
  content: n.content || '',
  aiSummary: n.aiSummary || null,
  aiGenerated: !!n.aiSummary,
});

export function CounselingNotesPage() {
  const { c, sh } = useTheme();
  const [notesData, setNotesData] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeType, setActiveType] = useState('All');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPatient, setEditPatient] = useState('');
  const [editShared, setEditShared] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3000);
  };

  // Real notes stored on the backend
  const load = (keep?: string) => api.get('/doctor/notes').then(res => {
    const mapped = (res.data.notes || []).map(mapNote);
    setNotesData(mapped);
    setSelected(prev => keep || prev || mapped[0]?.id || null);
  }).catch(() => {});

  useEffect(() => {
    load();
    api.get('/doctor/patients').then(r => setPatients(r.data.patients || [])).catch(() => {});
  }, []);

  // Category chips reflect the tags actually in use, plus the suggestions.
  const categories = ['All', ...Array.from(new Set([
    ...notesData.flatMap((n: any) => n.tags || []),
    ...SUGGESTED_TAGS,
  ]))];

  const createNote = async () => {
    try {
      const res = await api.post('/doctor/notes', { title: 'New note', content: '' });
      const note = mapNote(res.data.note);
      setNotesData(prev => [note, ...prev]);
      setSelected(note.id);
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditTags([]);
      setEditPatient('');
      setEditShared(false);
      setIsEditing(true);
    } catch (e: any) { flash(e.message || 'Could not create the note', true); }
  };

  const saveNote = async () => {
    if (!selected) return;
    if (!editTitle.trim()) { flash('Give the note a title', true); return; }
    setBusy('save');
    try {
      const res = await api.put(`/doctor/notes/${selected}`, {
        title: editTitle.trim(),
        content: editContent,
        tags: editTags,
        patientId: editPatient || null,
        shared: editShared,
      });
      const updated = mapNote(res.data.note);
      setNotesData(prev => prev.map(n => n.id === selected ? updated : n));
      setIsEditing(false);
      flash('Note saved');
    } catch (e: any) { flash(e.message || 'Could not save', true); }
    finally { setBusy(''); }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await api.delete(`/doctor/notes/${id}`);
      setNotesData(prev => prev.filter(n => n.id !== id));
      setSelected(prev => (prev === id ? null : prev));
      setIsEditing(false);
      flash('Note deleted');
    } catch (e: any) { flash(e.message || 'Could not delete', true); }
  };

  const exportPdf = async (id: string) => {
    setBusy('pdf');
    try {
      await api.download(`/doctor/notes/${id}/pdf`);
      flash('PDF downloaded');
    } catch (e: any) { flash(e.message || 'Export failed', true); }
    finally { setBusy(''); }
  };

  const generateSummary = async (id: string) => {
    setBusy('ai');
    try {
      const res = await api.post(`/doctor/notes/${id}/summarise`);
      setNotesData(prev => prev.map(n => n.id === id ? mapNote(res.data.note) : n));
      flash('Summary generated');
    } catch (e: any) { flash(e.message || 'Could not summarise', true); }
    finally { setBusy(''); }
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t) return;
    setEditTags(prev => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };

  /**
   * Voice dictation via the browser's SpeechRecognition API.
   *
   * Chrome and Edge expose it as webkitSpeechRecognition; Firefox has no
   * implementation, so the button reports that rather than silently doing
   * nothing. Only final results are appended, otherwise interim guesses
   * would keep rewriting the note as you speak.
   */
  const toggleDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      flash('Voice input needs Chrome or Edge — your browser does not support it', true);
      return;
    }
    if (dictating) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (ev: any) => {
      let finalText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript;
      }
      if (finalText) {
        setEditContent(prev => (prev ? `${prev.replace(/\s+$/, '')} ` : '') + finalText.trim());
      }
    };
    rec.onerror = (ev: any) => {
      flash(ev.error === 'not-allowed'
        ? 'Microphone access was blocked — allow it in your browser address bar'
        : `Dictation stopped: ${ev.error}`, true);
      setDictating(false);
    };
    rec.onend = () => setDictating(false);

    recognitionRef.current = rec;
    rec.start();
    setDictating(true);
    flash('Listening — speak now, click the mic again to stop');
  };

  // Never leave the microphone open if the page unmounts mid-dictation.
  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* already stopped */ } }, []);

  /** Asks the backend to draft a SOAP-shaped note from the patient's record. */
  const generateDraft = async () => {
    const target = editPatient || selectedNote?.patientId;
    if (!target) { flash('Link a patient first — the draft is built from their record', true); return; }
    setBusy('draft');
    try {
      const res = await api.post('/doctor/notes/draft', { patientId: target });
      const d = res.data.draft;
      // Appended, never overwriting — losing typed work to a generated draft
      // would be far worse than an extra paragraph to delete.
      setEditContent(prev => (prev.trim() ? `${prev.trim()}\n\n${d.content}` : d.content));
      if (!editTitle.trim() || editTitle === 'New note') setEditTitle(d.title);
      setEditTags(prev => Array.from(new Set([...prev, ...(d.tags || [])])));
      flash('Draft inserted — review and edit before saving');
    } catch (e: any) {
      flash(e.message || 'Could not draft that note', true);
    } finally { setBusy(''); }
  };

  /** Wraps the current textarea selection in markdown-ish syntax. */
  const applyFormat = (kind: string) => {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = editContent.slice(a, b);
    const wrap: Record<string, [string, string]> = {
      bold: ['**', '**'], italic: ['_', '_'], underline: ['__', '__'],
      list: ['\n- ', ''], quote: ['\n> ', ''],
    };
    const [pre, post] = wrap[kind] || ['', ''];
    const next = editContent.slice(0, a) + pre + (sel || (kind === 'list' || kind === 'quote' ? '' : 'text')) + post + editContent.slice(b);
    setEditContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = a + pre.length + (sel || 'text').length;
      el.setSelectionRange(pos, pos);
    });
  };

  const filtered = notesData.filter(n => {
    const matchCat = activeCategory === 'All' || n.category === activeCategory;
    const matchType = activeType === 'All' || n.type === activeType.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.patient.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const selectedNote = notesData.find(n => n.id === selected);

  const startEdit = () => {
    if (!selectedNote) return;
    if (isEditing) { setIsEditing(false); return; }
    setEditContent(selectedNote.content);
    setEditTitle(selectedNote.title);
    setEditTags(selectedNote.tags || []);
    setEditPatient(selectedNote.patientId || '');
    setEditShared(selectedNote.type === 'shared');
    setIsEditing(true);
  };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter', background: c.background, position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 12, zIndex: 400,
          background: toast.bad ? '#FFEBEE' : c.primary,
          color: toast.bad ? c.error : 'white',
          fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        }}>{toast.text}</div>
      )}
      {/* Left panel: Note list */}
      <div style={{ width: 320, background: c.white, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Notes</h2>
            <button onClick={createNote} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> New Note
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} />
            <input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 9, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.background, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {typeFilters.map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                style={{ flex: 1, padding: '5px 0', borderRadius: 8, border: `1px solid ${activeType === t ? c.primary : c.border}`, fontFamily: 'Inter', fontSize: 11, cursor: 'pointer', background: activeType === t ? c.veryLightSage : 'transparent', color: activeType === t ? c.primary : c.textSecondary, fontWeight: activeType === t ? 600 : 400 }}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Category chips */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${activeCategory === cat ? c.primary : c.border}`, fontFamily: 'Inter', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', background: activeCategory === cat ? c.veryLightSage : 'transparent', color: activeCategory === cat ? c.primary : c.textSecondary, fontWeight: activeCategory === cat ? 600 : 400, flexShrink: 0 }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Note list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {!filtered.length && (
            <div style={{ padding: '30px 16px', textAlign: 'center', fontFamily: 'Inter', fontSize: 12.5, color: c.textMuted, lineHeight: 1.7 }}>
              {notesData.length ? 'No notes match these filters.' : 'No notes yet — hit New Note to write your first.'}
            </div>
          )}
          {filtered.map((note: any) => (
            <div
              key={note.id}
              onClick={() => { setSelected(note.id); setIsEditing(false); }}
              style={{
                padding: '14px', borderRadius: 12, cursor: 'pointer', marginBottom: 6,
                background: selected === note.id ? c.veryLightSage : 'transparent',
                border: `1px solid ${selected === note.id ? c.border : 'transparent'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (selected !== note.id) (e.currentTarget as HTMLDivElement).style.background = c.background; }}
              onMouseLeave={(e) => { if (selected !== note.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {note.patient.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 12, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>{note.patient} · {note.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {note.aiGenerated && <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 5, background: '#E8EAF6', color: '#3F51B5', fontWeight: 600 }}>AI</span>}
                  {note.type === 'private' ? <Lock size={9} color={c.textMuted} /> : <Eye size={9} color={c.primary} />}
                </div>
              </div>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {note.preview}
              </p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{ padding: '2px 7px', borderRadius: 7, background: c.mintAccent, color: c.primary, fontSize: 10, fontWeight: 500 }}>#{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedNote ? (
          <>
            {/* Note header */}
            <div style={{ padding: '18px 28px', background: c.white, borderBottom: `1px solid ${c.border}` }}>
              {isEditing ? (
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{ width: '100%', fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: c.textPrimary, border: 'none', outline: 'none', background: 'transparent', marginBottom: 8 }}
                />
              ) : (
                <h2 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: c.textPrimary, margin: '0 0 8px' }}>{selectedNote.title}</h2>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, fontWeight: 500 }}>{selectedNote.patient}</span>
                <span style={{ fontSize: 12, color: c.textMuted }}>·</span>
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted }}>{selectedNote.date}</span>
                <span style={{ padding: '2px 8px', borderRadius: 7, background: selectedNote.type === 'private' ? '#E8EAF6' : c.veryLightSage, color: selectedNote.type === 'private' ? '#3F51B5' : c.primary, fontSize: 10, fontWeight: 600 }}>
                  {selectedNote.type === 'private' ? 'Private' : 'Shared'}
                </span>
                {selectedNote.aiGenerated && <span style={{ padding: '2px 8px', borderRadius: 7, background: '#E8EAF6', color: '#3F51B5', fontSize: 10, fontWeight: 600 }}>AI Generated</span>}
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>
                    <Edit3 size={12} /> {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                  <button onClick={() => exportPdf(selectedNote.id)} disabled={busy === 'pdf'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: busy === 'pdf' ? 'wait' : 'pointer' }}>
                    <Download size={12} /> {busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
                  </button>
                  <button onClick={() => deleteNote(selectedNote.id)} title="Delete note" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.error, cursor: 'pointer' }}>
                    <Trash2 size={12} />
                  </button>
                  <button onClick={() => generateSummary(selectedNote.id)} disabled={busy === 'ai'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: 'none', background: c.primary, fontFamily: 'Inter', fontSize: 12, color: 'white', cursor: busy === 'ai' ? 'wait' : 'pointer', opacity: busy === 'ai' ? 0.7 : 1 }}>
                    <Bot size={12} /> {busy === 'ai' ? 'Reading…' : 'AI Summary'}
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar (only when editing) */}
            {isEditing && (
              <div style={{ padding: '10px 28px', background: c.white, borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                {[
                  { Icon: Bold, label: 'Bold', kind: 'bold' },
                  { Icon: Italic, label: 'Italic', kind: 'italic' },
                  { Icon: Underline, label: 'Underline', kind: 'underline' },
                  { Icon: List, label: 'Bullet list', kind: 'list' },
                  { Icon: Quote, label: 'Quote', kind: 'quote' },
                ].map(({ Icon, label, kind }) => (
                  <button
                    key={label}
                    title={label}
                    onClick={() => applyFormat(kind)}
                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
                <div style={{ width: 1, height: 20, background: c.border, margin: '0 4px' }} />

                <button
                  title={dictating ? 'Stop dictation' : 'Dictate with your voice'}
                  onClick={toggleDictation}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
                    borderRadius: 7, cursor: 'pointer',
                    border: `1px solid ${dictating ? '#EF4444' : c.border}`,
                    background: dictating ? '#FFEBEE' : 'transparent',
                    color: dictating ? '#EF4444' : c.textSecondary,
                    fontFamily: 'Inter', fontSize: 12, fontWeight: dictating ? 600 : 400,
                  }}>
                  <Mic size={13} /> {dictating ? 'Listening…' : 'Voice'}
                </button>

                <button
                  title="Draft this note from the patient's record"
                  onClick={generateDraft}
                  disabled={busy === 'draft'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px',
                    borderRadius: 7, cursor: busy === 'draft' ? 'wait' : 'pointer',
                    border: `1px solid ${c.border}`, background: 'transparent',
                    color: c.textSecondary, fontFamily: 'Inter', fontSize: 12,
                  }}>
                  <Bot size={13} /> {busy === 'draft' ? 'Drafting…' : 'AI Generate'}
                </button>

                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>
                  {editContent.trim() ? `${editContent.trim().split(/\s+/).length} words` : 'Empty'}
                </span>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <textarea
                    ref={contentRef}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Write your clinical note…"
                    style={{
                      width: '100%', minHeight: 320, padding: '18px', borderRadius: 14,
                      border: `1.5px solid ${c.border}`, fontFamily: 'Inter', fontSize: 15,
                      color: c.textPrimary, lineHeight: 1.8, outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box', background: c.white,
                    }}
                    onFocus={(e) => { e.target.style.borderColor = c.primary; }}
                    onBlur={(e) => { e.target.style.borderColor = c.border; }}
                  />
                  {/* Note metadata — none of this was editable before, which is
                      why every note showed as "General" and "Private". */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>Linked patient</div>
                      <select
                        value={editPatient}
                        onChange={e => setEditPatient(e.target.value)}
                        style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                      >
                        <option value="">General note (no patient)</option>
                        {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>Visibility</div>
                      <button
                        onClick={() => setEditShared(v => !v)}
                        style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${editShared ? c.primary : c.border}`, background: editShared ? c.veryLightSage : 'transparent', fontFamily: 'Inter', fontSize: 13, color: editShared ? c.primary : c.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                      >
                        {editShared ? <><Eye size={13} /> Shared with patient</> : <><Lock size={13} /> Private to me</>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>Tags</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {editTags.map(tag => (
                        <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 20, background: c.veryLightSage, color: c.primary, fontSize: 12, fontWeight: 500 }}>
                          #{tag}
                          <button onClick={() => setEditTags(prev => prev.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.primary, display: 'flex', padding: 0 }}>
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                      {!editTags.length && <span style={{ fontSize: 12, color: c.textMuted }}>No tags yet</span>}
                    </div>
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Type a tag and press Enter"
                      style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {SUGGESTED_TAGS.filter(t => !editTags.includes(t)).map(t => (
                        <button key={t} onClick={() => addTag(t)} style={{ padding: '3px 9px', borderRadius: 20, border: `1px dashed ${c.border}`, background: 'transparent', fontSize: 11, color: c.textMuted, cursor: 'pointer' }}>
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveNote} disabled={busy === 'save'} style={{ padding: '10px 22px', borderRadius: 11, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: busy === 'save' ? 'wait' : 'pointer', opacity: busy === 'save' ? 0.7 : 1 }}>
                      {busy === 'save' ? 'Saving…' : 'Save Note'}
                    </button>
                    <button onClick={() => setIsEditing(false)} style={{ padding: '10px 18px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: c.white, borderRadius: 18, padding: '28px', boxShadow: sh.card, border: `1px solid ${c.border}`, marginBottom: 18 }}>
                    <p style={{ fontFamily: 'Inter', fontSize: 15, color: selectedNote.content ? c.textPrimary : c.textMuted, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {selectedNote.content || 'This note is empty. Hit Edit to start writing.'}
                    </p>
                  </div>

                  {selectedNote.aiSummary && (
                    <div style={{ background: c.veryLightSage, borderRadius: 18, padding: '20px 24px', border: `1px solid ${c.mintAccent}`, marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <Bot size={14} color={c.primary} />
                        <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: c.primary }}>AI Summary</span>
                      </div>
                      <p style={{ fontFamily: 'Inter', fontSize: 13.5, color: c.textSecondary, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedNote.aiSummary}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedNote.tags.map(tag => (
                      <span key={tag} style={{ padding: '5px 12px', borderRadius: 20, background: c.veryLightSage, color: c.primary, fontSize: 12, fontWeight: 500 }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
            <FileText size={44} color={c.textMuted} />
            <p style={{ fontFamily: 'Inter', fontSize: 15, color: c.textMuted, margin: 0 }}>Select a note to view or edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
