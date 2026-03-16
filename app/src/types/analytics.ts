// T1.9 — Population analytics types

import type { CBTACompetency } from './assessment';

export interface PopulationBaseline {
  competency: CBTACompetency;
  p25: number;
  p50: number;
  p75: number;
  sampleSize: number;
}

export interface CohortComparison {
  pilotId: string;
  competency: CBTACompetency;
  pilotScore: number;
  cohortP25: number;
  cohortP50: number;
  cohortP75: number;
  percentileRank: number;
}

export interface PercentileRank {
  pilotId: string;
  competency: CBTACompetency;
  rank: number;
  totalPilots: number;
}
