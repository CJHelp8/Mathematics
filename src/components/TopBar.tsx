import React from 'react';
import { Settings } from 'lucide-react';
import type { ActivePage, UserProfile } from '../types/game';
import { ALL_RANK_TIERS, computeLevelState, MAX_ELO } from '../lib/progression';
import { resolveUserRank } from '../services/userService';
import { RankBadge } from './RankBadge';

interface TopBarProps {
  profile: UserProfile;
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  isMatchActive: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  profile,
  activePage,
  onNavigate,
  isMatchActive,
}) => {
  const navItems: { id: ActivePage; label: string }[] = [
    { id: 'home', label: 'Jogar' },
    { id: 'learn', label: 'Aprender' },
    { id: 'profile', label: 'Perfil' },
  ];

  const levelState = computeLevelState(profile.xp);
  const rank = resolveUserRank(profile.elo);
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

  const targetEloLabel = nextRankTier
    ? `${nextRankTier.minElo.toLocaleString('pt-BR')} (${nextRankTier.name})`
    : `${MAX_ELO.toLocaleString('pt-BR')} Elo`;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand icon + wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          disabled={isMatchActive}
          className="flex items-center gap-2 text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1"
        >
          <img
            src="/assets/aistudio/file_000000009194820ebfecf5aa31ce0c44_f2f94ca7.png"
            alt="Axioma"
            referrerPolicy="no-referrer"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-950"
          />
          <span className="hidden min-[440px]:inline">Axioma</span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="flex items-center gap-3 sm:gap-7 min-w-0">
          {navItems.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                disabled={isMatchActive}
                className={`relative py-1 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-[14px] sm:-bottom-[17px] h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Rank indicator + Elo progress bar + Settings icon */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            disabled={isMatchActive}
            title={`Patente ${rank.fullName} · ${profile.elo.toLocaleString('pt-BR')} / ${targetEloLabel}`}
            className="flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex flex-col items-stretch gap-1 sm:hidden">
              <RankBadge rank={rank} size="xs" compactLabelOnMobile />
              <div
                aria-label="Progresso de patente"
                className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${eloProgressPct}%`,
                    backgroundColor: rank.accentColor,
                  }}
                />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2.5">
              <RankBadge rank={rank} size="xs" />
              <div className="flex flex-col items-stretch min-w-[138px] md:min-w-[160px] gap-1 text-left">
                <div className="flex items-baseline justify-between gap-2 text-[11px] font-mono tabular-nums leading-none whitespace-nowrap">
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">
                    Nív. {levelState.level} · {profile.elo.toLocaleString('pt-BR')} Elo
                  </span>
                  <span className="hidden md:inline text-[10px] text-slate-400 dark:text-slate-500">
                    {nextRankTier ? `→ ${nextRankTier.minElo}` : `${MAX_ELO}`}
                  </span>
                </div>
                <div
                  aria-label="Progresso até a próxima patente"
                  className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${eloProgressPct}%`,
                      backgroundColor: rank.accentColor,
                    }}
                  />
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            disabled={isMatchActive}
            aria-label="Configurações"
            title="Configurações"
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              activePage === 'settings'
                ? 'border-blue-600/40 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
