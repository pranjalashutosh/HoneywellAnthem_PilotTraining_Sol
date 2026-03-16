// T3.15 — Standard ICAO/FAA phraseology templates

export const phraseologyTemplates = {
  readback: {
    altitudeChange: '{callsign}, descend and maintain {altitude}',
    headingChange: '{callsign}, turn {direction} heading {heading}',
    frequencyChange: '{callsign}, contact {facility} on {frequency}',
    holdingClearance: '{callsign}, hold {direction} on the {fix} {radial} radial, {leg} minute legs, expect further clearance {time}',
    approachClearance: '{callsign}, cleared {approach} approach runway {runway}',
  },
  atcInstruction: {
    descend: '{callsign}, descend and maintain flight level {level}',
    climb: '{callsign}, climb and maintain flight level {level}',
    turn: '{callsign}, turn {direction} heading {heading}',
    contact: '{callsign}, contact {facility} on {frequency}',
    squawk: '{callsign}, squawk {code}',
    hold: '{callsign}, hold {direction} as published, expect further clearance at {time}',
    cleared: '{callsign}, cleared {approach} approach runway {runway}',
    traffic: 'Traffic, {position}, {type}, {altitude}, {direction} bound',
  },
  standard: {
    roger: 'Roger',
    wilco: 'Wilco',
    unable: 'Unable',
    sayAgain: 'Say again',
    standby: 'Standby',
    affirmative: 'Affirmative',
    negative: 'Negative',
    mayday: 'Mayday, mayday, mayday',
  },
} as const;

// Aviation number pronunciation helpers
export function pronounceAltitude(feet: number): string {
  if (feet >= 18000) {
    const fl = Math.round(feet / 100);
    return `flight level ${String(fl).split('').join(' ')}`;
  }
  return `${feet.toLocaleString()} feet`;
}

export function pronounceHeading(heading: number): string {
  return String(heading).padStart(3, '0').split('').join(' ');
}

export function pronounceFrequency(freq: number): string {
  const parts = freq.toFixed(3).split('.');
  return `${parts[0]} point ${(parts[1] ?? '000').split('').join(' ')}`;
}
