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
          id: drill.id,
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
        console.warn('[useATCEngine] No active drill — cannot speak ATC');
        return null;
      }

      console.info('[useATCEngine] speakATCInstruction called — drill=%s, prompt="%s"',
        drill.id, prompt.slice(0, 80));

      // Update keywords if provided
      if (keywords && keywords.length > 0) {
        console.info('[useATCEngine] Updating drill keywords: %d terms', keywords.length);
        updateDrillKeywords(keywords);
      }

      // Build ATC context from current state
      let context: ATCContext;
      try {
        context = buildContext(drill, prompt);
      } catch (err) {
        console.error('[useATCEngine] Failed to build ATC context:', err);
        return null;
      }

      // Mark ATC as speaking
      setATCSpeaking(true);
      console.info('[useATCEngine] ATC speaking = true, starting generation');

      // Generate and speak
      const instruction = await generateAndSpeakATCInstruction(context);

      if (!instruction) {
        console.warn('[useATCEngine] generateAndSpeakATCInstruction returned null');
        setATCSpeaking(false);
        return null;
      }

      // Safety timeout starts AFTER instruction is sent to agent (not before generation).
      // This gives the agent the full 30s for TTS playback + ATC_SPEAK_END delivery.
      setTimeout(() => {
        if (useVoiceStore.getState().isATCSpeaking) {
          console.warn('[useATCEngine] ATC speaking timeout (30s) — force resetting');
          setATCSpeaking(false);
        }
      }, 30_000);

      console.info('[useATCEngine] ATC instruction sent to agent — text: "%s"',
        instruction.instruction.slice(0, 80));

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
