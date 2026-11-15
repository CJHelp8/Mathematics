import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  clampElo,
  computeLevelState,
  computeMatchRewards,
  getRankFromElo,
} from '../lib/progression';
import type {
  MatchConfig,
  MatchRecord,
  MatchSummary,
  RankInfo,
  UserPreferences,
  UserProfile,
} from '../types/game';

export function resolveUserRank(elo: number): RankInfo {
  return getRankFromElo(clampElo(elo));
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  soundEnabled: true,
  showTimerWarning: true,
  mentalDefaultDifficulty: 'normal',
};

function sanitizeDisplayName(name: string | null | undefined): string {
  const trimmed = (name || 'Jogador').trim().slice(0, 40);
  if (trimmed.length >= 2) return trimmed;
  return 'Jogador';
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: sanitizeDisplayName(user.displayName),
        photoUrl: '',
        elo: 0,
        xp: 0,
        level: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalMatches: 0,
        totalTimeSeconds: 0,
        bestStreak: 0,
        preferences: DEFAULT_PREFERENCES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const raw = snapshot.data() as UserProfile;
      onData({
        ...raw,
        elo: clampElo(raw.elo),
      });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeMatchHistory(
  uid: string,
  onData: (matches: MatchRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/matches`;
  const matchesCol = collection(db, 'users', uid, 'matches');
  const q = query(matchesCol, where('userId', '==', uid), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as MatchRecord);
      items.sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
        return tb - ta;
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function updateProfileIdentity(
  uid: string,
  displayName: string,
  photoUrl: string
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const safeName = sanitizeDisplayName(displayName);
  const safePhoto = photoUrl.slice(0, 120000);

  try {
    await updateDoc(userRef, {
      displayName: safeName,
      photoUrl: safePhoto,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserPreferences(
  uid: string,
  preferences: UserPreferences
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      preferences,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface CommitMatchInput {
  uid: string;
  matchId: string;
  config: MatchConfig;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  bestStreak: number;
  mentalLiveEloDelta: number;
}

export async function commitMatchResult(input: CommitMatchInput): Promise<MatchSummary> {
  const {
    uid,
    matchId,
    config,
    correctCount,
    wrongCount,
    durationSeconds,
    bestStreak,
    mentalLiveEloDelta,
  } = input;

  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const matchRef = doc(db, 'users', uid, 'matches', matchId);

  try {
    return await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('Perfil de usuário não encontrado.');
      }

      const existingMatch = await tx.get(matchRef);
      if (existingMatch.exists()) {
        throw new Error('Esta partida já foi registrada anteriormente.');
      }

      const current = userSnap.data() as UserProfile;
      const eloBefore = clampElo(current.elo);
      const rewards = computeMatchRewards({
        playMode: config.playMode,
        subMode: config.subMode,
        difficulty: config.difficulty,
        correctCount,
        wrongCount,
        bestStreak,
        mentalLiveEloDelta,
        currentElo: eloBefore,
      });

      const eloAfter = clampElo(eloBefore + rewards.eloDelta);
      const nextXp = current.xp + rewards.xpEarned;
      const levelBefore = current.level;
      const levelAfter = computeLevelState(nextXp).level;
      const safeDuration = Math.max(1, Math.round(durationSeconds));

      tx.update(userRef, {
        elo: eloAfter,
        xp: nextXp,
        level: levelAfter,
        totalCorrect: current.totalCorrect + correctCount,
        totalWrong: current.totalWrong + wrongCount,
        totalMatches: current.totalMatches + 1,
        totalTimeSeconds: current.totalTimeSeconds + safeDuration,
        bestStreak: Math.max(current.bestStreak, bestStreak),
        updatedAt: serverTimestamp(),
      });

      tx.set(matchRef, {
        matchId,
        userId: uid,
        playMode: config.playMode,
        subMode: config.subMode,
        difficulty: config.difficulty,
        correctCount,
        wrongCount,
        durationSeconds: safeDuration,
        eloBefore,
        eloAfter,
        eloDelta: eloAfter - eloBefore,
        xpEarned: rewards.xpEarned,
        levelBefore,
        levelAfter,
        bestStreak,
        createdAt: serverTimestamp(),
      });

      return {
        matchId,
        config,
        correctCount,
        wrongCount,
        durationSeconds: safeDuration,
        eloBefore,
        eloAfter,
        eloDelta: eloAfter - eloBefore,
        xpEarned: rewards.xpEarned,
        levelBefore,
        levelAfter,
        bestStreak,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath}/matches/${matchId}`);
  }
}
