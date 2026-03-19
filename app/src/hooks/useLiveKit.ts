// T6.8 — LiveKit React hook
// Auto-connect on drill start, isConnected, connect, disconnect

import { useCallback, useEffect, useRef } from 'react';
import {
  connectToRoom,
  disconnect,
  isConnected as checkConnected,
  setDataHandler,
  type DataChannelMessage,
} from '@/services/livekit-client';
import { useVoiceStore } from '@/stores/voice-store';
import { useScenarioStore } from '@/stores/scenario-store';
import {
  processAssessmentResult,
  processBaselineUpdate,
} from '@/services/assessment-engine';
import type { TranscriptEntry, ConfidenceAnnotatedWord } from '@/types';
import {
  MSG_INTERIM_TRANSCRIPT,
  MSG_FINAL_TRANSCRIPT,
  MSG_ATC_SPEAK_END,
  MSG_ASSESSMENT_RESULT,
  MSG_BASELINE_UPDATE,
} from '@/services/livekit-client';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string | undefined;

export function useLiveKit() {
  const setLivekitConnected = useVoiceStore((s) => s.setLivekitConnected);
  const setInterimTranscript = useVoiceStore((s) => s.setInterimTranscript);
  const commitTranscript = useVoiceStore((s) => s.commitTranscript);
  const setATCSpeaking = useVoiceStore((s) => s.setATCSpeaking);
  const livekitConnected = useVoiceStore((s) => s.livekitConnected);

  const phase = useScenarioStore((s) => s.phase);
  const connectAttempted = useRef(false);

  // Handle incoming data channel messages from agent
  const handleDataMessage = useCallback(
    (message: DataChannelMessage) => {
      const { type, payload } = message;

      switch (type) {
        case MSG_INTERIM_TRANSCRIPT: {
          const text = payload.text as string;
          setInterimTranscript(text);
          break;
        }

        case MSG_FINAL_TRANSCRIPT: {
          const entry: TranscriptEntry = {
            id: crypto.randomUUID(),
            speaker: 'pilot',
            text: payload.text as string,
            words: (payload.words as ConfidenceAnnotatedWord[]) ?? [],
            timestamp: (payload.timestamp as number) ?? Date.now(),
            isFinal: true,
            meanConfidence: (payload.meanConfidence as number) ?? 0,
          };
          commitTranscript(entry);
          break;
        }

        case MSG_ATC_SPEAK_END: {
          setATCSpeaking(false);
          break;
        }

        case MSG_ASSESSMENT_RESULT: {
          processAssessmentResult(
            payload as unknown as Parameters<typeof processAssessmentResult>[0],
          );
          break;
        }

        case MSG_BASELINE_UPDATE: {
          processBaselineUpdate(
            payload as unknown as Parameters<typeof processBaselineUpdate>[0],
          );
          break;
        }

        default:
          console.warn('[useLiveKit] Unknown message type:', type);
      }
    },
    [setInterimTranscript, commitTranscript, setATCSpeaking],
  );

  // Auto-connect when drill becomes active
  useEffect(() => {
    if (phase === 'active' && !livekitConnected && !connectAttempted.current) {
      connectAttempted.current = true;

      if (!LIVEKIT_URL) {
        console.warn('[useLiveKit] VITE_LIVEKIT_URL not set, running without voice');
        return;
      }

      // Fetch token from Supabase Edge Function
      void (async () => {
        try {
          const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
          if (!isSupabaseConfigured()) {
            console.warn('[useLiveKit] Supabase not configured, skipping LiveKit');
            return;
          }

          const pilotStore = (await import('@/stores/pilot-store')).usePilotStore.getState();
          const scenarioStore = useScenarioStore.getState();

          const { data, error } = await supabase.functions.invoke('livekit-token', {
            body: {
              roomName: `drill-${scenarioStore.activeDrill?.id ?? 'unknown'}`,
              participantName: pilotStore.activePilot?.name ?? 'Pilot',
              pilotId: pilotStore.activePilot?.id ?? 'unknown',
            },
          });

          if (error || !data?.token) {
            console.error('[useLiveKit] Token fetch failed:', error);
            return;
          }

          setDataHandler(handleDataMessage);
          await connectToRoom(LIVEKIT_URL, data.token as string);
          setLivekitConnected(true);

          // Send stored baseline to agent if available
          const { useAssessmentStore } = await import('@/stores/assessment-store');
          const baseline = useAssessmentStore.getState().cognitiveLoadBaseline;
          if (baseline && baseline.sampleCount > 0) {
            const { sendBaseline } = await import('@/services/livekit-client');
            sendBaseline(baseline as unknown as Record<string, unknown>);
          }
        } catch (err) {
          console.error('[useLiveKit] Connection failed:', err);
          connectAttempted.current = false;
        }
      })();
    }

    // Disconnect when drill ends
    if (phase === 'idle' && livekitConnected) {
      connectAttempted.current = false;
      void disconnect().then(() => setLivekitConnected(false));
    }
  }, [phase, livekitConnected, setLivekitConnected, handleDataMessage]);

  const connect = useCallback(
    async (url: string, token: string) => {
      setDataHandler(handleDataMessage);
      await connectToRoom(url, token);
      setLivekitConnected(true);
    },
    [setLivekitConnected, handleDataMessage],
  );

  const disconnectRoom = useCallback(async () => {
    await disconnect();
    setLivekitConnected(false);
    connectAttempted.current = false;
  }, [setLivekitConnected]);

  return {
    isConnected: checkConnected(),
    livekitConnected,
    connect,
    disconnect: disconnectRoom,
  };
}
