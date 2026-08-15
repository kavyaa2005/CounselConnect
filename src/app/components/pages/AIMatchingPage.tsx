import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Sparkles, Brain, Star, Video, CheckCircle } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api, fileUrl } from '../../lib/api';

const questions = [
  {
    id: 1,
    question: 'What is your primary reason for seeking counseling?',
    multi: true,
    options: ['Anxiety or worry', 'Feeling low or depressed', 'Stress from work or studies', 'Relationship issues', 'Trauma or past experiences', 'General personal growth'],
  },
  {
    id: 2,
    question: 'How would you describe your preferred counseling style?',
    multi: true,
    options: ['Structured & goal-focused', 'Open conversations', 'Mindfulness-based', 'Practical advice & tools', 'Exploration of past experiences', 'Flexible & varied'],
  },
  {
    id: 3,
    question: 'What counselor gender do you feel most comfortable with?',
    options: ['Female', 'Male', 'No preference'],
  },
  {
    id: 4,
    question: 'How often would you like to have sessions?',
    options: ['Once a week', 'Twice a week', 'Every two weeks', 'Monthly', 'As needed'],
  },
  {
    id: 5,
    question: 'What is your availability for sessions?',
    options: ['Mornings', 'Afternoons', 'Evenings', 'Weekends only', 'Flexible'],
  },
];

