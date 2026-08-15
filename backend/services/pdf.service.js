// PDF generation for clinical documents.
//
// Streams straight to the HTTP response — nothing is written to disk.

const PDFDocument = require('pdfkit');
const { money, moneyShort, symbol } = require('../utils/money.utils');

const BRAND = {
  primary: '#355C4D',
  sage: '#5E8B7E',
  light: '#F0F7F5',
  text: '#2C3A34',
  muted: '#8A9A93',
  border: '#E3EBE7',
  accent: '#D8A48F',
};

const fmtDate = (iso, withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

/**
 * Builds a patient journal summary and pipes it to `res`.
 *
 * @param res      express response
 * @param patient  { name, email, reason, goals }
 * @param doctor   { name, title }
 * @param summary  output of journalService.getSharedSummary()
 */
function streamJournalSummary(res, { patient, doctor, summary }) {
  const doc = new PDFDocument({
    size: 'A4',
    // bufferPages is required for the footer pass at the end — without it
    // switchToPage() only ever sees the final page.
    bufferPages: true,
    // Bottom margin leaves clear air for the footer band
    margins: { top: 56, bottom: 78, left: 56, right: 56 },
    info: {
      Title: `Journal Summary — ${patient.name}`,
      Author: 'CounselConnect',
      Subject: 'Confidential patient journal summary',
      Creator: 'CounselConnect',
    },
  });

  const safeName = String(patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const filename = `journal-summary-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageW = doc.page.width;
  const contentW = pageW - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  /* ── Header band ── */
  doc.rect(0, 0, pageW, 108).fill(BRAND.primary);

  doc.fillColor('#FFFFFF').fontSize(21).font('Helvetica-Bold')
    .text('CounselConnect', left, 32);
  doc.fontSize(10).font('Helvetica').fillColor('#C9DBD3')
    .text('Confidential Journal Summary', left, 60);

  doc.fontSize(8).fillColor('#A9C4B9')
    .text(`Generated ${fmtDate(new Date().toISOString(), true)}`, left, 80);

  doc.y = 140;

  /* ── Patient / clinician block ── */
  const boxTop = doc.y;
  doc.roundedRect(left, boxTop, contentW, 92, 8)
    .fillAndStroke(BRAND.light, BRAND.border);

  const colW = contentW / 2 - 14;
  const label = (t, x, y) => doc.fontSize(7.5).font('Helvetica-Bold')
    .fillColor(BRAND.muted).text(t.toUpperCase(), x, y, { characterSpacing: 0.6 });
  const value = (t, x, y, size = 11) => doc.fontSize(size).font('Helvetica-Bold')
    .fillColor(BRAND.text).text(t, x, y, { width: colW });

  label('Patient', left + 16, boxTop + 14);
  value(patient.name || '—', left + 16, boxTop + 26);
  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(patient.email || '', left + 16, boxTop + 42, { width: colW });

  label('Prepared for', left + contentW / 2 + 6, boxTop + 14);
  value(doctor.name || '—', left + contentW / 2 + 6, boxTop + 26);
  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(doctor.title || 'Counselor', left + contentW / 2 + 6, boxTop + 42, { width: colW });

  if (patient.reason) {
    doc.fontSize(8.5).font('Helvetica').fillColor(BRAND.muted)
      .text(`Focus area: ${patient.reason}`, left + 16, boxTop + 66, { width: contentW - 32 });
  }

  doc.y = boxTop + 112;

  /* ── At a glance ── */
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
    .text('At a glance', left, doc.y);
  doc.moveDown(0.5);

  const stats = [
    ['Shared entries', String(summary.sharedCount)],
    ['Kept private', String(summary.privateCount)],
    ['Words written', String(summary.totalWords)],
    ['Avg per entry', `${summary.avgWords} words`],
  ];

  const statTop = doc.y;
  const statW = contentW / stats.length;
  stats.forEach(([k, v], i) => {
    const x = left + i * statW;
    doc.fontSize(17).font('Helvetica-Bold').fillColor(BRAND.primary)
      .text(v, x, statTop, { width: statW - 8 });
    doc.fontSize(8).font('Helvetica').fillColor(BRAND.muted)
      .text(k, x, statTop + 22, { width: statW - 8 });
  });

  doc.y = statTop + 48;

  if (summary.firstEntryAt) {
    doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
      .text(`Journalling period: ${fmtDate(summary.firstEntryAt)} — ${fmtDate(summary.lastEntryAt)}`, left, doc.y);
    doc.moveDown(0.8);
  }

  /* ── Recurring themes ── */
  if (summary.topTags?.length) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
      .text('Recurring themes', left, doc.y);
    doc.moveDown(0.4);

    let x = left;
    let y = doc.y;
    summary.topTags.forEach(({ tag, count }) => {
      const text = `${tag} (${count})`;
      const w = doc.fontSize(9).font('Helvetica').widthOfString(text) + 20;
      if (x + w > left + contentW) { x = left; y += 24; }
      doc.roundedRect(x, y, w, 18, 9).fillAndStroke('#FFFFFF', BRAND.sage);
      doc.fillColor(BRAND.sage).fontSize(9).font('Helvetica')
        .text(text, x + 10, y + 5, { lineBreak: false });
      x += w + 6;
    });
    doc.y = y + 34;
  }

  /* ── Privacy notice ── */
  if (summary.privateCount > 0) {
    const noteTop = doc.y;
    doc.roundedRect(left, noteTop, contentW, 34, 6)
      .fillAndStroke('#FFF8F1', BRAND.accent);
    doc.fontSize(8.5).font('Helvetica').fillColor('#8A5A3B')
      .text(
        `${summary.privateCount} ${summary.privateCount === 1 ? 'entry was' : 'entries were'} marked private by the patient and ${summary.privateCount === 1 ? 'is' : 'are'} not included in this document.`,
        left + 12, noteTop + 11, { width: contentW - 24 }
      );
    doc.y = noteTop + 48;
  }

  /* ── Entries ── */
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
    .text('Journal entries', left, doc.y);
  doc.moveDown(0.6);

  if (!summary.entries.length) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(BRAND.muted)
      .text('This patient has not shared any journal entries.', left, doc.y);
  }

  summary.entries.forEach((e) => {
    // Measure the entry first so a heading is never orphaned from its body
    const bodyText = String(e.content || '').trim() || '(no content)';
    const bodyH = doc.fontSize(10).font('Helvetica')
      .heightOfString(bodyText, { width: contentW, lineGap: 2.5 });
    const needed = bodyH + 62;
    const usableBottom = doc.page.height - doc.page.margins.bottom;

    if (doc.y + needed > usableBottom) doc.addPage();

    const top = doc.y;
    doc.moveTo(left, top).lineTo(left + contentW, top).lineWidth(0.5).stroke(BRAND.border);

    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.text)
      .text(e.title || 'Untitled entry', left, top + 12, { width: contentW - 120 });

    doc.fontSize(8.5).font('Helvetica').fillColor(BRAND.muted)
      .text(fmtDate(e.createdAt), left + contentW - 120, top + 14, { width: 120, align: 'right' });

    let metaY = doc.y + 2;
    const bits = [];
    if (e.moodLabel) bits.push(`Mood: ${e.moodLabel}`);
    if (e.tags?.length) bits.push(e.tags.join(' · '));
    if (bits.length) {
      doc.fontSize(8.5).font('Helvetica').fillColor(BRAND.sage)
        .text(bits.join('   |   '), left, metaY, { width: contentW });
      metaY = doc.y;
    }

    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#404F48')
      .text(String(e.content || '').trim() || '(no content)', left, doc.y, {
        width: contentW, align: 'left', lineGap: 2.5,
      });

    doc.moveDown(1.1);
  });

  /* ── Footer on every page ── */
  // The footer sits below the text margin. PDFKit spawns a fresh page whenever
  // you write past that margin, so drop it to zero for this pass — otherwise
  // each footer cascades into another blank page.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;

    const fy = doc.page.height - 46;
    doc.moveTo(left, fy - 10).lineTo(left + contentW, fy - 10).lineWidth(0.5).stroke(BRAND.border);
    doc.fontSize(7.5).font('Helvetica').fillColor(BRAND.muted)
      .text(
        'Confidential — contains protected patient information. Share only in line with your clinical and legal obligations.',
        left, fy, { width: contentW - 60, lineBreak: false }
      );
    doc.fontSize(7.5).fillColor(BRAND.muted)
      .text(`${i - range.start + 1} / ${range.count}`, left + contentW - 60, fy, {
        width: 60, align: 'right', lineBreak: false,
      });
  }

  doc.flushPages();
  doc.end();
}

/* ══════════════════════════════════════════════════════════════════
   Shared document chrome
   ------------------------------------------------------------------
   streamJournalSummary above predates these helpers and draws its own
   header/footer. Rather than refactor a document that is already
   verified working, the newer exports below share this chrome instead.
   ══════════════════════════════════════════════════════════════════ */

/** Opens a branded A4 document piped to `res` and draws the header band. */
function openDoc(res, { title, subtitle, filename, meta }) {
  const doc = new PDFDocument({
    size: 'A4',
    bufferPages: true,
    margins: { top: 56, bottom: 78, left: 56, right: 56 },
    info: { Title: title, Author: 'CounselConnect', Creator: 'CounselConnect' },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const contentW = doc.page.width - left - doc.page.margins.right;

  doc.rect(0, 0, doc.page.width, 108).fill(BRAND.primary);
  doc.fillColor('#FFFFFF').fontSize(21).font('Helvetica-Bold')
    .text('CounselConnect', left, 32);
  doc.fontSize(10).font('Helvetica').fillColor('#C9DBD3')
    .text(subtitle, left, 60);
  doc.fontSize(8).fillColor('#A9C4B9')
    .text(meta || `Generated ${fmtDate(new Date().toISOString(), true)}`, left, 80);

  doc.y = 140;
  return { doc, left, contentW };
}

/** Draws the confidentiality footer on every buffered page and closes. */
function closeDoc(doc, left, contentW, notice) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // See the note in streamJournalSummary: without this every footer
    // would push PDFKit into spawning another blank page.
    doc.page.margins.bottom = 0;

    const fy = doc.page.height - 46;
    doc.moveTo(left, fy - 10).lineTo(left + contentW, fy - 10).lineWidth(0.5).stroke(BRAND.border);
    doc.fontSize(7.5).font('Helvetica').fillColor(BRAND.muted)
      .text(notice, left, fy, { width: contentW - 60, lineBreak: false });
    doc.fontSize(7.5).fillColor(BRAND.muted)
      .text(`${i - range.start + 1} / ${range.count}`, left + contentW - 60, fy, {
        width: 60, align: 'right', lineBreak: false,
      });
  }
  doc.flushPages();
  doc.end();
}

const slug = (s) => String(s || 'document').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/**
 * Treats placeholder values as empty.
 *
 * Seed data uses an em-dash for "not set", which is truthy — so a plain
 * `value || fallback` silently rendered the placeholder instead of the
 * fallback.
 */
const realValue = (v) => {
  const t = String(v ?? '').trim();
  return t && t !== '—' && t !== '-' && t !== 'N/A' ? t : '';
};

/** Section heading with a rule under it. */
function heading(doc, left, contentW, text) {
  if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) doc.addPage();
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text).text(text, left, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(left, doc.y).lineTo(left + contentW, doc.y).lineWidth(0.5).stroke(BRAND.border);
  doc.moveDown(0.6);
}

/** Evenly spaced statistic row. */
function statRow(doc, left, contentW, stats) {
  const top = doc.y;
  const w = contentW / stats.length;
  stats.forEach(([k, v], i) => {
    const x = left + i * w;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND.primary)
      .text(String(v), x, top, { width: w - 8 });
    doc.fontSize(8).font('Helvetica').fillColor(BRAND.muted)
      .text(k, x, top + 21, { width: w - 8 });
  });
  doc.y = top + 46;
}

/** Two-column label/value detail table. */
function detailTable(doc, left, contentW, rows) {
  rows.forEach(([k, v]) => {
    if (doc.y + 26 > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
      .text(k, left, y, { width: contentW * 0.35 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND.text)
      .text(String(v ?? '—'), left + contentW * 0.35, y, { width: contentW * 0.65 });
    doc.y = Math.max(doc.y, y + 16);
    doc.moveTo(left, doc.y + 3).lineTo(left + contentW, doc.y + 3)
      .lineWidth(0.5).stroke(BRAND.border);
    doc.y += 10;
  });
}

/**
 * Session summary for a single appointment.
 * Pulls in the clinician's linked notes and the patient's mood around the date.
 */
function streamAppointmentSummary(res, { appointment, patient, doctor, notes = [], moods = [] }) {
  const { doc, left, contentW } = openDoc(res, {
    title: `Session Summary — ${patient.name}`,
    subtitle: 'Session Summary',
    filename: `session-summary-${slug(patient.name)}-${slug(appointment.date)}.pdf`,
  });

  /* Patient / clinician block */
  const boxTop = doc.y;
  doc.roundedRect(left, boxTop, contentW, 76, 8).fillAndStroke(BRAND.light, BRAND.border);
  const colW = contentW / 2 - 22;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND.muted)
    .text('PATIENT', left + 16, boxTop + 14, { characterSpacing: 0.6 });
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
    .text(patient.name || '—', left + 16, boxTop + 27, { width: colW });
  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(patient.email || '', left + 16, boxTop + 45, { width: colW });

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND.muted)
    .text('CLINICIAN', left + contentW / 2 + 6, boxTop + 14, { characterSpacing: 0.6 });
  doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND.text)
    .text(doctor.name || '—', left + contentW / 2 + 6, boxTop + 27, { width: colW });
  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(doctor.title || 'Counselor', left + contentW / 2 + 6, boxTop + 45, { width: colW });

  doc.y = boxTop + 96;

  heading(doc, left, contentW, 'Session details');
  detailTable(doc, left, contentW, [
    ['Date', appointment.date],
    ['Time', appointment.time],
    ['Format', appointment.sessionType === 'video' ? 'Video session' : 'Chat session'],
    ['Duration', '50 minutes'],
    ['Status', String(appointment.status || 'confirmed').replace(/^./, (m) => m.toUpperCase())],
    ['Presenting concern', patient.reason || 'General wellbeing'],
    ['Booked on', fmtDate(appointment.createdAt)],
    ['Fee', appointment.price != null ? moneyShort(appointment.price) : '—'],
  ]);
  doc.moveDown(0.6);

  /* Mood context */
  if (moods.length) {
    heading(doc, left, contentW, 'Mood around this session');
    const vals = moods.map((m) => m.value).filter((v) => typeof v === 'number');
    const avg = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    statRow(doc, left, contentW, [
      ['Entries logged', vals.length],
      ['Average mood', avg != null ? `${Math.round(avg * 10) / 10}/5` : '—'],
      ['Lowest', vals.length ? `${Math.min(...vals)}/5` : '—'],
      ['Highest', vals.length ? `${Math.max(...vals)}/5` : '—'],
    ]);
    moods.slice(0, 10).forEach((m) => {
      if (doc.y + 18 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
        .text(fmtDate(m.createdAt), left, doc.y, { width: 150, continued: true });
      doc.fillColor(BRAND.text).font('Helvetica-Bold')
        .text(`   ${m.label || ''} (${m.value}/5)`);
      doc.moveDown(0.2);
    });
    doc.moveDown(0.8);
  }

  /* Clinical notes */
  heading(doc, left, contentW, 'Clinical notes');
  if (!notes.length) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(BRAND.muted)
      .text('No notes were recorded for this patient.', left, doc.y);
    doc.moveDown(1);
  }
  notes.forEach((n) => {
    const body = String(n.content || '').trim() || '(no content)';
    const bodyH = doc.fontSize(10).font('Helvetica')
      .heightOfString(body, { width: contentW, lineGap: 2.5 });
    if (doc.y + bodyH + 46 > doc.page.height - doc.page.margins.bottom) doc.addPage();

    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND.text)
      .text(n.title || 'Untitled note', left, doc.y, { width: contentW - 120 });
    doc.fontSize(8.5).font('Helvetica').fillColor(BRAND.muted)
      .text(fmtDate(n.updatedAt || n.createdAt), left, doc.y + 2);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#404F48')
      .text(body, left, doc.y, { width: contentW, lineGap: 2.5 });
    doc.moveDown(1);
  });

  closeDoc(doc, left, contentW,
    'Confidential — contains protected patient information. Share only in line with your clinical and legal obligations.');
}

/** A single counseling note as a standalone clinical record. */
function streamNote(res, { note, doctor, patient }) {
  const { doc, left, contentW } = openDoc(res, {
    title: note.title || 'Counseling note',
    subtitle: 'Counseling Note',
    filename: `note-${slug(note.title)}-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  doc.fontSize(19).font('Helvetica-Bold').fillColor(BRAND.text)
    .text(note.title || 'Untitled note', left, doc.y, { width: contentW });
  doc.moveDown(0.4);

  const bits = [
    patient ? `Patient: ${patient}` : 'General note',
    `Clinician: ${doctor.name || '—'}`,
    `Last updated ${fmtDate(note.updatedAt || note.createdAt, true)}`,
    note.shared ? 'Shared with patient' : 'Private to clinician',
  ];
  doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
    .text(bits.join('   ·   '), left, doc.y, { width: contentW });
  doc.moveDown(0.8);

  if (note.tags?.length) {
    let x = left;
    let y = doc.y;
    note.tags.forEach((tag) => {
      const t = `#${tag}`;
      const w = doc.fontSize(9).font('Helvetica').widthOfString(t) + 20;
      if (x + w > left + contentW) { x = left; y += 24; }
      doc.roundedRect(x, y, w, 18, 9).fillAndStroke('#FFFFFF', BRAND.sage);
      doc.fillColor(BRAND.sage).fontSize(9).font('Helvetica')
        .text(t, x + 10, y + 5, { lineBreak: false });
      x += w + 6;
    });
    doc.y = y + 32;
  }

  doc.moveTo(left, doc.y).lineTo(left + contentW, doc.y).lineWidth(0.5).stroke(BRAND.border);
  doc.moveDown(0.8);

  doc.fontSize(11).font('Helvetica').fillColor('#404F48')
    .text(String(note.content || '').trim() || '(This note is empty.)', left, doc.y, {
      width: contentW, lineGap: 3.5,
    });

  if (note.aiSummary) {
    doc.moveDown(1.4);
    const top = doc.y;
    const h = doc.fontSize(10).font('Helvetica')
      .heightOfString(note.aiSummary, { width: contentW - 32, lineGap: 2 }) + 40;
    if (top + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const boxTop = doc.y;
    doc.roundedRect(left, boxTop, contentW, h, 8).fillAndStroke(BRAND.light, BRAND.border);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.sage)
      .text('AI SUMMARY', left + 16, boxTop + 12, { characterSpacing: 0.6 });
    doc.fontSize(10).font('Helvetica').fillColor(BRAND.text)
      .text(note.aiSummary, left + 16, boxTop + 26, { width: contentW - 32, lineGap: 2 });
    doc.y = boxTop + h + 10;
  }

  closeDoc(doc, left, contentW,
    'Confidential clinical record — CounselConnect. Not to be redistributed without patient consent.');
}

/** Whole-practice report: the printable twin of the Reports page. */
function streamPracticeReport(res, { doctor, totals, patients = [], feedback, appointments = [], revenue = [], moodTrend = [], period }) {
  const { doc, left, contentW } = openDoc(res, {
    title: `Practice Report — ${doctor.name}`,
    subtitle: 'Practice Report',
    filename: `practice-report-${slug(doctor.name)}-${new Date().toISOString().slice(0, 10)}.pdf`,
    meta: `${period || 'All time'}  ·  Generated ${fmtDate(new Date().toISOString(), true)}`,
  });

  doc.fontSize(15).font('Helvetica-Bold').fillColor(BRAND.text)
    .text(doctor.name || 'Practice', left, doc.y);
  doc.fontSize(9.5).font('Helvetica').fillColor(BRAND.muted)
    .text(doctor.title || 'Counselor', left, doc.y + 2);
  doc.moveDown(1.2);

  heading(doc, left, contentW, 'Key figures');
  statRow(doc, left, contentW, [
    ['Patients', totals.totalPatients ?? 0],
    ['Sessions', totals.totalAppointments ?? 0],
    ['Avg rating', totals.avgRating != null ? `${totals.avgRating}/5` : '—'],
    ['Avg mood', totals.avgMood != null ? `${totals.avgMood}/10` : '—'],
    ['Revenue (mo)', moneyShort(totals.monthlyRevenue ?? 0)],
  ]);
  doc.moveDown(0.4);

  /* Revenue table */
  if (revenue.length) {
    heading(doc, left, contentW, 'Revenue by month');
    detailTable(doc, left, contentW,
      revenue.map((r) => [r.month, moneyShort(r.revenue || 0)]));
    doc.moveDown(0.5);
  }

  /* Mood trend */
  if (moodTrend.length) {
    heading(doc, left, contentW, 'Average patient mood by month');
    detailTable(doc, left, contentW,
      moodTrend.map((m) => [m.month, m.avg != null ? `${m.avg}/10` : 'No entries']));
    doc.moveDown(0.5);
  }

  /* Ratings */
  if (feedback?.total) {
    heading(doc, left, contentW, 'Patient ratings');
    doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
      .text(`${feedback.total} review${feedback.total === 1 ? '' : 's'}, averaging ${feedback.avg}/5`, left, doc.y);
    doc.moveDown(0.6);
    (feedback.distribution || []).forEach((d) => {
      if (doc.y + 20 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const y = doc.y;
      const pct = feedback.total ? d.count / feedback.total : 0;
      doc.fontSize(9).font('Helvetica').fillColor(BRAND.text)
        .text(`${d.star} star${d.star === 1 ? '' : 's'}`, left, y, { width: 60 });
      doc.roundedRect(left + 66, y + 1, contentW - 130, 9, 4.5).fill(BRAND.border);
      if (pct > 0) doc.roundedRect(left + 66, y + 1, (contentW - 130) * pct, 9, 4.5).fill(BRAND.sage);
      doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
        .text(String(d.count), left + contentW - 56, y, { width: 56, align: 'right' });
      doc.y = y + 18;
    });
    doc.moveDown(0.8);
  }

  /* Patient roster */
  heading(doc, left, contentW, `Patient roster (${patients.length})`);
  if (!patients.length) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(BRAND.muted)
      .text('No patients on record yet.', left, doc.y);
  } else {
    const cols = [
      ['Name', 0.30], ['Focus', 0.30], ['Sessions', 0.13], ['Avg mood', 0.13], ['Entries', 0.14],
    ];
    const headerY = doc.y;
    let cx = left;
    cols.forEach(([label, frac]) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.muted)
        .text(label.toUpperCase(), cx, headerY, { width: contentW * frac, characterSpacing: 0.5 });
      cx += contentW * frac;
    });
    doc.y = headerY + 14;
    doc.moveTo(left, doc.y).lineTo(left + contentW, doc.y).lineWidth(0.5).stroke(BRAND.border);
    doc.y += 6;

    patients.forEach((p) => {
      if (doc.y + 20 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const y = doc.y;
      const vals = [
        p.name || '—',
        p.reason || 'General wellbeing',
        String(p.sessions ?? 0),
        p.avgMood != null ? `${p.avgMood}/10` : '—',
        String(p.moodCount ?? 0),
      ];
      let x = left;
      vals.forEach((v, i) => {
        doc.fontSize(9.5).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(i === 0 ? BRAND.text : '#4A5A53')
          .text(v, x, y, { width: contentW * cols[i][1] - 6, ellipsis: true, lineBreak: false });
        x += contentW * cols[i][1];
      });
      doc.y = y + 17;
    });
  }

  /* Recent sessions */
  if (appointments.length) {
    doc.moveDown(1);
    heading(doc, left, contentW, 'Recent sessions');
    appointments.slice(0, 20).forEach((a) => {
      if (doc.y + 18 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const y = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor(BRAND.muted)
        .text(`${a.date} ${a.time}`, left, y, { width: contentW * 0.32, lineBreak: false });
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND.text)
        .text(a.patient?.name || 'Patient', left + contentW * 0.32, y, { width: contentW * 0.34, ellipsis: true, lineBreak: false });
      doc.fontSize(9).font('Helvetica').fillColor('#4A5A53')
        .text(`${a.sessionType || 'video'} · ${a.status || 'confirmed'}`, left + contentW * 0.66, y, { width: contentW * 0.34, lineBreak: false });
      doc.y = y + 16;
    });
  }

  closeDoc(doc, left, contentW,
    'Confidential practice report — CounselConnect. Contains aggregated patient information.');
}

/** Client-facing appointment confirmation / details sheet. */
function streamAppointmentDetails(res, { appointment, client, counselor, payment }) {
  const { doc, left, contentW } = openDoc(res, {
    title: `Appointment — ${counselor.name}`,
    subtitle: 'Appointment Details',
    filename: `appointment-${slug(counselor.name)}-${slug(appointment.date)}.pdf`,
  });

  const inPerson = appointment.mode === 'offline';

  /* Big "when" banner — the thing people actually open this for */
  const boxTop = doc.y;
  doc.roundedRect(left, boxTop, contentW, 82, 8).fillAndStroke(BRAND.light, BRAND.border);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND.muted)
    .text('YOUR SESSION', left + 16, boxTop + 14, { characterSpacing: 0.6 });
  doc.fontSize(19).font('Helvetica-Bold').fillColor(BRAND.primary)
    .text(`${appointment.date}`, left + 16, boxTop + 28, { width: contentW - 32 });
  doc.fontSize(13).font('Helvetica').fillColor(BRAND.text)
    .text(`${appointment.time}  ·  ${inPerson ? 'In person' : appointment.sessionType === 'chat' ? 'Online — chat' : 'Online — video'}`,
      left + 16, boxTop + 54, { width: contentW - 32 });
  doc.y = boxTop + 102;

  heading(doc, left, contentW, 'Details');
  detailTable(doc, left, contentW, [
    ['Counselor', counselor.name],
    ['Specialty', realValue(counselor.specialty) || '—'],
    ['Format', inPerson ? 'In person' : `Online (${appointment.sessionType || 'video'})`],
    ...(inPerson ? [['Where', realValue(counselor.location) || 'Ask your counselor for the address']] : []),
    ['Duration', '50 minutes'],
    ['Status', String(appointment.status || 'confirmed').replace(/^./, (m) => m.toUpperCase())],
    ['Reason for session', realValue(appointment.reason) || 'Not specified'],
    ['Booked on', fmtDate(appointment.createdAt)],
    ...(appointment.rescheduledAt
      ? [['Rescheduled', `${fmtDate(appointment.rescheduledAt)} (moved ${appointment.rescheduleCount}×)`]]
      : []),
    ['Fee', appointment.price != null ? moneyShort(appointment.price) : '—'],
    ['Payment', payment ? `Paid ${fmtDate(payment.createdAt)}` : 'Due at checkout'],
  ]);
  doc.moveDown(0.8);

  heading(doc, left, contentW, 'Booked by');
  detailTable(doc, left, contentW, [
    ['Name', client.name],
    ['Email', client.email || '—'],
    ['Phone', client.phone || '—'],
  ]);

  if (appointment.documents?.length) {
    doc.moveDown(0.8);
    heading(doc, left, contentW, 'Attached documents');
    appointment.documents.forEach((d) => {
      if (doc.y + 18 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      doc.fontSize(10).font('Helvetica').fillColor(BRAND.text)
        .text(`•  ${d.name}`, left, doc.y, { width: contentW });
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1.2);
  const noteTop = doc.y;
  doc.roundedRect(left, noteTop, contentW, 52, 6).fillAndStroke('#FFF8F1', BRAND.accent);
  doc.fontSize(9).font('Helvetica').fillColor('#8A5A3B')
    .text(inPerson
      ? 'Please arrive five minutes early. If you need to change or cancel, do so from the Appointments page at least 24 hours ahead.'
      : 'Join from the Video Sessions page a few minutes before the start time. Test your camera and microphone in advance.',
      left + 12, noteTop + 12, { width: contentW - 24 });
  doc.y = noteTop + 66;

  closeDoc(doc, left, contentW,
    'CounselConnect appointment record. Keep this for your reference.');
}

/** Client-facing weekly or monthly mood report. */
function streamMoodReport(res, { client, report }) {
  const periodLabel = report.period === 'month' ? 'Monthly' : 'Weekly';
  const { doc, left, contentW } = openDoc(res, {
    title: `${periodLabel} Mood Report — ${client.name}`,
    subtitle: `${periodLabel} Mood Report`,
    filename: `mood-report-${report.period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  });

  doc.fontSize(15).font('Helvetica-Bold').fillColor(BRAND.text).text(client.name, left, doc.y);
  doc.fontSize(9.5).font('Helvetica').fillColor(BRAND.muted)
    .text(`Covering the last 6 ${report.period === 'month' ? 'months' : 'weeks'}`, left, doc.y + 2);
  doc.moveDown(1.2);

  heading(doc, left, contentW, 'At a glance');
  statRow(doc, left, contentW, [
    ['Average mood', report.overall != null ? `${report.overall}/10` : '—'],
    ['Entries logged', report.totalEntries],
    ['Current streak', `${report.streak} day${report.streak === 1 ? '' : 's'}`],
    ['Change', report.change == null ? '—' : `${report.change > 0 ? '+' : ''}${report.change}`],
  ]);

  /* Narrative */
  const nTop = doc.y;
  const nH = doc.fontSize(10).font('Helvetica')
    .heightOfString(report.narrative, { width: contentW - 24, lineGap: 2 }) + 24;
  doc.roundedRect(left, nTop, contentW, nH, 6).fillAndStroke(BRAND.light, BRAND.border);
  doc.fontSize(10).font('Helvetica').fillColor(BRAND.text)
    .text(report.narrative, left + 12, nTop + 12, { width: contentW - 24, lineGap: 2 });
  doc.y = nTop + nH + 18;

  /* Bar chart of the series */
  heading(doc, left, contentW, `${periodLabel === 'Monthly' ? 'Month' : 'Week'} by ${periodLabel === 'Monthly' ? 'month' : 'week'}`);
  const chartH = 120;
  const chartTop = doc.y;
  const barW = contentW / report.series.length;

  doc.moveTo(left, chartTop + chartH).lineTo(left + contentW, chartTop + chartH)
    .lineWidth(0.5).stroke(BRAND.border);

  report.series.forEach((s, i) => {
    const x = left + i * barW;
    if (s.avg != null) {
      const h = Math.max(3, (s.avg / 10) * chartH);
      doc.roundedRect(x + barW * 0.22, chartTop + chartH - h, barW * 0.56, h, 3).fill(BRAND.sage);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BRAND.primary)
        .text(String(s.avg), x, chartTop + chartH - h - 12, { width: barW, align: 'center' });
    } else {
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(BRAND.muted)
        .text('no data', x, chartTop + chartH - 14, { width: barW, align: 'center' });
    }
    doc.fontSize(7.5).font('Helvetica').fillColor(BRAND.muted)
      .text(s.label, x, chartTop + chartH + 6, { width: barW, align: 'center' });
  });
  doc.y = chartTop + chartH + 30;

  heading(doc, left, contentW, 'Breakdown');
  detailTable(doc, left, contentW, report.series.map(s => [
    s.label,
    s.avg == null
      ? 'No entries'
      : `${s.avg}/10 across ${s.entries} ${s.entries === 1 ? 'entry' : 'entries'}` +
        (s.avgIntensity != null ? ` · intensity ${s.avgIntensity}/10` : ''),
  ]));

  if (report.topTags?.length) {
    doc.moveDown(0.8);
    heading(doc, left, contentW, 'What came up most');
    let x = left;
    let y = doc.y;
    report.topTags.forEach(({ tag, count }) => {
      const label = `${tag} (${count})`;
      const w = doc.fontSize(9).font('Helvetica').widthOfString(label) + 20;
      if (x + w > left + contentW) { x = left; y += 24; }
      doc.roundedRect(x, y, w, 18, 9).fillAndStroke('#FFFFFF', BRAND.sage);
      doc.fillColor(BRAND.sage).fontSize(9).font('Helvetica')
        .text(label, x + 10, y + 5, { lineBreak: false });
      x += w + 6;
    });
    doc.y = y + 32;
  }

  closeDoc(doc, left, contentW,
    'Your personal mood record — CounselConnect. Share with your counselor if you find it useful.');
}

/**
 * The counselor's patient list as a branded table.
 *
 * @param res      express response
 * @param doctor   { name, title }
 * @param patients rows already filtered to what the counselor is looking at
 */
function streamPatientList(res, { doctor, patients }) {
  const { doc, left, contentW } = openDoc(res, {
    title: `Patient list — ${doctor.name}`,
    subtitle: 'Patient List',
    filename: `patients-${slug(doctor.name)}-${new Date().toISOString().slice(0, 10)}.pdf`,
    meta: `${doctor.name} · ${patients.length} patient${patients.length === 1 ? '' : 's'} · ${fmtDate(new Date().toISOString(), true)}`,
  });

  // Column widths as fractions of the content width, so the table scales with
  // the page rather than being pinned to A4 point values.
  const cols = [
    { key: 'name',     label: 'Patient',   w: 0.24 },
    { key: 'issue',    label: 'Concern',   w: 0.21 },
    // 'Sessions' wrapped to "SESSIO / NS" at 0.10 — the heading needs the room
    // even though the values are single digits.
    { key: 'sessions', label: 'Sessions',  w: 0.13, align: 'right' },
    { key: 'lastSeen', label: 'Last seen', w: 0.14 },
    { key: 'next',     label: 'Next',      w: 0.17 },
    { key: 'risk',     label: 'Risk',      w: 0.11 },
  ];
  const widths = cols.map(c => c.w * contentW);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(left, y, contentW, 22).fill(BRAND.light);
    let x = left;
    cols.forEach((col, i) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BRAND.muted)
        .text(col.label.toUpperCase(), x + 6, y + 7,
          { width: widths[i] - 12, align: col.align || 'left', lineBreak: false, characterSpacing: 0.5 });
      x += widths[i];
    });
    doc.y = y + 28;
  };

  drawHeader();

  if (!patients.length) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(BRAND.muted)
      .text('No patients matched the current filters.', left, doc.y + 10, { width: contentW });
  }

  patients.forEach((p, idx) => {
    // Start a fresh page — and repeat the column headings — before the row
    // would otherwise be clipped by the footer band.
    if (doc.y > doc.page.height - 110) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      drawHeader();
    }

    const y = doc.y;
    if (idx % 2 === 1) doc.rect(left, y - 4, contentW, 22).fill('#FAFCFB');

    const cells = [
      p.name || '—',
      p.issue || '—',
      String(p.sessions ?? 0),
      p.lastSeen || '—',
      p.next || 'Not scheduled',
      p.risk || '—',
    ];

    let x = left;
    cells.forEach((text, i) => {
      const isRisk = cols[i].key === 'risk';
      const colour = isRisk
        ? (p.risk === 'high' ? '#C0392B' : p.risk === 'medium' ? '#B7791F' : BRAND.sage)
        : BRAND.text;
      doc.fontSize(8.5).font(isRisk ? 'Helvetica-Bold' : 'Helvetica').fillColor(colour)
        .text(isRisk ? String(text).toUpperCase() : text, x + 6, y,
          { width: widths[i] - 12, align: cols[i].align || 'left', lineBreak: false, ellipsis: true });
      x += widths[i];
    });

    // The email belongs with the name, one size down.
    if (p.email) {
      doc.fontSize(7).font('Helvetica').fillColor(BRAND.muted)
        .text(p.email, left + 6, y + 10, { width: widths[0] - 12, lineBreak: false, ellipsis: true });
    }

    doc.y = y + 22;
    doc.moveTo(left, doc.y - 3).lineTo(left + contentW, doc.y - 3).lineWidth(0.4).stroke(BRAND.border);
  });

  closeDoc(doc, left, contentW,
    'Confidential — contains patient-identifiable information. Handle under your practice data policy.');
}

module.exports = {
  streamJournalSummary,
  streamAppointmentSummary,
  streamNote,
  streamPracticeReport,
  streamAppointmentDetails,
  streamMoodReport,
  streamPatientList,
};
