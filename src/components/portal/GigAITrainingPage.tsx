'use client';
// Gig AI Training — main page.
// Ported from interboost-agent-training/src/App.tsx, restyled with the
// gig-solutions navy/green/white palette. Renamed from "LiveShift"/"Interboost"
// to "Gig AI Training".
//
// Three training modes:
//   1. Practice Session — real-time voice role-play with an AI customer
//   2. Watch AI Solve — generates a transcript of an expert agent resolving
//      the scenario, plays it back with TTS
//   3. Live AI Coach — real-time voice coaching with an AI instructor
//
// Requires NEXT_PUBLIC_GEMINI_API_KEY for all Gemini-dependent features.
// If the key is not set, shows a friendly configuration card instead of crashing.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch, useAppStore } from '@/lib/store';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  User,
  MessageSquare,
  Trophy,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Calculator,
  Wrench,
  HeartPulse,
  Shield,
  ShoppingCart,
  Laptop,
  Plane,
  Landmark,
  Smartphone,
  Lightbulb,
  Car,
  Home,
  ArrowLeft,
  Loader2,
  Brain,
  KeyRound,
} from 'lucide-react';
import type { AppState, Scenario, Feedback, Message } from '@/lib/ai-training-types';
import {
  generateScenario,
  getFeedback,
  generateLearningTranscript,
  isGeminiConfigured,
  ConfigurationError,
} from '@/lib/gemini-service';
import LiveVoiceSession from './ai-training/LiveVoiceSession';
import KnowledgeBaseViewer from './ai-training/KnowledgeBaseViewer';
import LearnModeViewer from './ai-training/LearnModeViewer';
import LiveTeacherSession from './ai-training/LiveTeacherSession';

