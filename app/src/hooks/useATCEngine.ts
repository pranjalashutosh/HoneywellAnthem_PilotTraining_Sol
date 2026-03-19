// T6.10 — ATC engine React hook
// Wraps atc-engine service, handles assessment results from data channel

import { useCallback, useEffect } from 'react';
import { generateAndSpeakATCInstruction, updateDrillKeywords } from '@/services/atc-engine';
import { useVoiceStore } from '@/stores/voice-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useCockpitStore } from '@/stores/cockpit-store';
import type { ATCContext, ATCInstruction, TranscriptEntry, DrillDefinition } from '@/types';

export function useATCEngine() {
  const setATCSpeaking = useVoiceStore((s) => s.setATCSpeaking);
  const commitTranscript = useVoiceStore((s) => s.commitTranscript);

  // Listen for assessment results from data channel (dispatched by useLiveKit)
  useEffect(() => {
    const handleAssessment = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      // Assessment results are forwarded to stores by the drill runner
      console.info('[useATCEngine] Assessment received:', detail);
    };

    window.addEventListener('atc-assessment', handleAssessment);
    return () => window.removeEventListener('atc-assessment', handleAssessment);
  }, []);

  /**
   * Build ATC context from stores and drill definition.
   */
  const buildContext = useCallback(
    (drill: DrillDefinition, prompt: string): ATCContext => {
      const cockpit = useCockpitStore.getState();
      return {
        facility: drill.atcContext.facility,
        sector: drill.atcContext.sector,
        callsign: drill.atcContext.callsign,
        altitude: cockpit.altitude,
        heading: cockpit.heading,
        frequency: cockpit.activeFrequency.value,
        flightPhase: cockpit.selectedMode,
        conversationHistory: [],
        drill: {
          atcConstraints: prompt,
          traffic: drill.atcContext.traffic,
          weather: drill.atcContext.weather,
        },
      };
    },
    [],
  );

  /**
   * Trigger an ATC instruction: generate via Claude, send to agent for TTS.
   */
  const speakATCInstruction = useCallback(
    async (prompt: string, keywords?: string[]): Promise<ATCInstruction | null> => {
      const scenario = useScenarioStore.getState();
      const drill = scenario.activeDrill;

      if (!drill) {
        console.warn('[useATCEngine] No active drill');
        return null;
      }

      // Update keywords if provided
      if (keywords && keywords.length > 0) {
        updateDrillKeywords(keywords);
      }

      // Build ATC context from current state
      const context = buildContext(drill, prompt);

      // Mark ATC as speaking with safety timeout
      setATCSpeaking(true);
      const timeoutId = setTimeout(() => {
        if (useVoiceStore.getState().isATCSpeaking) {
          console.warn('[useATCEngine] ATC speaking timeout — resetting');
          setATCSpeaking(false);
        }
      }, 30_000);

      // Generate and speak
      const instruction = await generateAndSpeakATCInstruction(context);

      if (!instruction) {
        clearTimeout(timeoutId);
        setATCSpeaking(false);
        return null;
      }

      // Add ATC transcript entry
      const atcEntry: TranscriptEntry = {
        id: crypto.randomUUID(),
        speaker: 'atc',
        text: instruction.instruction,
        words: [],
        timestamp: Date.now(),
        isFinal: true,
        meanConfidence: 1.0,
      };
      commitTranscript(atcEntry);

      return instruction;
    },
    [setATCSpeaking, commitTranscript, buildContext],
  );

  return {
    speakATCInstruction,
    updateDrillKeywords,
  };
}
