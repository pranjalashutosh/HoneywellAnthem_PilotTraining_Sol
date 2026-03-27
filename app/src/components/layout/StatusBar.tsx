// Status bar with degradation badges — restyled with Graduate font and PFD palette.

import { useEffect, useState } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useVoiceStore } from '@/stores/voice-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { usePilotStore } from '@/stores/pilot-store';
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
        : 'text-[#4EFFFC] border-[#4EFFFC]/30 bg-[#4EFFFC]/5';

  return (
    <span
      className={`text-[9px] font-graduate uppercase px-1.5 py-0.5 rounded border ${colorClass}`}
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

  const activeDrill = useScenarioStore((s) => s.activeDrill);
  const activePilot = usePilotStore((s) => s.activePilot);

  // Calibration status for active drills
  const showCalibration = drillPhase !== 'idle' && baseline;
  const calibrationLabel = baseline
    ? baseline.isCalibrated
      ? 'Calibrated'
      : `Calibrating (${baseline.sampleCount}/10)`
    : null;

  return (
    <footer
      className="flex items-center justify-between h-8 px-4 border-t border-white/10 text-xs"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="flex items-center gap-4">
        <span className="font-graduate text-white/60">{utc}</span>
        <span className="text-white/20">|</span>
        <span className="font-graduate text-[#4EFFFC]">
          {activeFrequency.value.toFixed(3)}
        </span>
        <span className="text-white/40 font-graduate">{activeFrequency.label}</span>
        {activePilot && (
          <>
            <span className="text-white/20">|</span>
            <span className="font-graduate text-white/60">
              {activePilot.name}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Degradation badges */}
        {!hasLiveKitUrl && <DegradationBadge label="Voice Unavailable" color="amber" />}
        {!hasSupabase && <DegradationBadge label="Offline Mode" color="amber" />}

        {/* Calibration status */}
        {showCalibration && calibrationLabel && (
          <span
            className={[
              'text-[10px] font-graduate',
              baseline?.isCalibrated ? 'text-anthem-green' : 'text-anthem-amber',
            ].join(' ')}
          >
            {calibrationLabel}
          </span>
        )}

        <span className="text-white/20">|</span>

        {drillPhase !== 'idle' && activeDrill ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-anthem-green animate-pulse" />
            <span className="text-anthem-green font-graduate text-[10px]">
              {activeDrill.title}
            </span>
          </span>
        ) : (
          <span className="text-white/40 font-graduate">No Active Drill</span>
        )}
        <span className="text-white/20">|</span>
        <span className="flex items-center gap-1.5">
          <span
            className={[
              'inline-block w-2 h-2 rounded-full',
              livekitConnected ? 'bg-anthem-green' : 'bg-white/30',
            ].join(' ')}
          />
          <span className="text-white/40 font-graduate">
            {livekitConnected ? 'Connected' : 'Offline'}
          </span>
        </span>
      </div>
    </footer>
  );
}
