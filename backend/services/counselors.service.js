const { readStore } = require('../utils/fileStore.utils');

// Counselor cards are derived from real doctor accounts (doctors.json).
// This keeps the user panel and the doctor panel in sync — every counselor
// a user sees is a real doctor who can log in to the doctor portal.
const toCounselorCard = (d) => ({
  id: d.counselorId,
  name: d.name,
  specialty: d.specialty || '',
  rating: d.rating || 0,
  sessions: d.sessions || 0,
  experience: d.experience || '',
  languages: d.languages || [],
  available: d.available !== false,
  price: d.price || 0,
  image: d.image || d.avatar || '',
  bio: d.bio || '',
  approach: d.approach || '',
  badge: d.badge || null,
});

const getAllCounselors = () => readStore('doctors.json').map(toCounselorCard);

const getCounselors = ({ search = '', specialty = 'All' } = {}) => {
  let result = getAllCounselors();

  if (specialty && specialty !== 'All') {
    result = result.filter(c =>
      c.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.specialty.toLowerCase().includes(q) ||
      c.bio.toLowerCase().includes(q)
    );
  }

  return result;
};

const getCounselorById = (id) => {
  const c = getAllCounselors().find(c => c.id === id);
  if (!c) throw Object.assign(new Error('Counselor not found'), { statusCode: 404 });
  return c;
};

module.exports = { getCounselors, getCounselorById, getAllCounselors };
