// T6.14 — Voice status indicators
// Connection, recording, ATC speaking states

import { useVoiceStore } from '@/stores/voice-store';

export function VoiceStatus() {
  const livekitConnected = useVoiceStore((s) => s.livekitConnected);
  const isRecording = useVoiceStore((s) => s.isRecording);
  const isATCSpeaking = useVoiceStore((s) => s.isATCSpeaking);

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      {/* Connection indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={[
            'w-2 h-2 rounded-full',
            livekitConnected ? 'bg-anthem-green animate-pulse' : 'bg-anthem-text-muted',
          ].join(' ')}
        />
        <span className="text-anthem-text-secondary">
          {livekitConnected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-anthem-red animate-pulse" />
          <span className="text-anthem-red">REC</span>
        </div>
      )}

      {/* ATC speaking indicator */}
      {isATCSpeaking && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-anthem-cyan animate-pulse" />
          <span className="text-anthem-cyan">ATC</span>
        </div>
      )}
    </div>
  );
}
