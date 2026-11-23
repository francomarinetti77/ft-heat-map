// Loads the seed JSON at startup, builds the match set once, and exposes
// lookup helpers. Data is static for the prototype (§7: no server, no DB).

import type {
  HeatSource,
  HeatSink,
  DistrictNetwork,
  Match,
} from '../types';
import sourcesJson from '../data/sources.json';
import sinksJson from '../data/sinks.json';
import networksJson from '../data/networks.json';
import { buildAllMatches } from './matching';

export const sources: HeatSource[] = (sourcesJson.sources as HeatSource[]);
export const sinks: HeatSink[] = (sinksJson.sinks as HeatSink[]);
export const networks: DistrictNetwork[] = (networksJson.networks as DistrictNetwork[]);

/** Active sources carry recoverable heat; decommissioned ones do not. */
export const activeSources = sources.filter((s) => s.recoverableHeatMWhPerYear > 0);

export const matches: Match[] = buildAllMatches(sources, sinks);

const sourceById = new Map(sources.map((s) => [s.id, s]));
const sinkById = new Map(sinks.map((s) => [s.id, s]));
const matchById = new Map(matches.map((m) => [m.id, m]));

export function getSource(id: string): HeatSource | undefined {
  return sourceById.get(id);
}
export function getSink(id: string): HeatSink | undefined {
  return sinkById.get(id);
}
export function getMatch(id: string): Match | undefined {
  return matchById.get(id);
}

/** Total addressable recoverable heat in the city, MWh/yr (active sources). */
export const totalAddressableRecoverableMWh = activeSources.reduce(
  (sum, s) => sum + s.recoverableHeatMWhPerYear,
  0,
);