export default function GigAITrainingPage() {
  // Subscribe to currentUser so the component re-renders when the store
  // hydrates from localStorage. Without this, the usage-fetch useEffect
  // would run before currentUser is available and authFetch would send
  // no auth headers.
  const currentUser = useAppStore((s) => s.currentUser);

  const [state, setState] = useState<AppState>('IDLE');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [intendedMode, setIntendedMode] = useState<'PRACTICING' | 'LEARNING' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [practiceTab, setPracticeTab] = useState<'session' | 'kb' | 'script'>('session');
  const [configError, setConfigError] = useState<string | null>(null);

  // ─── Usage tracking (3 sessions per 24h) ──────────────────────────────
  const [usage, setUsage] = useState<{
    count: number;
    limit: number;
    remaining: number;
    canUse: boolean;
    resetAt: string | null;
    waitMs: number;
  } | null>(null);
  const [usageCountdown, setUsageCountdown] = useState<string>('');

  const geminiReady = isGeminiConfigured();

  // Fetch usage status on mount + when currentUser becomes available
  // (the store hydrates from localStorage asynchronously, so we need to
  // wait for currentUser before authFetch can send auth headers).
  useEffect(() => {
    if (!geminiReady || !currentUser) return;
    authFetch('/api/ai-training/usage')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.count === 'number') setUsage(data);
      })
      .catch(() => {});
  }, [geminiReady, currentUser]);

  // Countdown ticker — updates every second when limit is reached
  useEffect(() => {
    if (!usage || usage.canUse) {
      setUsageCountdown('');
      return;
    }
    const tick = () => {
      if (!usage.resetAt) {
        setUsageCountdown('');
        return;
      }
      const ms = new Date(usage.resetAt).getTime() - Date.now();
      if (ms <= 0) {
        setUsageCountdown('Available now!');
        authFetch('/api/ai-training/usage')
          .then((r) => r.json())
          .then((data) => {
            if (data && typeof data.count === 'number') setUsage(data);
          })
          .catch(() => {});
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setUsageCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [usage]);

  const refreshUsage = () => {
    authFetch('/api/ai-training/usage')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.count === 'number') setUsage(data);
      })
      .catch(() => {});
  };

  const categories = [
    { id: 'taxes', name: 'Taxes & Accounting', icon: Calculator, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'home-repair', name: 'Home Repair', icon: Wrench, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'healthcare', name: 'Healthcare', icon: HeartPulse, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'insurance', name: 'Insurance Claims', icon: Shield, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'tech-support', name: 'Tech Support', icon: Laptop, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'travel', name: 'Travel & Hospitality', icon: Plane, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'banking', name: 'Banking & Finance', icon: Landmark, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'telecom', name: 'Telecommunications', icon: Smartphone, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'utilities', name: 'Utilities & Services', icon: Lightbulb, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'automotive', name: 'Automotive', icon: Car, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
    { id: 'real-estate', name: 'Real Estate', icon: Home, color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10' },
  ];

  const handleStartPractice = () => {
    if (!geminiReady) {
      setConfigError('Gemini API key not configured. See setup instructions below.');
      return;
    }
    if (usage && !usage.canUse) {
      setConfigError(`Daily limit reached. Try again in ${usageCountdown}.`);
      return;
    }
    setConfigError(null);
    setIntendedMode('PRACTICING');
    setState('SELECT_CATEGORY');
    setPracticeTab('session');
  };

  const handleStartLearnMode = () => {
    if (!geminiReady) {
      setConfigError('Gemini API key not configured. See setup instructions below.');
      return;
    }
    if (usage && !usage.canUse) {
      setConfigError(`Daily limit reached. Try again in ${usageCountdown}.`);
      return;
    }
    setConfigError(null);
    setIntendedMode('LEARNING');
    setState('SELECT_CATEGORY');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setState('SELECT_DIFFICULTY');
  };

  const handleDifficultySelect = async (selectedDiff: string) => {
    setDifficulty(selectedDiff);
    setIsLoading(true);
    setState('GENERATING_SCENARIO');
    try {
      const newScenario = await generateScenario(selectedCategory, selectedDiff);
      setScenario(newScenario);
      // Refresh usage (the scenario route recorded a session)
      refreshUsage();

      if (intendedMode === 'LEARNING') {
        setState('GENERATING_TRANSCRIPT');
        const newMessages = await generateLearningTranscript(newScenario);
        setMessages(newMessages);
        setState('LEARNING');
      } else {
        setState('PRACTICING');
      }
    } catch (error: any) {
      console.error(error);
      // Check if it's a rate-limit error (the API returns a JSON body)
      const msg = error?.message || '';
      if (msg.includes('Daily limit reached')) {
        setConfigError(`Daily limit reached. Try again in ${usageCountdown || '24 hours'}.`);
        refreshUsage();
      } else if (error instanceof ConfigurationError) {
        setConfigError('Gemini API key not configured. See setup instructions below.');
      } else {
        setConfigError('Failed to generate scenario. Please try again.');
      }
      setState('IDLE');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTeacherSession = async () => {
    if (!geminiReady) {
      setConfigError('Gemini API key not configured. See setup instructions below.');
      return;
    }
    if (usage && !usage.canUse) {
      setConfigError(`Daily limit reached. Try again in ${usageCountdown}.`);
      return;
    }
    // Record the session via the usage API (enforces limit server-side)
    try {
      const res = await authFetch('/api/ai-training/usage', { method: 'POST' });
      if (res.status === 429) {
        const data = await res.json();
        setConfigError('Daily limit reached. Try again later.');
        refreshUsage();
        return;
      }
      if (!res.ok) throw new Error('Failed to record session');
      const updated = await res.json();
      if (updated && typeof updated.count === 'number') setUsage(updated);
    } catch (e) {
      console.error('Usage check failed:', e);
    }
    setConfigError(null);
    setState('TEACHER_SESSION');
  };

  const handleSessionEnd = async (sessionTranscript: string) => {
    setIsLoading(true);
    setState('FEEDBACK');
    setTranscript(sessionTranscript);
    try {
      if (scenario) {
        const result = await getFeedback(sessionTranscript, scenario);
        setFeedback(result);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setScenario(null);
    setFeedback(null);
    setMessages([]);
    setTranscript('');
    setState('IDLE');
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#0B1A2E] text-white font-sans selection:bg-[#16A34A]/30 flex flex-col">
      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl w-full mx-auto px-2 sm:px-6 py-2 sm:py-4">
        {/* Configuration card — shown automatically when the Gemini API key
            is not set, so users know how to enable the feature. */}
        {!geminiReady && state === 'IDLE' && (
          <ConfigurationCard />
        )}
        {configError && geminiReady && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-bold text-sm">{configError}</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {state === 'IDLE' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center text-center h-full"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6">
                <Sparkles className="w-3 h-3" />
                AI-Powered Training
              </div>

              {/* ─── Usage indicator ────────────────────────────────────────
                  Shows: X / 3 sessions used today, countdown when limit reached. */}
              {geminiReady && usage && (
                <div
                  className={`mb-6 inline-flex items-center gap-3 px-4 py-2 rounded-full border text-xs sm:text-sm font-medium ${
                    usage.canUse
                      ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {usage.canUse ? (
                    <>
                      <span className="font-bold">
                        {usage.remaining} of {usage.limit}
                      </span>
                      <span className="text-gray-400">sessions remaining today</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Limit reached — resets in</span>
                      <span className="font-mono font-bold">{usageCountdown}</span>
                    </>
                  )}
                </div>
              )}
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight px-2">
                Master Customer Service <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#16A34A] to-[#4ADE80]">
                  Through Real-Time Voice
                </span>
              </h2>
              <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
                Practice handling difficult tickets with our advanced AI customer
                simulator. Get instant feedback on your tone, empathy, and
                problem-solving skills.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full px-4 sm:px-0">
                <button
                  onClick={handleStartPractice}
                  disabled={isLoading || (!!usage && !usage.canUse)}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 sm:py-4 bg-white text-[#0B1A2E] rounded-full font-bold text-sm sm:text-lg transition-all hover:bg-[#16A34A] hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center"
                >
                  {isLoading ? 'Preparing...' : 'Start Practice Session'}
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
                <button
                  onClick={handleStartLearnMode}
                  disabled={isLoading || (!!usage && !usage.canUse)}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 sm:py-4 bg-[#16A34A] text-white rounded-full font-bold text-sm sm:text-lg transition-all hover:bg-[#0F7B35] hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center shadow-lg shadow-[#16A34A]/20"
                >
                  {isLoading ? 'Preparing...' : 'Watch AI Solve'}
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform shrink-0" />
                </button>
                <button
                  onClick={handleStartTeacherSession}
                  disabled={isLoading || (!!usage && !usage.canUse)}
                  className="group relative inline-flex items-center gap-3 px-6 py-3 sm:py-4 bg-white/10 text-white border border-white/20 rounded-full font-bold text-sm sm:text-lg transition-all hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center shadow-lg"
                >
                  {isLoading ? 'Preparing...' : 'Live AI Coach'}
                  <User className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform shrink-0" />
                </button>
              </div>
            </motion.div>
          )}

          {state === 'SELECT_CATEGORY' && (
            <motion.div
              key="select-category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col h-full w-full max-w-5xl mx-auto"
            >
              <div className="shrink-0 flex items-center gap-4 mb-4">
                <button
                  onClick={() => setState('IDLE')}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Select a Scenario Category
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                    Choose an industry to practice your customer service skills.
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 pb-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 h-full">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.name)}
                      className="group relative flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-[#16A34A]/10 border border-white/10 hover:border-[#16A34A]/30 rounded-xl transition-all text-center w-full h-full"
                    >
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-1 sm:mb-2 shrink-0 ${cat.bg}`}>
                        <cat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${cat.color}`} />
                      </div>
                      <h3 className="text-[10px] sm:text-xs font-bold text-white group-hover:text-[#16A34A] transition-colors leading-tight">
                        {cat.name}
                      </h3>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {state === 'SELECT_DIFFICULTY' && (
            <motion.div
              key="select-difficulty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col h-full w-full max-w-3xl mx-auto"
            >
              <div className="shrink-0 flex items-center gap-4 mb-4">
                <button
                  onClick={() => setState('SELECT_CATEGORY')}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 hover:text-white" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Select Difficulty
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                    Choose how challenging the {selectedCategory} scenario should be.
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 pb-2">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {[
                    { id: 'easy', name: 'Easy', desc: 'Polite, simple', color: 'text-[#16A34A]', bg: 'bg-[#16A34A]/10', border: 'hover:border-[#16A34A]/50' },
                    { id: 'medium', name: 'Medium', desc: 'Frustrated, standard', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50' },
                    { id: 'hard', name: 'Hard', desc: 'Angry, complex', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/50' },
                    { id: 'very hard', name: 'Very Hard', desc: 'Irate, edge-case', color: 'text-red-400', bg: 'bg-red-500/10', border: 'hover:border-red-500/50' },
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => handleDifficultySelect(diff.id)}
                      className={`group relative flex flex-col items-center justify-center p-2 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 ${diff.border} rounded-xl transition-all text-center w-full h-full`}
                    >
                      <h3 className={`text-sm sm:text-lg font-bold mb-1 ${diff.color}`}>
                        {diff.name}
                      </h3>
                      <p className="text-gray-400 text-[10px] sm:text-xs leading-tight">
                        {diff.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {state === 'GENERATING_SCENARIO' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <Loader2 className="w-12 h-12 text-[#16A34A] animate-spin mb-6" />
              <p className="text-xl font-medium text-gray-300">
                Generating a unique scenario...
              </p>
              <p className="text-sm text-gray-500 mt-2 font-mono">
                Consulting the AI Customer Database
              </p>
            </motion.div>
          )}

          {state === 'GENERATING_TRANSCRIPT' && (
            <motion.div
              key="generating-transcript"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <Loader2 className="w-12 h-12 text-[#16A34A] animate-spin mb-6" />
              <p className="text-xl font-medium text-gray-300">
                Generating expert solution...
              </p>
              <p className="text-sm text-gray-500 mt-2 font-mono">
                The AI Agent is solving the case
              </p>
            </motion.div>
          )}

          {state === 'LEARNING' && scenario && (
            <motion.div
              key="learning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4 sm:gap-6"
            >
              <div className="h-full min-h-0">
                <LearnModeViewer scenario={scenario} messages={messages} onEnd={reset} />
              </div>
              <div className="h-full min-h-0">
                <KnowledgeBaseViewer content={scenario.knowledgeBase} script={scenario.script} />
              </div>
            </motion.div>
          )}

          {state === 'TEACHER_SESSION' && (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 min-h-0 w-full max-w-4xl mx-auto"
            >
              <LiveTeacherSession onEnd={reset} />
            </motion.div>
          )}

          {state === 'PRACTICING' && scenario && (
            <motion.div
              key="practicing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 min-h-0 w-full max-w-4xl mx-auto flex flex-col"
            >
              <div className="grid grid-cols-3 bg-black/40 rounded-xl p-1 border border-white/10 mb-2 sm:mb-4 shrink-0">
                <button
                  onClick={() => setPracticeTab('session')}
                  className={`flex items-center justify-center px-1 sm:px-4 py-2 text-[10px] sm:text-sm font-medium rounded-lg transition-colors text-center leading-tight ${
                    practiceTab === 'session'
                      ? 'bg-[#16A34A]/20 text-[#16A34A]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Voice Session
                </button>
                <button
                  onClick={() => setPracticeTab('kb')}
                  className={`flex items-center justify-center px-1 sm:px-4 py-2 text-[10px] sm:text-sm font-medium rounded-lg transition-colors text-center leading-tight ${
                    practiceTab === 'kb'
                      ? 'bg-[#16A34A]/20 text-[#16A34A]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Knowledge Base
                </button>
                <button
                  onClick={() => setPracticeTab('script')}
                  className={`flex items-center justify-center px-1 sm:px-4 py-2 text-[10px] sm:text-sm font-medium rounded-lg transition-colors text-center leading-tight ${
                    practiceTab === 'script'
                      ? 'bg-[#16A34A]/20 text-[#16A34A]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Agent Script
                </button>
              </div>

              <div className="flex-1 relative min-h-0">
                <div
                  className={`absolute inset-0 flex flex-col bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-4 overflow-hidden ${
                    practiceTab === 'session' ? 'block' : 'hidden'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2 sm:mb-4">
                    <div>
                      <h3 className="text-[9px] sm:text-[10px] font-mono text-[#16A34A] uppercase tracking-widest mb-1">
                        Active Scenario
                      </h3>
                      <h2 className="text-sm sm:text-xl font-bold leading-tight">
                        {scenario.issue}
                      </h2>
                    </div>
                    <div
                      className={`px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                        scenario.difficulty === 'very hard'
                          ? 'bg-red-600/20 border-red-500/30 text-red-500'
                          : scenario.difficulty === 'hard'
                            ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            : scenario.difficulty === 'medium'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                      }`}
                    >
                      {scenario.difficulty}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="text-xs">
                          Customer: <strong className="text-white">{scenario.customerName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="text-xs">
                          Initial Mood:{' '}
                          <strong className="text-white capitalize">{scenario.mood}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="p-2 sm:p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">
                        Agent Context
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {scenario.context}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <LiveVoiceSession scenario={scenario} voiceName="Zephyr" onEnd={handleSessionEnd} />
                  </div>
                </div>

                {practiceTab === 'kb' && (
                  <div className="absolute inset-0">
                    <KnowledgeBaseViewer content={scenario.knowledgeBase} hideTabs title="Knowledge Base" />
                  </div>
                )}

                {practiceTab === 'script' && (
                  <div className="absolute inset-0">
                    <KnowledgeBaseViewer content={scenario.script || ''} hideTabs title="Agent Script" icon="script" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {state === 'FEEDBACK' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto"
            >
              {!feedback ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-[#16A34A] animate-spin mb-4" />
                  <p className="text-sm sm:text-xl font-medium text-gray-300">
                    Analyzing your performance...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col h-full gap-2 sm:gap-4">
                  <div className="bg-gradient-to-br from-[#16A34A] to-[#0F7B35] rounded-xl sm:rounded-2xl p-3 sm:p-6 text-center shadow-lg shrink-0">
                    <div className="flex items-center justify-center gap-4">
                      <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-white/50" />
                      <div>
                        <h2 className="text-[9px] sm:text-xs font-mono text-white/80 uppercase tracking-widest mb-1">
                          Session Score
                        </h2>
                        <div className="text-3xl sm:text-5xl font-black">{feedback.score}</div>
                      </div>
                    </div>
                    <p className="text-white/90 text-xs sm:text-sm max-w-xl mx-auto mt-2 line-clamp-2">
                      {feedback.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4 shrink-0">
                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                        <h3 className="text-xs sm:text-sm font-bold">Key Strengths</h3>
                      </div>
                      <ul className="space-y-1 sm:space-y-2 overflow-y-auto no-scrollbar max-h-24 sm:max-h-32">
                        {feedback.strengths.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[10px] sm:text-xs text-gray-300"
                          >
                            <ChevronRight className="w-3 h-3 text-[#16A34A] mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-xs sm:text-sm font-bold">Areas to Improve</h3>
                      </div>
                      <ul className="space-y-1 sm:space-y-2 overflow-y-auto no-scrollbar max-h-24 sm:max-h-32">
                        {feedback.improvements.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[10px] sm:text-xs text-gray-300"
                          >
                            <ChevronRight className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {transcript && (
                    <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col flex-1 min-h-0">
                      <div className="flex items-center gap-2 mb-2 shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#16A34A]" />
                        <h3 className="text-xs sm:text-sm font-bold">Session Transcript</h3>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 sm:p-4 overflow-y-auto no-scrollbar font-mono text-[9px] sm:text-[10px] text-gray-300 whitespace-pre-wrap border border-white/5 flex-1">
                        {transcript}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center shrink-0 pt-2">
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-6 py-2 sm:py-3 bg-white text-[#0B1A2E] rounded-full font-bold text-xs sm:text-sm transition-all hover:bg-[#16A34A] hover:text-white hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try Another Scenario
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Configuration Card ─────────────────────────────────────────────────
// Shown when NEXT_PUBLIC_GEMINI_API_KEY is not set. Explains how to configure
// the Gemini API key to enable AI training features.
function ConfigurationCard() {
  return (
    <div className="mb-6 bg-gradient-to-br from-[#16A34A]/10 to-transparent border border-[#16A34A]/20 rounded-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#16A34A]/20 flex items-center justify-center shrink-0">
          <KeyRound className="w-6 h-6 text-[#16A34A]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">
            Configuration Required
          </h3>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Gig AI Training uses Google Gemini&apos;s real-time voice API to
            simulate customer interactions. To enable this feature, you need to
            set the <code className="bg-[#16A34A]/10 text-[#16A34A] px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GEMINI_API_KEY</code> environment variable.
          </p>
          <div className="bg-black/40 rounded-xl p-4 border border-white/5">
            <p className="text-xs font-mono text-gray-400 mb-2">
              Add this line to <code className="text-[#16A34A]">/root/gig-src/.env</code>:
            </p>
            <pre className="text-xs font-mono text-[#16A34A]">
              NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
            </pre>
            <p className="text-xs text-gray-500 mt-3">
              Get a free API key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#16A34A] hover:underline"
              >
                aistudio.google.com/apikey
              </a>
              . Then rebuild and redeploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
