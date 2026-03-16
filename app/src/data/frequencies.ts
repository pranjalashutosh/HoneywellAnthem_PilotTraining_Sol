// T3.13 — Common ATC frequencies for drills

import type { Frequency } from '@/types';

export const frequencies: Record<string, Frequency> = {
  guard: { value: 121.500, label: 'Guard' },
  bostonCenter: { value: 124.350, label: 'Boston Center' },
  bostonApproach: { value: 120.600, label: 'Boston Approach' },
  bostonTower: { value: 128.800, label: 'Boston Tower' },
  bostonGround: { value: 121.900, label: 'Boston Ground' },
  nyCenter: { value: 132.450, label: 'New York Center' },
  nyApproach: { value: 125.700, label: 'New York Approach' },
  jfkTower: { value: 119.100, label: 'JFK Tower' },
  jfkGround: { value: 121.700, label: 'JFK Ground' },
  tebTower: { value: 119.500, label: 'Teterboro Tower' },
  tebGround: { value: 121.600, label: 'Teterboro Ground' },
  pbiApproach: { value: 124.600, label: 'Palm Beach Approach' },
  pbiTower: { value: 119.100, label: 'Palm Beach Tower' },
  jacksonCenter: { value: 134.100, label: 'Jacksonville Center' },
  washCenter: { value: 128.350, label: 'Washington Center' },
  atis: { value: 127.600, label: 'ATIS' },
};

export const frequencyList: Frequency[] = Object.values(frequencies);
