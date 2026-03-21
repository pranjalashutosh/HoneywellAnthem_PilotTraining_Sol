// Floating ATC communication panel — shows voice transcripts and escalation messages.
// Positioned bottom-left over the PFD during interactive cockpit events.

import { useVoiceStore } from '@/stores/voice-store';

interface ATCCommunicationOverlayProps {
  escalationTriggered: boolean;
  escalationPrompt?: string;
  initialPrompt?: string;
}

export function ATCCommunicationOverlay({
  escalationTriggered,
  escalationPrompt,
  initialPrompt,
}: ATCCommunicationOverlayProps) {
  const transcriptHistory = useVoiceStore((s) => s.transcriptHistory);

  // Show the most recent 4 transcripts
  const recentTranscripts = transcriptHistory.slice(-4);

  return (
    <div className="absolute bottom-6 left-6 w-96 bg-slate-900/95 border-2 border-cyan-600/60 rounded-lg overflow-hidden shadow-2xl z-40 backdrop-blur-sm">
      <div className="bg-gradient-to-r from-cyan-900/50 to-transparent px-4 py-2.5 border-b border-cyan-700/40">
        <div className="text-cyan-300 text-sm font-mono tracking-widest font-bold">
          ATC COMMUNICATION
        </div>
      </div>

      <div className="p-3 space-y-2 max-h-36 overflow-auto">
        {initialPrompt && (
          <div className="bg-slate-800/60 border border-cyan-700/30 rounded-lg p-2.5 shadow-md">
            <div className="text-[10px] text-cyan-400/70 mb-1 font-mono tracking-wider">
              ATC:
            </div>
            <div className="text-white text-sm font-medium">{initialPrompt}</div>
          </div>
        )}

        {recentTranscripts.map((entry, i) => (
          <div
            key={i}
            className={`bg-slate-800/60 border rounded-lg p-2.5 shadow-md ${
              entry.speaker === 'atc'
                ? 'border-cyan-700/30'
                : 'border-green-700/30'
            }`}
          >
            <div
              className={`text-[10px] mb-1 font-mono tracking-wider ${
                entry.speaker === 'atc' ? 'text-cyan-400/70' : 'text-green-400/70'
              }`}
            >
              {entry.speaker === 'atc' ? 'ATC:' : 'PILOT:'}
            </div>
            <div className="text-white text-sm font-medium">{entry.text}</div>
          </div>
        ))}

        {escalationTriggered && escalationPrompt && (
          <div className="bg-red-950/60 border-2 border-red-600/60 rounded-lg p-2.5 animate-pulse shadow-md">
            <div className="text-[10px] text-red-300 mb-1 font-mono tracking-wider font-bold">
              ATC URGENT:
            </div>
            <div className="text-white text-sm font-medium">
              {escalationPrompt}
            </div>
          </div>
        )}

        {!initialPrompt && recentTranscripts.length === 0 && !escalationTriggered && (
          <div className="text-cyan-400/50 text-sm text-center py-3 font-mono">
            Monitoring...
          </div>
        )}
      </div>
    </div>
  );
}
