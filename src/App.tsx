import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { auth } from './lib/firebase';
import {
  ensureUserProfile,
  subscribeMatchHistory,
  subscribeUserProfile,
} from './services/userService';
import type { ActivePage, MatchConfig, MatchRecord, UserProfile } from './types/game';
import { AuthGate } from './components/AuthGate';
import { TopBar } from './components/TopBar';
import { HomeHub } from './components/HomeHub';
import { MatchArena } from './components/MatchArena';
import { LearnSection } from './components/LearnSection';
import { PlayerProfile } from './components/PlayerProfile';
import { SettingsPage } from './components/SettingsPage';
import { soundEngine } from './lib/sound';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h1 className="text-lg font-bold">Algo deu errado</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [activeMatch, setActiveMatch] = useState<{
    config: MatchConfig;
    nonce: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Default dark class before profile loads to match body base cleanly
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setMatches([]);
        setActiveMatch(null);
        setActivePage('home');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    let unsubProfile: (() => void) | undefined;
    let unsubMatches: (() => void) | undefined;
    let cancelled = false;

    const initUser = async () => {
      try {
        setLoadError(null);
        await ensureUserProfile(user);
        if (cancelled) return;

        unsubProfile = subscribeUserProfile(
          user.uid,
          (data) => {
            setProfile(data);
          },
          (err) => {
            setLoadError(err.message);
          }
        );

        unsubMatches = subscribeMatchHistory(
          user.uid,
          (items) => {
            setMatches(items);
          },
          (err) => {
            setLoadError(err.message);
          }
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Erro ao carregar perfil.');
        }
      }
    };

    void initUser();

    return () => {
      cancelled = true;
      if (unsubProfile) unsubProfile();
      if (unsubMatches) unsubMatches();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!profile) return;
    const isDark = profile.preferences.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [profile]);

  useEffect(() => {
    if (!user || !profile || activeMatch) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === 'F1') {
        e.preventDefault();
        soundEngine.playClick(profile.preferences.soundEnabled);
        setActivePage('home');
      } else if (e.key === 'F2') {
        e.preventDefault();
        soundEngine.playClick(profile.preferences.soundEnabled);
        setActivePage('learn');
      } else if (e.key === 'F3') {
        e.preventDefault();
        soundEngine.playClick(profile.preferences.soundEnabled);
        setActivePage('profile');
      } else if (e.key === 'F4') {
        e.preventDefault();
        soundEngine.playClick(profile.preferences.soundEnabled);
        setActivePage('settings');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMatch, profile, user]);

  // Global UI click and typing sound feedback (respects soundEnabled preference)
  const soundEnabled = profile ? profile.preferences.soundEnabled : true;

  useEffect(() => {
    if (!soundEnabled) return;

    let lastKeyHandledAt = 0;

    const isEditableField = (target: EventTarget | null): boolean => {
      if (target instanceof HTMLTextAreaElement) return !target.disabled && !target.readOnly;
      if (target instanceof HTMLInputElement) {
        const nonTextTypes = new Set([
          'button',
          'submit',
          'reset',
          'checkbox',
          'radio',
          'file',
          'color',
          'range',
        ]);
        return !nonTextTypes.has(target.type) && !target.disabled && !target.readOnly;
      }
      return false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest(
        'button, a, [role="button"], [role="switch"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]'
      );
      if (!interactive) return;
      if (
        (interactive as HTMLButtonElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }
      soundEngine.playClick(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditableField(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        lastKeyHandledAt = performance.now();
        soundEngine.playKey(true, 'backspace');
      } else if (e.key === ' ') {
        lastKeyHandledAt = performance.now();
        soundEngine.playKey(true, 'space');
      } else if (e.key.length === 1) {
        lastKeyHandledAt = performance.now();
        soundEngine.playKey(true, 'char');
      }
    };

    // Fallback for mobile virtual keyboards where keydown may report "Unidentified"
    const onInput = (e: Event) => {
      if (!isEditableField(e.target)) return;
      if (performance.now() - lastKeyHandledAt < 45) return;

      const inputEvt = e as InputEvent;
      if (inputEvt.inputType?.startsWith('delete')) {
        soundEngine.playKey(true, 'backspace');
      } else if (inputEvt.data === ' ') {
        soundEngine.playKey(true, 'space');
      } else {
        soundEngine.playKey(true, 'char');
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('input', onInput, true);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('input', onInput, true);
    };
  }, [soundEnabled]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Carregando Axioma...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <AppErrorBoundary>
        <AuthGate />
      </AppErrorBoundary>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h1 className="text-lg font-bold">Erro de sincronização</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 break-words">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Sincronizando perfil e progresso...
        </p>
      </div>
    );
  }

  const handleStartMatch = (config: MatchConfig) => {
    setActiveMatch({ config, nonce: Date.now() });
  };

  const handlePlayAgain = () => {
    if (!activeMatch) return;
    setActiveMatch({ config: activeMatch.config, nonce: Date.now() });
  };

  const handleExitMatch = () => {
    setActiveMatch(null);
    setActivePage('home');
  };

  const handleNavigate = (page: ActivePage) => {
    if (activeMatch) return;
    setActivePage(page);
  };

  return (
    <AppErrorBoundary>
      <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <TopBar
          profile={profile}
          activePage={activePage}
          onNavigate={handleNavigate}
          isMatchActive={Boolean(activeMatch)}
        />

        <main className="w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeMatch ? (
              <motion.div
                key={`match-${activeMatch.nonce}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                <MatchArena
                  profile={profile}
                  config={activeMatch.config}
                  onExitToHome={handleExitMatch}
                  onPlayAgain={handlePlayAgain}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {activePage === 'home' && (
                  <HomeHub
                    profile={profile}
                    onStartMatch={handleStartMatch}
                    onGoLearn={() => setActivePage('learn')}
                  />
                )}
                {activePage === 'learn' && <LearnSection />}
                {activePage === 'profile' && (
                  <PlayerProfile profile={profile} matches={matches} />
                )}
                {activePage === 'settings' && <SettingsPage profile={profile} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </AppErrorBoundary>
  );
}
