import { describe, it, expect } from 'vitest';
import {
  recoverableHeatMWhPerYear,
  proximityScore,
  demandFitScore,
  profileFitScore,
  infrastructureScore,
  governanceScore,
  effectiveSensitivity,
  bandFor,
  scoreMatch,
  clamp,
  type ScoreInputs,
} from './scoring';

describe('recoverableHeatMWhPerYear', () => {
  it('applies the default energy-per-cremation and efficiency', () => {
    // 6200 × 240 × 0.55 / 1000 = 818.4 MWh/yr
    expect(recoverableHeatMWhPerYear(6200)).toBeCloseTo(818.4, 5);
  });

  it('is zero for zero cremations', () => {
    expect(recoverableHeatMWhPerYear(0)).toBe(0);
  });

  it('respects overridden constants', () => {
    expect(recoverableHeatMWhPerYear(1000, 200, 0.5)).toBeCloseTo(100, 5);
  });
});

describe('proximityScore (§4.2 table)', () => {
  it.each([
    [0, 100],
    [300, 100],
    [301, 85],
    [750, 85],
    [751, 65],
    [1500, 65],
    [1501, 40],
    [3000, 40],
    [3001, 15],
    [5000, 15],
    [5001, 0],
    [12000, 0],
  ])('%d m -> %d', (dist, expected) => {
    expect(proximityScore(dist)).toBe(expected);
  });
});

describe('demandFitScore (§4.2 table)', () => {
  // source recoverable fixed at 100 MWh so ratio r == sink demand / 100
  const src = 100;
  const lowTemp = 70;

  it('scores the sweet spot (0.8–1.5) at 100', () => {
    expect(demandFitScore(80, src, lowTemp)).toBe(100);
    expect(demandFitScore(150, src, lowTemp)).toBe(100);
  });

  it('scores adjacent bands at 80', () => {
    expect(demandFitScore(50, src, lowTemp)).toBe(80); // r = 0.5
    expect(demandFitScore(300, src, lowTemp)).toBe(80); // r = 3.0
  });

  it('scores wider bands at 55', () => {
    expect(demandFitScore(25, src, lowTemp)).toBe(55); // r = 0.25
    expect(demandFitScore(600, src, lowTemp)).toBe(55); // r = 6.0
  });

  it('scores the far bands at 30', () => {
    expect(demandFitScore(10, src, lowTemp)).toBe(30); // r = 0.1
    expect(demandFitScore(700, src, lowTemp)).toBe(30); // r = 7.0
  });

  it('scores tiny demand at 10', () => {
    expect(demandFitScore(5, src, lowTemp)).toBe(10); // r = 0.05
  });

  it('halves the score for high-temperature demand (>90°C)', () => {
    expect(demandFitScore(100, src, 95)).toBe(50); // 100 × 0.5
  });

  it('returns 0 when the source has no recoverable heat', () => {
    expect(demandFitScore(100, 0, lowTemp)).toBe(0);
  });
});

describe('profileFitScore (§4.2 table)', () => {
  it.each([
    ['continuous', 100],
    ['weekday_daytime', 90],
    ['term_time', 60],
    ['seasonal_winter', 40],
  ] as const)('%s -> %d', (profile, expected) => {
    expect(profileFitScore(profile)).toBe(expected);
  });
});

describe('infrastructureScore (§4.2)', () => {
  it('starts at 50 and clamps the no-hydronic case', () => {
    // 50 - 30 = 20
    expect(
      infrastructureScore({
        nearDistrictNetwork: false,
        hasHydronicSystem: false,
        sourceHasExistingHeatRecovery: false,
      }),
    ).toBe(20);
  });

  it('adds network + hydronic + existing recovery and clamps at 100', () => {
    // 50 + 30 + 20 + 10 = 110 -> 100
    expect(
      infrastructureScore({
        nearDistrictNetwork: true,
        hasHydronicSystem: true,
        sourceHasExistingHeatRecovery: true,
      }),
    ).toBe(100);
  });

  it('hydronic only -> 70', () => {
    expect(
      infrastructureScore({
        nearDistrictNetwork: false,
        hasHydronicSystem: true,
        sourceHasExistingHeatRecovery: false,
      }),
    ).toBe(70);
  });
});

