// Files a counselor has shared with this client.
//
// Read-only by design: the client receives here, they don't upload. Files
// they want to send go with a booking or through chat, where they're attached
// to a context the counselor will actually see.

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, Eye, Search, Inbox } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝',
  xls: '📊', xlsx: '📊', csv: '📊',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', gif: '🖼️',
  txt: '📃', mp3: '🎧', wav: '🎧', m4a: '🎧',
};

const PREVIEWABLE = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt'];

export function MyFilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get('/shared-files')
      .then(r => setFiles(r.data.files || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  const open = async (f: any, inline = false) => {
    try {
      await api.download(`/shared-files/${f.id}/download${inline ? '?inline=1' : ''}`, f.name, inline);
    } catch (e: any) {
      flash(e.message || 'Could not open that file', true);
    }
  };

  const filtered = files.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.note || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.sharedBy || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by counselor — with more than one, whose file this is matters.
  const groups = filtered.reduce((acc: Record<string, any[]>, f) => {
    (acc[f.sharedBy] = acc[f.sharedBy] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 px-5 py-3 rounded-2xl z-50"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: toast.bad ? 'rgba(217,119,87,0.95)' : CC.forestSage,
            color: 'white', fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
          }}>
          {toast.text}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>From your counselor</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 6 }}>
          My Files
        </h1>
        <p style={{ color: CC.mutedOlive, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 20, maxWidth: 560 }}>
          Worksheets, reading and anything else your counselor has sent you. Everything here is yours to keep.
        </p>

        {files.length > 3 && (
          <div className="relative mb-5" style={{ maxWidth: 380 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: CC.mutedOlive }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search your files…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none"
              style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, color: CC.primaryText, fontSize: '0.9rem' }} />
          </div>
        )}

        {loading && (
          <p style={{ color: CC.mutedOlive, fontSize: '0.9rem' }}>Loading…</p>
        )}

        {!loading && !files.length && (
          <div className="p-12 rounded-3xl text-center" style={{ backgroundColor: CC.lightIvory }}>
            <Inbox size={34} color={CC.mutedOlive} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: CC.primaryText, marginBottom: 6 }}>
              Nothing here yet
            </p>
            <p style={{ color: CC.mutedOlive, fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
              When your counselor shares a worksheet or some reading with you, it'll appear here.
            </p>
          </div>
        )}

        {!loading && !!files.length && !filtered.length && (
          <p style={{ color: CC.mutedOlive, fontSize: '0.9rem' }}>Nothing matches “{search}”.</p>
        )}

        {Object.entries(groups).map(([counselor, list]) => (
          <div key={counselor} className="mb-7">
            {Object.keys(groups).length > 1 && (
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: CC.primaryText, marginBottom: 10 }}>
                {counselor}
              </h2>
            )}
            <div className="flex flex-col gap-3">
              {(list as any[]).map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  className="p-4 rounded-2xl flex items-start gap-4"
                  style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}` }}>
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: CC.softSage, fontSize: '1.2rem' }}>
                    {ICONS[f.ext] || '📎'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 700, fontSize: '0.94rem', color: CC.primaryText }} className="truncate">
                      {f.name}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: CC.mutedOlive, marginTop: 2 }}>
                      {Object.keys(groups).length === 1 ? `${f.sharedBy} · ` : ''}
                      {new Date(f.sharedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {f.size ? ` · ${f.size}` : ''}
                    </p>
                    {f.note && (
                      <div className="mt-2 pl-3 py-1" style={{ borderLeft: `2px solid ${CC.forestSage}` }}>
                        <p style={{ fontSize: '0.85rem', color: CC.primaryText, lineHeight: 1.6 }}>{f.note}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {PREVIEWABLE.includes(f.ext) && (
                      <button onClick={() => open(f, true)} title="Open in a new tab"
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: CC.softSage, border: 'none', cursor: 'pointer' }}>
                        <Eye size={15} color={CC.mutedOlive} />
                      </button>
                    )}
                    <button onClick={() => open(f)} title="Download"
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, border: 'none', cursor: 'pointer' }}>
                      <Download size={15} color="white" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {!loading && !!files.length && (
          <p style={{ fontSize: '0.8rem', color: CC.mutedOlive, marginTop: 4 }}>
            <FileText size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
            Only your counselor can share files here. To send them something, attach it when you book a session or in Messages.
          </p>
        )}
      </motion.div>
    </div>
  );
}
