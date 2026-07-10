import { useState, useEffect } from 'react';
import { Search, Plus, Tag, Mic, FileText, Bot, Download, Edit3, Lock, Eye, Bold, Italic, Underline, List, Quote } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const categories = ['All', 'CBT', 'Assessment', 'PTSD', 'Burnout', 'Mindfulness', 'Crisis'];
const typeFilters = ['All', 'Private', 'Shared'];

const mapNote = (n: any) => ({
  id: n.id,
  patient: n.patientName || 'General',
  date: new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  title: n.title,
  category: n.tags?.[0] || 'General',
  tags: n.tags || [],
  type: 'private' as const,
  preview: (n.content || '').slice(0, 90) + ((n.content || '').length > 90 ? '…' : ''),
  content: n.content || '',
  aiGenerated: false,
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

  // Real notes stored on the backend
  useEffect(() => {
    api.get('/doctor/notes').then(res => {
      const mapped = (res.data.notes || []).map(mapNote);
      setNotesData(mapped);
      setSelected(prev => prev || mapped[0]?.id || null);
    }).catch(() => {});
  }, []);

  const createNote = async () => {
    try {
      const res = await api.post('/doctor/notes', { title: 'New note', content: '' });
      const note = mapNote(res.data.note);
      setNotesData(prev => [note, ...prev]);
      setSelected(note.id);
      setEditTitle(note.title);
      setEditContent(note.content);
      setIsEditing(true);
    } catch { /* ignore */ }
  };

  const saveNote = async () => {
    if (!selected) return;
    try {
      const res = await api.put(`/doctor/notes/${selected}`, { title: editTitle, content: editContent });
      const updated = mapNote(res.data.note);
      setNotesData(prev => prev.map(n => n.id === selected ? updated : n));
    } catch { /* ignore */ }
    setIsEditing(false);
  };

  const filtered = notesData.filter(n => {
    const matchCat = activeCategory === 'All' || n.category === activeCategory;
    const matchType = activeType === 'All' || n.type === activeType.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.patient.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const selectedNote = notesData.find(n => n.id === selected);

  const startEdit = () => {
    if (selectedNote) {
      setEditContent(selectedNote.content);
      setEditTitle(selectedNote.title);
      setIsEditing(true);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter', background: c.background }}>
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
                  <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>
                    <Download size={12} /> Export PDF
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: 'none', background: c.primary, fontFamily: 'Inter', fontSize: 12, color: 'white', cursor: 'pointer' }}>
                    <Bot size={12} /> AI Summary
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar (only when editing) */}
            {isEditing && (
              <div style={{ padding: '10px 28px', background: c.white, borderBottom: `1px solid ${c.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                {[
                  { Icon: Bold, label: 'Bold' },
                  { Icon: Italic, label: 'Italic' },
                  { Icon: Underline, label: 'Underline' },
                  { Icon: List, label: 'List' },
                  { Icon: Quote, label: 'Quote' },
                  { Icon: Tag, label: 'Tag' },
                  { Icon: Mic, label: 'Voice' },
                  { Icon: Bot, label: 'AI Generate' },
                ].map(({ Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    style={{
                      width: '100%', minHeight: 320, padding: '18px', borderRadius: 14,
                      border: `1.5px solid ${c.border}`, fontFamily: 'Inter', fontSize: 15,
                      color: c.textPrimary, lineHeight: 1.8, outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box', background: c.white,
                    }}
                    onFocus={(e) => { e.target.style.borderColor = c.primary; }}
                    onBlur={(e) => { e.target.style.borderColor = c.border; }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveNote} style={{ padding: '10px 22px', borderRadius: 11, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Note</button>
                    <button onClick={() => setIsEditing(false)} style={{ padding: '10px 18px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: c.white, borderRadius: 18, padding: '28px', boxShadow: sh.card, border: `1px solid ${c.border}`, marginBottom: 18 }}>
                    <p style={{ fontFamily: 'Inter', fontSize: 15, color: c.textPrimary, lineHeight: 1.8, margin: 0 }}>{selectedNote.content}</p>
                  </div>
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
