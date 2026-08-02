import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Star, Filter, X, Calendar, MessageCircle, Video } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const specialties = ['All', 'Anxiety', 'Depression', 'Trauma', 'Stress', 'Relationships', 'Burnout', 'Grief', 'Self-esteem'];
const languages = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic'];

const SORTS = [
  { id: 'rating', label: 'Top rated' },
  { id: 'experience', label: 'Most experienced' },
  { id: 'fee-low', label: 'Price: low to high' },
  { id: 'fee-high', label: 'Price: high to low' },
  { id: 'sessions', label: 'Most sessions' },
  { id: 'name', label: 'Name (A–Z)' },
];

export function FindCounselorPage() {
  const navigate = useNavigate();
  const [counselors, setCounselors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState('rating');
  const [profile, setProfile] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotDay, setSlotDay] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Live counselor roster — the backend does the ordering so the sort matches
  // what a server-side paginated list would give.
  useEffect(() => {
    api.get(`/counselors?sort=${encodeURIComponent(sort)}`)
      .then(res => setCounselors(res.data.counselors || []))
      .catch(() => setCounselors([]));
  }, [sort]);

  // Arriving from AI Match ("View Profile") opens that counselor directly.
  //
  // Read straight from the URL rather than copying it into state in an effect:
  // an effect keyed on [counselors] only fires when that array identity changes,
  // so depending on load order it could miss the param entirely — which is why
  // this worked only some of the time.
  const linkedId = searchParams.get('counselor');
  const activeId = selected ?? linkedId;

  const closeProfile = () => {
    setSelected(null);
    if (linkedId) {
      const next = new URLSearchParams(searchParams);
      next.delete('counselor');
      setSearchParams(next, { replace: true });
    }
  };

  const openProfile = (id: string) => setSelected(id);

  // Reviews and real availability are only fetched when a profile opens —
  // loading them for every card would be a request per counselor.
  useEffect(() => {
    if (!activeId) { setProfile(null); setSlots([]); setSlotDay(0); return; }
    setLoadingProfile(true);
    Promise.all([
      api.get(`/counselors/${activeId}`).then(r => r.data.counselor).catch(() => null),
      api.get(`/counselors/${activeId}/slots?days=14`).then(r => r.data.days || []).catch(() => []),
    ]).then(([p, d]) => {
      setProfile(p);
      setSlots(d);
      setSlotDay(0);
    }).finally(() => setLoadingProfile(false));
  }, [activeId]);

  /** Jumps to booking with the counselor AND the chosen slot pre-filled. */
  const bookSlot = (counselorId: string, date: string, time: string) => {
    navigate(`/dashboard/appointments?counselor=${encodeURIComponent(counselorId)}`
      + `&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
  };

  const filtered = counselors.filter(c =>
    (activeSpecialty === 'All' || c.specialty.toLowerCase().includes(activeSpecialty.toLowerCase())) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedCounselor = counselors.find(c => c.id === activeId);

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

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label="Sort counselors"
            className="px-4 py-3.5 rounded-2xl text-sm outline-none cursor-pointer"
            style={{ backgroundColor: CC.lightIvory, border: `1.5px solid ${CC.softSage}`, color: CC.primaryText, fontWeight: 600 }}
          >
            {SORTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
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
              onClick={() => openProfile(c.id)}
            >
              <div className="relative h-48 flex-shrink-0">
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
                    onClick={e => { e.stopPropagation(); navigate(`/dashboard/appointments?counselor=${encodeURIComponent(c.id)}`); }}
                  >
                    <Video size={13} /> Book Session
                  </motion.button>
                  <motion.button
                    className="px-3 py-2.5 rounded-xl text-xs flex items-center justify-center"
                    style={{ backgroundColor: CC.softSage, color: CC.primaryText }}
                    whileHover={{ scale: 1.05 }}
                    onClick={e => { e.stopPropagation(); navigate(`/dashboard/chat?counselor=${encodeURIComponent(c.id)}`); }}
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
        {activeId !== null && selectedCounselor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(35,49,45,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={closeProfile}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: CC.lightIvory, maxHeight: '88vh' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-48">
                <img src={selectedCounselor.image} alt={selectedCounselor.name} className="w-full h-full object-cover" />
                <button
                  onClick={closeProfile}
                  className="absolute top-4 right-4 p-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                >
                  <X size={16} color={CC.primaryText} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: CC.primaryText }}>{selectedCounselor.name}</h2>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.85rem' }}>{selectedCounselor.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star size={15} fill={CC.terracotta} color={CC.terracotta} />
                    <span style={{ fontWeight: 700, color: CC.primaryText }}>
                      {profile?.avg ?? selectedCounselor.rating}
                    </span>
                    {!!profile?.total && (
                      <span style={{ fontSize: '0.75rem', color: CC.mutedOlive }}>({profile.total})</span>
                    )}
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

                {/* ── Real availability, from this counselor's own schedule ── */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: CC.primaryText }}>
                      Available times
                    </h3>
                    {!!slots.length && (
                      <span style={{ fontSize: '0.75rem', color: CC.mutedOlive }}>
                        next {slots.length} day{slots.length === 1 ? '' : 's'} with openings
                      </span>
                    )}
                  </div>

                  {loadingProfile && (
                    <p style={{ fontSize: '0.82rem', color: CC.mutedOlive }}>Checking availability…</p>
                  )}

                  {!loadingProfile && !slots.length && (
                    <div className="p-4 rounded-2xl" style={{ backgroundColor: CC.softSage }}>
                      <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, lineHeight: 1.6 }}>
                        No open slots in the next two weeks. Send a message and they'll let you know when something frees up.
                      </p>
                    </div>
                  )}

                  {!loadingProfile && !!slots.length && (
                    <>
                      {/* Day strip */}
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
                        {slots.map((d: any, i: number) => (
                          <button
                            key={d.iso}
                            onClick={() => setSlotDay(i)}
                            className="flex-shrink-0 px-3 py-2 rounded-2xl text-center"
                            style={{
                              backgroundColor: slotDay === i ? CC.forestSage : CC.softSage,
                              color: slotDay === i ? 'white' : CC.primaryText,
                              minWidth: 62,
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>{d.dayLabel}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.dayNum}</div>
                            <div style={{ fontSize: '0.62rem', opacity: 0.85 }}>{d.openCount} free</div>
                          </button>
                        ))}
                      </div>

                      {/* Times for the chosen day */}
                      <div className="flex gap-2 flex-wrap">
                        {(slots[slotDay]?.slots || []).map((sl: any) => (
                          <button
                            key={sl.iso}
                            disabled={sl.booked}
                            onClick={() => { closeProfile(); bookSlot(selectedCounselor.id, slots[slotDay].date, sl.time); }}
                            title={sl.booked ? 'Already booked' : `Book ${sl.time}`}
                            className="px-3 py-2 rounded-xl text-sm"
                            style={{
                              backgroundColor: sl.booked ? 'transparent' : CC.lightIvory,
                              border: `1.5px solid ${sl.booked ? CC.softSage : CC.forestSage}`,
                              color: sl.booked ? CC.mutedOlive : CC.forestSage,
                              fontWeight: 600,
                              textDecoration: sl.booked ? 'line-through' : 'none',
                              cursor: sl.booked ? 'not-allowed' : 'pointer',
                              opacity: sl.booked ? 0.55 : 1,
                            }}
                          >
                            {sl.time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Reviews from real clients ── */}
                {!!profile?.total && (
                  <div className="mb-5">
                    <h3 className="mb-2.5" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: CC.primaryText }}>
                      Client reviews
                    </h3>

                    {/* Rating breakdown */}
                    <div className="p-3 rounded-2xl mb-3" style={{ backgroundColor: CC.softSage }}>
                      {profile.distribution.map((d: any) => (
                        <div key={d.star} className="flex items-center gap-2 mb-1">
                          <span style={{ fontSize: '0.72rem', color: CC.mutedOlive, width: 34 }}>{d.star}★</span>
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: CC.lightIvory }}>
                            <div style={{
                              height: '100%',
                              width: `${profile.total ? (d.count / profile.total) * 100 : 0}%`,
                              backgroundColor: CC.terracotta,
                            }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: CC.mutedOlive, width: 18, textAlign: 'right' }}>{d.count}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {profile.reviews.slice(0, 4).map((r: any) => (
                        <div key={r.id} className="p-3 rounded-2xl" style={{ backgroundColor: CC.softSage }}>
                          <div className="flex items-center justify-between mb-1">
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: CC.primaryText }}>{r.patientName}</span>
                            <span style={{ fontSize: '0.72rem', color: CC.mutedOlive }}>{r.date}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} size={11}
                                fill={n <= r.rating ? CC.terracotta : 'transparent'}
                                color={n <= r.rating ? CC.terracotta : CC.mutedOlive} />
                            ))}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: CC.primaryText, lineHeight: 1.6 }}>{r.comment}</p>
                          {r.reply && (
                            <div className="mt-2 pl-2.5" style={{ borderLeft: `2px solid ${CC.forestSage}` }}>
                              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: CC.forestSage }}>{r.replyBy} replied</p>
                              <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, lineHeight: 1.5 }}>{r.reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingProfile && profile && !profile.total && (
                  <p className="mb-5" style={{ fontSize: '0.82rem', color: CC.mutedOlive }}>
                    No reviews yet — you could be the first after your session.
                  </p>
                )}

                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 py-3.5 rounded-2xl text-white flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { closeProfile(); navigate(`/dashboard/appointments?counselor=${encodeURIComponent(selectedCounselor.id)}`); }}
                  >
                    <Calendar size={16} /> Book Session
                  </motion.button>
                  <motion.button
                    className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm"
                    style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 600 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { closeProfile(); navigate(`/dashboard/chat?counselor=${encodeURIComponent(selectedCounselor.id)}`); }}
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
