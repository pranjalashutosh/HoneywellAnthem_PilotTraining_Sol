// T6.12 — Push-to-talk button
// Press-and-hold with audio level visualization, disabled while ATC speaks

import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice-store';
import { sendPTTStart, sendPTTEnd } from '@/services/livekit-client';

export function PTTButton() {
  const isPTTPressed = useVoiceStore((s) => s.isPTTPressed);
  const isATCSpeaking = useVoiceStore((s) => s.isATCSpeaking);
  const livekitConnected = useVoiceStore((s) => s.livekitConnected);
  const pressPTT = useVoiceStore((s) => s.pressPTT);
  const releasePTT = useVoiceStore((s) => s.releasePTT);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const disabled = isATCSpeaking || !livekitConnected;

  const handlePressStart = useCallback(() => {
    if (disabled) return;
    pressPTT();
    sendPTTStart();
  }, [disabled, pressPTT]);

  const handlePressEnd = useCallback(() => {
    if (!isPTTPressed) return;
    releasePTT();
    sendPTTEnd();
  }, [isPTTPressed, releasePTT]);

  // Keyboard: spacebar as PTT
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isPTTPressed && !disabled) {
        e.preventDefault();
        handlePressStart();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPTTPressed) {
        e.preventDefault();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isPTTPressed, disabled, handlePressStart, handlePressEnd]);

  return (
    <button
      ref={buttonRef}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={(e) => {
        e.preventDefault();
        handlePressStart();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        handlePressEnd();
      }}
      disabled={disabled}
      className={[
        'w-full min-h-[64px] rounded-lg border-2 font-mono text-sm font-bold',
        'transition-all duration-100 select-none touch-none',
        'flex flex-col items-center justify-center gap-1',
        disabled
          ? 'border-anthem-text-muted text-anthem-text-muted cursor-not-allowed opacity-40'
          : isPTTPressed
            ? 'border-anthem-red bg-anthem-red/10 text-anthem-red shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'border-anthem-cyan bg-anthem-bg-tertiary text-anthem-cyan hover:bg-anthem-bg-secondary',
      ].join(' ')}
    >
      {/* Mic icon */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>

      <span>
        {disabled
          ? isATCSpeaking
            ? 'ATC SPEAKING'
            : 'OFFLINE'
          : isPTTPressed
            ? 'TRANSMITTING'
            : 'PUSH TO TALK'}
      </span>

      {!disabled && !isPTTPressed && (
        <span className="text-[10px] text-anthem-text-muted">
          Hold SPACE or press
        </span>
      )}

      {/* Audio level ring animation when recording */}
      {isPTTPressed && (
        <div className="absolute inset-0 rounded-lg border-2 border-anthem-red animate-ping opacity-20 pointer-events-none" />
      )}
    </button>
  );
}
