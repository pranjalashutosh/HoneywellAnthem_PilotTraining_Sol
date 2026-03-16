// T1.7 — Pilot profile types

export type AccentGroup =
  | 'native_us'
  | 'native_uk'
  | 'native_aus'
  | 'south_asian'
  | 'east_asian'
  | 'european'
  | 'middle_eastern'
  | 'latin_american'
  | 'african'
  | 'other';

export type ExperienceLevel =
  | 'student'
  | 'low_time'
  | 'mid_time'
  | 'high_time'
  | 'atp';

export interface PilotProfile {
  id: string;
  name: string;
  accentGroup: AccentGroup;
  experienceLevel: ExperienceLevel;
  totalHours: number;
  anthemHours: number;
  previousPlatform: string;
  createdAt: number;
  lastActiveAt: number;
}
