// The Heat Score — the intellectual content of this product. See project §4.
//
// Pure, deterministic functions only. No I/O, no randomness, no Date.now().
// Every threshold and constant is either inline here (the scoring bands, which
// are defined by the spec tables) or imported from config/assumptions.ts (the
// physical and economic constants that an audience may want to change).

import {
  ENERGY_PER_CREMATION_KWH,
  RECOVERY_EFFICIENCY,
  TECHNICAL_WEIGHTS,
  COMPOSITE_WEIGHTS,
  DEFAULT_SENSITIVITY_BY_TYPE,
  SENSITIVITY_MODIFIER,
  BANDS,
} from '../config/assumptions';
import type {
  HeatSource,
  HeatSink,
  HeatBand,
  PublicSensitivity,
  OwnershipType,
  DemandProfile,
  SinkType,
} from '../types';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// §4.1 Recoverable heat
// ---------------------------------------------------------------------------

/**
 * Recoverable heat from a source, in MWh/year.
 * Uses tunable constants from assumptions.ts. When the source is NOT FT Connect
 * connected, callers should present this as an estimate in the UI.
 */
export function recoverableHeatMWhPerYear(
  annualCremations: number,
  energyPerCremationKWh: number = ENERGY_PER_CREMATION_KWH,
  recoveryEfficiency: number = RECOVERY_EFFICIENCY,
): number {
  return (annualCremations * energyPerCremationKWh * recoveryEfficiency) / 1000;
}

// ---------------------------------------------------------------------------
// §4.2 Proximity (uses routed distance)
// ---------------------------------------------------------------------------

export function proximityScore(routedDistanceM: number): number {
  if (routedDistanceM <= 300) return 100;
  if (routedDistanceM <= 750) return 85;
  if (routedDistanceM <= 1_500) return 65;
  if (routedDistanceM <= 3_000) return 40;
  if (routedDistanceM <= 5_000) return 15;
  return 0;
}

// ---------------------------------------------------------------------------
// §4.2 Demand fit (with high-temperature penalty)
// ---------------------------------------------------------------------------

export function demandFitScore(
  sinkDemandMWh: number,
  sourceRecoverableMWh: number,
  requiredSupplyTempC: number,
): number {
  // Avoid divide-by-zero: a source with no recoverable heat fits nothing.
  if (sourceRecoverableMWh <= 0) return 0;

  const r = sinkDemandMWh / sourceRecoverableMWh;

  let base: number;
  if (r >= 0.8 && r <= 1.5) base = 100;
  else if ((r >= 0.5 && r < 0.8) || (r > 1.5 && r <= 3.0)) base = 80;
  else if ((r >= 0.25 && r < 0.5) || (r > 3.0 && r <= 6.0)) base = 55;
  else if ((r >= 0.1 && r < 0.25) || r > 6.0) base = 30;
  else base = 10; // r < 0.1

  // Temperature penalty: flue-gas recovery comfortably serves low-temperature
  // demand; very high-temperature demand is harder.
  if (requiredSupplyTempC > 90) base *= 0.5;

  return base;
}

// ---------------------------------------------------------------------------
// §4.2 Profile fit
// ---------------------------------------------------------------------------

export function profileFitScore(sinkProfile: DemandProfile): number {
  switch (sinkProfile) {
    case 'continuous':
      return 100;
    case 'weekday_daytime':
      return 90;
    case 'term_time':
      return 60;
    case 'seasonal_winter':
      return 40;
  }
}

// ---------------------------------------------------------------------------
// §4.2 Infrastructure
// ---------------------------------------------------------------------------

export function infrastructureScore(opts: {
  nearDistrictNetwork: boolean;
  hasHydronicSystem: boolean;
  sourceHasExistingHeatRecovery: boolean;
}): number {
  let s = 50;
  if (opts.nearDistrictNetwork) s += 30;
  if (opts.hasHydronicSystem) s += 20;
  else s -= 30; // all-electric building needs a full wet-system retrofit
  if (opts.sourceHasExistingHeatRecovery) s += 10;
  return clamp(s);
}

// ---------------------------------------------------------------------------
// §4.2 Governance
// ---------------------------------------------------------------------------

export function governanceScore(
  sourceOwner: OwnershipType,
  sinkOwner: OwnershipType,
): number {
  // Any pairing involving 'mixed' ownership means multiple parties.
  if (sourceOwner === 'mixed' || sinkOwner === 'mixed') return 50;

  if (sourceOwner === 'municipal' && sinkOwner === 'municipal') return 100;
  if (sourceOwner === 'municipal' && sinkOwner === 'private') return 65;
  if (sourceOwner === 'private' && sinkOwner === 'municipal') return 60;
  if (sourceOwner === 'private' && sinkOwner === 'private') return 75;

  return 50; // defensive default
}

// ---------------------------------------------------------------------------
// §4.3 Social sensitivity
// ---------------------------------------------------------------------------

/** Effective sensitivity: the record's explicit value, else the type default. */
export function effectiveSensitivity(
  type: SinkType,
  explicit?: PublicSensitivity,
): PublicSensitivity {
  if (explicit) return explicit;
  return (DEFAULT_SENSITIVITY_BY_TYPE[type] ?? 'medium') as PublicSensitivity;
}

