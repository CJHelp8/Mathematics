import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Delete,
  Flag,
  Home,
  Keyboard,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { MatchConfig, MatchSummary, MathQuestion, RankInfo, UserProfile } from '../types/game';
import { generateQuestion, validateMathAnswer } from '../lib/mathEngine';
import {
  clampElo,
  computeMatchRewards,
  formatCountdown,
  getMatchDurationSeconds,
  getRankFromElo,
} from '../lib/progression';
import { commitMatchResult } from '../services/userService';
import { soundEngine } from '../lib/sound';
import { RankBadge } from './RankBadge';

interface MatchArenaProps {
  profile: UserProfile;
  config: MatchConfig;
  onExitToHome: () => void;
  onPlayAgain: () => void;
}

interface FeedbackBanner {
  id: string;
  correct: boolean;
  label: string;
  streak: number;
}

interface BurstParticle {
  angleDeg: number;
  distance: number;
  size: number;
  isDiamond: boolean;
  delay: number;
}

const CORRECT_PARTICLES: BurstParticle[] = [
  { angleDeg: 0, distance: 78, size: 7, isDiamond: false, delay: 0 },
  { angleDeg: 30, distance: 56, size: 6, isDiamond: true, delay: 0.02 },
  { angleDeg: 62, distance: 84, size: 8, isDiamond: false, delay: 0.01 },
  { angleDeg: 95, distance: 52, size: 6, isDiamond: true, delay: 0.03 },
  { angleDeg: 128, distance: 80, size: 7, isDiamond: false, delay: 0 },
  { angleDeg: 158, distance: 60, size: 5, isDiamond: true, delay: 0.02 },
  { angleDeg: 185, distance: 82, size: 7, isDiamond: false, delay: 0.01 },
  { angleDeg: 215, distance: 54, size: 6, isDiamond: true, delay: 0.03 },
  { angleDeg: 248, distance: 86, size: 8, isDiamond: false, delay: 0 },
  { angleDeg: 278, distance: 50, size: 6, isDiamond: true, delay: 0.02 },
  { angleDeg: 308, distance: 78, size: 7, isDiamond: false, delay: 0.01 },
  { angleDeg: 336, distance: 62, size: 6, isDiamond: true, delay: 0.02 },
];

const WRONG_PARTICLES: BurstParticle[] = [
  { angleDeg: 20, distance: 46, size: 6, isDiamond: true, delay: 0 },
  { angleDeg: 65, distance: 38, size: 5, isDiamond: false, delay: 0.02 },
  { angleDeg: 115, distance: 42, size: 6, isDiamond: true, delay: 0.01 },
  { angleDeg: 160, distance: 48, size: 5, isDiamond: false, delay: 0 },
  { angleDeg: 200, distance: 44, size: 6, isDiamond: true, delay: 0.02 },
  { angleDeg: 250, distance: 34, size: 5, isDiamond: false, delay: 0.01 },
  { angleDeg: 295, distance: 36, size: 6, isDiamond: true, delay: 0.02 },
  { angleDeg: 340, distance: 46, size: 5, isDiamond: false, delay: 0 },
];

const PROMOTION_PARTICLES: BurstParticle[] = [
  { angleDeg: 0, distance: 118, size: 8, isDiamond: true, delay: 0.04 },
  { angleDeg: 24, distance: 86, size: 6, isDiamond: false, delay: 0.08 },
  { angleDeg: 48, distance: 124, size: 9, isDiamond: true, delay: 0.02 },
  { angleDeg: 74, distance: 78, size: 6, isDiamond: false, delay: 0.1 },
  { angleDeg: 100, distance: 116, size: 8, isDiamond: true, delay: 0.05 },
  { angleDeg: 126, distance: 84, size: 7, isDiamond: false, delay: 0.09 },
  { angleDeg: 152, distance: 122, size: 8, isDiamond: true, delay: 0.03 },
  { angleDeg: 178, distance: 90, size: 6, isDiamond: false, delay: 0.07 },
  { angleDeg: 204, distance: 120, size: 9, isDiamond: true, delay: 0.04 },
  { angleDeg: 230, distance: 80, size: 6, isDiamond: false, delay: 0.11 },
  { angleDeg: 256, distance: 114, size: 8, isDiamond: true, delay: 0.06 },
  { angleDeg: 282, distance: 88, size: 7, isDiamond: false, delay: 0.08 },
  { angleDeg: 310, distance: 126, size: 8, isDiamond: true, delay: 0.03 },
  { angleDeg: 336, distance: 82, size: 6, isDiamond: false, delay: 0.12 },
];

