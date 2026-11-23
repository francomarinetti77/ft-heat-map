// Single source of truth for every tunable constant in the Heat Score and the
// indicative economics. Per project §10 these live in one file so they can be
// argued about and changed in front of an audience.
//
// IMPORTANT: these are indicative planning figures, NOT measured values. The UI
// must present any figure derived from them as an estimate unless the underlying
// source record is FT Connect connected.

// ---------------------------------------------------------------------------
// §4.1 Recoverable heat from a source
// ---------------------------------------------------------------------------

/**
 * Thermal energy available in the flue gas per cremation, in kWh.
 * Indicative figure: a cremation cycle liberates a large amount of heat into
 * the flue gas; this is a conservative planning estimate of what is practically
 * present for recovery, not a metered value.
 */
export const ENERGY_PER_CREMATION_KWH = 240;

/**
 * Fraction of the available flue-gas heat that a realistic heat-recovery system
 * can actually capture and deliver. Indicative planning figure.
 */
export const RECOVERY_EFFICIENCY = 0.55;

// ---------------------------------------------------------------------------
// §4.2 Component score weights (composite — see §4.4)
// ---------------------------------------------------------------------------

/**
 * Weights used inside technicalFit. Note these are the §4.4 composite weights
 * (0.40 / 0.27 / 0.20 / 0.13), which already fold the headline §4.2 weights
 * (0.30 / 0.20 / 0.15 / 0.15) into the technical-only sub-score.
 */
export const TECHNICAL_WEIGHTS = {
  proximity: 0.4,
  demandFit: 0.27,
  profileFit: 0.2,
  infrastructure: 0.13,
} as const;

/**
 * Final blend of technical and social/political fit into the headline Heat Score.
 */
export const COMPOSITE_WEIGHTS = {
  technical: 0.6,
  social: 0.4,
} as const;

// ---------------------------------------------------------------------------
// §4.3 Social modifier
// ---------------------------------------------------------------------------

/** Default public sensitivity by sink type. Overridable per record. */
export const DEFAULT_SENSITIVITY_BY_TYPE: Record<
  string,
  'low' | 'medium' | 'high'
> = {
  school: 'high',
  care_home: 'high',
  // hospitals default medium at the type level; maternity / children's
  // hospitals should be flagged 'high' on the individual record.
  laundry: 'low',
  greenhouse: 'low',
  district_network_node: 'low',
  office: 'low',
  university: 'low',
  municipal_pool: 'medium',
  sports_centre: 'medium',
  hotel: 'medium',
  residential_block: 'medium',
  hospital: 'medium',
  industrial: 'low',
  other: 'medium',
};

/** Multiplier and hard cap applied to the final composite by sensitivity. */
export const SENSITIVITY_MODIFIER: Record<
  'low' | 'medium' | 'high',
  { multiplier: number; cap: number }
> = {
  low: { multiplier: 1.0, cap: 100 },
  medium: { multiplier: 0.9, cap: 90 },
  high: { multiplier: 0.7, cap: 60 },
};

// ---------------------------------------------------------------------------
// §4.5 Bands
// ---------------------------------------------------------------------------

export const BANDS = [
  { band: 'hot', min: 75, label: 'Approach now', color: '#E0452F' },
  { band: 'warm', min: 55, label: 'Qualify', color: '#F7941E' },
  { band: 'lukewarm', min: 35, label: 'Watch', color: '#E8C547' },
  { band: 'cold', min: 0, label: 'Park', color: '#8FA3B0' },
] as const;

// ---------------------------------------------------------------------------
// §4.6 Indicative economics
// ---------------------------------------------------------------------------

/** Trenching + pipe cost per metre of routed distance, dense urban. EUR. */
export const CAPEX_PER_METRE_EUR = 1_200;

/** Fixed heat exchanger + plant room cost. EUR. */
export const CAPEX_PLANT_EUR = 180_000;

/** Additional cost when the sink has no existing wet (hydronic) system. EUR. */
export const CAPEX_HYDRONIC_RETROFIT_EUR = 250_000;

/** Avoided natural gas price, used for savings. EUR per MWh. */
export const GAS_PRICE_EUR_PER_MWH = 65;

/** CO2 emission factor for displaced natural gas heat. tonnes CO2 per MWh. */
export const CO2_TONNES_PER_MWH = 0.2;

/** Distance loss: delivered heat falls with routed distance, floored at 0.70. */
export const DISTANCE_LOSS_FLOOR = 0.7;
export const DISTANCE_LOSS_SCALE_M = 20_000;
