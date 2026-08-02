import { useState, useEffect, useRef } from 'react';
import { Search, Upload, Download, Eye, Trash2 } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { colors as staticColors } from '../colors';
import { api } from '../../../lib/api';

const typeIcon: Record<string, { icon: string; color: string }> = {
  pdf:  { icon: '📄', color: staticColors.error },
  doc:  { icon: '📝', color: '#2196F3' },
  docx: { icon: '📝', color: '#2196F3' },
  xls:  { icon: '📊', color: staticColors.success },
  xlsx: { icon: '📊', color: staticColors.success },
  csv:  { icon: '📊', color: staticColors.success },
  txt:  { icon: '📃', color: staticColors.textMuted },
  png:  { icon: '🖼️', color: '#7C6FFF' },
  jpg:  { icon: '🖼️', color: '#7C6FFF' },
  jpeg: { icon: '🖼️', color: '#7C6FFF' },
  webp: { icon: '🖼️', color: '#7C6FFF' },
  file: { icon: '📎', color: staticColors.textMuted },
};

const FOLDER_META: Record<string, { icon: string; color: string }> = {
  form: { icon: '📋', color: staticColors.primary },
  worksheet: { icon: '📝', color: staticColors.warning },
  resource: { icon: '📚', color: '#00BCD4' },
  file: { icon: '📄', color: '#7C6FFF' },
};

const PREVIEWABLE = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt'];

