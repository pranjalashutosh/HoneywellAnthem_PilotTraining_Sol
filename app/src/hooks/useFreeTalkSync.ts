// Phase 8 — Sync COM frequency swaps to Free Talk persona switching

import { useEffect, useRef } from 'react';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useFreeTalkStore } from '@/stores/freetalk-store';
import { sendSetPersona } from '@/services/livekit-client';

export function useFreeTalkSync(): void {
  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const freetalkPhase = useFreeTalkStore((s) => s.phase);
  const personas = useFreeTalkStore((s) => s.personas);
  const prevFreqRef = useRef(activeFrequency.value);

  useEffect(() => {
    if (freetalkPhase !== 'active') return;
    if (activeFrequency.value === prevFreqRef.current) return;

    prevFreqRef.current = activeFrequency.value;

    // Send persona switch to agent
    sendSetPersona(activeFrequency.value);

    // Update local store
    const matched = personas.find(
      (p) => Math.abs(p.frequency - activeFrequency.value) < 0.001,
    );
    if (matched) {
      useFreeTalkStore.getState().setActivePersona(matched.id);
    }
  }, [activeFrequency.value, freetalkPhase, personas]);
}
