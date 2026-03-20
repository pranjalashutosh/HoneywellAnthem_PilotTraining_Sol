// Active drill view — renders current event, handles interaction

import { useDrillRunner } from '@/hooks/useDrillRunner';
import { DrillTimer } from './DrillTimer';
import { DecisionPrompt } from './DecisionPrompt';
import { AnthemButton } from '@/components/shared/AnthemButton';
import { evaluatePredictResponse } from '@/services/pilot-predict';
import { VoicePanel } from '@/components/voice/VoicePanel';
import { useVoiceStore } from '@/stores/voice-store';
import { useATCEngine } from '@/hooks/useATCEngine';
import type { DecisionPointEvent, PredictSuggestionEvent, ATCInstructionEvent } from '@/types';
import { useState, useEffect, useRef } from 'react';

export function DrillActiveView() {
  const {
    activeDrill,
    currentEvent,
    currentEventIndex,
    phase,
    startTime,
    recordResult,
    advance,
    complete,
  } = useDrillRunner();

  const livekitConnected = useVoiceStore((s) => s.livekitConnected);
  const { speakATCInstruction } = useATCEngine();
  const [predictHandled, setPredictHandled] = useState(false);
  const atcSpokenRef = useRef<number>(-1);

  // Trigger ATC TTS when an atc_instruction event becomes active and LiveKit is connected
  useEffect(() => {
    if (currentEvent?.type === 'atc_instruction') {
      console.info('[DrillActiveView] ATC event detected — index=%d, livekit=%s, alreadySpoken=%s',
        currentEventIndex, livekitConnected, atcSpokenRef.current === currentEventIndex);
    }

    if (
      currentEvent?.type === 'atc_instruction' &&
      livekitConnected &&
      atcSpokenRef.current !== currentEventIndex
    ) {
      atcSpokenRef.current = currentEventIndex;
      const atcEvent = currentEvent as ATCInstructionEvent;
      console.info('[DrillActiveView] Triggering speakATCInstruction for event %d', currentEventIndex);
      speakATCInstruction(atcEvent.prompt, atcEvent.keywords).catch((err) =>
        console.error('[DrillActiveView] speakATCInstruction failed:', err),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent, currentEventIndex, livekitConnected]);

  if (!activeDrill || !currentEvent || !startTime) return null;

  const totalEvents = activeDrill.events.length;
  const isLastEvent = currentEventIndex >= totalEvents - 1;

  const handleAdvanceOrComplete = () => {
    if (isLastEvent) {
      complete();
    } else {
      setPredictHandled(false);
      advance();
    }
  };

  // Decision point handled via DecisionPrompt overlay
  if (phase === 'decision' && currentEvent.type === 'decision_point') {
    const decisionEvent = currentEvent as DecisionPointEvent;
    return (
      <div className="flex-1 relative">
        <DrillHUD
          drill={activeDrill.title}
          eventIndex={currentEventIndex}
          totalEvents={totalEvents}
          startTime={startTime}
          duration={activeDrill.duration}
        />
        <DecisionPrompt
          event={decisionEvent}
          onDecide={(optionId, timedOut) => {
            recordResult({
              eventType: 'decision_point',
              success: optionId === decisionEvent.correctOptionId,
              details: { optionId, timedOut, correct: decisionEvent.correctOptionId },
            });
            handleAdvanceOrComplete();
          }}
        />
      </div>
    );
  }

  // ATC Instruction event — voice mode or keyboard fallback
  if (currentEvent.type === 'atc_instruction') {
    // When LiveKit is connected, show voice panel alongside the ATC prompt
    if (livekitConnected) {
      return (
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <DrillHUD
              drill={activeDrill.title}
              eventIndex={currentEventIndex}
              totalEvents={totalEvents}
              startTime={startTime}
              duration={activeDrill.duration}
            />
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md w-full rounded-lg border border-[var(--anthem-border)] bg-[var(--anthem-bg-secondary)] p-6">
                <div className="text-xs text-[var(--anthem-cyan)] font-mono uppercase mb-2">
                  ATC Communication
                </div>
                <p className="text-sm text-[var(--anthem-text-primary)] mb-4">
                  {currentEvent.prompt}
                </p>
                <p className="text-xs text-[var(--anthem-text-secondary)] mb-4">
                  Use PTT (spacebar) to respond via voice.
                </p>
                <AnthemButton
                  variant="primary"
                  className="w-full"
                  onClick={handleAdvanceOrComplete}
                >
                  Continue
                </AnthemButton>
              </div>
            </div>
          </div>
          <VoicePanel />
        </div>
      );
    }

    // Keyboard fallback when voice is unavailable
    return (
      <div className="flex-1 flex flex-col">
        <DrillHUD
          drill={activeDrill.title}
          eventIndex={currentEventIndex}
          totalEvents={totalEvents}
          startTime={startTime}
          duration={activeDrill.duration}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border border-[var(--anthem-border)] bg-[var(--anthem-bg-secondary)] p-6">
            <div className="text-xs text-[var(--anthem-cyan)] font-mono uppercase mb-2">
              ATC Communication
            </div>
            <p className="text-sm text-[var(--anthem-text-primary)] mb-4">
              {currentEvent.prompt}
            </p>
            <p className="text-xs text-[var(--anthem-text-secondary)] mb-4">
              Voice unavailable — click to simulate readback response.
            </p>
            <div className="flex gap-3">
              <AnthemButton
                variant="success"
                className="flex-1"
                onClick={() => {
                  recordResult({
                    eventType: 'atc_instruction',
                    success: true,
                    details: { mode: 'keyboard-fallback' },
                  });
                  handleAdvanceOrComplete();
                }}
              >
                Readback Correct
              </AnthemButton>
              <AnthemButton
                variant="danger"
                onClick={() => {
                  recordResult({
                    eventType: 'atc_instruction',
                    success: false,
                    details: { mode: 'keyboard-fallback' },
                  });
                  handleAdvanceOrComplete();
                }}
              >
                Skip
              </AnthemButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PilotPredict trap event
  if (currentEvent.type === 'predict_suggestion') {
    const predictEvent = currentEvent as PredictSuggestionEvent;
    return (
      <div className="flex-1 flex flex-col">
        <DrillHUD
          drill={activeDrill.title}
          eventIndex={currentEventIndex}
          totalEvents={totalEvents}
          startTime={startTime}
          duration={activeDrill.duration}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border border-[var(--anthem-magenta)]/30 bg-[var(--anthem-bg-secondary)] p-6">
            <div className="text-xs text-[var(--anthem-magenta)] font-mono uppercase mb-2">
              PilotPredict Suggestion
            </div>
            <div className="rounded-lg bg-[var(--anthem-magenta)]/10 border border-[var(--anthem-magenta)]/20 p-3 mb-4">
              <p className="text-sm text-[var(--anthem-text-primary)] font-mono">
                {predictEvent.suggestion}
              </p>
            </div>
            {!predictHandled ? (
              <div className="flex gap-3">
                <AnthemButton
                  variant="success"
                  className="flex-1"
                  onClick={() => {
                    const result = evaluatePredictResponse(predictEvent, true);
                    recordResult({
                      eventType: 'predict_suggestion',
                      success: result.detected,
                      details: { accepted: true, ...result },
                    });
                    setPredictHandled(true);
                  }}
                >
                  Accept
                </AnthemButton>
                <AnthemButton
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    const result = evaluatePredictResponse(predictEvent, false);
                    recordResult({
                      eventType: 'predict_suggestion',
                      success: result.detected,
                      details: { accepted: false, ...result },
                    });
                    setPredictHandled(true);
                  }}
                >
                  Reject
                </AnthemButton>
              </div>
            ) : (
              <AnthemButton
                variant="primary"
                className="w-full"
                onClick={handleAdvanceOrComplete}
              >
                Continue
              </AnthemButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Cockpit action event
  if (currentEvent.type === 'cockpit_action') {
    return (
      <div className="flex-1 flex flex-col">
        <DrillHUD
          drill={activeDrill.title}
          eventIndex={currentEventIndex}
          totalEvents={totalEvents}
          startTime={startTime}
          duration={activeDrill.duration}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-lg border border-[var(--anthem-border)] bg-[var(--anthem-bg-secondary)] p-6">
            <div className="text-xs text-[var(--anthem-green)] font-mono uppercase mb-2">
              Cockpit Action Required
            </div>
            <p className="text-sm text-[var(--anthem-text-primary)] mb-4">
              {currentEvent.instruction}
            </p>
            <p className="text-xs text-[var(--anthem-text-secondary)] mb-4">
              Expected: {currentEvent.expectedAction.type} → {currentEvent.expectedAction.value}
            </p>
            <div className="flex gap-3">
              <AnthemButton
                variant="success"
                className="flex-1"
                onClick={() => {
                  recordResult({
                    eventType: 'cockpit_action',
                    success: true,
                    details: { mode: 'keyboard-fallback', action: currentEvent.expectedAction },
                  });
                  handleAdvanceOrComplete();
                }}
              >
                Action Complete
              </AnthemButton>
              <AnthemButton
                variant="danger"
                onClick={() => {
                  recordResult({
                    eventType: 'cockpit_action',
                    success: false,
                    details: { mode: 'keyboard-fallback', timedOut: true },
                  });
                  handleAdvanceOrComplete();
                }}
              >
                Skip
              </AnthemButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// HUD bar showing drill progress
function DrillHUD({
  drill,
  eventIndex,
  totalEvents,
  startTime,
  duration,
}: {
  drill: string;
  eventIndex: number;
  totalEvents: number;
  startTime: number;
  duration: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--anthem-border)] bg-[var(--anthem-bg-secondary)]">
      <div className="text-xs font-semibold text-[var(--anthem-text-primary)]">
        {drill}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-[var(--anthem-text-secondary)]">
          Event {eventIndex + 1}/{totalEvents}
        </span>
        <div className="w-24 h-1.5 rounded-full bg-[var(--anthem-bg-tertiary)] overflow-hidden">
          <div
            className="h-full bg-[var(--anthem-cyan)] rounded-full transition-all"
            style={{ width: `${((eventIndex + 1) / totalEvents) * 100}%` }}
          />
        </div>
        <DrillTimer startTime={startTime} durationSeconds={duration} mode="elapsed" />
      </div>
    </div>
  );
}
