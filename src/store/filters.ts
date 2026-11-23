// Filter state for the map and lists. A plain hook (no context needed — the
// map owns it and passes it down).

import { useMemo, useState } from 'react';
import type { HeatBand, SinkType, Match, HeatSink } from '../types';

export interface Filters {
  sinkTypes: Set<SinkType>;
  bands: Set<HeatBand>;
  districts: Set<string>;
  ownership: Set<string>;
  onlyWithPipeline: boolean;
}

export function emptyFilters(): Filters {
  return {
    sinkTypes: new Set(),
    bands: new Set(),
    districts: new Set(),
    ownership: new Set(),
    onlyWithPipeline: false,
  };
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  function toggle<T>(key: keyof Filters, value: T) {
    setFilters((prev) => {
      const set = new Set(prev[key] as Set<T>);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: set };
    });
  }

  function setOnlyWithPipeline(v: boolean) {
    setFilters((prev) => ({ ...prev, onlyWithPipeline: v }));
  }

  function reset() {
    setFilters(emptyFilters());
  }

  const activeCount =
    filters.sinkTypes.size +
    filters.bands.size +
    filters.districts.size +
    filters.ownership.size +
    (filters.onlyWithPipeline ? 1 : 0);

  return { filters, toggle, setOnlyWithPipeline, reset, activeCount };
}

/** Does a sink pass the non-band filters (type, district, ownership)? */
export function sinkPassesStaticFilters(sink: HeatSink, filters: Filters): boolean {
  if (filters.sinkTypes.size && !filters.sinkTypes.has(sink.type)) return false;
  if (filters.districts.size && !filters.districts.has(sink.district)) return false;
  if (filters.ownership.size && !filters.ownership.has(sink.ownershipType)) return false;
  return true;
}

/**
 * The best (highest heatScore) match per sink for the currently selected
 * source, or across all sources when none is selected. Used to colour/size
 * sink markers and to apply the band filter.
 */
export function useBestMatchPerSink(
  matches: Match[],
  selectedSourceId: string | null,
): Map<string, Match> {
  return useMemo(() => {
    const best = new Map<string, Match>();
    for (const m of matches) {
      if (selectedSourceId && m.sourceId !== selectedSourceId) continue;
      const cur = best.get(m.sinkId);
      if (!cur || m.heatScore > cur.heatScore) best.set(m.sinkId, m);
    }
    return best;
  }, [matches, selectedSourceId]);
}
