import { Difficulty, MatchRecord, PlayMode, RankInfo, SubMode, UserProfile } from '../types/game';

interface RankTierDef {
  name: string;
  minElo: number;
  maxElo: number;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  hasDivisions: boolean;
}

export const MAX_ELO = 3000;

const RANK_TIERS: RankTierDef[] = [
  {
    name: 'Bronze',
    minElo: 0,
    maxElo: 150,
    accentColor: '#B45309',
    badgeBg: 'bg-amber-900/10 dark:bg-amber-900/30',
    badgeText: 'text-amber-800 dark:text-amber-300',
    hasDivisions: true,
  },
  {
    name: 'Prata',
    minElo: 151,
    maxElo: 350,
    accentColor: '#64748B',
    badgeBg: 'bg-slate-200/70 dark:bg-slate-700/60',
    badgeText: 'text-slate-700 dark:text-slate-200',
    hasDivisions: true,
  },
  {
    name: 'Ouro',
    minElo: 351,
    maxElo: 750,
    accentColor: '#D97706',
    badgeBg: 'bg-yellow-500/15 dark:bg-yellow-500/20',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    hasDivisions: true,
  },
  {
    name: 'Diamante',
    minElo: 751,
    maxElo: 1500,
    accentColor: '#0284C7',
    badgeBg: 'bg-sky-500/15 dark:bg-sky-500/20',
    badgeText: 'text-sky-700 dark:text-sky-300',
    hasDivisions: true,
  },
  {
    name: 'Axioma',
    minElo: 1501,
    maxElo: 2000,
    accentColor: '#4F46E5',
    badgeBg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    hasDivisions: true,
  },
  {
    name: 'Supremo',
    minElo: 2001,
    maxElo: MAX_ELO,
    accentColor: '#1D4ED8',
    badgeBg: 'bg-blue-600/15 dark:bg-blue-500/25',
    badgeText: 'text-blue-700 dark:text-blue-300',
    hasDivisions: false,
  },
];

export const ALL_RANK_TIERS = RANK_TIERS;

export function clampElo(elo: number): number {
  return Math.max(0, Math.min(MAX_ELO, Math.round(elo)));
}

export function getRankFromElo(rawElo: number): RankInfo {
  const elo = clampElo(rawElo);
  const idx = RANK_TIERS.findIndex((t) => elo >= t.minElo && elo <= t.maxElo);
  const tier = RANK_TIERS[idx >= 0 ? idx : 0];
  const tierIndex = idx >= 0 ? idx : 0;

  if (!tier.hasDivisions) {
    return {
      name: tier.name,
      division: 'I',
      fullName: tier.name,
      minElo: tier.minElo,
      maxElo: tier.maxElo,
      tierIndex,
      accentColor: tier.accentColor,
      badgeBg: tier.badgeBg,
      badgeText: tier.badgeText,
    };
  }

  const span = tier.maxElo - tier.minElo + 1;
  const progressInTier = elo - tier.minElo;
  const divisionSlot = Math.min(2, Math.floor((progressInTier / span) * 3));
  const divisions = ['III', 'II', 'I'];
  const division = divisions[divisionSlot];

  return {
    name: tier.name,
    division,
    fullName: `${tier.name} ${division}`,
    minElo: tier.minElo,
    maxElo: tier.maxElo,
    tierIndex,
    accentColor: tier.accentColor,
    badgeBg: tier.badgeBg,
    badgeText: tier.badgeText,
  };
}

export function getXpRequiredForLevel(level: number): number {
  return 200 + level * 120;
}

export function computeLevelState(totalXp: number): {
  level: number;
  xpIntoCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 0;

  while (true) {
    const req = getXpRequiredForLevel(level);
    if (remaining < req) {
      return {
        level,
        xpIntoCurrentLevel: remaining,
        xpNeededForNext: req,
        progressPercent: Math.min(100, Math.round((remaining / req) * 100)),
      };
    }
    remaining -= req;
    level += 1;
  }
}

export function getMatchDurationSeconds(subMode: SubMode, difficulty: Difficulty): number {
  if (subMode === 'basico') {
    if (difficulty === 'facil') return 80;
    if (difficulty === 'normal') return 60;
    return 40;
  }
  if (subMode === 'equacao') {
    if (difficulty === 'facil') return 120;
    if (difficulty === 'normal') return 90;
    return 80;
  }
  // Mental uses 10s per question
  return 10;
}

