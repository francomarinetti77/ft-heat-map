// Domain model for FT Heat Map. Mirrors the project spec §3.
// A HeatSource is a crematorium (supply); a HeatSink is a plausible offtaker
// (demand); a Match scores a source↔sink pair; an Opportunity tracks a match
// through the sales pipeline.

export type OwnershipType = 'municipal' | 'private' | 'mixed';
export type DataConfidence = 'high' | 'medium' | 'low';

export type FtConnectStatus =
  | 'connected'
  | 'retrofit_candidate'
  | 'not_connected'
  | 'unknown';

export type HeatProfile = 'weekday_daytime' | 'extended_hours' | 'continuous';

export interface HeatSource {
  id: string;
  name: string;
  operator: string;
  ownershipType: OwnershipType;
  address: string;
  district: string;
  lat: number;
  lng: number;

  cremators: number;
  isFTEquipment: boolean;
  ftConnectStatus: FtConnectStatus;

  annualCremations: number;
  annualCremationsSource: 'ft_connect' | 'estimated' | 'public_data';
  operatingHoursPerWeek: number;
  avgFlueGasTempC: number;

  recoverableHeatMWhPerYear: number; // computed, see §4.1
  heatProfile: HeatProfile;

  hasExistingHeatRecovery: boolean;
  notes: string;
  dataConfidence: DataConfidence;
}

export type SinkType =
  | 'municipal_pool'
  | 'sports_centre'
  | 'hospital'
  | 'care_home'
  | 'school'
  | 'university'
  | 'hotel'
  | 'laundry'
  | 'greenhouse'
  | 'district_network_node'
  | 'residential_block'
  | 'office'
  | 'industrial'
  | 'other';

export type DemandProfile =
  | 'continuous'
  | 'seasonal_winter'
  | 'term_time'
  | 'weekday_daytime';

export type PublicSensitivity = 'low' | 'medium' | 'high';

export interface HeatSink {
  id: string;
  name: string;
  type: SinkType;
  operator: string;
  ownershipType: OwnershipType;
  address: string;
  district: string;
  lat: number;
  lng: number;

  annualHeatDemandMWh: number;
  demandSource: 'open_data' | 'estimated_from_floor_area' | 'reported';
  demandProfile: DemandProfile;
  requiredSupplyTempC: number;

  currentHeatSource:
    | 'natural_gas'
    | 'electric'
    | 'district_network'
    | 'biomass'
    | 'unknown';
  hasHydronicSystem: boolean;

  nearDistrictNetwork: boolean;
  distanceToNetworkM: number | null;

  publicSensitivity: PublicSensitivity;
  notes: string;
  dataConfidence: DataConfidence;
}

export type HeatBand = 'hot' | 'warm' | 'lukewarm' | 'cold';

export interface Match {
  id: string;
  sourceId: string;
  sinkId: string;

  straightLineDistanceM: number;
  routedDistanceM: number;

  // scoring
  proximityScore: number;
  demandFitScore: number;
  profileFitScore: number;
  infrastructureScore: number;
  governanceScore: number;
  technicalFit: number;
  socialPoliticalFit: number;
  heatScore: number;
  heatBand: HeatBand;

  // economics (indicative only — label as such in the UI)
  deliverableHeatMWhPerYear: number;
  estimatedCapexEur: number;
  annualSavingsEur: number;
  simplePaybackYears: number;
  co2AvoidedTonnesPerYear: number;

  blockers: string[];
  whatWouldHaveToBeTrue: string[];
}

export type Stage =
  | 'identified'
  | 'contacted'
  | 'feasibility'
  | 'term_sheet'
  | 'permitting'
  | 'construction'
  | 'live'
  | 'parked'
  | 'lost';

export type LostReason =
  | 'community_opposition'
  | 'cost'
  | 'no_municipal_appetite'
  | 'technical_infeasible'
  | 'competitor'
  | 'timing'
  | 'other';

export interface Contact {
  name: string;
  role: string;
  organisation: string;
  email?: string;
  phone?: string;
}

export interface Activity {
  date: string; // ISO
  note: string;
  author: string;
}

export interface Opportunity {
  id: string;
  matchId: string;
  stage: Stage;
  owner: string;
  contacts: Contact[];
  nextAction: string;
  nextActionDate: string; // ISO
  lastActivityDate: string;
  estimatedContractValueEur: number;
  probabilityPct: number;
  lostReason?: LostReason;
  activityLog: Activity[];
}

export interface DistrictNetwork {
  id: string;
  name: string;
  operator: string;
  // approximate footprint polygon as [lat, lng] rings (see §6.3)
  footprint: [number, number][];
  color: string;
}
