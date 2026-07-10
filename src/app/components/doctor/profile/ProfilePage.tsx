import { useState, useEffect } from 'react';
import { Camera, Plus, X, Star, Award, Globe, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const specializations = ['Clinical Psychology', 'Cognitive Behavioral Therapy', 'EMDR', 'Trauma Therapy', 'Mindfulness-Based CBT'];
const languages = ['English', 'Spanish', 'French'];
const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '3:30 PM', '5:00 PM'];

const certificates = [
  { name: 'Clinical Psychology License 2026', issuer: 'State Board of Psychology', year: '2026' },
  { name: 'EMDR Certified Therapist', issuer: 'EMDRIA', year: '2022' },
  { name: 'CBT Practitioner Certificate', issuer: 'Beck Institute', year: '2020' },
];

const awards = [
  { name: 'Top Rated Therapist 2025', org: 'CounselConnect' },
  { name: 'Excellence in Mental Health Care', org: 'State Medical Board' },
];

export function ProfilePage() {
  const { c: colors, sh: shadows } = useTheme();
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const tabs = ['personal', 'professional', 'availability', 'security'];

  // Real doctor profile + live stats
  useEffect(() => {
    api.get('/doctor/profile').then(res => setProfile(res.data.profile)).catch(() => {});
    api.get('/doctor/analytics').then(res => setStats(res.data.analytics?.totals)).catch(() => {});
  }, []);

  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() : 'DR';
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profile) setForm({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone, bio: profile.bio, price: profile.price }); }, [profile]);

  const saveProfile = async () => {
    try {
      const res = await api.put('/doctor/profile', { firstName: form.firstName, lastName: form.lastName, phone: form.phone, bio: form.bio, price: Number(form.price) || profile?.price });
      setProfile(res.data.profile);
    } catch { /* ignore */ }
    setEditing(false);
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 28 }}>
      {/* Left: Profile Card */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ background: colors.white, borderRadius: 24, padding: '28px 20px', boxShadow: shadows.card, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 800, fontSize: 28, margin: '0 auto' }}>
              {initials}
            </div>
            <button style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', background: colors.primary, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadows.card }}>
              <Camera size={13} />
            </button>
          </div>
          <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: colors.textPrimary, margin: 0, marginBottom: 4 }}>{profile?.name || '…'}</h2>
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.primary, fontWeight: 500, margin: 0, marginBottom: 4 }}>{profile?.title || ''}</p>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0, marginBottom: 20 }}>{profile?.experience ? `${profile.experience} experience` : ''}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Patients', value: String(stats?.totalPatients ?? '—') },
              { label: 'Sessions', value: String(stats?.totalAppointments ?? '—') },
              { label: 'Rating', value: stats?.avgRating != null ? `${stats.avgRating}★` : '—' },
              { label: 'Reviews', value: String(stats?.reviewCount ?? '—') },
            ].map((s, i) => (
              <div key={i} style={{ padding: '10px', borderRadius: 12, background: colors.background }}>
                <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 800, color: colors.primary }}>{s.value}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: Mail, text: profile?.email || '—' },
              { icon: Phone, text: profile?.phone || 'No phone added' },
              { icon: MapPin, text: profile?.specialty || '—' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={13} color={colors.primary} />
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textSecondary, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: '8px 16px', borderRadius: 12, background: colors.veryLightSage, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.success }} />
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.primary, fontWeight: 600 }}>Accepting New Patients</span>
          </div>
        </div>
      </div>

      {/* Right: Edit Panels */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: colors.white, padding: 6, borderRadius: 14, border: `1px solid ${colors.border}`, width: 'fit-content', boxShadow: shadows.card }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'Inter', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? colors.primary : 'transparent',
                color: activeTab === tab ? 'white' : colors.textSecondary,
                textTransform: 'capitalize', transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'personal' && (
          <div style={{ background: colors.white, borderRadius: 20, padding: '28px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Personal Information</h3>
              <button onClick={() => editing ? saveProfile() : setEditing(true)} style={{ padding: '8px 18px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: colors.primary, fontWeight: 500, cursor: 'pointer' }}>
                {editing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {[
                { label: 'First Name', key: 'firstName', value: profile?.firstName || '—', editable: true },
                { label: 'Last Name', key: 'lastName', value: profile?.lastName || '—', editable: true },
                { label: 'Email', key: 'email', value: profile?.email || '—', editable: false },
                { label: 'Phone', key: 'phone', value: profile?.phone || 'Not set', editable: true },
                { label: 'Specialty', key: 'specialty', value: profile?.specialty || '—', editable: false },
                { label: 'Consultation Fee', key: 'price', value: profile?.price ? `$${profile.price}/session` : '—', editable: true },
              ].map(field => (
                <div key={field.label}>
                  <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>{field.label}</label>
                  {editing && field.editable ? (
                    <input
                      value={form[field.key] ?? ''}
                      onChange={e => setForm((f: any) => ({ ...f, [field.key]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${colors.primary}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <div style={{ fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, padding: '10px 0' }}>{field.value}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Bio</label>
              {editing ? (
                <textarea
                  value={form.bio ?? ''}
                  onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${colors.primary}`, fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }}
                />
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {profile?.bio || 'No bio added yet.'}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Specializations */}
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 14 }}>Specializations</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {specializations.map(spec => (
                  <span key={spec} style={{ padding: '6px 14px', borderRadius: 20, background: colors.veryLightSage, color: colors.primary, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {spec} <X size={12} style={{ cursor: 'pointer' }} />
                  </span>
                ))}
                <button style={{ padding: '6px 14px', borderRadius: 20, border: `1px dashed ${colors.border}`, background: 'transparent', color: colors.textMuted, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>

            {/* Certificates */}
            <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 14 }}>Certificates & Licenses</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {certificates.map((cert, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, background: colors.background }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.veryLightSage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={16} color={colors.primary} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: colors.textPrimary }}>{cert.name}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>{cert.issuer} · {cert.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Working Schedule</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <div
                  key={day}
                  style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${workingDays.includes(day) ? colors.primary : colors.border}`, background: workingDays.includes(day) ? colors.veryLightSage : 'transparent', color: workingDays.includes(day) ? colors.primary : colors.textMuted, fontFamily: 'Inter', fontSize: 12, fontWeight: workingDays.includes(day) ? 600 : 400, cursor: 'pointer' }}
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>
            <div>
              <h5 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: colors.textPrimary, margin: 0, marginBottom: 10 }}>Available Time Slots</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {timeSlots.map(slot => (
                  <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: colors.veryLightSage, border: `1px solid ${colors.mintAccent}` }}>
                    <Clock size={12} color={colors.primary} />
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.primary }}>{slot}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Security Settings</h4>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textMuted }}>Manage your security preferences in <span style={{ color: colors.primary, cursor: 'pointer' }}>Settings → Security</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
