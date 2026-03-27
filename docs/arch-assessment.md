# Assessment Engine Architecture

Readback scoring, voice biomarkers, cognitive load measurement, and CBTA competency mapping.

---

## Readback Scoring — Confidence-Weighted

Uses confidence-weighted fuzzy token comparison. Deepgram's per-word confidence scores prevent STT errors from being scored as pilot errors. See `Metrics_research.md` for full empirical justification.

```typescript
interface ReadbackScore {
  rawAccuracy: number;
  confidenceAdjustedAccuracy: number;
  latency: LatencyDecomposition;
  phraseology: number;
  callsignCorrect: boolean;
  transcriptConfidence: number;
  estimatedWER: number;
  scoringBasis: 'confident' | 'uncertain' | 'abstained';
  uncertainElements: UncertainElement[];
  criticalElements: {
    element: string;
    matched: boolean;
    weight: number;
    matchConfidence: number;
    discounted: boolean;
  }[];
}

interface UncertainElement {
  element: string;
  transcribedAs: string;
  confidence: number;
  flaggedForReview: boolean;
}
```

**Confidence tiers** (applied in Python agent `agent/assessment.py` via `_confidence_weighted_match()`):

| Tier | Deepgram Confidence | Scoring Treatment |
|------|-------------------|-------------------|
| High | >= 0.85 | Full weight (1.0x) in scoring |
| Medium | 0.60-0.84 | Half weight (0.5x) |
| Low | < 0.60 | Excluded (0.0x), flagged for instructor review |

**Browser-side scoring basis** (in `lib/scoring.ts`): The browser determines whether to trust the transcript before displaying results:
- `confident`: mean confidence >= 0.50 AND <= 40% low-confidence words
- `uncertain`: below confident threshold
- `abstained`: mean < 0.35 OR > 60% low-confidence words → score NOT counted toward CBTA rollup

Note: The confidence-weighted token matching happens server-side in the Python agent. The browser receives pre-scored results and only determines the display scoring basis.

**Estimated WER per transcript:**
```
estimatedWER ≈ Σ(1 - confidence_i) / totalWords
```

**Scoring algorithm:**
1. Tokenize expected readback and actual transcript (with confidence annotations)
2. Identify critical elements (altitudes, headings, frequencies, callsign) — weight 2x
3. Run LCS on token sequences
4. Weight each token match/mismatch by its confidence tier
5. Low-confidence mismatches → zero penalty (likely STT error)
6. High-confidence mismatches → full penalty (likely pilot error)
7. Apply phraseology bonus for standard ICAO phrasing
8. Deduct for incorrect or omitted callsign
9. Report both raw and confidence-adjusted scores

---

## Voice Biomarker Extraction — Cognitive Load Measurement

All voice biomarker extraction happens in the Python agent via librosa and numpy. See `Metrics_research.md` for complete empirical evidence and weight derivation.

**Audio capture pipeline:**
```
LiveKit Room → Agent Worker receives pilot's audio track
  ├── Audio → Deepgram Nova-2 STT (streaming, per-word confidence + timestamps)
  └── Raw audio frames → librosa (F0, RMS, MFCC, spectral extraction)
                        → numpy (smoothing, octave correction)
                        → Assessment scores → data channel → browser
```

**Extraction methods (all in `agent/voice_analysis.py`):**
- **F0 extraction:** `librosa.yin()` or `librosa.pyin()` on raw PCM (16kHz)
- **RMS intensity:** `librosa.feature.rms()`
- **MFCC:** `librosa.feature.mfcc()` for voice quality characterization
- **Spectral features:** `librosa.feature.spectral_centroid()`, `spectral_rolloff()`, `spectral_flatness()`

```typescript
interface VoiceBiomarkers {
  f0Mean: number;
  f0Peak: number;
  f0Range: number;
  f0Std: number;
  vocalIntensityRMS: number;
  speechRateWPM: number;
  articulationRateWPM: number;
  disfluencyCount: number;
  disfluencyRate: number;
  utteranceDurationMs: number;
}

interface CognitiveLoadBaseline {
  pilotId: string;
  sampleCount: number;
  f0Mean: number; f0Std: number; f0RangeMean: number;
  intensityMean: number; intensityStd: number;
  speechRateMean: number; speechRateStd: number;
  disfluencyRateMean: number; disfluencyRateStd: number;
  isCalibrated: boolean;
}

interface CognitiveLoadScore {
  eventIndex: number;
  biomarkers: VoiceBiomarkers;
  deviations: {
    f0Deviation: number;
    intensityDeviation: number;
    speechRateDeviation: number;
    f0RangeDeviation: number;
    disfluencyDeviation: number;
  };
  compositeLoad: number;
  confidence: number;
  calibrationStatus: 'uncalibrated' | 'partial' | 'calibrated';
}
```

**Composite load weights:** F0 deviation 0.35, disfluency rate 0.25, F0 range narrowing 0.15, speech rate decrease 0.15, vocal intensity 0.10. Derived from relative evidence strength — see `Metrics_research.md` Section 1.6.

**Calibration:** A dedicated pre-drill calibration flow (`CalibrationView.tsx`) runs before the pilot's first drill. The pilot reads 5 standard ATC phrases while a real-time VU meter provides visual mic feedback. After 5 phrases → partial baseline (confidence 0.3-0.65). After 10+ utterances → calibrated (confidence 0.7-1.0). Baseline is stored per-pilot in Supabase PostgreSQL and restored to the Python agent on LiveKit reconnect via the `SET_BASELINE` data channel message.

---

## CBTA Competency Mapping

Each drill maps to 2-3 CBTA competencies. Individual event scores roll up into competency scores:

| Competency | Code | Measured By |
|-----------|------|-------------|
| Communication | COM | Confidence-adjusted readback accuracy, phraseology, callsign usage, response latency |
| Workload Management | WLM | Task completion time, cognitive load composite (inverted), sequential task ordering |
| Situational Awareness | SAW | Decision correctness with conflicting information, PilotPredict trap detection, cognitive load context |
| Knowledge | KNO | Procedural correctness, PilotPredict trap detection, holding pattern entry |
| Problem Solving & Decision Making | PSD | Decision correctness, time-to-decision, clarification requests |
| Flight Path Management | FPM | Flight plan modifications, altitude/heading selections, mode selections |

**Aggregation:** Weighted rolling average (exponential decay, 0.95^(N-i)) across last 20 drill attempts. Stored server-side in Supabase PostgreSQL. Radar chart displays all six competencies with optional population P25/P75 overlay.

---

## Decision & Trap Scoring

```typescript
interface DecisionScore {
  correct: boolean;
  timeToDecision: number;
  timedOut: boolean;
  optionSelected: string;
}

interface TrapScore {
  detected: boolean;
  timeToReject: number;
  acceptedWrong: boolean;
}
```
