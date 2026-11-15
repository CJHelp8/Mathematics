import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Calculator,
  Compass,
  FileText,
  Flame,
  Play,
  Shield,
  Sparkles,
  Target,
  Timer,
  Trophy,
  User,
} from 'lucide-react';
import type { Difficulty, MatchConfig, PlayMode, SubMode, UserProfile } from '../types/game';
import { computeLevelState, getMatchDurationSeconds, MAX_ELO } from '../lib/progression';
import { resolveUserRank } from '../services/userService';
import { RankBadge } from './RankBadge';

interface HomeHubProps {
  profile: UserProfile;
  onStartMatch: (config: MatchConfig) => void;
  onGoLearn: () => void;
}

const PLAY_MODES: {
  id: PlayMode;
  title: string;
  description: string;
  meta: string;
  icon: React.FC<{ className?: string }>;
  accentClass: string;
}[] = [
  {
    id: 'ranked',
    title: 'RANKED',
    description: 'Desafios competitivos com ajuste oficial de Elo, XP e subida de patente.',
    meta: 'Valendo Elo e Rank',
    icon: Trophy,
    accentClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'casual',
    title: 'CASUAL',
    description: 'Partidas cronometradas para ganhar XP e estatísticas sem arriscar seu Elo.',
    meta: 'Sem impacto no Elo',
    icon: Compass,
    accentClass: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'mental',
    title: 'MENTAL',
    description: 'Cálculo rápido infinito com 10 segundos por questão e ajuste direto de Elo.',
    meta: 'Início rápido · 10s',
    icon: Brain,
    accentClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'treino',
    title: 'TREINO',
    description: 'Sessões livres para desenvolver precisão e velocidade no seu ritmo.',
    meta: 'Foco em prática',
    icon: Target,
    accentClass: 'text-slate-700 dark:text-slate-300',
  },
];

const SUB_MODES: {
  id: SubMode;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'basico',
    title: 'BÁSICO',
    description: 'Adição, subtração, multiplicação e divisão com resposta digitada.',
    icon: Calculator,
  },
  {
    id: 'mental',
    title: 'MENTAL',
    description: 'Questões infinitas de cálculo rápido com 10s por pergunta.',
    icon: Flame,
  },
  {
    id: 'equacao',
    title: 'EQUAÇÃO',
    description: 'Equações de 1º e 2º grau e sistemas matematicamente válidos.',
    icon: Shield,
  },
];

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'facil', label: 'Fácil' },
  { id: 'normal', label: 'Normal' },
  { id: 'dificil', label: 'Difícil' },
];

function getDifficultyDetails(playMode: PlayMode, subMode: SubMode, difficulty: Difficulty) {
  const isEloMode = playMode === 'ranked' || playMode === 'mental';
  const duration = getMatchDurationSeconds(subMode, difficulty);

  if (subMode === 'basico') {
    const eloRange =
      difficulty === 'facil' ? '+10 a +50 Elo' : difficulty === 'normal' ? '+50 a +100 Elo' : '+100 a +150 Elo';
    return {
      timeLabel: `${duration}s de partida`,
      rewardLabel: isEloMode ? `${eloRange} · XP proporcional` : 'XP proporcional (sem Elo)',
      detail:
        difficulty === 'facil'
          ? 'Operações diretas com números menores.'
          : difficulty === 'normal'
          ? 'Valores médios exigindo ritmo constante.'
          : 'Contas maiores e resultados negativos possíveis.',
    };
  }

  if (subMode === 'mental') {
    const penalty = difficulty === 'dificil' ? '-2 Elo' : '-1 ou -2 Elo';
    return {
      timeLabel: '10s por questão · Infinito',
      rewardLabel: isEloMode ? `+5 Elo acerto · ${penalty} erro` : 'XP por sequência (sem Elo)',
      detail:
        difficulty === 'facil'
          ? 'Adição, subtração e tabuada básica.'
          : difficulty === 'normal'
          ? 'Contas intermediárias de agilidade mental.'
          : 'Multiplicações e somas rápidas desafiadoras.',
    };
  }

  // Equacao
  const eqReward =
    difficulty === 'facil'
      ? '+50 Elo · +100 XP / acerto'
      : difficulty === 'normal'
      ? '+75 Elo · +175 XP / acerto'
      : '+100 Elo · +225 XP / acerto';

  const xpOnly =
    difficulty === 'facil' ? '+100 XP / acerto' : difficulty === 'normal' ? '+175 XP / acerto' : '+225 XP / acerto';

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const formattedTime = secs > 0 ? `${mins}m ${secs}s` : `${mins} minutos`;

  return {
    timeLabel: formattedTime,
    rewardLabel: isEloMode ? eqReward : `${xpOnly} (sem Elo)`,
    detail:
      difficulty === 'facil'
        ? 'Equações de 1º grau com uma incógnita.'
        : difficulty === 'normal'
        ? 'Sistemas lineares de 1º grau com duas incógnitas.'
        : 'Equações de 1º e 2º grau com uma ou duas incógnitas.',
  };
}

