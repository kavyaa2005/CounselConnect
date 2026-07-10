import { useState, useEffect } from 'react';
import { Search, Upload, FolderOpen, FileText, Image, Download, Eye, Trash2, Plus, Filter } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { colors as staticColors } from '../colors';
import { api } from '../../../lib/api';

const typeIcon: Record<string, { icon: string; color: string }> = {
  pdf: { icon: '📄', color: staticColors.error },
  docx: { icon: '📝', color: '#2196F3' },
  png: { icon: '🖼️', color: staticColors.success },
  jpg: { icon: '🖼️', color: staticColors.success },
};

const FOLDER_META: Record<string, { icon: string; color: string }> = {
  form: { icon: '📋', color: staticColors.primary },
  worksheet: { icon: '📝', color: staticColors.warning },
  resource: { icon: '📚', color: '#00BCD4' },
  file: { icon: '📄', color: '#7C6FFF' },
};

export function DocumentsPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  // Real documents stored on the backend
  const loadDocs = () => api.get('/doctor/documents').then(res => {
    setFiles((res.data.documents || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.name.toLowerCase().includes('image') ? 'png' : 'pdf',
      kind: d.type || 'file',
      size: d.size,
      date: new Date(d.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      patient: null,
      preview: true,
    })));
  }).catch(() => {});
  useEffect(() => { loadDocs(); }, []);

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
    (!selectedFolder || f.kind === selectedFolder)
  );

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, cursor: 'pointer' }}>
            <Filter size={14} /> Filter
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
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
        <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>PDF, DOCX, PNG, JPG up to 25MB</div>
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
                      {file.preview && (
                        <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                          <Eye size={12} />
                        </button>
                      )}
                      <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.primary }}>
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => { api.delete(`/doctor/documents/${file.id}`).then(loadDocs).catch(() => {}); }}
                        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.error }}
                      >
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
