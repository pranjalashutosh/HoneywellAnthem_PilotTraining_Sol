// T5.13 + T7.4 — Post-drill summary with instructor override UI

import { useState } from 'react';
import { useScenarioStore } from '@/stores/scenario-store';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useUIStore } from '@/stores/ui-store';
import { AnthemButton } from '@/components/shared/AnthemButton';
import { getScoringFlags, getDrillCBTA } from '@/services/assessment-engine';
import * as api from '@/services/api-client';

export function DrillOutcome() {
  const drill = useScenarioStore((s) => s.activeDrill);
  const eventResults = useScenarioStore((s) => s.eventResults);
  const startTime = useScenarioStore((s) => s.startTime);
  const reset = useScenarioStore((s) => s.reset);
  const setShowAssessment = useUIStore((s) => s.setShowAssessment);
  const metrics = useAssessmentStore((s) => s.currentDrillMetrics);
  const sessionHistory = useAssessmentStore((s) => s.sessionHistory);

  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSaved, setOverrideSaved] = useState(false);

  if (!drill) return null;

  const totalEvents = drill.events.length;
  const successCount = eventResults.filter((r) => r.success).length;
  const elapsedSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  const { hasAbstained, hasUncertain, abstainedCount, uncertainCount } = getScoringFlags();
  const drillCBTA = getDrillCBTA();
  const overallScore = metrics?.overallScore ?? 0;

  // Get latest result ID for instructor override
  const latestResult = sessionHistory[sessionHistory.length - 1];

  const handleSaveOverride = async (action: string) => {
    if (!latestResult) return;
    try {
      await api.saveInstructorOverride(latestResult.id, {
        timestamp: Date.now(),
        action,
        notes: overrideNotes,
      });
      setOverrideSaved(true);
    } catch (err) {
      console.warn('[DrillOutcome] Override save failed:', err);
    }
  };

  const eventTypeLabel = (type: string) => {
    switch (type) {
      case 'atc_instruction': return 'ATC Communication';
      case 'decision_point': return 'Decision Point';
      case 'predict_suggestion': return 'PilotPredict Check';
      case 'cockpit_action': return 'Cockpit Action';
      default: return type;
    }
  };

  // Count ATC instruction events before a given index to map to readbackScores array
  const getReadbackIndex = (eventIndex: number) => {
    let atcCount = 0;
    for (let j = 0; j < eventIndex; j++) {
      if (drill.events[j]?.type === 'atc_instruction') atcCount++;
    }
    return atcCount;
  };

  // Check if all readback scores are manual (no voice data at all)
  const hasOnlyManualReadbacks =
    metrics != null &&
    metrics.readbackScores.length > 0 &&
    metrics.readbackScores.every((s) => s.scoringBasis === 'manual');

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="max-w-lg w-full rounded-lg border border-anthem-border bg-anthem-bg-secondary p-8">
        <h2 className="text-xl font-bold text-anthem-text-primary mb-1">
          Drill Complete
        </h2>
        <p className="text-sm text-anthem-text-secondary mb-6">
          {drill.title}
        </p>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-anthem-bg-tertiary p-3 text-center">
            <div className="text-2xl font-mono font-bold text-anthem-cyan">
              {successCount}/{totalEvents}
            </div>
            <div className="text-[10px] text-anthem-text-secondary uppercase">Events Passed</div>
          </div>
          <div className="rounded-lg bg-anthem-bg-tertiary p-3 text-center">
            <div className="text-2xl font-mono font-bold text-anthem-text-primary">
              {minutes}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-anthem-text-secondary uppercase">Elapsed</div>
          </div>
          <div className="rounded-lg bg-anthem-bg-tertiary p-3 text-center">
            <div className="text-2xl font-mono font-bold text-anthem-green">
              {overallScore}
            </div>
            <div className="text-[10px] text-anthem-text-secondary uppercase">Score</div>
          </div>
        </div>

        {/* CBTA Competency Chips */}
        {drillCBTA && (
          <div className="flex flex-wrap gap-2 mb-6">
            {drill.competencies.map((comp) => (
              <div
                key={comp}
                className="flex items-center gap-1.5 rounded border border-anthem-border bg-anthem-bg-tertiary px-2 py-1"
              >
                <span className="text-[10px] font-mono text-anthem-text-secondary">{comp}</span>
                <span className="text-xs font-mono font-bold text-anthem-cyan">
                  {drillCBTA[comp]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Readback Score Details */}
        {metrics && metrics.readbackScores.length > 0 && (
          <div className="mb-4 rounded border border-anthem-border bg-anthem-bg-tertiary p-3">
            <div className="text-[10px] font-mono text-anthem-text-secondary uppercase mb-2">
              Readback Assessment
            </div>
            {metrics.readbackScores.map((score, i) => (
              <div key={i} className="flex items-center justify-between text-xs mb-1">
                <span className="text-anthem-text-secondary">Readback {i + 1}</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-anthem-text-primary">
                    {score.confidenceAdjustedAccuracy.toFixed(0)}%
                  </span>
                  <span className="text-anthem-text-muted">
                    WER {(score.estimatedWER * 100).toFixed(1)}%
                  </span>
                  <span
                    className={
                      score.scoringBasis === 'confident'
                        ? 'text-anthem-green'
                        : score.scoringBasis === 'manual'
                          ? 'text-anthem-cyan'
                          : score.scoringBasis === 'uncertain'
                            ? 'text-anthem-amber'
                            : 'text-anthem-red'
                    }
                  >
                    {score.scoringBasis.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual assessment note — shown when all readbacks used keyboard fallback */}
        {hasOnlyManualReadbacks && (
          <div className="mb-4 rounded border border-anthem-cyan/30 bg-anthem-cyan/5 p-3">
            <span className="text-xs text-anthem-cyan font-bold">
              Manual Assessment
            </span>
            <p className="text-[10px] text-anthem-text-secondary mt-1">
              Readback scores based on self-reported accuracy (keyboard fallback). Connect voice for AI-assessed scoring.
            </p>
          </div>
        )}

        {/* Instructor Override UI — only for voice-based uncertain/abstained, not manual */}
        {(hasAbstained || hasUncertain) && !hasOnlyManualReadbacks && !overrideSaved && (
          <div
            className={[
              'mb-6 rounded border p-4',
              hasAbstained
                ? 'border-anthem-red/50 bg-anthem-red/5'
                : 'border-anthem-amber/50 bg-anthem-amber/5',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={[
                  'w-2 h-2 rounded-full',
                  hasAbstained ? 'bg-anthem-red' : 'bg-anthem-amber',
                ].join(' ')}
              />
              <span
                className={[
                  'text-xs font-bold',
                  hasAbstained ? 'text-anthem-red' : 'text-anthem-amber',
                ].join(' ')}
              >
                {hasAbstained
                  ? `Score Withheld — ${abstainedCount} readback(s) below quality threshold`
                  : `Instructor Review Recommended — ${uncertainCount} uncertain readback(s)`}
              </span>
            </div>
            <p className="text-xs text-anthem-text-secondary mb-3">
              {hasAbstained
                ? 'Transcript quality too low for reliable automated scoring. Instructor review required before scores contribute to competency assessment.'
                : 'Some readback scores have moderate confidence. Instructor may override AI assessment if needed.'}
            </p>

            <textarea
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              placeholder="Instructor notes (optional)..."
              className="w-full rounded border border-anthem-border bg-anthem-bg-input text-anthem-text-primary text-xs p-2 mb-3 min-h-[60px] resize-none"
            />

            <div className="flex gap-2">
              <AnthemButton
                variant="success"
                compact
                className="flex-1 text-xs"
                onClick={() => void handleSaveOverride('accept_ai_score')}
              >
                Accept AI Score
              </AnthemButton>
              <AnthemButton
                variant="warning"
                compact
                className="flex-1 text-xs"
                onClick={() => void handleSaveOverride('mark_for_review')}
              >
                Flag for Review
              </AnthemButton>
            </div>
          </div>
        )}

        {overrideSaved && (
          <div className="mb-6 rounded border border-anthem-green/50 bg-anthem-green/5 p-3">
            <span className="text-xs text-anthem-green font-bold">
              Instructor override saved
            </span>
          </div>
        )}

        {/* Event Results */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-anthem-text-secondary mb-3 uppercase tracking-wider">
            Event Results
          </h3>
          <div className="space-y-2">
            {drill.events.map((event, i) => {
              const result = eventResults.find((r) => r.eventIndex === i);

              // Per-event detail: readback accuracy or cockpit action timing
              let detailElement: React.ReactNode = null;
              if (result && event.type === 'atc_instruction' && metrics) {
                const rbIdx = getReadbackIndex(i);
                const readback = metrics.readbackScores[rbIdx];
                if (readback) {
                  detailElement = readback.scoringBasis === 'manual' ? (
                    <span className="text-anthem-cyan text-[10px] font-mono">MANUAL</span>
                  ) : (
                    <span className="text-anthem-text-muted text-[10px] font-mono">
                      {readback.confidenceAdjustedAccuracy.toFixed(0)}%
                    </span>
                  );
                }
              } else if (result && event.type === 'cockpit_action') {
                const time = result.details.timeToComplete as number | undefined;
                if (time && time > 0) {
                  detailElement = (
                    <span className="text-anthem-text-muted text-[10px] font-mono">
                      {(time / 1000).toFixed(1)}s
                    </span>
                  );
                }
              } else if (result && event.type === 'decision_point') {
                const time = result.details.timeToDecision as number | undefined;
                if (time && time > 0) {
                  detailElement = (
                    <span className="text-anthem-text-muted text-[10px] font-mono">
                      {(time / 1000).toFixed(1)}s
                    </span>
                  );
                }
              }

              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-anthem-border bg-anthem-bg-tertiary px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-anthem-cyan/10 text-anthem-cyan flex items-center justify-center text-[10px] font-mono shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-anthem-text-primary">
                      {eventTypeLabel(event.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {detailElement}
                    <span
                      className={`text-xs font-mono ${
                        result?.success
                          ? 'text-anthem-green'
                          : result
                            ? 'text-anthem-red'
                            : 'text-anthem-text-secondary'
                      }`}
                    >
                      {result?.success ? 'PASS' : result ? 'FAIL' : 'SKIP'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <AnthemButton
            variant="primary"
            className="flex-1"
            onClick={() => {
              setShowAssessment(true);
              reset();
            }}
          >
            View Dashboard
          </AnthemButton>
          <AnthemButton
            variant="warning"
            className="flex-1"
            onClick={reset}
          >
            Try Again
          </AnthemButton>
        </div>
      </div>
    </div>
  );
}
