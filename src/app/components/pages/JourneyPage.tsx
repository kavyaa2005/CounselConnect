import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Star, Heart, TrendingUp, MessageCircle, Sparkles, Award, Calendar } from 'lucide-react';
import { CC } from '../../lib/colors';

// Icons cannot be serialised to JSON, so API entries only carry a `type` string.
// This map resolves the correct component for both static and API-sourced items.
const ICON_MAP: Record<string, any> = {
  session:     Calendar,
  achievement: Award,
  insight:     TrendingUp,
  note:        MessageCircle,
  mood:        Heart,
  ai:          Sparkles,
  milestone:   Star,
};

const typeColors: Record<string, string> = {
  session: CC.forestSage,
  achievement: CC.terracotta,
  insight: CC.forestSage,
  note: CC.darkForest,
  mood: CC.terracotta,
  ai: CC.mutedOlive,
  milestone: CC.terracotta,
};

const typeLabels: Record<string, string> = {
  session: 'Session',
  achievement: 'Achievement',
  insight: 'Mood Insight',
  note: 'Counselor Note',
  mood: 'Mood',
  ai: 'AI Insight',
  milestone: 'Milestone',
};

export function JourneyPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/ai/summary').then(res => setStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/journey').then(res => {
      if (res.data.timeline && res.data.timeline.length > 0) {
        setTimeline(res.data.timeline);
      }
    }).catch(() => { /* keep static fallback */ });
  }, []);

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Your story so far</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 8 }}>
          Journey Timeline
        </h1>
        <p style={{ color: CC.mutedOlive, marginBottom: 36, maxWidth: 500 }}>
          A beautiful record of your healing, growth, and every milestone along the way.
        </p>

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Calendar, label: 'Sessions', value: String(stats?.totalSessions ?? 0), color: CC.forestSage },
            { icon: TrendingUp, label: 'Mood Growth', value: `+${stats?.moodImprovement ?? 0}%`, color: CC.terracotta },
            { icon: Award, label: 'Badges Earned', value: String((stats?.badges || []).filter((b: any) => b.earned).length), color: CC.darkForest },
            { icon: Heart, label: 'Days Tracked', value: String(stats?.daysTracked ?? 0), color: CC.mutedOlive },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: CC.lightIvory, boxShadow: '0 2px 16px rgba(53,92,77,0.05)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: CC.primaryText }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: CC.mutedOlive }}>{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="relative max-w-3xl">
          {/* Center line */}
          <div
            className="absolute left-[28px] top-0 bottom-0 w-0.5"
            style={{ backgroundColor: CC.softSage }}
          />

          <div className="space-y-8">
            {timeline.map((m, i) => {
              const Icon = m.icon ?? ICON_MAP[m.type] ?? Star;
              const color = typeColors[m.type];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="relative flex gap-6"
                >
                  {/* Icon bubble */}
                  <div
                    className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${color}18`,
                      border: `2px solid ${color}40`,
                      boxShadow: `0 4px 16px ${color}20`,
                    }}
                  >
                    <Icon size={20} color={color} />
                  </div>

                  {/* Content */}
                  <motion.div
                    className="flex-1 p-5 rounded-3xl"
                    style={{
                      backgroundColor: CC.lightIvory,
                      boxShadow: '0 4px 20px rgba(53,92,77,0.06)',
                      border: m.type === 'achievement' ? `1.5px solid ${CC.terracotta}30` : 'none',
                    }}
                    whileHover={{ scale: 1.01, y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs"
                          style={{ backgroundColor: `${color}15`, color: color, fontWeight: 600 }}
                        >
                          {typeLabels[m.type]}
                        </span>
                        {m.type === 'achievement' && <span>🏆</span>}
                      </div>
                      <div className="text-right">
                        <p style={{ fontSize: '0.75rem', color: CC.mutedOlive }}>{m.date}</p>
                        {m.mood && (
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <Heart size={10} color={CC.terracotta} fill={CC.terracotta} />
                            <span style={{ fontSize: '0.7rem', color: CC.terracotta, fontWeight: 600 }}>{m.mood}/100</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 8, fontSize: '1rem' }}>
                      {m.title}
                    </h3>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', lineHeight: 1.7 }}>{m.desc}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Journey start marker */}
          <div className="relative flex gap-6 mt-8">
            <div
              className="z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: CC.softSage, border: `2px dashed ${CC.mutedOlive}` }}
            >
              <span style={{ fontSize: '1.4rem' }}>🌱</span>
            </div>
            <div className="flex-1 flex items-center">
              <p style={{ color: CC.mutedOlive, fontSize: '0.88rem', fontStyle: 'italic' }}>
                Your journey continues... every day is a new chapter.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