function makeMatchId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const MatchArena: React.FC<MatchArenaProps> = ({
  profile,
  config,
  onExitToHome,
  onPlayAgain,
}) => {
  const isMental = config.subMode === 'mental';
  const isEloActive = config.playMode === 'ranked' || config.playMode === 'mental';
  const initialTimerSeconds = getMatchDurationSeconds(config.subMode, config.difficulty);

  const [matchId] = useState<string>(() => makeMatchId());
  const [question, setQuestion] = useState<MathQuestion>(() =>
    generateQuestion(config.subMode, config.difficulty)
  );
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number>(initialTimerSeconds);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mentalEloDelta, setMentalEloDelta] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [livePromotion, setLivePromotion] = useState<RankInfo | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );
  const [useMobileMathPad, setUseMobileMathPad] = useState<boolean>(true);
  const [activeField, setActiveField] = useState<'a' | 'b'>('a');

  const isMathPadActive = isMobileViewport && useMobileMathPad;

  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryInputRef = useRef<HTMLInputElement | null>(null);
  const matchStartMsRef = useRef<number>(Date.now());
  const deadlineMsRef = useRef<number>(Date.now() + initialTimerSeconds * 1000);
  const finishedRef = useRef<boolean>(false);
  const prevLiveRankRef = useRef<RankInfo>(getRankFromElo(profile.elo));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const syncViewport = () => setIsMobileViewport(mq.matches);
    syncViewport();
    mq.addEventListener('change', syncViewport);
    return () => mq.removeEventListener('change', syncViewport);
  }, []);

  const triggerCardFeedbackMotion = useCallback(
    (isCorrect: boolean) => {
      if (shouldReduceMotion || !cardRef.current || typeof cardRef.current.animate !== 'function') {
        return;
      }
      cardRef.current.animate(
        isCorrect
          ? [
              { transform: 'scale(1)' },
              { transform: 'scale(1.012)' },
              { transform: 'scale(1)' },
            ]
          : [
              { transform: 'translateX(0px)' },
              { transform: 'translateX(-7px)' },
              { transform: 'translateX(7px)' },
              { transform: 'translateX(-4px)' },
              { transform: 'translateX(4px)' },
              { transform: 'translateX(0px)' },
            ],
        {
          duration: 280,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }
      );
    },
    [shouldReduceMotion]
  );

  // Latest counters in refs for timer-expiry closure safety
  const statsRef = useRef({
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    bestStreak: 0,
    mentalEloDelta: 0,
  });

  useEffect(() => {
    statsRef.current = {
      correctCount,
      wrongCount,
      streak,
      bestStreak,
      mentalEloDelta,
    };
  }, [correctCount, wrongCount, streak, bestStreak, mentalEloDelta]);

  const focusFirstInput = useCallback(() => {
    if (isMathPadActive) return;
    const el = primaryInputRef.current;
    if (!el) return;
    if (document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [isMathPadActive]);

  useEffect(() => {
    if (!confirmExit && !summary && !isMathPadActive) {
      const activeEl = document.activeElement;
      if (
        activeEl !== primaryInputRef.current &&
        activeEl !== secondaryInputRef.current
      ) {
        focusFirstInput();
      }
    }
  }, [question.id, confirmExit, summary, isMathPadActive, focusFirstInput]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFinishing) return;

      if (summary) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onExitToHome();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          onPlayAgain();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmExit) {
          setConfirmExit(false);
          if (statsRef.current.correctCount + statsRef.current.wrongCount === 0) {
            onExitToHome();
          } else {
            void finishMatch();
          }
        } else {
          setConfirmExit(true);
        }
        return;
      }

      if (confirmExit && e.key === 'Enter') {
        e.preventDefault();
        setConfirmExit(false);
        focusFirstInput();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmExit, focusFirstInput, isFinishing, onExitToHome, onPlayAgain, summary]);

  const finishMatch = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFinishing(true);
    setSaveError(null);

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - matchStartMsRef.current) / 1000)
    );
    const snapshot = statsRef.current;

    try {
      const result = await commitMatchResult({
        uid: profile.uid,
        matchId,
        config,
        correctCount: snapshot.correctCount,
        wrongCount: snapshot.wrongCount,
        durationSeconds: elapsedSeconds,
        bestStreak: snapshot.bestStreak,
        mentalLiveEloDelta: snapshot.mentalEloDelta,
      });
      const rankBefore = getRankFromElo(result.eloBefore);
      const rankAfter = getRankFromElo(result.eloAfter);
      const promoted =
        rankAfter.tierIndex > rankBefore.tierIndex ||
        (rankAfter.fullName !== rankBefore.fullName && result.eloAfter > result.eloBefore);

      if (promoted) {
        soundEngine.playPromotion(profile.preferences.soundEnabled);
      } else {
        soundEngine.playFinish(profile.preferences.soundEnabled);
      }

      setSummary(result);
    } catch (error) {
      soundEngine.playFinish(profile.preferences.soundEnabled);
      setSaveError(
        error instanceof Error
          ? 'Erro ao salvar partida no servidor. Verifique sua conexão.'
          : 'Erro ao registrar partida.'
      );
    } finally {
      setIsFinishing(false);
    }
  }, [config, matchId, profile.preferences.soundEnabled, profile.uid]);

  const advanceQuestion = useCallback(() => {
    setInputA('');
    setInputB('');
    setActiveField('a');
    setQuestion(generateQuestion(config.subMode, config.difficulty));
    if (isMental) {
      deadlineMsRef.current = Date.now() + 10000;
      setSecondsLeft(10);
    }
  }, [config.difficulty, config.subMode, isMental]);

  // High-accuracy countdown loop
  useEffect(() => {
    if (summary || isFinishing) return;

    const interval = window.setInterval(() => {
      if (finishedRef.current) return;
      const remainingMs = deadlineMsRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(remainingSec);

      if (remainingMs <= 0) {
        if (isMental) {
          // Mental mode: 10s expired -> count as wrong/timeout, apply penalty, advance automatically
          const penalty = question.eloPenaltyOnWrong;
          const nextWrong = statsRef.current.wrongCount + 1;
          const nextDelta = isEloActive
            ? statsRef.current.mentalEloDelta - penalty
            : 0;

          statsRef.current.wrongCount = nextWrong;
          statsRef.current.streak = 0;
          statsRef.current.mentalEloDelta = nextDelta;

          setWrongCount(nextWrong);
          setStreak(0);
          setMentalEloDelta(nextDelta);
          soundEngine.playWrong(profile.preferences.soundEnabled);
          triggerCardFeedbackMotion(false);
          setFeedback({
            id: `timeout-${Date.now()}`,
            correct: false,
            label: `Tempo esgotado · Resposta: ${question.formattedAnswer}`,
            streak: 0,
          });
          advanceQuestion();
        } else {
          // Basico / Equacao: match ends when countdown reaches 0
          void finishMatch();
        }
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [
    advanceQuestion,
    finishMatch,
    isEloActive,
    isFinishing,
    isMental,
    profile.preferences.soundEnabled,
    question.eloPenaltyOnWrong,
    question.formattedAnswer,
    summary,
    triggerCardFeedbackMotion,
  ]);

  const submitCurrentAnswer = () => {
    if (finishedRef.current || isFinishing) return;

    // On 2-field questions, advance to second field first if only the first is filled
    if (
      question.kind !== 'single' &&
      activeField === 'a' &&
      inputA.trim() &&
      !inputB.trim()
    ) {
      setActiveField('b');
      if (!isMathPadActive) {
        secondaryInputRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    if (!inputA.trim() && !inputB.trim()) return;

    const isCorrect = validateMathAnswer(question, inputA, inputB);

    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      const nextStreak = streak + 1;
      const nextBest = Math.max(bestStreak, nextStreak);
      const nextDelta = isMental && isEloActive ? mentalEloDelta + 5 : mentalEloDelta;

      statsRef.current.correctCount = nextCorrect;
      statsRef.current.streak = nextStreak;
      statsRef.current.bestStreak = nextBest;
      statsRef.current.mentalEloDelta = nextDelta;

      setCorrectCount(nextCorrect);
      setStreak(nextStreak);
      setBestStreak(nextBest);
      setMentalEloDelta(nextDelta);
      soundEngine.playCorrect(profile.preferences.soundEnabled);
      triggerCardFeedbackMotion(true);

      setFeedback({
        id: `ok-${Date.now()}`,
        correct: true,
        label: isMental && isEloActive ? 'Correto (+5 Elo)' : 'Correto!',
        streak: nextStreak,
      });
    } else {
      const nextWrong = wrongCount + 1;
      const penalty = question.eloPenaltyOnWrong;
      const nextDelta = isMental && isEloActive ? mentalEloDelta - penalty : mentalEloDelta;

      statsRef.current.wrongCount = nextWrong;
      statsRef.current.streak = 0;
      statsRef.current.mentalEloDelta = nextDelta;

      setWrongCount(nextWrong);
      setStreak(0);
      setMentalEloDelta(nextDelta);
      soundEngine.playWrong(profile.preferences.soundEnabled);
      triggerCardFeedbackMotion(false);

      setFeedback({
        id: `err-${Date.now()}`,
        correct: false,
        label: `Incorreto · Resposta: ${question.formattedAnswer}`,
        streak: 0,
      });
    }

    // Keep system keyboard open synchronously without scrolling if math pad is off
    if (!isMathPadActive) {
      primaryInputRef.current?.focus({ preventScroll: true });
    }

    advanceQuestion();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentAnswer();
  };

  const targetField: 'a' | 'b' = question.kind === 'single' ? 'a' : activeField;

  const updateTargetValue = (updater: (prev: string) => string) => {
    if (targetField === 'a') {
      setInputA(updater);
    } else {
      setInputB(updater);
    }
  };

  const handlePadDigit = (token: string) => {
    updateTargetValue((prev) => {
      if (prev.length >= 14) return prev;
      if (token === ',' && prev.includes(',') && !prev.includes('/')) return prev;
      if (token === '/' && (prev.includes('/') || !prev || prev === '-')) return prev;
      return `${prev}${token}`;
    });
  };

  const handlePadToggleMinus = () => {
    updateTargetValue((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
  };

  const handlePadBackspace = () => {
    updateTargetValue((prev) => prev.slice(0, -1));
  };

  const handlePadClear = () => {
    updateTargetValue(() => '');
  };

  const handlePadSwitchField = () => {
    if (question.kind === 'single') return;
    setActiveField((prev) => (prev === 'a' ? 'b' : 'a'));
  };

  // Live estimated Elo preview during match
  const liveRewardsPreview = computeMatchRewards({
    playMode: config.playMode,
    subMode: config.subMode,
    difficulty: config.difficulty,
    correctCount,
    wrongCount,
    bestStreak,
    mentalLiveEloDelta: mentalEloDelta,
    currentElo: profile.elo,
  });

  const liveEloPreview = clampElo(profile.elo + liveRewardsPreview.eloDelta);
  const liveRank = getRankFromElo(liveEloPreview);
  const showUrgent = profile.preferences.showTimerWarning && secondsLeft <= 10;

  useEffect(() => {
    if (!isMental || !isEloActive || summary) return;
    const prevTier = prevLiveRankRef.current.tierIndex;
    if (liveRank.tierIndex > prevTier) {
      prevLiveRankRef.current = liveRank;
      setLivePromotion(liveRank);
      soundEngine.playPromotion(profile.preferences.soundEnabled);
    } else if (liveRank.tierIndex < prevTier) {
      prevLiveRankRef.current = liveRank;
    }
  }, [isEloActive, isMental, liveRank, profile.preferences.soundEnabled, summary]);

  useEffect(() => {
    if (!livePromotion) return;
    const timer = window.setTimeout(() => {
      setLivePromotion(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [livePromotion]);

  if (summary) {
    const total = summary.correctCount + summary.wrongCount;
    const accuracy = total > 0 ? Math.round((summary.correctCount / total) * 100) : 0;
    const rankBefore = getRankFromElo(summary.eloBefore);
    const rankAfter = getRankFromElo(summary.eloAfter);
    const isTierPromoted = rankAfter.tierIndex > rankBefore.tierIndex;
    const isDivisionPromoted =
      !isTierPromoted &&
      rankAfter.fullName !== rankBefore.fullName &&
      summary.eloAfter > summary.eloBefore;
    const isPromoted = isTierPromoted || isDivisionPromoted;
    const leveledUp = summary.levelAfter > summary.levelBefore;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {summary.config.playMode} · {summary.config.subMode} · {summary.config.difficulty}
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                Partida Finalizada
              </h2>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Patente Atual</p>
              <RankBadge rank={rankAfter} size="sm" />
            </div>
          </div>

          {isPromoted && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border p-5 sm:p-6 bg-slate-50/90 dark:bg-slate-950/70"
              style={{
                borderColor: `${rankAfter.accentColor}55`,
                backgroundImage: `radial-gradient(circle at 50% 35%, ${rankAfter.accentColor}24, transparent 72%)`,
              }}
            >
              {!shouldReduceMotion && (
                <>
                  {/* Diagonal sweeping highlight */}
                  <motion.div
                    aria-hidden="true"
                    initial={{ x: '-120%' }}
                    animate={{ x: '230%' }}
                    transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 dark:via-white/15 to-transparent"
                  />

                  {/* Expanding rank-up shockwave + particle burst */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <motion.span
                      initial={{ scale: 0.35, opacity: 0.85 }}
                      animate={{ scale: 2.8, opacity: 0 }}
                      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute w-20 h-20 rounded-full border-2"
                      style={{ borderColor: rankAfter.accentColor }}
                    />
                    <motion.span
                      initial={{ scale: 0.25, opacity: 0.65 }}
                      animate={{ scale: 3.4, opacity: 0 }}
                      transition={{ duration: 1.05, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute w-20 h-20 rounded-full border"
                      style={{ borderColor: '#fbbf24' }}
                    />

                    {PROMOTION_PARTICLES.map((p, idx) => {
                      const rad = (p.angleDeg * Math.PI) / 180;
                      const dx = Math.cos(rad) * p.distance;
                      const dy = Math.sin(rad) * (p.distance * 0.65);
                      const particleColor =
                        idx % 3 === 0
                          ? rankAfter.accentColor
                          : idx % 3 === 1
                          ? '#fbbf24'
                          : '#38bdf8';

                      return (
                        <motion.span
                          key={idx}
                          initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
                          animate={{
                            x: dx,
                            y: dy,
                            scale: [0.3, 1.25, 0],
                            opacity: [1, 1, 0],
                            rotate: p.isDiamond ? 180 : 0,
                          }}
                          transition={{
                            duration: 0.9,
                            delay: p.delay,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{
                            width: p.size,
                            height: p.size,
                            backgroundColor: particleColor,
                          }}
                          className={`absolute ${p.isDiamond ? 'rounded-[2px]' : 'rounded-full'}`}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.25 }}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest"
                  style={{ color: rankAfter.accentColor }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isTierPromoted ? 'Promoção de Patente!' : 'Subiu de Divisão!'}</span>
                </motion.div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                  <motion.span
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
                    animate={{ opacity: 0.75, x: 0 }}
                    transition={{ delay: 0.14, duration: 0.25 }}
                    className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {rankBefore.fullName}
                  </motion.span>
                  <motion.span
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                    className="text-slate-400 dark:text-slate-500"
                    aria-hidden="true"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.65, opacity: 0 }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { scale: [0.65, 1.14, 1], opacity: 1 }
                    }
                    transition={{ delay: 0.22, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <RankBadge rank={rankAfter} size="sm" />
                  </motion.div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md">
                  Você ultrapassou a marca e alcançou{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {summary.eloAfter.toLocaleString('pt-BR')} Elo
                  </span>
                  {isTierPromoted ? ` na patente ${rankAfter.name}.` : '.'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Primary result numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Acertos</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {summary.correctCount}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Erros</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {summary.wrongCount}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Precisão</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {accuracy}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400">Tempo</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {summary.durationSeconds}s
              </p>
            </div>
          </div>

          {/* Elo & XP progression */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Elo Atualizado</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                  {summary.eloAfter.toLocaleString('pt-BR')} Elo
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-bold font-mono tabular-nums ${
                  summary.eloDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : summary.eloDelta < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {summary.eloDelta > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : summary.eloDelta < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : null}
                <span>
                  {summary.eloDelta > 0 ? `+${summary.eloDelta}` : summary.eloDelta} Elo
                </span>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Experiência</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  +{summary.xpEarned} XP
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nível</p>
                <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {leveledUp
                    ? `${summary.levelBefore} → ${summary.levelAfter} (Subiu!)`
                    : `Nível ${summary.levelAfter}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onExitToHome}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Voltar ao Início (Esc)</span>
            </button>
            <button
              type="button"
              onClick={onPlayAgain}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Jogar Novamente (Enter)</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const needsSecondFieldAdvance =
    question.kind !== 'single' &&
    activeField === 'a' &&
    Boolean(inputA.trim()) &&
    !inputB.trim();

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 sm:py-6 space-y-2.5 sm:space-y-4">
      {/* Live Match HUD */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm min-w-0">
          <span className="font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
            {config.playMode} · {config.subMode}
          </span>
          <span className="text-slate-400 hidden sm:inline" aria-hidden="true">/</span>
          <span className="hidden sm:inline capitalize text-slate-600 dark:text-slate-300 font-medium">
            {config.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 font-mono tabular-nums text-xs sm:text-sm">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {correctCount} acertos
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {wrongCount} erros
          </span>
          {isEloActive && (
            <span className="hidden sm:inline text-blue-600 dark:text-blue-400 font-semibold">
              {liveEloPreview.toLocaleString('pt-BR')} Elo (
              {liveRewardsPreview.eloDelta >= 0
                ? `+${liveRewardsPreview.eloDelta}`
                : liveRewardsPreview.eloDelta}
              )
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border font-mono tabular-nums text-sm sm:text-base font-bold flex items-center gap-1.5 transition-colors ${
              showUrgent
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{isMental ? `${secondsLeft}s` : formatCountdown(secondsLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            disabled={isFinishing}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{isMental ? 'Finalizar' : 'Encerrar'}</span>
            <span className="hidden sm:inline text-[10px] font-mono opacity-60">(Esc)</span>
          </button>
        </div>
      </div>

      {/* Live Mental Mode Rank Promotion Banner */}
      <AnimatePresence>
        {livePromotion && (
          <motion.div
            key={`live-promo-${livePromotion.fullName}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="pointer-events-none relative overflow-hidden rounded-2xl border px-4 py-3 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5"
            style={{
              borderColor: `${livePromotion.accentColor}66`,
              backgroundImage: `radial-gradient(circle at 20% 50%, ${livePromotion.accentColor}22, transparent 70%)`,
            }}
          >
            {!shouldReduceMotion && (
              <motion.span
                aria-hidden="true"
                initial={{ x: '-120%' }}
                animate={{ x: '240%' }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 dark:via-white/15 to-transparent"
              />
            )}
            <div className="relative z-10 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-50">
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: livePromotion.accentColor }} />
              <span>Promoção ao vivo! Nova patente alcançada:</span>
            </div>
            <div className="relative z-10">
              <RankBadge rank={livePromotion} size="sm" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-7 min-w-0"
      >
        {/* Ambient radial glow + border flash on answer */}
        <AnimatePresence>
          {feedback && !shouldReduceMotion && (
            <motion.div
              key={`glow-${feedback.id}`}
              aria-hidden="true"
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: feedback.correct ? 0.52 : 0.42, ease: 'easeOut' }}
              className={`pointer-events-none absolute inset-0 rounded-2xl border-2 ${
                feedback.correct
                  ? 'border-emerald-400/70 dark:border-emerald-400/50'
                  : 'border-rose-400/70 dark:border-rose-500/50'
              }`}
              style={{
                background: feedback.correct
                  ? 'radial-gradient(circle at 50% 72%, rgba(16, 185, 129, 0.2), transparent 68%)'
                  : 'radial-gradient(circle at 50% 72%, rgba(244, 63, 94, 0.18), transparent 68%)',
              }}
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 sm:mb-3">
          <span className="truncate">{question.helperLabel}</span>
          <span className="font-mono tabular-nums shrink-0">Sequência: {streak}</span>
        </div>

        {/* Fixed-height prompt container prevents layout bounce between questions */}
        <div className="min-h-[72px] sm:min-h-[108px] flex flex-col items-center justify-center">
          <motion.div
            key={question.id}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-1 space-y-1.5 min-w-0 w-full"
          >
            <div className="text-2xl sm:text-4xl md:text-5xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-50 break-words">
              {question.prompt}
            </div>
            {question.secondaryPrompt && (
              <div className="text-xl sm:text-3xl md:text-4xl font-bold font-mono tracking-tight text-slate-800 dark:text-slate-200 break-words">
                {question.secondaryPrompt}
              </div>
            )}
          </motion.div>
        </div>

        {/* Answer Form */}
        <form onSubmit={handleSubmit} className="mt-3 sm:mt-5 max-w-md mx-auto space-y-2.5 sm:space-y-3">
          {question.kind === 'single' ? (
            <div>
              <input
                ref={primaryInputRef}
                type="text"
                inputMode={isMathPadActive ? 'none' : 'text'}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={inputA}
                onFocus={() => setActiveField('a')}
                onChange={(e) => setInputA(e.target.value)}
                placeholder="Digite sua resposta..."
                className={`w-full text-center text-2xl font-mono font-bold h-12 sm:h-14 px-4 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow ${
                  isMathPadActive
                    ? 'border-blue-600/80 ring-2 ring-blue-600/35'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] sm:text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {question.kind === 'system_xy' ? 'Valor de x' : 'Raiz x₁'}
                </label>
                <input
                  ref={primaryInputRef}
                  type="text"
                  inputMode={isMathPadActive ? 'none' : 'text'}
                  enterKeyHint="next"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={inputA}
                  onFocus={() => setActiveField('a')}
                  onClick={() => setActiveField('a')}
                  onChange={(e) => setInputA(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputA.trim() && !inputB.trim()) {
                      e.preventDefault();
                      setActiveField('b');
                      secondaryInputRef.current?.focus({ preventScroll: true });
                    }
                  }}
                  placeholder={question.kind === 'system_xy' ? 'x =' : 'x₁ ='}
                  className={`w-full text-center text-xl font-mono font-bold h-12 sm:h-13 px-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow ${
                    isMathPadActive && targetField === 'a'
                      ? 'border-blue-600 ring-2 ring-blue-600/45'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {question.kind === 'system_xy' ? 'Valor de y' : 'Raiz x₂'}
                </label>
                <input
                  ref={secondaryInputRef}
                  type="text"
                  inputMode={isMathPadActive ? 'none' : 'text'}
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={inputB}
                  onFocus={() => setActiveField('b')}
                  onClick={() => setActiveField('b')}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder={question.kind === 'system_xy' ? 'y =' : 'x₂ ='}
                  className={`w-full text-center text-xl font-mono font-bold h-12 sm:h-13 px-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow ${
                    isMathPadActive && targetField === 'b'
                      ? 'border-blue-600 ring-2 ring-blue-600/45'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Desktop / System-Keyboard Submit Button */}
          {!isMathPadActive && (
            <button
              type="submit"
              disabled={isFinishing}
              onMouseDown={(e) => e.preventDefault()}
              className="w-full min-h-[46px] py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 touch-manipulation"
            >
              {needsSecondFieldAdvance ? (
                <span>{question.kind === 'system_xy' ? 'Ir para y' : 'Ir para x₂'}</span>
              ) : (
                <>
                  Responder e Avançar{' '}
                  <span className="hidden sm:inline opacity-75 font-mono text-xs">(Enter)</span>
                </>
              )}
            </button>
          )}
        </form>

        {/* Visual feedback strip + particle burst (fixed height so controls below never jump) */}
        <div className="relative mt-3 sm:mt-5 min-h-[42px] sm:min-h-[44px] flex items-center justify-center">
          <AnimatePresence>
            {feedback && !shouldReduceMotion && (
              <motion.div
                key={`burst-${feedback.id}`}
                aria-hidden="true"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                {feedback.correct && (
                  <motion.span
                    initial={{ scale: 0.35, opacity: 0.75 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                    className={`absolute w-14 h-14 rounded-full border-2 ${
                      feedback.streak >= 3 ? 'border-amber-400/80' : 'border-emerald-400/80'
                    }`}
                  />
                )}

                {(feedback.correct ? CORRECT_PARTICLES : WRONG_PARTICLES).map((p, idx) => {
                  const rad = (p.angleDeg * Math.PI) / 180;
                  const dx = Math.cos(rad) * p.distance;
                  const dy = Math.sin(rad) * p.distance + (feedback.correct ? 0 : 12);
                  const colorClass = feedback.correct
                    ? feedback.streak >= 3 && idx % 3 === 0
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                      : idx % 2 === 0
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                      : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.65)]'
                    : idx % 2 === 0
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                    : 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]';

                  return (
                    <motion.span
                      key={idx}
                      initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
                      animate={{
                        x: dx,
                        y: dy,
                        scale: feedback.correct ? [0.3, 1.2, 0] : [0.9, 0.5, 0],
                        opacity: [1, 1, 0],
                        rotate: p.isDiamond ? 135 : 0,
                      }}
                      transition={{
                        duration: feedback.correct ? 0.54 : 0.4,
                        delay: p.delay,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ width: p.size, height: p.size }}
                      className={`absolute ${p.isDiamond ? 'rounded-[2px]' : 'rounded-full'} ${colorClass}`}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                key={feedback.id}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 520,
                  damping: 28,
                }}
                className={`relative z-10 overflow-hidden max-w-full inline-flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-center break-words ${
                  feedback.correct
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.16)]'
                    : 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-500/35 shadow-[0_0_18px_rgba(244,63,94,0.14)]'
                }`}
              >
                {feedback.correct && !shouldReduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ x: '-130%' }}
                    animate={{ x: '240%' }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 dark:via-white/20 to-transparent"
                  />
                )}
                {feedback.correct ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Integrated Ergonomic Mobile Math Keypad (prevents OS keyboard viewport jumps) */}
        {isMathPadActive && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {['1', '2', '3'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePadDigit(digit)}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-slate-900 dark:text-slate-50 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePadBackspace}
                aria-label="Apagar último dígito"
                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-transform cursor-pointer touch-manipulation select-none"
              >
                <Delete className="w-5 h-5" />
              </button>

              {['4', '5', '6'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePadDigit(digit)}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-slate-900 dark:text-slate-50 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePadToggleMinus}
                aria-label="Alternar sinal negativo"
                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-800 dark:text-slate-100 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
              >
                +/−
              </button>

              {['7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePadDigit(digit)}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-slate-900 dark:text-slate-50 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePadDigit(',')}
                aria-label="Vírgula decimal"
                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-800 dark:text-slate-100 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
              >
                ,
              </button>

              <button
                type="button"
                onClick={handlePadClear}
                aria-label="Limpar campo"
                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-700 dark:text-slate-200 font-mono text-sm font-bold transition-transform cursor-pointer touch-manipulation select-none"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handlePadDigit('0')}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-slate-900 dark:text-slate-50 font-mono text-xl font-bold transition-transform cursor-pointer touch-manipulation select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handlePadDigit('/')}
                aria-label="Barra de fração"
                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-800 dark:text-slate-100 font-mono text-lg font-bold transition-transform cursor-pointer touch-manipulation select-none"
              >
                /
              </button>
              {question.kind !== 'single' ? (
                <button
                  type="button"
                  onClick={handlePadSwitchField}
                  aria-label="Alternar campo de resposta"
                  className="h-12 rounded-xl bg-blue-600/12 dark:bg-blue-500/20 border border-blue-500/35 active:scale-[0.97] text-blue-700 dark:text-blue-300 font-mono text-xs font-bold inline-flex items-center justify-center gap-1 transition-transform cursor-pointer touch-manipulation select-none"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{question.kind === 'system_xy' ? 'x↔y' : 'x₁↔x₂'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUseMobileMathPad(false)}
                  aria-label="Usar teclado do celular"
                  className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 active:scale-[0.97] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-transform cursor-pointer touch-manipulation select-none"
                  title="Usar teclado do celular"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {question.kind !== 'single' && (
                <button
                  type="button"
                  onClick={() => setUseMobileMathPad(false)}
                  aria-label="Usar teclado do celular"
                  className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer touch-manipulation"
                  title="Usar teclado do celular"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={submitCurrentAnswer}
                disabled={isFinishing}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-50 touch-manipulation select-none"
              >
                {needsSecondFieldAdvance
                  ? question.kind === 'system_xy'
                    ? 'Avançar para y →'
                    : 'Avançar para x₂ →'
                  : 'Responder e Avançar'}
              </button>
            </div>
          </div>
        )}

        {/* Option on mobile to switch back to built-in math pad */}
        {isMobileViewport && !useMobileMathPad && (
          <div className="mt-2.5 flex justify-center">
            <button
              type="button"
              onClick={() => setUseMobileMathPad(true)}
              className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Usar teclado numérico integrado</span>
            </button>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 text-center">
            {saveError}
          </div>
        )}
      </div>

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-xl"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Encerrar partida?
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {correctCount + wrongCount === 0
                    ? 'Nenhuma questão foi respondida ainda. Você voltará diretamente à tela inicial.'
                    : 'Seu desempenho até aqui será salvo no seu histórico e pontuação.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmExit(false);
                    focusFirstInput();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Continuar (Enter)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmExit(false);
                    if (correctCount + wrongCount === 0) {
                      onExitToHome();
                    } else {
                      void finishMatch();
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Sair (Esc)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
