// Small display formatters. Kept separate so components stay declarative.

export function fmtMWh(n: number): string {
  return `${Math.round(n).toLocaleString('en-GB')} MWh`;
}

export function fmtEur(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1000)}k`;
  return `€${Math.round(n)}`;
}

export function fmtYears(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)} yr`;
}

export function fmtTonnes(n: number): string {
  return `${Math.round(n).toLocaleString('en-GB')} t`;
}

export function fmtDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Whole-number days between an ISO date and now; negative means overdue. */
export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / 86_400_000);
}