export interface RewardComputationInput {
  playMode: PlayMode;
  subMode: SubMode;
  difficulty: Difficulty;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  mentalLiveEloDelta: number;
  currentElo: number;
}

export function computeMatchRewards(input: RewardComputationInput): {
  eloDelta: number;
  xpEarned: number;
} {
  const {
    playMode,
    subMode,
    difficulty,
    correctCount,
    wrongCount,
    bestStreak,
    mentalLiveEloDelta,
    currentElo,
  } = input;

  const totalAttempts = correctCount + wrongCount;
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
  const isEloActive = playMode === 'ranked' || playMode === 'mental';

  // XP proportional to performance
  const diffMultiplier = difficulty === 'facil' ? 1 : difficulty === 'normal' ? 1.35 : 1.75;
  let xpEarned = 0;

  if (subMode === 'equacao') {
    const perCorrectXp = difficulty === 'facil' ? 100 : difficulty === 'normal' ? 175 : 225;
    xpEarned = correctCount * perCorrectXp;
  } else if (subMode === 'mental') {
    xpEarned = Math.round(correctCount * 22 * diffMultiplier + bestStreak * 4);
  } else {
    // Basico
    const baseCorrectXp = Math.round(correctCount * 18 * diffMultiplier);
    const accuracyBonus = correctCount >= 3 ? Math.round(accuracy * 45 * diffMultiplier) : 0;
    xpEarned = baseCorrectXp + accuracyBonus;
  }

  if (playMode === 'casual') {
    xpEarned = Math.round(xpEarned * 0.75);
  } else if (playMode === 'treino') {
    xpEarned = Math.round(xpEarned * 0.55);
  }

  xpEarned = Math.max(0, Math.min(25000, xpEarned));

  if (!isEloActive) {
    return { eloDelta: 0, xpEarned };
  }

  let rawEloDelta = 0;

  if (subMode === 'mental') {
    rawEloDelta = mentalLiveEloDelta;
  } else if (subMode === 'equacao') {
    const perCorrectElo = difficulty === 'facil' ? 50 : difficulty === 'normal' ? 75 : 100;
    rawEloDelta = correctCount * perCorrectElo;
  } else {
    // Basico Ranked: Facil 10..50, Normal 50..100, Dificil 100..150
    if (correctCount > 0) {
      const range =
        difficulty === 'facil'
          ? { min: 10, max: 50, target: 14 }
          : difficulty === 'normal'
          ? { min: 50, max: 100, target: 12 }
          : { min: 100, max: 150, target: 10 };

      const volumeRatio = Math.min(1, correctCount / range.target);
      const perfScore = 0.55 * accuracy + 0.45 * volumeRatio;
      rawEloDelta = Math.round(range.min + perfScore * (range.max - range.min));
    } else {
      rawEloDelta = 0;
    }
  }

  const nextElo = clampElo(currentElo + rawEloDelta);
  const actualDelta = nextElo - currentElo;

  return {
    eloDelta: actualDelta,
    xpEarned,
  };
}

export function computeRecreationalIqEstimate(profile: UserProfile): {
  score: number;
  bandLabel: string;
  confidenceLabel: string;
} {
  const totalAttempts = profile.totalCorrect + profile.totalWrong;
  if (totalAttempts === 0) {
    return {
      score: 100,
      bandLabel: 'Calibrando base inicial',
      confidenceLabel: 'Sem partidas registradas',
    };
  }

  const accuracy = profile.totalCorrect / totalAttempts;
  const eloComponent = (clampElo(profile.elo) / MAX_ELO) * 32;
  const accuracyComponent = (accuracy - 0.5) * 28;
  const streakComponent = Math.min(10, profile.bestStreak * 0.45);
  const experienceComponent = Math.min(8, Math.log10(profile.totalMatches + 1) * 4);

  const raw = Math.round(100 + eloComponent + accuracyComponent + streakComponent + experienceComponent);
  const score = Math.max(80, Math.min(160, raw));

  let bandLabel = 'Desempenho Sólido';
  if (score >= 140) bandLabel = 'Agilidade Analítica Excepcional';
  else if (score >= 125) bandLabel = 'Raciocínio Rápido Avançado';
  else if (score >= 112) bandLabel = 'Acima da Média nos Desafios';
  else if (score < 95) bandLabel = 'Em Construção de Base';

  const confidenceLabel =
    profile.totalMatches >= 15
      ? 'Base consistente'
      : profile.totalMatches >= 5
      ? 'Amostra moderada'
      : 'Amostra preliminar';

  return { score, bandLabel, confidenceLabel };
}

