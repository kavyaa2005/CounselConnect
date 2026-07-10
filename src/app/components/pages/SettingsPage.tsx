import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Bell, Lock, Globe, Palette, Shield, LogOut, ChevronRight, Camera } from 'lucide-react';
import { CC } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useNavigate, useLocation } from 'react-router';

const sections = [
  { id: 'profile', icon: User, label: 'Profile Settings' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'privacy', icon: Shield, label: 'Privacy' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'language', icon: Globe, label: 'Language & Region' },
  { id: 'theme', icon: Palette, label: 'Theme' },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0"
      style={{ backgroundColor: value ? CC.forestSage : CC.softSage }}
    >
      <motion.div
        animate={{ x: value ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
      />
    </motion.button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUserLocal } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

  // Sidebar deep-link: /dashboard/settings?tab=profile | notifications | ...
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab) setActiveSection(tab);
  }, [location.search]);
  const [profile, setProfile] = useState({
    firstName: user?.firstName || 'Alex',
    lastName: user?.lastName || 'Morgan',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [notifications, setNotifications] = useState(user?.notifications || { sessions: true, moodReminders: true, messages: true, aiInsights: false, newsletter: false });
  const [privacy, setPrivacy] = useState(user?.privacy || { shareProgress: false, anonymousData: true, profileVisible: true });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      const res = await api.put('/user/profile', profile);
      updateUserLocal(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile');
    }
  };

  const handleNotifChange = async (key: string, val: boolean) => {
    const updated = { ...notifications, [key]: val };
    setNotifications(updated as any);
    try { await api.put('/user/settings/notifications', updated); } catch { /* silent */ }
  };

  const handlePrivacyChange = async (key: string, val: boolean) => {
    const updated = { ...privacy, [key]: val };
    setPrivacy(updated as any);
    try { await api.put('/user/settings/privacy', updated); } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    try {
      await api.delete('/user/account');
      await logout();
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Your account</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 24 }}>
          Settings
        </h1>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <div className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map(s => {
                const Icon = s.icon;
                return (
                  <motion.button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                    style={{
                      backgroundColor: activeSection === s.id ? `${CC.forestSage}12` : 'transparent',
                      color: activeSection === s.id ? CC.forestSage : CC.primaryText,
                      border: `1px solid ${activeSection === s.id ? CC.forestSage + '30' : 'transparent'}`,
                    }}
                    whileHover={{ backgroundColor: `${CC.forestSage}08` }}
                  >
                    <Icon size={16} />
                    <span style={{ fontSize: '0.875rem', fontWeight: activeSection === s.id ? 600 : 400 }}>{s.label}</span>
                    {activeSection === s.id && <ChevronRight size={14} className="ml-auto" />}
                  </motion.button>
                );
              })}

              <div className="border-t my-2" style={{ borderColor: CC.softSage }} />

              <motion.button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                style={{ color: CC.terracotta }}
                whileHover={{ backgroundColor: `${CC.terracotta}08` }}
              >
                <LogOut size={16} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Logout</span>
              </motion.button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeSection === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
              >
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 20 }}>
                  Profile Settings
                </h2>

                {/* Avatar */}
                <div className="flex items-center gap-5 mb-8">
                  <div className="relative">
                    <img
                      src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`) : "https://images.unsplash.com/photo-1768828246616-e86833c66dea?w=100&h=100&fit=crop&crop=face"}
                      alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                    <motion.button
                      type="button"
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: CC.forestSage }}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => document.getElementById('photo-upload-input')?.click()}
                    >
                      <Camera size={13} />
                    </motion.button>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: CC.primaryText }}>Profile Photo</p>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginTop: 2 }}>JPG, PNG up to 5MB</p>
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('photo', file);
                        try {
                          const token = localStorage.getItem('cc_token');
                          const res = await fetch('http://localhost:5000/api/user/profile/photo', {
                            method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: formData,
                          });
                          const json = await res.json();
                          if (json.success) updateUserLocal({ avatar: json.data.avatarUrl });
                        } catch { alert('Photo upload failed'); }
                      }}
                    />
                    <button
                      type="button"
                      style={{ color: CC.forestSage, fontSize: '0.82rem', fontWeight: 600, marginTop: 6 }}
                      onClick={() => document.getElementById('photo-upload-input')?.click()}
                    >Upload new photo</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'First Name', key: 'firstName' as const },
                    { label: 'Last Name', key: 'lastName' as const },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 6 }}>{f.label}</label>
                      <input
                        value={profile[f.key]}
                        onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl outline-none"
                        style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.9rem' }}
                        onFocus={e => (e.target.style.border = `1.5px solid ${CC.forestSage}`)}
                        onBlur={e => (e.target.style.border = '1.5px solid transparent')}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mb-6">
                  {[
                    { label: 'Email Address', key: 'email' as const, type: 'email' },
                    { label: 'Phone Number', key: 'phone' as const, type: 'tel' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 6 }}>{f.label}</label>
                      <input
                        type={f.type}
                        value={profile[f.key]}
                        onChange={e => setProfile({ ...profile, [f.key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl outline-none"
                        style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.9rem' }}
                        onFocus={e => (e.target.style.border = `1.5px solid ${CC.forestSage}`)}
                        onBlur={e => (e.target.style.border = '1.5px solid transparent')}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText, display: 'block', marginBottom: 6 }}>Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={e => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                      style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.9rem' }}
                      onFocus={e => (e.target.style.border = `1.5px solid ${CC.forestSage}`)}
                      onBlur={e => (e.target.style.border = '1.5px solid transparent')}
                    />
                  </div>
                </div>

                <motion.button
                  onClick={handleSave}
                  className="px-8 py-3 rounded-xl text-white"
                  style={{ background: saved ? CC.forestSage : `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                  whileHover={{ scale: 1.03 }}
                >
                  {saved ? '✓ Saved!' : 'Save Changes'}
                </motion.button>
              </motion.div>
            )}

            {activeSection === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
              >
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 6 }}>
                  Notification Preferences
                </h2>
                <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginBottom: 24 }}>
                  Choose what notifications you receive and how.
                </p>
                <div className="space-y-4">
                  {[
                    { key: 'sessions' as const, label: 'Session Reminders', desc: 'Get notified 15 minutes before each session' },
                    { key: 'moodReminders' as const, label: 'Daily Mood Reminders', desc: 'A gentle reminder to log your mood each day' },
                    { key: 'messages' as const, label: 'New Messages', desc: 'Notifications for counselor messages' },
                    { key: 'aiInsights' as const, label: 'AI Insights', desc: 'Weekly personalized wellness insights from your AI' },
                    { key: 'newsletter' as const, label: 'Wellness Newsletter', desc: 'Monthly mental health tips and resources' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: CC.softSage }}>
                      <div>
                        <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{item.label}</p>
                        <p style={{ color: CC.mutedOlive, fontSize: '0.78rem', marginTop: 2 }}>{item.desc}</p>
                      </div>
                      <Toggle
                        value={notifications[item.key]}
                        onChange={v => handleNotifChange(item.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'privacy' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
              >
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 6 }}>
                  Privacy Settings
                </h2>
                <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginBottom: 24 }}>
                  Control how your data is shared and used.
                </p>
                <div className="space-y-4">
                  {[
                    { key: 'shareProgress' as const, label: 'Share Progress with Counselor', desc: 'Allow your counselor to see detailed mood analytics' },
                    { key: 'anonymousData' as const, label: 'Anonymous Data Sharing', desc: 'Help improve our platform with anonymized insights' },
                    { key: 'profileVisible' as const, label: 'Profile Visibility', desc: 'Allow counselors to see your basic profile information' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: CC.softSage }}>
                      <div>
                        <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{item.label}</p>
                        <p style={{ color: CC.mutedOlive, fontSize: '0.78rem', marginTop: 2 }}>{item.desc}</p>
                      </div>
                      <Toggle
                        value={privacy[item.key]}
                        onChange={v => handlePrivacyChange(item.key, v)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 rounded-2xl border" style={{ borderColor: `${CC.terracotta}40`, backgroundColor: `${CC.terracotta}08` }}>
                  <p style={{ fontWeight: 600, color: CC.terracotta, fontSize: '0.9rem', marginBottom: 4 }}>Delete Account</p>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginBottom: 12 }}>
                    Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-5 py-2 rounded-xl text-sm"
                    style={{ border: `1px solid ${CC.terracotta}`, color: CC.terracotta, fontWeight: 600 }}
                  >
                    Delete Account
                  </button>
                </div>
              </motion.div>
            )}

            {(activeSection === 'security' || activeSection === 'language' || activeSection === 'theme') && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)', minHeight: 300 }}
              >
                <div className="text-center">
                  <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>
                    {activeSection === 'security' ? '🔒' : activeSection === 'language' ? '🌍' : '🎨'}
                  </p>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, fontSize: '1.1rem' }}>
                    {sections.find(s => s.id === activeSection)?.label}
                  </p>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginTop: 6 }}>Settings coming soon</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
