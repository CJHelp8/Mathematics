import React from 'react';
import { Award, Crown, Gem, Hexagon, Shield, ShieldCheck } from 'lucide-react';
import type { RankInfo } from '../types/game';

interface RankBadgeProps {
  rank: RankInfo;
  size?: 'xs' | 'sm';
  compactLabelOnMobile?: boolean;
}

const RANK_STYLE_MAP: Record<
  string,
  {
    container: string;
    iconClass: string;
  }
> = {
  Bronze: {
    container:
      'bg-amber-900/12 dark:bg-amber-800/30 border-amber-700/30 dark:border-amber-600/40 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-700 dark:text-amber-400',
  },
  Prata: {
    container:
      'bg-slate-200/80 dark:bg-slate-700/60 border-slate-400/40 dark:border-slate-500/40 text-slate-700 dark:text-slate-200',
    iconClass: 'text-slate-600 dark:text-slate-300',
  },
  Ouro: {
    container:
      'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/40 dark:border-amber-400/40 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  Diamante: {
    container:
      'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/40 dark:border-sky-400/40 text-sky-700 dark:text-sky-300',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  Axioma: {
    container:
      'bg-indigo-500/15 dark:bg-indigo-500/20 border-indigo-500/40 dark:border-indigo-400/40 text-indigo-700 dark:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  Supremo: {
    container:
      'bg-blue-600/15 dark:bg-blue-500/25 border-blue-600/40 dark:border-blue-400/40 text-blue-700 dark:text-blue-300',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
};

function RankEmblem({ name, className }: { name: string; className: string }) {
  switch (name) {
    case 'Bronze':
      return <Shield className={className} />;
    case 'Prata':
      return <ShieldCheck className={className} />;
    case 'Ouro':
      return <Award className={className} />;
    case 'Diamante':
      return <Gem className={className} />;
    case 'Axioma':
      return <Hexagon className={className} />;
    case 'Supremo':
      return <Crown className={className} />;
    default:
      return <Shield className={className} />;
  }
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 'sm',
  compactLabelOnMobile = false,
}) => {
  const palette = RANK_STYLE_MAP[rank.name] || RANK_STYLE_MAP.Bronze;
  const padding = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5';

  return (
    <span
      title={`Patente atual: ${rank.fullName}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap shrink-0 ${padding} ${palette.container}`}
    >
      <RankEmblem name={rank.name} className={`${iconSize} shrink-0 ${palette.iconClass}`} />
      <span className={compactLabelOnMobile ? 'hidden min-[380px]:inline' : ''}>
        {rank.fullName}
      </span>
    </span>
  );
};
