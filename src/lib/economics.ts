// Indicative economics for a source↔sink match. See project §4.6.
// Every figure here is for PRIORITISATION, not for investment decisions, and
// the UI must label it as such.

import {
  CAPEX_PER_METRE_EUR,
  CAPEX_PLANT_EUR,
  CAPEX_HYDRONIC_RETROFIT_EUR,
  GAS_PRICE_EUR_PER_MWH,
  CO2_TONNES_PER_MWH,
  DISTANCE_LOSS_FLOOR,
  DISTANCE_LOSS_SCALE_M,
} from '../config/assumptions';

export interface EconomicsInput {
  sourceRecoverableMWh: number;
  sinkDemandMWh: number;
  routedDistanceM: number;
  hasHydronicSystem: boolean;
}

export interface EconomicsResult {
  deliverableHeatMWhPerYear: number;
  estimatedCapexEur: number;
  annualSavingsEur: number;
  simplePaybackYears: number;
  co2AvoidedTonnesPerYear: number;
}

/** Heat delivered after distance losses, capped by whichever side is smaller. */
export function distanceLossFactor(routedDistanceM: number): number {
  return Math.max(DISTANCE_LOSS_FLOOR, 1 - routedDistanceM / DISTANCE_LOSS_SCALE_M);
}

export function computeEconomics(input: EconomicsInput): EconomicsResult {
  const { sourceRecoverableMWh, sinkDemandMWh, routedDistanceM, hasHydronicSystem } =
    input;

  const deliverableHeatMWhPerYear =
    Math.min(sourceRecoverableMWh, sinkDemandMWh) * distanceLossFactor(routedDistanceM);

  const estimatedCapexEur =
    CAPEX_PER_METRE_EUR * routedDistanceM +
    CAPEX_PLANT_EUR +
    (hasHydronicSystem ? 0 : CAPEX_HYDRONIC_RETROFIT_EUR);

  const annualSavingsEur = deliverableHeatMWhPerYear * GAS_PRICE_EUR_PER_MWH;
  const co2AvoidedTonnesPerYear = deliverableHeatMWhPerYear * CO2_TONNES_PER_MWH;

  // Guard against divide-by-zero when there is no deliverable heat.
  const simplePaybackYears =
    annualSavingsEur > 0 ? estimatedCapexEur / annualSavingsEur : Infinity;

  return {
    deliverableHeatMWhPerYear,
    estimatedCapexEur,
    annualSavingsEur,
    simplePaybackYears,
    co2AvoidedTonnesPerYear,
  };
}
