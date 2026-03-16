// T2.7 — Status bar: UTC clock, active frequency, drill status, LiveKit connection dot

import { useEffect, useState } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useVoiceStore } from '@/stores/voice-store';

function useUTCClock() {
  const [time, setTime] = useState(() => formatUTC());
  useEffect(() => {
    const id = setInterval(() => setTime(formatUTC()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatUTC(): string {
  const d = new Date();
  return d.toISOString().slice(11, 19) + 'Z';
}

export function StatusBar() {
  const utc = useUTCClock();
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const drillPhase = useScenarioStore((s) => s.phase);
  const livekitConnected = useVoiceStore((s) => s.livekitConnected);

  const drillLabel =
    drillPhase === 'idle'
      ? 'No Active Drill'
      : drillPhase.charAt(0).toUpperCase() + drillPhase.slice(1);

  return (
    <footer className="flex items-center justify-between h-8 px-4 bg-anthem-bg-secondary border-t border-anthem-border text-xs">
      <div className="flex items-center gap-4">
        <span className="font-mono text-anthem-text-secondary">{utc}</span>
        <span className="text-anthem-text-muted">|</span>
        <span className="font-mono text-anthem-cyan">
          {activeFrequency.value.toFixed(3)}
        </span>
        <span className="text-anthem-text-muted">{activeFrequency.label}</span>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={
            drillPhase === 'idle'
              ? 'text-anthem-text-muted'
              : 'text-anthem-amber'
          }
        >
          {drillLabel}
        </span>
        <span className="text-anthem-text-muted">|</span>
        <span className="flex items-center gap-1.5">
          <span
            className={[
              'inline-block w-2 h-2 rounded-full',
              livekitConnected ? 'bg-anthem-green' : 'bg-anthem-text-muted',
            ].join(' ')}
          />
          <span className="text-anthem-text-muted">
            {livekitConnected ? 'Connected' : 'Offline'}
          </span>
        </span>
      </div>
    </footer>
  );
}
