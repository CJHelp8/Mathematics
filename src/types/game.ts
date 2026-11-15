export type PlayMode = 'ranked' | 'casual' | 'mental' | 'treino';
export type SubMode = 'basico' | 'mental' | 'equacao';
export type Difficulty = 'facil' | 'normal' | 'dificil';
export type ThemeMode = 'light' | 'dark';
export type ActivePage = 'home' | 'learn' | 'profile' | 'settings';

export interface UserPreferences {
  theme: ThemeMode;
  soundEnabled: boolean;
  showTimerWarning: boolean;
  mentalDefaultDifficulty: Difficulty;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoUrl: string;
  elo: number;
  xp: number;
  level: number;
  totalCorrect: number;
  totalWrong: number;
  totalMatches: number;
  totalTimeSeconds: number;
  bestStreak: number;
  preferences: UserPreferences;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MatchRecord {
  matchId: string;
  userId: string;
  playMode: PlayMode;
  subMode: SubMode;
  difficulty: Difficulty;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  bestStreak: number;
  createdAt?: unknown;
}

export interface RankInfo {
  name: string;
  division: string;
  fullName: string;
  minElo: number;
  maxElo: number;
  tierIndex: number;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
}

export type QuestionKind = 'single' | 'system_xy' | 'quadratic_roots';

export interface MathQuestion {
  id: string;
  prompt: string;
  secondaryPrompt?: string;
  helperLabel: string;
  kind: QuestionKind;
  expectedValues: number[]; // [ans] for single, [x, y] for system, [r1, r2] for quadratic
  formattedAnswer: string;
  eloPenaltyOnWrong: number; // used in Mental mode (-1 or -2)
}

export interface MatchConfig {
  playMode: PlayMode;
  subMode: SubMode;
  difficulty: Difficulty;
}

export interface MatchSummary {
  matchId: string;
  config: MatchConfig;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  bestStreak: number;
}
