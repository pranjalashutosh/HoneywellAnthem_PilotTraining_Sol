// Phase 9 — Free Talk Panel: active controller display, transcript, PTT, end session

import { useEffect, useRef } from 'react';
import { useFreeTalkStore } from '@/stores/freetalk-store';
import { useCockpitStore } from '@/stores/cockpit-store';
import { useFreeTalkSync } from '@/hooks/useFreeTalkSync';
import { PTTButton } from '@/components/voice/PTTButton';

export function FreeTalkPanel() {
  useFreeTalkSync();

  const activePersonaId = useFreeTalkStore((s) => s.activePersonaId);
  const personas = useFreeTalkStore((s) => s.personas);
  const conversationLog = useFreeTalkStore((s) => s.conversationLog);
  const stopFreeTalk = useFreeTalkStore((s) => s.stopFreeTalk);

  const activeFrequency = useCockpitStore((s) => s.activeFrequency);
  const standbyFrequency = useCockpitStore((s) => s.standbyFrequency);
  const swapFrequencies = useCockpitStore((s) => s.swapFrequencies);

  const activePersona = personas.find((p) => p.id === activePersonaId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationLog.length]);

  return (
    <div className="flex flex-col gap-3" style={{ height: '100%' }}>
      {/* Active Controller Header */}
      <div
        className="rounded-lg"
        style={{
          background: 'rgba(13,115,119,0.1)',
          border: '1px solid rgba(13,115,119,0.3)',
          padding: '10px 14px',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="animate-pulse"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#34d399',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#22d3ee',
              letterSpacing: '0.04em',
            }}
          >
            {activePersona?.facility ?? 'Unknown'}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {activePersona?.frequency.toFixed(3)} MHz
        </div>
      </div>

      {/* COM1/COM2 Row */}
      <div className="flex items-center gap-2">
        <FreqChip
          label="COM1"
          freq={activeFrequency.value}
          isActive={true}
        />
        <button
          onClick={swapFrequencies}
          className="transition-all active:scale-95 min-h-[36px] min-w-[36px]"
          style={{
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#22d3ee',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          SWAP
        </button>
        <FreqChip
          label="COM2"
          freq={standbyFrequency.value}
          isActive={false}
        />
      </div>

      {/* Conversation Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto rounded-lg"
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.04)',
          padding: '8px 10px',
          minHeight: 80,
          maxHeight: 200,
        }}
      >
        {conversationLog.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            Press PTT to talk to ATC
          </div>
        ) : (
          conversationLog.map((entry) => (
            <div key={entry.id} className="mb-2">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: entry.speaker === 'pilot' ? '#fbbf24' : '#22d3ee',
                }}
              >
                {entry.speaker === 'pilot' ? 'PILOT' : activePersona?.facility ?? 'ATC'}
              </span>
              <div
                style={{
                  fontSize: 12,
                  color: '#e0e8ec',
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {entry.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PTT Area */}
      <div className="flex justify-center">
        <PTTButton />
      </div>

      {/* End Session */}
      <button
        onClick={stopFreeTalk}
        className="w-full transition-all active:scale-[0.98] min-h-[40px]"
        style={{
          borderRadius: 6,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 16px',
        }}
      >
        End Free Talk
      </button>
    </div>
  );
}

function FreqChip({
  label,
  freq,
  isActive,
}: {
  label: string;
  freq: number;
  isActive: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-md"
      style={{
        padding: '6px 10px',
        background: isActive ? 'rgba(13,115,119,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isActive ? 'rgba(13,115,119,0.3)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 500,
          color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.4)',
        }}
      >
        {freq.toFixed(3)}
      </div>
    </div>
  );
}