export const HomeHub: React.FC<HomeHubProps> = ({ profile, onStartMatch, onGoLearn }) => {
  const [selectedPlayMode, setSelectedPlayMode] = useState<PlayMode | null>(null);
  const [selectedSubMode, setSelectedSubMode] = useState<SubMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    profile.preferences.mentalDefaultDifficulty || 'normal'
  );

  const rank = resolveUserRank(profile.elo);
  const levelState = computeLevelState(profile.xp);
  const totalAttempts = profile.totalCorrect + profile.totalWrong;
  const accuracy =
    totalAttempts > 0 ? Math.round((profile.totalCorrect / totalAttempts) * 100) : 0;

  const handleSelectPlayMode = (mode: PlayMode) => {
    setSelectedPlayMode(mode);
    if (mode === 'mental') {
      setSelectedSubMode('mental');
      setSelectedDifficulty(profile.preferences.mentalDefaultDifficulty || 'normal');
    } else {
      setSelectedSubMode(null);
      setSelectedDifficulty('normal');
    }
  };

  const handleBack = useCallback(() => {
    if (selectedPlayMode === 'mental') {
      setSelectedPlayMode(null);
      setSelectedSubMode(null);
      return;
    }
    if (selectedSubMode) {
      setSelectedSubMode(null);
    } else {
      setSelectedPlayMode(null);
    }
  }, [selectedPlayMode, selectedSubMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === 'Escape' && selectedPlayMode !== null) {
        e.preventDefault();
        handleBack();
        return;
      }

      if (selectedPlayMode === null) {
        if (e.key === '1') handleSelectPlayMode('ranked');
        else if (e.key === '2') handleSelectPlayMode('casual');
        else if (e.key === '3') handleSelectPlayMode('mental');
        else if (e.key === '4') handleSelectPlayMode('treino');
      } else if (selectedSubMode === null) {
        if (e.key === '1') setSelectedSubMode('basico');
        else if (e.key === '2') setSelectedSubMode('mental');
        else if (e.key === '3') setSelectedSubMode('equacao');
      } else {
        if (e.key === '1') setSelectedDifficulty('facil');
        else if (e.key === '2') setSelectedDifficulty('normal');
        else if (e.key === '3') setSelectedDifficulty('dificil');
        else if (e.key === 'Enter') {
          e.preventDefault();
          onStartMatch({
            playMode: selectedPlayMode,
            subMode: selectedSubMode,
            difficulty: selectedDifficulty,
          });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack, onStartMatch, selectedDifficulty, selectedPlayMode, selectedSubMode]);

  const activeDetails =
    selectedPlayMode && selectedSubMode
      ? getDifficultyDetails(selectedPlayMode, selectedSubMode, selectedDifficulty)
      : null;

  const needsPaperNote = selectedSubMode === 'basico' || selectedSubMode === 'equacao';

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Organized Player Status Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 py-4">
        {selectedPlayMode === null ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-800 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                    {profile.displayName}
                  </h1>
                  <RankBadge rank={rank} size="xs" />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  <span>
                    {profile.elo.toLocaleString('pt-BR')} / {MAX_ELO.toLocaleString('pt-BR')} Elo
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{profile.totalMatches} partidas</span>
                  <span aria-hidden="true">·</span>
                  <span>{accuracy}% precisão</span>
                  <span aria-hidden="true">·</span>
                  <span>Seq. {profile.bestStreak}x</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  Nível {levelState.level}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {levelState.xpIntoCurrentLevel} / {levelState.xpNeededForNext} XP
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${levelState.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {selectedPlayMode === 'mental'
                ? 'Modo Mental · Cálculo Rápido'
                : selectedSubMode === null
                ? `Modo ${selectedPlayMode.toUpperCase()} · Escolha a modalidade`
                : `${selectedPlayMode.toUpperCase()} · ${selectedSubMode.toUpperCase()}`}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Nível {levelState.level}
              </span>
              <span aria-hidden="true">·</span>
              <span>{profile.elo.toLocaleString('pt-BR')} Elo</span>
            </div>
          </div>
        )}
      </section>

      {/* Main animated mode selector flow */}
      <AnimatePresence mode="wait">
        {selectedPlayMode === null && (
          <motion.div
            key="step-playmode"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PLAY_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectPlayMode(mode.id)}
                    className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600/50 dark:hover:border-blue-500/50 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 flex flex-col justify-between min-h-[126px]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {mode.meta}
                        </p>
                        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                          {mode.title}
                        </h2>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${mode.accentClass}`} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-4">
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-snug">
                        {mode.description}
                      </p>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Subtle study callout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Quer revisar os fundamentos antes de competir?
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesse Aprender para ver passo a passo, exemplos resolvidos e exercícios.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoLearn}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Abrir Aprender
              </button>
            </div>
          </motion.div>
        )}

        {selectedPlayMode !== null && selectedSubMode === null && (
          <motion.div
            key="step-submode"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar aos modos</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SUB_MODES.map((sub) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubMode(sub.id)}
                    className="group text-left p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-600/50 dark:hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between min-h-[172px]"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                        {sub.title}
                      </h3>
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {sub.description}
                      </p>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {selectedPlayMode !== null && selectedSubMode !== null && activeDetails && (
          <motion.div
            key="step-difficulty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {selectedPlayMode === 'mental' ? 'Voltar aos modos' : 'Trocar modalidade'} (Esc)
              </span>
            </button>

            <div className="p-4 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 sm:space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Selecione a dificuldade
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  {DIFFICULTIES.map((diff) => {
                    const active = selectedDifficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff.id)}
                        className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Match rules summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cronômetro</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono tabular-nums">
                    <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{activeDetails.timeLabel}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recompensa</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {activeDetails.rewardLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Escopo</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {activeDetails.detail}
                  </p>
                </div>
              </div>

              {needsPaperNote && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200">
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Recomendamos utilizar papel e caneta para resolver os exercícios.</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onStartMatch({
                      playMode: selectedPlayMode,
                      subMode: selectedSubMode,
                      difficulty: selectedDifficulty,
                    })
                  }
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {selectedPlayMode === 'mental'
                      ? 'Iniciar Partida Mental'
                      : 'Iniciar Partida'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