export function DocumentsPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [kindFilter, setKindFilter] = useState('all');
  const [patients, setPatients] = useState<any[]>([]);
  const [attachTo, setAttachTo] = useState('');
  const [category, setCategory] = useState('file');
  const fileInput = useRef<HTMLInputElement>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3200);
  };

  // Real documents stored on the backend
  const loadDocs = () => api.get('/doctor/documents').then(res => {
    setFiles((res.data.documents || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      // Real extension off the stored filename — this used to guess "pdf"
      // for everything unless the name contained the word "image".
      type: d.ext || String(d.name || '').split('.').pop()?.toLowerCase() || 'file',
      kind: d.type || 'file',
      size: d.size,
      date: new Date(d.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      patient: d.patientName,
      hasFile: !!d.storedName,
    })));
  }).catch(() => {});

  useEffect(() => {
    loadDocs();
    api.get('/doctor/patients').then(r => setPatients(r.data.patients || [])).catch(() => {});
  }, []);

  /** Uploads one or more files, sequentially so progress stays readable. */
  const uploadFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    const tooBig = arr.find(f => f.size > 25 * 1024 * 1024);
    if (tooBig) { flash(`"${tooBig.name}" is over the 25 MB limit`, true); return; }

    setUploading(true);
    let ok = 0;
    for (let i = 0; i < arr.length; i++) {
      setProgress(`Uploading ${i + 1} of ${arr.length}…`);
      const fd = new FormData();
      fd.append('file', arr[i]);
      fd.append('type', category);
      if (attachTo) fd.append('patientId', attachTo);
      try { await api.upload('/doctor/documents/upload', fd); ok++; }
      catch (e: any) { flash(e.message || `Could not upload "${arr[i].name}"`, true); }
    }
    setUploading(false);
    setProgress('');
    if (ok) flash(`${ok} file${ok === 1 ? '' : 's'} uploaded`);
    loadDocs();
  };

  const download = async (f: any, inline = false) => {
    if (!f.hasFile) { flash('This entry has no file attached', true); return; }
    try {
      await api.download(`/doctor/documents/${f.id}/download${inline ? '?inline=1' : ''}`, f.name, inline);
    } catch (e: any) { flash(e.message || 'Download failed', true); }
  };

  const remove = async (f: any) => {
    if (!window.confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/doctor/documents/${f.id}`);
      setFiles(prev => prev.filter(x => x.id !== f.id));
      flash('Document deleted');
    } catch (e: any) { flash(e.message || 'Could not delete', true); }
  };

  // Folders derived from real document categories
  const folders = Object.entries(
    files.reduce((acc: Record<string, number>, f: any) => { acc[f.kind] = (acc[f.kind] || 0) + 1; return acc; }, {})
  ).map(([kind, count], i) => ({
    id: kind,
    name: kind.charAt(0).toUpperCase() + kind.slice(1) + 's',
    count,
    icon: FOLDER_META[kind]?.icon || '📄',
    color: FOLDER_META[kind]?.color || '#7C6FFF',
  }));

  const filteredFiles = files.filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase()) &&
    (!selectedFolder || f.kind === selectedFolder) &&
    (kindFilter === 'all' || f.type === kindFilter)
  );

  const extensions = Array.from(new Set(files.map((f: any) => f.type))).sort();

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 12, zIndex: 400,
          background: toast.bad ? '#FFEBEE' : colors.primary,
          color: toast.bad ? colors.error : 'white',
          fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        }}>{toast.text}</div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.white, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={kindFilter}
            onChange={e => setKindFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All file types</option>
            {extensions.map(x => <option key={x} value={x}>{String(x).toUpperCase()}</option>)}
          </select>
          <input
            ref={fileInput}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
            <Upload size={14} /> {uploading ? progress || 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
        }}
        style={{
          borderRadius: 20,
          border: `2px dashed ${isDragging ? colors.primary : colors.border}`,
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: isDragging ? colors.veryLightSage : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Upload size={28} color={isDragging ? colors.primary : colors.textMuted} />
        <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: isDragging ? colors.primary : colors.textPrimary }}>
          Drop files here or <span style={{ color: colors.primary }}>browse</span>
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>PDF, Word, Excel, text or images up to 25MB</div>

        {/* Where the next upload lands — chosen before dropping, so files
            arrive already filed against a patient and category. */}
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, cursor: 'pointer', outline: 'none' }}
          >
            <option value="file">General file</option>
            <option value="form">Form</option>
            <option value="worksheet">Worksheet</option>
            <option value="resource">Resource</option>
          </select>
          <select
            value={attachTo}
            onChange={e => setAttachTo(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Not patient-specific</option>
            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Folders */}
      <div>
        <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 14 }}>Folders</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {folders.map(folder => (
            <div
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id === selectedFolder ? null : folder.id)}
              style={{
                background: colors.white,
                borderRadius: 16,
                padding: '18px 16px',
                boxShadow: shadows.card,
                border: `1.5px solid ${selectedFolder === folder.id ? folder.color : colors.border}`,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = folder.color; }}
              onMouseLeave={(e) => { if (selectedFolder !== folder.id) (e.currentTarget as HTMLDivElement).style.borderColor = colors.border; }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{folder.icon}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>{folder.name}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{folder.count} files</div>
            </div>
          ))}
        </div>
      </div>

      {/* Files Table */}
      <div style={{ background: colors.white, borderRadius: 20, border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: shadows.card }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Recent Files</h3>
          <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>{filteredFiles.length} files</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, background: colors.background }}>
              {['Name', 'Type', 'Patient', 'Size', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: colors.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filteredFiles.length && (
              <tr><td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', fontFamily: 'Inter', fontSize: 13.5, color: colors.textMuted }}>
                {files.length ? 'Nothing matches these filters.' : 'No documents yet — drop a file above to get started.'}
              </td></tr>
            )}
            {filteredFiles.map((file, i) => {
              const ti = typeIcon[file.type] || typeIcon.pdf;
              return (
                <tr
                  key={file.id}
                  style={{ borderBottom: i < filteredFiles.length - 1 ? `1px solid ${colors.border}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = colors.background; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{ti.icon}</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>{file.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 8, background: `${ti.color}18`, color: ti.color, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{file.type}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontFamily: 'Inter', fontSize: 12, color: file.patient ? colors.textSecondary : colors.textMuted }}>
                    {file.patient || 'General'}
                  </td>
                  <td style={{ padding: '13px 16px', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>{file.size}</td>
                  <td style={{ padding: '13px 16px', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>{file.date}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {PREVIEWABLE.includes(file.type) && file.hasFile && (
                        <button onClick={() => download(file, true)} title="Preview" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                          <Eye size={12} />
                        </button>
                      )}
                      <button onClick={() => download(file)} title={file.hasFile ? 'Download' : 'No file attached'} disabled={!file.hasFile} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: file.hasFile ? 'pointer' : 'not-allowed', opacity: file.hasFile ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary }}>
                        <Download size={12} />
                      </button>
                      <button onClick={() => remove(file)} title="Delete" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.error }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
