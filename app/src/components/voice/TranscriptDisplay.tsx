// T6.13 — Transcript display
// Live interim transcript, final with confidence-colored words
// Green >= 0.85, Amber 0.60-0.84, Dim < 0.60

import { useRef, useEffect } from 'react';
import { useVoiceStore } from '@/stores/voice-store';
import type { TranscriptEntry, ConfidenceAnnotatedWord } from '@/types';

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-anthem-green';
  if (confidence >= 0.60) return 'text-anthem-amber';
  return 'text-anthem-text-muted';
}

function ConfidenceWord({ word }: { word: ConfidenceAnnotatedWord }) {
  return (
    <span
      className={`${getConfidenceColor(word.confidence)} font-mono`}
      title={`Confidence: ${(word.confidence * 100).toFixed(0)}%`}
    >
      {word.word}{' '}
    </span>
  );
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isATC = entry.speaker === 'atc';

  return (
    <div className="py-1.5 px-2">
      <div className="flex items-start gap-2">
        {/* Speaker label */}
        <span
          className={[
            'text-[10px] font-mono font-bold uppercase shrink-0 mt-0.5 w-10',
            isATC ? 'text-anthem-cyan' : 'text-anthem-green',
          ].join(' ')}
        >
          {isATC ? 'ATC' : 'PLT'}
        </span>

        {/* Transcript text */}
        <div className="text-sm leading-relaxed">
          {entry.isFinal && entry.words.length > 0 ? (
            entry.words.map((w, i) => <ConfidenceWord key={i} word={w} />)
          ) : (
            <span className={isATC ? 'text-anthem-text-primary' : 'text-anthem-text-secondary'}>
              {entry.text}
            </span>
          )}
        </div>
      </div>

      {/* Confidence indicator for pilot transcripts */}
      {!isATC && entry.isFinal && entry.meanConfidence > 0 && (
        <div className="ml-12 mt-0.5">
          <span
            className={[
              'text-[10px] font-mono',
              getConfidenceColor(entry.meanConfidence),
            ].join(' ')}
          >
            {(entry.meanConfidence * 100).toFixed(0)}% confidence
          </span>
        </div>
      )}
    </div>
  );
}

export function TranscriptDisplay() {
  const transcriptHistory = useVoiceStore((s) => s.transcriptHistory);
  const interimTranscript = useVoiceStore((s) => s.interimTranscript);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptHistory, interimTranscript]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto border border-anthem-border rounded bg-anthem-bg-primary"
    >
      {transcriptHistory.length === 0 && !interimTranscript ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-anthem-text-muted text-xs font-mono">
            Waiting for communication...
          </span>
        </div>
      ) : (
        <div className="divide-y divide-anthem-border/50">
          {transcriptHistory.map((entry) => (
            <TranscriptLine key={entry.id} entry={entry} />
          ))}

          {/* Interim (live) transcript */}
          {interimTranscript && (
            <div className="py-1.5 px-2 opacity-60">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-bold uppercase shrink-0 mt-0.5 w-10 text-anthem-green">
                  PLT
                </span>
                <span className="text-sm text-anthem-text-secondary italic">
                  {interimTranscript}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