export function formatDurationCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export type BadgeIconId =
  | 'flag'
  | 'check'
  | 'flame'
  | 'calendar'
  | 'zap'
  | 'trophy'
  | 'brain'
  | 'crown';

export interface PlayerBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  current: number;
  target: number;
  icon: BadgeIconId;
}

function getTimestampMillis(ts: unknown): number {
  if (!ts || typeof ts !== 'object') return 0;
  const maybe = ts as { toMillis?: () => number };
  return typeof maybe.toMillis === 'function' ? maybe.toMillis() : 0;
}

function toDayNumber(ms: number): number {
  const d = new Date(ms);
  const utcDay = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(utcDay / 86400000);
}

export function computePlayerBadges(
  profile: UserProfile,
  matches: MatchRecord[]
): PlayerBadge[] {
  const chronological = [...matches].sort(
    (a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt)
  );

  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let mentalMatches = 0;
  const activeDayNumbers = new Set<number>();

  for (const m of chronological) {
    const isWin = m.correctCount > 0 && m.correctCount >= m.wrongCount;
    if (isWin) {
      currentWinStreak += 1;
      if (currentWinStreak > bestWinStreak) bestWinStreak = currentWinStreak;
    } else {
      currentWinStreak = 0;
    }

    if (m.playMode === 'mental' || m.subMode === 'mental') {
      mentalMatches += 1;
    }

    const ms = getTimestampMillis(m.createdAt);
    if (ms > 0) {
      activeDayNumbers.add(toDayNumber(ms));
    }
  }

  const sortedDays = Array.from(activeDayNumbers).sort((a, b) => a - b);
  let currentDailyStreak = 0;
  let bestDailyStreak = 0;
  let prevDay: number | null = null;

  for (const day of sortedDays) {
    if (prevDay !== null && day === prevDay + 1) {
      currentDailyStreak += 1;
    } else {
      currentDailyStreak = 1;
    }
    if (currentDailyStreak > bestDailyStreak) bestDailyStreak = currentDailyStreak;
    prevDay = day;
  }

  const defs: Omit<PlayerBadge, 'unlocked'>[] = [
    {
      id: 'first_match',
      title: 'Primeira Partida',
      description: 'Conclua sua primeira partida na plataforma.',
      current: Math.min(1, profile.totalMatches),
      target: 1,
      icon: 'flag',
    },
    {
      id: '100_questions',
      title: '100 Questões Resolvidas',
      description: 'Acerte 100 questões matemáticas acumuladas.',
      current: Math.min(100, profile.totalCorrect),
      target: 100,
      icon: 'check',
    },
    {
      id: '5_win_streak',
      title: 'Sequência de 5 Vitórias',
      description: 'Vença 5 partidas seguidas com aproveitamento igual ou superior a 50%.',
      current: Math.min(5, bestWinStreak),
      target: 5,
      icon: 'flame',
    },
    {
      id: 'week_dedication',
      title: 'Semana de Dedicação',
      description: 'Pratique em 7 dias consecutivos no Axioma.',
      current: Math.min(7, bestDailyStreak),
      target: 7,
      icon: 'calendar',
    },
    {
      id: 'combo_15',
      title: 'Precisão Cirúrgica',
      description: 'Alcance uma sequência de 15 acertos seguidos em uma partida.',
      current: Math.min(15, profile.bestStreak),
      target: 15,
      icon: 'zap',
    },
    {
      id: 'gold_rank',
      title: 'Patente Ouro',
      description: 'Ultrapasse 350 pontos de Elo e alcance a patente Ouro.',
      current: Math.min(351, profile.elo),
      target: 351,
      icon: 'trophy',
    },
    {
      id: 'mental_10',
      title: 'Mente Relâmpago',
      description: 'Conclua 10 partidas no modo Mental.',
      current: Math.min(10, mentalMatches),
      target: 10,
      icon: 'brain',
    },
    {
      id: '500_questions',
      title: 'Mestre dos Números',
      description: 'Acerte 500 questões acumuladas na carreira.',
      current: Math.min(500, profile.totalCorrect),
      target: 500,
      icon: 'crown',
    },
  ];

  return defs.map((b) => ({
    ...b,
    unlocked: b.current >= b.target,
  }));
}