export function AIMatchingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'questions' | 'processing' | 'results'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [aiMatches, setAiMatches] = useState<any[]>([]); // populated from API

  const isMulti = !!(questions[currentQ] as any).multi;
  const isSelected = (opt: string) => isMulti ? selectedMulti.includes(opt) : selectedOption === opt;
  const hasSelection = isMulti ? selectedMulti.length > 0 : !!selectedOption;

  const handleAnswer = (option: string) => {
    if (isMulti) {
      setSelectedMulti(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
    } else {
      setSelectedOption(option);
    }
  };

  const handleNext = async () => {
    if (!hasSelection) return;
    // Multi-select answers are joined so the AI matcher can scan every choice
    const answerValue = isMulti ? selectedMulti.join(', ') : (selectedOption as string);
    const newAnswers = [...answers, answerValue];
    setAnswers(newAnswers);
    setSelectedOption(null);
    setSelectedMulti([]);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setPhase('processing');
      try {
        const res = await api.post('/ai/match', { answers: newAnswers });
        setAiMatches(res.data.matches);
      } catch { /* results stay empty if the API is unreachable */ }
      setTimeout(() => setPhase('results'), 3000);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) {
      const prev = answers[currentQ - 1] || '';
      const prevMulti = !!(questions[currentQ - 1] as any).multi;
      setCurrentQ(currentQ - 1);
      setAnswers(answers.slice(0, -1));
      if (prevMulti) { setSelectedMulti(prev ? prev.split(', ') : []); setSelectedOption(null); }
      else { setSelectedOption(prev || null); setSelectedMulti([]); }
    }
  };

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <AnimatePresence mode="wait">
        {/* Intro */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl mx-auto text-center pt-12"
          >
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8" style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, boxShadow: `0 16px 40px rgba(53,92,77,0.3)` }}>
              <Brain size={44} color="white" />
            </div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '2rem', color: CC.primaryText, marginBottom: 12 }}>
              AI Counselor Matching
            </h1>
            <p style={{ color: CC.mutedOlive, fontSize: '1rem', lineHeight: 1.7, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Answer 5 quick questions and our AI will analyze thousands of data points to find your perfect counselor match — instantly.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { icon: '🎯', title: '5 Questions', sub: 'Takes 2 minutes' },
                { icon: '🤖', title: 'AI Analysis', sub: 'Smart matching' },
                { icon: '✨', title: 'Top 3 Matches', sub: 'Personalized results' },
              ].map(item => (
                <div key={item.title} className="p-5 rounded-2xl" style={{ backgroundColor: CC.lightIvory }}>
                  <p style={{ fontSize: '1.6rem', marginBottom: 6 }}>{item.icon}</p>
                  <p style={{ fontWeight: 700, color: CC.primaryText, fontSize: '0.9rem' }}>{item.title}</p>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.78rem' }}>{item.sub}</p>
                </div>
              ))}
            </div>
            <motion.button
              onClick={() => setPhase('questions')}
              className="px-10 py-4 rounded-full text-white flex items-center gap-2 mx-auto"
              style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600, fontSize: '1rem' }}
              whileHover={{ scale: 1.04, boxShadow: `0 12px 32px rgba(53,92,77,0.25)` }}
              whileTap={{ scale: 0.97 }}
            >
              Start AI Matching <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* Questions */}
        {phase === 'questions' && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl mx-auto"
          >
            {/* Progress */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '0.82rem', color: CC.mutedOlive }}>Question {currentQ + 1} of {questions.length}</span>
                <span style={{ fontSize: '0.82rem', color: CC.forestSage, fontWeight: 600 }}>{Math.round(((currentQ) / questions.length) * 100)}%</span>
              </div>
              <div className="flex gap-2">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{ backgroundColor: i < currentQ ? CC.forestSage : i === currentQ ? CC.terracotta : CC.softSage }}
                  />
                ))}
              </div>
            </div>

            {/* Dynamic illustration */}
            <div className="mb-8 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: `linear-gradient(135deg, ${CC.terracotta}22, ${CC.forestSage}22)`, border: `2px solid ${CC.softSage}` }}
              >
                <span style={{ fontSize: '2.5rem' }}>
                  {['🧠', '💬', '👤', '📅', '🕐'][currentQ]}
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: CC.primaryText, marginBottom: 24, textAlign: 'center' }}>
                  {questions[currentQ].question}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {questions[currentQ].options.map(opt => (
                    <motion.button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="p-4 rounded-2xl text-left transition-all"
                      style={{
                        backgroundColor: isSelected(opt) ? CC.forestSage : CC.lightIvory,
                        border: `1.5px solid ${isSelected(opt) ? CC.forestSage : CC.softSage}`,
                        color: isSelected(opt) ? 'white' : CC.primaryText,
                        fontWeight: isSelected(opt) ? 600 : 400,
                        fontSize: '0.9rem',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isSelected(opt) && <CheckCircle size={14} className="inline mr-2" />}
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-8">
              {currentQ > 0 && (
                <motion.button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm"
                  style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 600 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <ArrowLeft size={16} /> Back
                </motion.button>
              )}
              <motion.button
                onClick={handleNext}
                disabled={!hasSelection}
                className="flex-1 py-3.5 rounded-2xl text-white flex items-center justify-center gap-2"
                style={{
                  background: hasSelection ? `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` : CC.mutedOlive,
                  fontWeight: 600,
                  cursor: hasSelection ? 'pointer' : 'not-allowed',
                }}
                whileHover={hasSelection ? { scale: 1.02 } : {}}
                whileTap={hasSelection ? { scale: 0.97 } : {}}
              >
                {currentQ === questions.length - 1 ? 'Find My Matches' : 'Next'} <ArrowRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md mx-auto text-center pt-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 rounded-full border-4 border-t-transparent mx-auto mb-8"
              style={{ borderColor: `${CC.forestSage}40`, borderTopColor: CC.forestSage }}
            />
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: CC.primaryText, marginBottom: 12 }}>
              Finding your perfect matches...
            </h2>
            <p style={{ color: CC.mutedOlive, marginBottom: 32 }}>Our AI is analyzing your responses against 500+ counselor profiles.</p>
            <div className="space-y-3">
              {['Analyzing your preferences...', 'Matching counselor specialties...', 'Calculating compatibility scores...'].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.8 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: CC.lightIvory }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CC.forestSage }}
                  />
                  <span style={{ color: CC.primaryText, fontSize: '0.85rem' }}>{text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: CC.terracotta }}>
                <Sparkles size={30} color="white" />
              </div>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.8rem', color: CC.primaryText, marginBottom: 8 }}>
                Your Top 3 Matches
              </h2>
              <p style={{ color: CC.mutedOlive }}>Based on your unique needs and preferences</p>
            </div>

            <div className="space-y-5">
              {aiMatches.map((m, i) => (
                <motion.div
                  key={m.id || m.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-5 p-5 rounded-3xl"
                  style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.07)', border: i === 0 ? `2px solid ${CC.forestSage}` : 'none' }}
                >
                  {i === 0 && (
                    <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: CC.forestSage, fontWeight: 600 }}>
                      Best Match
                    </div>
                  )}
                  <div className="relative">
                    <img src={fileUrl(m.image)} alt={m.name} className="w-20 h-20 rounded-2xl object-cover" />
                    {i === 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: CC.terracotta }}>
                        <Star size={10} fill="white" color="white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>{m.name}</h3>
                        <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginTop: 2 }}>{m.specialty}</p>
                      </div>
                      <div
                        className="px-4 py-1.5 rounded-full text-sm text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 700 }}
                      >
                        {m.match}% match
                      </div>
                    </div>
                    <p style={{ color: CC.primaryText, fontSize: '0.82rem', marginTop: 8, lineHeight: 1.6 }}>{m.reason}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Star size={13} fill={CC.terracotta} color={CC.terracotta} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: CC.primaryText }}>{m.rating}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>{m.sessions.toLocaleString()} sessions</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <motion.button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-white"
                        style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => navigate(`/dashboard/appointments?counselor=${encodeURIComponent(m.id)}`)}
                      >
                        <Video size={13} /> Book Session
                      </motion.button>
                      <motion.button
                        className="px-4 py-2 rounded-xl text-xs"
                        style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 500 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => navigate(`/dashboard/find-counselor?counselor=${encodeURIComponent(m.id)}`)}
                      >
                        View Profile
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => { setPhase('intro'); setCurrentQ(0); setAnswers([]); setSelectedOption(null); }}
                style={{ color: CC.mutedOlive, fontSize: '0.85rem' }}
              >
                Retake assessment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
