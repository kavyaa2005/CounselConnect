// Files a counselor has shared with their client.
//
// Reads the counselor's document library but exposes ONLY rows explicitly
// marked `sharedWithPatient` and addressed to this client. Everything else in
// that library is clinical material and must stay invisible here.

const { readStore } = require('../utils/fileStore.utils');

const forUser = (userId) => {
  const doctors = readStore('doctors.json');
  return readStore('documents.json')
    .filter(d => d.patientId === userId && d.sharedWithPatient && d.storedName)
    .sort((a, b) => new Date(b.sharedAt || b.uploadedAt) - new Date(a.sharedAt || a.uploadedAt))
    .map(d => {
      const doc = doctors.find(x => x.counselorId === d.counselorId);
      return {
        id: d.id,
        name: d.name,
        ext: d.ext || String(d.name || '').split('.').pop()?.toLowerCase() || 'file',
        size: d.size,
        mimeType: d.mimeType,
        type: d.type,
        note: d.note || '',
        sharedAt: d.sharedAt || d.uploadedAt,
        sharedBy: doc ? doc.name : 'Your counselor',
        counselorId: d.counselorId,
      };
    });
};

/** One shared file, if it really is shared with this user. */
const getOne = (userId, id) => {
  const hit = readStore('documents.json')
    .find(d => d.id === id && d.patientId === userId && d.sharedWithPatient);
  if (!hit) throw Object.assign(new Error('File not found'), { statusCode: 404 });
  return hit;
};

module.exports = { forUser, getOne };
