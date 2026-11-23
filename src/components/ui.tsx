// Small shared UI primitives. Restrained, data-dense, FT identity (§8).

import type { ReactNode } from 'react';
import type { HeatBand } from '../types';
import { BANDS } from '../config/assumptions';

export const BAND_COLOR: Record<HeatBand, string> = {
  hot: '#E0452F',
  warm: '#F7941E',
  lukewarm: '#E8C547',
  cold: '#8FA3B0',
};

export const BAND_LABEL: Record<HeatBand, string> = {
  hot: 'Approach now',
  warm: 'Qualify',
  lukewarm: 'Watch',
  cold: 'Park',
};

export function bandOf(score: number): HeatBand {
  for (const b of BANDS) if (score >= b.min) return b.band as HeatBand;
  return 'cold';
}

export function BandPill({ band, score }: { band: HeatBand; score?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: BAND_COLOR[band] }}
      title={BAND_LABEL[band]}
    >
      {score !== undefined && <span>{Math.round(score)}</span>}
      <span className="uppercase tracking-wide">{band}</span>
    </span>
  );
}

export function ScoreBar({
  label,
  value,
  weight,
  color = '#F7941E',
}: {
  label: string;
  value: number;
  weight?: string;
  color?: string;
}) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-baseline justify-between text-xs">
        <span className="text-ink">
          {label}
          {weight && <span className="ml-1 text-muted">· {weight}</span>}
        </span>
        <span className="font-semibold text-ink tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-black/5">
        <div
          className="h-full rounded"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/5 bg-surface p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function ConfidenceDot({ level }: { level: 'high' | 'medium' | 'low' }) {
  const color = level === 'high' ? '#4F9D69' : level === 'medium' ? '#E8C547' : '#C96A4B';
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" title={`Data confidence: ${level}`}>
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {level}
    </span>
  );
}

export function IndicativeTag() {
  return (
    <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      Indicative — for prioritisation, not investment decisions
    </span>
  );
}
