// Pipeline state: opportunities live here, persisted to localStorage. This is
// the only mutable state in the prototype; sources/sinks/matches are static.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Opportunity, Stage, LostReason } from '../types';
import { loadOpportunities, saveOpportunities } from '../lib/storage';
import { seedOpportunities } from '../lib/seedOpportunities';
import { getMatch } from '../lib/data';

interface OpportunitiesContextValue {
  opportunities: Opportunity[];
  /** Create an opportunity from a match, if one does not already exist. */
  addFromMatch: (matchId: string) => Opportunity;
  /** True if a match already has a pipeline record. */
  hasOpportunityForMatch: (matchId: string) => boolean;
  moveStage: (id: string, stage: Stage, lostReason?: LostReason) => void;
  logActivity: (id: string, note: string, author?: string) => void;
  updateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  removeOpportunity: (id: string) => void;
  resetToSeed: () => void;
}

const OpportunitiesContext = createContext<OpportunitiesContextValue | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

export function OpportunitiesProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    return loadOpportunities() ?? seedOpportunities();
  });

  // Persist on every change (storage.ts swallows failures in private mode).
  useEffect(() => {
    saveOpportunities(opportunities);
  }, [opportunities]);

  const hasOpportunityForMatch = useCallback(
    (matchId: string) => opportunities.some((o) => o.matchId === matchId),
    [opportunities],
  );

  const addFromMatch = useCallback(
    (matchId: string): Opportunity => {
      const existing = opportunities.find((o) => o.matchId === matchId);
      if (existing) return existing;

      const match = getMatch(matchId);
      // A rough first estimate of contract value: 10 years of annual savings.
      const estValue = match ? Math.round(match.annualSavingsEur * 10) : 0;

      const opp: Opportunity = {
        id: `opp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        matchId,
        stage: 'identified',
        owner: 'Unassigned',
        contacts: [],
        nextAction: 'Qualify the opportunity',
        nextActionDate: nowIso(),
        lastActivityDate: nowIso(),
        estimatedContractValueEur: estValue,
        probabilityPct: 10,
        activityLog: [
          { date: nowIso(), note: 'Added to pipeline from Heat Map', author: 'You' },
        ],
      };
      setOpportunities((prev) => [...prev, opp]);
      return opp;
    },
    [opportunities],
  );

  const moveStage = useCallback(
    (id: string, stage: Stage, lostReason?: LostReason) => {
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const next: Opportunity = {
            ...o,
            stage,
            lastActivityDate: nowIso(),
            lostReason: stage === 'lost' ? lostReason ?? o.lostReason : undefined,
            probabilityPct: STAGE_PROBABILITY[stage],
            activityLog: [
              ...o.activityLog,
              {
                date: nowIso(),
                note:
                  stage === 'lost'
                    ? `Moved to Lost (${(lostReason ?? 'other').replace(/_/g, ' ')})`
                    : `Moved to ${stage.replace(/_/g, ' ')}`,
                author: 'You',
              },
            ],
          };
          return next;
        }),
      );
    },
    [],
  );

  const logActivity = useCallback((id: string, note: string, author = 'You') => {
    if (!note.trim()) return;
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              lastActivityDate: nowIso(),
              activityLog: [...o.activityLog, { date: nowIso(), note: note.trim(), author }],
            }
          : o,
      ),
    );
  }, []);

  const updateOpportunity = useCallback((id: string, patch: Partial<Opportunity>) => {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const removeOpportunity = useCallback((id: string) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const resetToSeed = useCallback(() => {
    setOpportunities(seedOpportunities());
  }, []);

  const value = useMemo(
    () => ({
      opportunities,
      addFromMatch,
      hasOpportunityForMatch,
      moveStage,
      logActivity,
      updateOpportunity,
      removeOpportunity,
      resetToSeed,
    }),
    [
      opportunities,
      addFromMatch,
      hasOpportunityForMatch,
      moveStage,
      logActivity,
      updateOpportunity,
      removeOpportunity,
      resetToSeed,
    ],
  );

  return (
    <OpportunitiesContext.Provider value={value}>{children}</OpportunitiesContext.Provider>
  );
}

// Stage-weighted probability (indicative). 'parked'/'lost' are 0.
export const STAGE_PROBABILITY: Record<Stage, number> = {
  identified: 10,
  contacted: 20,
  feasibility: 40,
  term_sheet: 60,
  permitting: 75,
  construction: 90,
  live: 100,
  parked: 5,
  lost: 0,
};

export function useOpportunities(): OpportunitiesContextValue {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error('useOpportunities must be used within OpportunitiesProvider');
  return ctx;
}
