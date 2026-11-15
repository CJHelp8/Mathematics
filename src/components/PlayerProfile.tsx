import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Edit3,
  Flag,
  Flame,
  Lock,
  Shield,
  Target,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';
import type { MatchRecord, UserProfile } from '../types/game';
import {
  ALL_RANK_TIERS,
  computeLevelState,
  computePlayerBadges,
  computeRecreationalIqEstimate,
  formatDurationCompact,
  MAX_ELO,
  type BadgeIconId,
  type PlayerBadge,
} from '../lib/progression';
import { resolveUserRank, updateProfileIdentity } from '../services/userService';
import { AvatarEditor } from './AvatarEditor';
import { RankBadge } from './RankBadge';

interface PlayerProfileProps {
  profile: UserProfile;
  matches: MatchRecord[];
}

type ProfileTab = 'overview' | 'badges';

function BadgeGlyph({ icon, className }: { icon: BadgeIconId; className?: string }) {
  switch (icon) {
    case 'flag':
      return <Flag className={className} />;
    case 'check':
      return <CheckCircle2 className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'crown':
      return <Crown className={className} />;
  }
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ profile, matches }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<PlayerBadge | null>(null);

  const rank = resolveUserRank(profile.elo);
  const levelState = computeLevelState(profile.xp);
  const iqEstimate = computeRecreationalIqEstimate(profile);
  const badges = computePlayerBadges(profile, matches);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalAttempts = profile.totalCorrect + profile.totalWrong;
  const accuracy =
    totalAttempts > 0 ? Math.round((profile.totalCorrect / totalAttempts) * 100) : 0;

  const nextRankTier =
    rank.tierIndex < ALL_RANK_TIERS.length - 1
      ? ALL_RANK_TIERS[rank.tierIndex + 1]
      : null;

  const eloProgressPct = nextRankTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((profile.elo - rank.minElo) / (nextRankTier.minElo - rank.minElo)) * 100
          )
        )
      )
    : Math.min(100, Math.round((profile.elo / MAX_ELO) * 100));

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim();
    if (cleaned.length < 2) {
      setEditError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await updateProfileIdentity(profile.uid, cleaned, profile.photoUrl);
      setEditing(false);
    } catch {
      setEditError('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (newUrl: string) => {
    setSaving(true);
    try {
      await updateProfileIdentity(profile.uid, profile.displayName, newUrl);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditing(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
      {/* Compact Header + Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Perfil do Jogador
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Acompanhe sua evolução competitiva e suas conquistas.
          </p>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Visão Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center justify-center gap-1.5 ${
              activeTab === 'badges'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>Conquistas</span>
            <span className="font-mono tabular-nums opacity-75">
              {unlockedCount}/{badges.length}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="tab-overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
          >
            {/* Column 1 (6 cols): Character Identity Card */}
            <section className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.displayName}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                        <User className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Ficha do Competidor
                      </p>
                      <h2 className="mt-0.5 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 truncate">
                        {profile.displayName}
                      </h2>
                      <div className="mt-1">
                        <RankBadge rank={rank} size="xs" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(profile.displayName);
                      setEditError(null);
                      setEditing(true);
                    }}
                    aria-label="Editar perfil"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Level & XP Bar */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      Nível {levelState.level}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {profile.xp.toLocaleString('pt-BR')} XP Total
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                      style={{ width: `${levelState.progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Faltam {levelState.xpNeededForNext - levelState.xpIntoCurrentLevel} XP para o Nível{' '}
                    {levelState.level + 1}
                  </p>
                </div>

                {/* Elo Ladder Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{rank.fullName}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {profile.elo.toLocaleString('pt-BR')} /{' '}
                      {nextRankTier
                        ? nextRankTier.minElo.toLocaleString('pt-BR')
                        : MAX_ELO.toLocaleString('pt-BR')}{' '}
                      Elo
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${eloProgressPct}%`,
                        backgroundColor: rank.accentColor,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {nextRankTier
                      ? `Faltam ${Math.max(0, nextRankTier.minElo - profile.elo).toLocaleString('pt-BR')} Elo para ${nextRankTier.name}`
                      : `Patente máxima alcançada (limite de ${MAX_ELO.toLocaleString('pt-BR')} Elo)`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-mono text-slate-400">
                    {ALL_RANK_TIERS.map((t, idx) => (
                      <span
                        key={t.name}
                        className={
                          idx === rank.tierIndex
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : ''
                        }
                      >
                        {t.name} ({t.minElo})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Column 2 (6 cols): Combat Stats & Recreational Cognitive Indicator */}
            <section className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Atributos e Estatísticas</span>
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Elo Atual</p>
                    <p className="mt-0.5 text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {profile.elo.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tempo de Jogo</p>
                    <p className="mt-0.5 text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{formatDurationCompact(profile.totalTimeSeconds)}</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Acertos / Erros</p>
                    <p className="mt-0.5 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {profile.totalCorrect}
                      </span>
                      {' / '}
                      <span className="text-rose-600 dark:text-rose-400">
                        {profile.totalWrong}
                      </span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Precisão · Streak
                    </p>
                    <p className="mt-0.5 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {accuracy}% · {profile.bestStreak}x
                    </p>
                  </div>
                </div>
              </div>

              {/* Recreational Intellectual Performance Indicator */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Indicador de Desempenho Intelectual</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    {iqEstimate.confidenceLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-3xl font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                    {iqEstimate.score}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">
                    {iqEstimate.bandLabel}
                  </span>
                </div>

                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  Estimativa recreativa calculada apenas com base na sua velocidade, precisão e Elo nos desafios. Não constitui teste de QI científico nem diagnóstico clínico.
                </p>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.section
            key="tab-badges"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Conquistas
                </h2>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {unlockedCount} / {badges.length} desbloqueadas
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {selectedBadge
                  ? `${selectedBadge.title}: ${selectedBadge.description}`
                  : 'Clique em uma conquista para destacar seus detalhes.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {badges.map((badge) => {
                const isSelected = selectedBadge?.id === badge.id;
                const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setSelectedBadge(isSelected ? null : badge)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 min-w-0 ${
                      badge.unlocked
                        ? isSelected
                          ? 'border-blue-600 bg-blue-600/10 dark:bg-blue-500/15'
                          : 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/10 hover:border-amber-500/70'
                        : isSelected
                        ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          badge.unlocked
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <BadgeGlyph icon={badge.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {!badge.unlocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span>
                          {badge.unlocked ? 'Concluída' : `${badge.current}/${badge.target}`}
                        </span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">
                        {badge.title}
                      </p>
                      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {badge.description}
                      </p>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          badge.unlocked ? 'bg-amber-500' : 'bg-blue-600 dark:bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editing && (
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
              className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Editar Perfil
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveName} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Nome de exibição
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={40}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
                {editError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{editError}</p>
                )}
              </form>

              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Alterar foto de perfil
                </p>
                <AvatarEditor
                  currentPhotoUrl={profile.photoUrl}
                  onSelectPhoto={handlePhotoChange}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
