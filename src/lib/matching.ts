// Builds Match records for every source↔sink pair within range, composing the
// geo, scoring and economics modules. Pure given its inputs.

import type { HeatSource, HeatSink, Match } from '../types';
import { haversineMetres, approxRoutedMetres } from './geo';
import { scoreMatch, scoreInputsFrom, effectiveSensitivity } from './scoring';
import { computeEconomics } from './economics';

/**
 * Pairs beyond this routed distance score 0 on proximity and are not worth
 * surfacing as opportunities. Keeps the match set small and honest.
 */
export const MAX_ROUTED_DISTANCE_M = 6000;

/** Derive human-readable blockers for a pair. */
function deriveBlockers(source: HeatSource, sink: HeatSink, routedM: number): string[] {
  const out: string[] = [];
  if (source.recoverableHeatMWhPerYear <= 0) {
    out.push('Source carries no recoverable heat (decommissioned or offline)');
  }
  if (!sink.hasHydronicSystem) {
    out.push('No hydronic (wet) system — full heating retrofit required');
  }
  if (sink.requiredSupplyTempC > 90) {
    out.push(`High supply temperature required (${sink.requiredSupplyTempC}°C) — beyond comfortable flue-gas recovery`);
  }
  if (routedM > 3000) {
    out.push(`Long routed distance (${(routedM / 1000).toFixed(1)} km) — trenching cost and losses high`);
  }
  const sens = effectiveSensitivity(sink.type, sink.publicSensitivity);
  if (sens === 'high') {
    out.push('High public sensitivity — community acceptance is the binding constraint');
  }
  if (source.ownershipType === 'mixed' || sink.ownershipType === 'mixed') {
    out.push('Mixed ownership — multiple parties must agree');
  }
  return out;
}

/** Derive the "what would have to be true" checklist for a pair. */
function deriveWhatWouldHaveToBeTrue(source: HeatSource, sink: HeatSink): string[] {
  const out: string[] = [];
  out.push(
    source.ftConnectStatus === 'connected'
      ? 'FT Connect confirms the recoverable-heat volume (measured)'
      : 'Recoverable-heat volume confirmed by survey (currently an estimate)',
  );
  out.push('A routed pipe corridor exists that avoids major severances (rail, river)');
  if (!sink.hasHydronicSystem) {
    out.push('Offtaker commits to installing a wet heating system');
  }
  const sens = effectiveSensitivity(sink.type, sink.publicSensitivity);
  if (sens !== 'low') {
    out.push('Community engagement completed with no sustained opposition');
  }
  if (source.ownershipType === 'municipal' && sink.ownershipType === 'municipal') {
    out.push('Barcelona City Council approves both sides (single decision-maker)');
  } else {
    out.push('A commercial heat-supply agreement is signed between the parties');
  }
  if (sink.nearDistrictNetwork) {
    out.push('Network operator agrees an interconnection at the node');
  }
  return out;
}

export function buildMatch(source: HeatSource, sink: HeatSink): Match {
  const straightLineDistanceM = Math.round(haversineMetres(source, sink));
  const routedDistanceM = approxRoutedMetres(straightLineDistanceM);

  const breakdown = scoreMatch(scoreInputsFrom(source, sink, routedDistanceM));

  const econ = computeEconomics({
    sourceRecoverableMWh: source.recoverableHeatMWhPerYear,
    sinkDemandMWh: sink.annualHeatDemandMWh,
    routedDistanceM,
    hasHydronicSystem: sink.hasHydronicSystem,
  });

  return {
    id: `match-${source.id}__${sink.id}`,
    sourceId: source.id,
    sinkId: sink.id,
    straightLineDistanceM,
    routedDistanceM,

    proximityScore: breakdown.proximityScore,
    demandFitScore: breakdown.demandFitScore,
    profileFitScore: breakdown.profileFitScore,
    infrastructureScore: breakdown.infrastructureScore,
    governanceScore: breakdown.governanceScore,
    technicalFit: breakdown.technicalFit,
    socialPoliticalFit: breakdown.socialPoliticalFit,
    heatScore: breakdown.heatScore,
    heatBand: breakdown.heatBand,

    deliverableHeatMWhPerYear: round1(econ.deliverableHeatMWhPerYear),
    estimatedCapexEur: Math.round(econ.estimatedCapexEur),
    annualSavingsEur: Math.round(econ.annualSavingsEur),
    simplePaybackYears: Number.isFinite(econ.simplePaybackYears)
      ? round1(econ.simplePaybackYears)
      : Infinity,
    co2AvoidedTonnesPerYear: round1(econ.co2AvoidedTonnesPerYear),

    blockers: deriveBlockers(source, sink, routedDistanceM),
    whatWouldHaveToBeTrue: deriveWhatWouldHaveToBeTrue(source, sink),
  };
}

/**
 * Build all matches within range. Sources with zero recoverable heat
 * (decommissioned sites) produce no matches — they cannot supply anything.
 */
export function buildAllMatches(sources: HeatSource[], sinks: HeatSink[]): Match[] {
  const matches: Match[] = [];
  for (const source of sources) {
    if (source.recoverableHeatMWhPerYear <= 0) continue;
    for (const sink of sinks) {
      const straight = haversineMetres(source, sink);
      if (approxRoutedMetres(straight) > MAX_ROUTED_DISTANCE_M) continue;
      matches.push(buildMatch(source, sink));
    }
  }
  return matches.sort((a, b) => b.heatScore - a.heatScore);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
