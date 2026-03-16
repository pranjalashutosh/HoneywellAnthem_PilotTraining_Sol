// T6.11 — Voice panel (right-side during drills)
// Displays VoiceStatus, TranscriptDisplay, PTTButton

import { VoiceStatus } from './VoiceStatus';
import { PTTButton } from './PTTButton';
import { TranscriptDisplay } from './TranscriptDisplay';

export function VoicePanel() {
  return (
    <div className="flex flex-col h-full gap-3 p-3 bg-anthem-bg-secondary border-l border-anthem-border w-[320px]">
      {/* Header with status indicators */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-anthem-text-secondary uppercase tracking-wider">
          Voice Comm
        </h3>
        <VoiceStatus />
      </div>

      {/* Transcript area */}
      <TranscriptDisplay />

      {/* PTT button at bottom */}
      <div className="relative shrink-0">
        <PTTButton />
      </div>
    </div>
  );
}