describe('governanceScore (§4.2 table)', () => {
  it('municipal↔municipal is 100 (one decision-maker)', () => {
    expect(governanceScore('municipal', 'municipal')).toBe(100);
  });
  it('municipal source, private sink is 65', () => {
    expect(governanceScore('municipal', 'private')).toBe(65);
  });
  it('private source, municipal sink is 60', () => {
    expect(governanceScore('private', 'municipal')).toBe(60);
  });
  it('private↔private is 75', () => {
    expect(governanceScore('private', 'private')).toBe(75);
  });
  it('anything mixed is 50', () => {
    expect(governanceScore('mixed', 'municipal')).toBe(50);
    expect(governanceScore('private', 'mixed')).toBe(50);
    expect(governanceScore('mixed', 'mixed')).toBe(50);
  });
});

describe('effectiveSensitivity (§4.3)', () => {
  it('uses the explicit value when present', () => {
    expect(effectiveSensitivity('laundry', 'high')).toBe('high');
  });
  it('falls back to the type default', () => {
    expect(effectiveSensitivity('school')).toBe('high');
    expect(effectiveSensitivity('laundry')).toBe('low');
    expect(effectiveSensitivity('municipal_pool')).toBe('medium');
  });
});

describe('bandFor (§4.5)', () => {
  it.each([
    [100, 'hot'],
    [75, 'hot'],
    [74, 'warm'],
    [55, 'warm'],
    [54, 'lukewarm'],
    [35, 'lukewarm'],
    [34, 'cold'],
    [0, 'cold'],
  ] as const)('%d -> %s', (score, band) => {
    expect(bandFor(score).band).toBe(band);
  });
});

describe('clamp', () => {
  it('clamps to 0..100 by default', () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(150)).toBe(100);
    expect(clamp(42)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Full composite scenarios (§4.4) — the behaviour that matters most
// ---------------------------------------------------------------------------

const baseInputs: ScoreInputs = {
  routedDistanceM: 300, // prox 100
  sinkDemandMWh: 800, // r ≈ 0.98 -> demand 100 (source 818.4)
  sourceRecoverableMWh: 818.4,
  requiredSupplyTempC: 32,
  sinkDemandProfile: 'continuous', // profile 100
  nearDistrictNetwork: true,
  hasHydronicSystem: true,
  sourceHasExistingHeatRecovery: true,
  sourceOwner: 'municipal',
  sinkOwner: 'municipal',
  sinkType: 'municipal_pool', // medium sensitivity
  explicitSensitivity: undefined,
};

describe('scoreMatch composite', () => {
  it('a near-perfect municipal pool is hot but capped at the medium band', () => {
    const r = scoreMatch(baseInputs);
    // technical ≈ 100 across the board, governance 100, medium multiplier 0.9
    // social = 90, blended = 0.6·100 + 0.4·90 = 96, capped at 90
    expect(r.technicalFit).toBeCloseTo(100, 1);
    expect(r.socialPoliticalFit).toBeCloseTo(90, 1);
    expect(r.heatScore).toBe(90); // cap applied
    expect(r.heatBand).toBe('hot');
  });

  it('a low-sensitivity laundry with identical engineering scores higher overall', () => {
    const r = scoreMatch({
      ...baseInputs,
      sinkType: 'laundry',
      explicitSensitivity: 'low',
      sinkOwner: 'private', // governance 60 (private source? no—municipal→private 65)
    });
    // governance municipal→private = 65, low multiplier 1.0, social = 65
    // blended = 0.6·100 + 0.4·65 = 86
    expect(r.socialPoliticalFit).toBeCloseTo(65, 1);
    expect(r.heatScore).toBeCloseTo(86, 1);
    expect(r.heatBand).toBe('hot');
  });

  it('a high-sensitivity school can NEVER be hot, regardless of engineering', () => {
    const r = scoreMatch({
      ...baseInputs,
      sinkType: 'school',
      sinkDemandProfile: 'term_time',
      explicitSensitivity: 'high',
    });
    // high cap = 60, so heatScore <= 60 -> at most 'warm'
    expect(r.heatScore).toBeLessThanOrEqual(60);
    expect(r.heatBand).not.toBe('hot');
  });

  it('distance destroys the score for a far sink', () => {
    const near = scoreMatch(baseInputs);
    const far = scoreMatch({ ...baseInputs, routedDistanceM: 6000 }); // prox 0
    expect(far.proximityScore).toBe(0);
    expect(far.heatScore).toBeLessThan(near.heatScore);
  });

  it('reports technical and social fit separately', () => {
    const r = scoreMatch(baseInputs);
    expect(r).toHaveProperty('technicalFit');
    expect(r).toHaveProperty('socialPoliticalFit');
    expect(r.technicalFit).not.toBe(r.socialPoliticalFit);
  });
});
