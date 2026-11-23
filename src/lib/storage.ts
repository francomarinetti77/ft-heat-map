// localStorage persistence for pipeline state. Every read and write is wrapped
// in try/catch because localStorage throws in private-browsing modes (§7).

import type { Opportunity } from '../types';

const KEY = 'ft-heatmap.opportunities.v1';

export function loadOpportunities(): Opportunity[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Opportunity[];
  } catch {
    // Private browsing, disabled storage, or corrupt JSON — fall back to seed.
    return null;
  }
}

export function saveOpportunities(opportunities: Opportunity[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(opportunities));
  } catch {
    // Non-fatal: the demo still works in-memory for this session.
  }
}

export function clearOpportunities(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
