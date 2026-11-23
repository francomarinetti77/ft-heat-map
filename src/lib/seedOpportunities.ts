// A handful of seed opportunities so the pipeline board and dashboard are not
// empty on first load. These reference real match IDs from the seed data.
// Dates are computed relative to "now" so the "days since last activity" and
// "next action" fields always look live in a demo.

import type { Opportunity } from '../types';

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function seedOpportunities(): Opportunity[] {
  return [
    {
      id: 'opp-1',
      matchId: 'match-src-montjuic__sink-cem-montjuic-piscina',
      stage: 'feasibility',
      owner: 'Marta Vidal',
      contacts: [
        {
          name: 'Jordi Ferrer',
          role: 'Facilities Director',
          organisation: 'CEM / Ajuntament de Barcelona',
          email: 'jordi.ferrer@example.cat',
        },
      ],
      nextAction: 'Site survey to confirm recoverable-heat volume',
      nextActionDate: isoDaysFromNow(6),
      lastActivityDate: isoDaysFromNow(-3),
      estimatedContractValueEur: 1_900_000,
      probabilityPct: 45,
      activityLog: [
        { date: isoDaysFromNow(-12), note: 'Identified from Heat Map — top-scoring municipal pair', author: 'Marta Vidal' },
        { date: isoDaysFromNow(-3), note: 'Intro call with CEM facilities team; positive', author: 'Marta Vidal' },
      ],
    },
    {
      id: 'opp-2',
      matchId: 'match-src-altima-santboi__sink-laundry-santboi',
      stage: 'contacted',
      owner: 'Tom Reese',
      contacts: [
        {
          name: 'Laura Prats',
          role: 'Operations Manager',
          organisation: 'Sant Boi laundry (illustrative)',
        },
      ],
      nextAction: 'Send indicative heat-supply proposal',
      nextActionDate: isoDaysFromNow(2),
      lastActivityDate: isoDaysFromNow(-1),
      estimatedContractValueEur: 620_000,
      probabilityPct: 25,
      activityLog: [
        { date: isoDaysFromNow(-8), note: 'Low-sensitivity, commercially simple — prioritised', author: 'Tom Reese' },
        { date: isoDaysFromNow(-1), note: 'First contact made by phone', author: 'Tom Reese' },
      ],
    },
    {
      id: 'opp-3',
      matchId: 'match-src-montjuic__sink-care-montjuic',
      stage: 'lost',
      owner: 'Marta Vidal',
      contacts: [],
      nextAction: '—',
      nextActionDate: isoDaysFromNow(0),
      lastActivityDate: isoDaysFromNow(-20),
      estimatedContractValueEur: 0,
      probabilityPct: 0,
      lostReason: 'community_opposition',
      activityLog: [
        { date: isoDaysFromNow(-40), note: 'Physically ideal — near, continuous demand', author: 'Marta Vidal' },
        { date: isoDaysFromNow(-20), note: 'Residents and families objected to heat sourced from a crematorium; council paused it', author: 'Marta Vidal' },
      ],
    },
    {
      id: 'opp-4',
      matchId: 'match-src-memora-lescorts__sink-ub-filosofia',
      stage: 'identified',
      owner: 'Tom Reese',
      contacts: [],
      nextAction: 'Qualify: confirm Mémora site runs cremators on-premises',
      nextActionDate: isoDaysFromNow(10),
      lastActivityDate: isoDaysFromNow(-2),
      estimatedContractValueEur: 480_000,
      probabilityPct: 10,
      activityLog: [
        { date: isoDaysFromNow(-2), note: 'Surfaced by Heat Map; source data confidence is low, needs verifying', author: 'Tom Reese' },
      ],
    },
  ];
}