// ---------------------------------------------------------------------------
// §4.4 Composite + §4.5 bands
// ---------------------------------------------------------------------------

export function bandFor(heatScore: number): { band: HeatBand; label: string; color: string } {
  for (const b of BANDS) {
    if (heatScore >= b.min) {
      return { band: b.band as HeatBand, label: b.label, color: b.color };
    }
  }
  // BANDS always includes a min:0 entry, so this is unreachable; return cold.
  const cold = BANDS[BANDS.length - 1];
  return { band: cold.band as HeatBand, label: cold.label, color: cold.color };
}

export interface ScoreBreakdown {
  proximityScore: number;
  demandFitScore: number;
  profileFitScore: number;
  infrastructureScore: number;
  governanceScore: number;
  sensitivity: PublicSensitivity;
  sensitivityMultiplier: number;
  sensitivityCap: number;
  technicalFit: number;
  socialPoliticalFit: number;
  heatScore: number;
  heatBand: HeatBand;
  heatBandLabel: string;
  heatBandColor: string;
}

export interface ScoreInputs {
  routedDistanceM: number;
  sinkDemandMWh: number;
  sourceRecoverableMWh: number;
  requiredSupplyTempC: number;
  sinkDemandProfile: DemandProfile;
  nearDistrictNetwork: boolean;
  hasHydronicSystem: boolean;
  sourceHasExistingHeatRecovery: boolean;
  sourceOwner: OwnershipType;
  sinkOwner: OwnershipType;
  sinkType: SinkType;
  explicitSensitivity?: PublicSensitivity;
}

/**
 * The full Heat Score computation. Composes every component per §4.4:
 *
 *   technicalFit       = 0.40·proximity + 0.27·demandFit
 *                      + 0.20·profileFit + 0.13·infrastructure
 *   socialPoliticalFit = governance × sensitivityMultiplier
 *   heatScore          = min( cap(sensitivity),
 *                             0.60·technicalFit + 0.40·socialPoliticalFit )
 */
export function scoreMatch(inputs: ScoreInputs): ScoreBreakdown {
  const prox = proximityScore(inputs.routedDistanceM);
  const demand = demandFitScore(
    inputs.sinkDemandMWh,
    inputs.sourceRecoverableMWh,
    inputs.requiredSupplyTempC,
  );
  const profile = profileFitScore(inputs.sinkDemandProfile);
  const infra = infrastructureScore({
    nearDistrictNetwork: inputs.nearDistrictNetwork,
    hasHydronicSystem: inputs.hasHydronicSystem,
    sourceHasExistingHeatRecovery: inputs.sourceHasExistingHeatRecovery,
  });
  const governance = governanceScore(inputs.sourceOwner, inputs.sinkOwner);

  const sensitivity = effectiveSensitivity(inputs.sinkType, inputs.explicitSensitivity);
  const { multiplier, cap } = SENSITIVITY_MODIFIER[sensitivity];

  const technicalFit =
    TECHNICAL_WEIGHTS.proximity * prox +
    TECHNICAL_WEIGHTS.demandFit * demand +
    TECHNICAL_WEIGHTS.profileFit * profile +
    TECHNICAL_WEIGHTS.infrastructure * infra;

  const socialPoliticalFit = governance * multiplier;

  const blended =
    COMPOSITE_WEIGHTS.technical * technicalFit +
    COMPOSITE_WEIGHTS.social * socialPoliticalFit;

  const heatScore = Math.min(cap, blended);
  const band = bandFor(heatScore);

  return {
    proximityScore: round1(prox),
    demandFitScore: round1(demand),
    profileFitScore: round1(profile),
    infrastructureScore: round1(infra),
    governanceScore: round1(governance),
    sensitivity,
    sensitivityMultiplier: multiplier,
    sensitivityCap: cap,
    technicalFit: round1(technicalFit),
    socialPoliticalFit: round1(socialPoliticalFit),
    heatScore: round1(heatScore),
    heatBand: band.band,
    heatBandLabel: band.label,
    heatBandColor: band.color,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Convenience adapter from domain records to ScoreInputs
// ---------------------------------------------------------------------------

export function scoreInputsFrom(
  source: HeatSource,
  sink: HeatSink,
  routedDistanceM: number,
): ScoreInputs {
  return {
    routedDistanceM,
    sinkDemandMWh: sink.annualHeatDemandMWh,
    sourceRecoverableMWh: source.recoverableHeatMWhPerYear,
    requiredSupplyTempC: sink.requiredSupplyTempC,
    sinkDemandProfile: sink.demandProfile,
    nearDistrictNetwork: sink.nearDistrictNetwork,
    hasHydronicSystem: sink.hasHydronicSystem,
    sourceHasExistingHeatRecovery: source.hasExistingHeatRecovery,
    sourceOwner: source.ownershipType,
    sinkOwner: sink.ownershipType,
    sinkType: sink.type,
    explicitSensitivity: sink.publicSensitivity,
  };
}
