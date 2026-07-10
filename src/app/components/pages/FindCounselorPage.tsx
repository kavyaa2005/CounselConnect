import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Star, Filter, X, Calendar, MessageCircle, Video } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const specialties = ['All', 'Anxiety', 'Depression', 'Trauma', 'Stress', 'Relationships', 'Burnout', 'Grief', 'Self-esteem'];
const languages = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic'];

export function FindCounselorPage() {
  const navigate = useNavigate();
  const [counselors, setCounselors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Live counselor roster — real doctor accounts from the backend
  useEffect(() => {
    api.get('/counselors')
      .then(res => setCounselors(res.data.counselors || []))
      .catch(() => setCounselors([]));
  }, []);

  const filtered = counselors.filter(c =>
    (activeSpecialty === 'All' || c.specialty.toLowerCase().includes(activeSpecialty.toLowerCase())) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedCounselor = counselors.find(c => c.id === selected);

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Browse our network</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 24 }}>
          Find Your Counselor
        </h1>

        {/* Search and filter bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} color={CC.mutedOlive} className="absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or specialty..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none"
              style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, color: CC.primaryText, fontSize: '0.9rem' }}
              onFocus={e => (e.target.style.borderColor = CC.forestSage)}
              onBlur={e => (e.target.style.borderColor = CC.softSage)}
            />
          </div>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm"
            style={{ backgroundColor: showFilters ? CC.forestSage : CC.lightIvory, color: showFilters ? 'white' : CC.primaryText, border: `1.5px solid ${showFilters ? CC.forestSage : CC.softSage}`, fontWeight: 600 }}
            whileHover={{ scale: 1.02 }}
          >
            <Filter size={16} /> Filters
          </motion.button>
        </div>

        {/* Specialty chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {specialties.map(s => (
            <motion.button
              key={s}
              onClick={() => setActiveSpecialty(s)}
              className="px-4 py-1.5 rounded-full text-xs"
              style={{
                backgroundColor: activeSpecialty === s ? CC.forestSage : CC.softSage,
                color: activeSpecialty === s ? 'white' : CC.primaryText,
                fontWeight: activeSpecialty === s ? 600 : 400,
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {s}
            </motion.button>
          ))}
        </div>

        <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginBottom: 16 }}>
          {filtered.length} counselors available
        </p>

        {/* Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="rounded-3xl overflow-hidden cursor-pointer"
              style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.07)' }}
              onClick={() => setSelected(c.id)}
            >
              <div className="relative h-48">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(35,49,45,0.6))' }} />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: c.available ? CC.forestSage : CC.mutedOlive, fontWeight: 600 }}
                  >
                    {c.available ? 'Available' : 'Busy'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>{c.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>{c.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Star size={11} fill={CC.terracotta} color={CC.terracotta} />
                    <span style={{ color: 'white', fontSize: '0.78rem', fontWeight: 600 }}>{c.rating}</span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: '0.8rem', color: CC.mutedOlive }}>{c.experience} experience</span>
                  <span style={{ fontWeight: 700, color: CC.forestSage, fontSize: '0.9rem' }}>${c.price}/session</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, lineHeight: 1.6, marginBottom: 14 }}>{c.bio.slice(0, 80)}...</p>
                <div className="flex gap-2">
                  <motion.button
                    className="flex-1 py-2.5 rounded-xl text-xs text-white flex items-center justify-center gap-1.5"
                    style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={e => { e.stopPropagation(); navigate('/dashboard/appointments'); }}
                  >
                    <Video size={13} /> Book Session
                  </motion.button>
                  <motion.button
                    className="px-3 py-2.5 rounded-xl text-xs flex items-center justify-center"
                    style={{ backgroundColor: CC.softSage, color: CC.primaryText }}
                    whileHover={{ scale: 1.05 }}
                    onClick={e => { e.stopPropagation(); navigate('/dashboard/chat'); }}
                  >
                    <MessageCircle size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected !== null && selectedCounselor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden"
              style={{ backgroundColor: CC.lightIvory }}
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-48">
                <img src={selectedCounselor.image} alt={selectedCounselor.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 p-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                >
                  <X size={16} color={CC.primaryText} />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: CC.primaryText }}>{selectedCounselor.name}</h2>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.85rem' }}>{selectedCounselor.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={15} fill={CC.terracotta} color={CC.terracotta} />
                    <span style={{ fontWeight: 700, color: CC.primaryText }}>{selectedCounselor.rating}</span>
                  </div>
                </div>
                <p style={{ color: CC.primaryText, fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 16 }}>{selectedCounselor.bio}</p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Experience', value: selectedCounselor.experience },
                    { label: 'Sessions', value: selectedCounselor.sessions.toLocaleString() },
                    { label: 'Languages', value: selectedCounselor.languages.join(', ') },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-2xl text-center" style={{ backgroundColor: CC.softSage }}>
                      <p style={{ fontWeight: 700, color: CC.forestSage, fontSize: '0.9rem' }}>{item.value}</p>
                      <p style={{ fontSize: '0.7rem', color: CC.mutedOlive }}>{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 py-3.5 rounded-2xl text-white flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setSelected(null); navigate('/dashboard/appointments'); }}
                  >
                    <Calendar size={16} /> Book Session
                  </motion.button>
                  <motion.button
                    className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"
                    style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 600 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setSelected(null); navigate('/dashboard/chat'); }}
                  >
                    <MessageCircle size={16} /> Send Message
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
