// T2.7 + T9.2 + T9.4 + T9.5 + T9.6 — Status bar with degradation badges

import { useEffect, useState } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useVoiceStore } from '@/stores/voice-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { isSupabaseConfigured } from '@/lib/supabase';

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

function DegradationBadge({
  label,
  color,
}: {
  label: string;
  color: 'amber' | 'red' | 'cyan';
}) {
  const colorClass =
    color === 'amber'
      ? 'text-anthem-amber border-anthem-amber/30 bg-anthem-amber/5'
      : color === 'red'
        ? 'text-anthem-red border-anthem-red/30 bg-anthem-red/5'
        : 'text-anthem-cyan border-anthem-cyan/30 bg-anthem-cyan/5';

  return (
    <span
      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${colorClass}`}
    >
      {label}
    </span>
  );
}

export function StatusBar() {
  const utc = useUTCClock();
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const drillPhase = useScenarioStore((s) => s.phase);
  const livekitConnected = useVoiceStore((s) => s.livekitConnected);
  const baseline = useAssessmentStore((s) => s.cognitiveLoadBaseline);

  const hasLiveKitUrl = Boolean(import.meta.env.VITE_LIVEKIT_URL);
  const hasSupabase = isSupabaseConfigured();

  const drillLabel =
    drillPhase === 'idle'
      ? 'No Active Drill'
      : drillPhase.charAt(0).toUpperCase() + drillPhase.slice(1);

  // Calibration status for active drills
  const showCalibration = drillPhase !== 'idle' && baseline;
  const calibrationLabel = baseline
    ? baseline.isCalibrated
      ? 'Calibrated'
      : `Calibrating (${baseline.sampleCount}/10)`
    : null;

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

      <div className="flex items-center gap-3">
        {/* Degradation badges */}
        {!hasLiveKitUrl && <DegradationBadge label="Voice Unavailable" color="amber" />}
        {!hasSupabase && <DegradationBadge label="Offline Mode" color="amber" />}

        {/* Calibration status */}
        {showCalibration && calibrationLabel && (
          <span
            className={[
              'text-[10px] font-mono',
              baseline?.isCalibrated ? 'text-anthem-green' : 'text-anthem-amber',
            ].join(' ')}
          >
            {calibrationLabel}
          </span>
        )}

        <span className="text-anthem-text-muted">|</span>

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
