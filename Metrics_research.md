# Assessment Metrics — Empirical Evidence & Research Foundation

This document provides the empirical backing for every metric the Anthem training prototype's assessment engine measures. Each metric traces to peer-reviewed research, validated aviation projects, or regulatory frameworks. Thresholds are justified with specific data. Limitations are disclosed honestly.

**Purpose:** Prove that the objective feedback metrics in this assessment tool produce real, defensible value — not vanity scores.

**Evidence standard:** Only metrics with empirical validation in aviation or adjacent high-workload domains are included. No metric is adopted on intuition alone.

---

## 1. Voice-Based Cognitive Load Biomarkers

### 1.1 Fundamental Frequency (F0) — Mean Shift

**What it measures:** The average pitch of a speaker's voice. Vocal fold tension increases under cognitive load and stress, raising F0. This is an involuntary physiological response — pilots cannot consciously suppress it.

**Research evidence:**

| Study | Sample | Finding | Effect Size |
|-------|--------|---------|-------------|
| Huttunen et al. (2011) | 13 military pilots, real flight | F0 mean increased **+7 Hz** under cognitive load | Statistically significant within-speaker |
| Huttunen et al. (2011) | Same cohort | F0 peak increased **+12 Hz** during intensive flight phases | Higher effect in high-workload segments |
| Bittner, Begault & Christopher (2013) | NASA Ames study | Significantly higher F0 during high-workload ATC readback tasks | Confirmed F0-workload correlation |
| Johnstone & Scherer (2004) | Meta-analysis of stress/voice research | F0 elevation is the most consistently reported acoustic correlate of stress | Cross-study replication |

**Threshold used:** Deviation > 1.0 standard deviations above the pilot's own baseline F0 mean indicates elevated cognitive load. This threshold is derived from the Huttunen finding that +7 Hz mean shift is typical under load, and that individual F0 ranges vary (male ~85-180 Hz, female ~165-255 Hz), making absolute thresholds meaningless.

**Why per-speaker baseline is mandatory:** Bittner et al. (2013) at NASA Ames found **no correlation between subjective workload ratings and acoustic measures across individuals**. The Magnusdottir et al. (2022) study of 97 university participants and 20 airline pilots confirmed: **individual differences remain the primary limiting factor for generic classification** (misclassification rates of 15.17% for university cohort, 17.38% for airline pilots in trinary workload classification). Cross-individual F0 comparison is scientifically invalid. Only within-speaker deviation from baseline is meaningful.

**Our implementation:** YIN algorithm extracts F0 from raw PCM audio captured via Web Audio API AudioWorkletNode during PTT. 16kHz sample rate, 2048-sample analysis window (~128ms), 512-sample hop (~32ms). Baseline established from the pilot's first 10 utterances. All subsequent F0 scores are z-scores relative to that pilot's own baseline.

**Limitation:** The YIN algorithm requires voiced speech segments. Unvoiced consonants, silence, and background noise produce no valid F0 frames. If more than 30% of frames in an utterance are invalid, the F0 measurement confidence is reduced by 50%. Browser microphone quality varies — desktop studio mics produce cleaner F0 than laptop built-in mics. The research was conducted with high-quality recording equipment; browser audio introduces additional noise that may degrade precision.

---

### 1.2 Fundamental Frequency (F0) — Range Narrowing

**What it measures:** The spread between the highest and lowest pitch in an utterance. Under high cognitive load, speakers tend to produce flatter, more monotone speech — the F0 range narrows.

**Research evidence:**

| Study | Finding |
|-------|---------|
| Huttunen et al. (2011) | F0 range narrowed by **~5 Hz** during high-workload flight phases |
| Springer (2018) | Confirmed reduced prosodic variation under cognitive load |

**Threshold used:** F0 range decrease > 1.0 standard deviations below the pilot's baseline range mean indicates load. Combined with F0 mean shift, this provides a two-dimensional pitch signature of cognitive load.

**Limitation:** Short utterances (< 2 seconds) may naturally have narrow F0 range regardless of cognitive state. Aviation readbacks are often brief. The scoring engine discounts F0 range narrowing for utterances with fewer than 5 Deepgram-recognized words.

---

### 1.3 Vocal Intensity (Loudness)

**What it measures:** RMS (Root Mean Square) amplitude of the voice signal, converted to dB. Speakers tend to speak slightly louder under stress — the Lombard effect combined with arousal-driven vocal effort.

**Research evidence:**

| Study | Finding |
|-------|---------|
| Huttunen et al. (2011) | Vocal intensity increased **+1.0 to +1.5 dB** under cognitive load |

**Threshold used:** Intensity increase > 1.0 standard deviations above baseline.

**Why the weight is low (0.10):** The 1-1.5 dB range is narrow and highly sensitive to microphone distance, gain settings, and ambient noise. In a browser prototype without controlled recording conditions, intensity is the least reliable biomarker. It is included because it is trivial to compute (RMS is a single line of code) and provides a weak corroborating signal, but it receives the lowest weight in the composite score.

**Limitation:** Microphone distance changes between PTT presses can produce intensity variation that has nothing to do with cognitive load. Automatic gain control (AGC) in browser audio pipelines may normalize intensity, further reducing its discriminative value. This metric should never be used in isolation.

---

### 1.4 Speech Disfluencies

**What it measures:** Filled pauses ("um," "uh," "er," "ah"), word repetitions, and self-corrections that interrupt fluent speech. These increase under cognitive load as the speaker's language production system struggles to keep pace with processing demands.

**Research evidence:**

| Study | Sample | Finding |
|-------|--------|---------|
| Fox Tree (1995) | Conversational speech corpus | Normal baseline: **6 disfluencies per 100 words** |
| Clark & Fox Tree (2002) | Psycholinguistic study | **"um" signals longer cognitive delays than "uh"** — granular load discrimination |
| Goldman-Eisler (foundational) | Speech production research | Nearly **50% of speaking time consists of pausing and disfluencies** — ratio shifts upward under workload |

**Threshold used:** Disfluency rate > 1.0 standard deviations above the pilot's baseline rate. The 6/100-word Fox Tree baseline is a population reference point for contextualization, but scoring uses per-speaker baseline because individual disfluency rates vary enormously.

**Why weight is 0.25 (second highest):** Disfluencies are easily detectable from Deepgram transcripts (scan for "um", "uh", "er", "ah" tokens), strongly validated as cognitive load indicators, and less sensitive to recording conditions than intensity or F0. The "um" vs "uh" distinction (Clark & Fox Tree) provides additional granularity — "um" occurrences are weighted 1.5x in the disfluency count because they indicate deeper processing interruptions.

**Limitation:** Deepgram may not always transcribe filled pauses accurately — "um" might be dropped or transcribed as a partial word. Keyword boosting for disfluency markers ("um", "uh") partially mitigates this. Pilots trained in professional radio communication may have inherently low disfluency rates, compressing the measurable range.

---

### 1.5 Speech Rate

**What it measures:** Words per minute (WPM), computed from Deepgram word timestamps. Two variants:
- **Speech rate:** Total words / total utterance duration (includes pauses)
- **Articulation rate:** Total words / (utterance duration minus silent pauses > 200ms)

**Research evidence:**

| Study | Finding |
|-------|---------|
| ICAO Standard | Recommended radiotelephony rate: **100 words per minute** |
| Bittner et al. (2013) | Most studies report **decreased** articulation rate under cognitive load |
| Springer (2018) | Confirmed decreased speech rate under load |
| Johnstone & Scherer (2004) | Some studies find **accelerated** speech under acute stress |

**Resolution of the directional ambiguity:** The apparent contradiction (slower vs. faster) is resolved by distinguishing speech rate from articulation rate. Under cognitive load, **speech rate** (including pauses) typically decreases because pauses lengthen — even if the pilot speaks the words themselves at a normal or slightly faster pace. The assessment engine tracks both metrics and compares to baseline, flagging deviation in either direction.

**Threshold used:** Speech rate decrease > 1.0 standard deviations below baseline, OR articulation rate increase > 1.5 standard deviations above baseline. The asymmetric thresholds reflect the research finding that slowing is more common and a lower magnitude of change is diagnostic, while acceleration requires a larger deviation to be meaningful.

**Limitation:** Aviation readbacks are short and formulaic, limiting the range of speech rate variation. A 5-word readback produces an unreliable rate estimate. The engine requires a minimum of 8 recognized words for speech rate scoring.

---

### 1.6 Composite Cognitive Load Score — Weight Derivation

The composite score combines all five biomarkers into a single 0-100 value. Weights are research-informed heuristics, not statistically optimized for this population.

| Biomarker | Weight | Evidence Basis |
|-----------|--------|---------------|
| F0 mean deviation | 0.35 | "Strongest single indicator" — most replicated finding across Huttunen, Bittner/NASA, Johnstone & Scherer meta-analysis |
| Disfluency rate | 0.25 | Strong evidence (Fox Tree, Clark & Fox Tree), easily detectable, less sensitive to recording conditions |
| F0 range narrowing | 0.15 | Validated (Huttunen) but secondary to F0 mean; short utterances reduce reliability |
| Speech rate decrease | 0.15 | Generally reliable (Bittner, Springer) but directionally ambiguous (Johnstone & Scherer); moderate weight |
| Vocal intensity | 0.10 | Validated (Huttunen) but narrowest effect range (1-1.5 dB), most sensitive to recording conditions |

**Honest disclosure:** These weights are informed by the relative strength of evidence and effect sizes in the literature, but they have not been statistically optimized against a ground-truth cognitive load dataset for this specific prototype. After accumulating 100+ pilot training sessions, the weights should be re-derived using regression against instructor-rated workload assessments as ground truth.

---

### 1.7 Calibration Protocol

**Why calibration exists:** Magnusdottir et al. (2022) demonstrated that even with combined cardiovascular and voice measures, generic (cross-individual) workload classification produces **15-17% misclassification rates**. Per-speaker baseline calibration is the only scientifically valid approach.

**Protocol:**
- **Partial calibration:** After 5 utterances — preliminary statistics computed, cognitive load scores generated with reduced confidence (0.3-0.65)
- **Full calibration:** After 10 utterances — stable baseline, full confidence scoring (0.7-1.0)
- **No special UI required:** The first drill naturally provides calibration utterances. The system is transparent — no extra steps for the pilot.

**Validation approach for future work:** Compare system-generated cognitive load scores against instructor ratings (5-point scale) during the same drill events. Target: AI-instructor agreement (Cohen's κ) at or above the human inter-rater reliability baseline of ~0.5 (DLR NOTECHS studies).

---

## 2. Readback Accuracy & Communication KPIs

### 2.1 Readback Accuracy

**What it measures:** How accurately the pilot repeats back critical elements of an ATC instruction — altitudes, headings, frequencies, callsign, and clearance type.

**Research evidence:**

| Study | Sample | Finding |
|-------|--------|---------|
| Prinzo, Hendrix & Hendrix (2006) | 50 hours TRACON communications, FAA-funded | **0.30 error rate** for 4-topic messages; **0.062 error rate** for 2-topic messages |
| Prinzo et al. (2006) | Same study | Only **1.74% of omission errors** were self-corrected by pilots |
| HAAWAII validation (2022) | 500+ hours real ATC recordings | **1.3% of total utterances** contain readback errors in live operations |
| HAAWAII PROSA (Sept-Nov 2022) | 12 Austro Control controllers | Radar label errors dropped from **11% to 4%** when ASRU was active — demonstrates value of automated readback monitoring |

**Scoring approach:** Confidence-weighted fuzzy token matching (see Section 7 for WER impact). Critical elements (altitudes, headings, frequencies) weighted 2x because Prinzo et al. found these are the elements most commonly involved in operationally significant errors.

**Why fuzzy matching, not exact match:** Even Deepgram Nova-2 has ~8-10% WER for pilot speech. Exact string matching would produce ~10% false negative rate — penalizing pilots for STT errors, not their own mistakes. The Longest Common Subsequence (LCS) algorithm tolerates minor transcription variations while catching genuine omissions and substitutions.

**Why confidence weighting on top of fuzzy matching:** Fuzzy matching tolerates word-order variation and minor wording changes, but cannot distinguish between a pilot who said "flight level two four zero" (correctly, but Deepgram heard "fly level two four zero") and a pilot who said "flight level three four zero" (incorrectly). Deepgram's per-word confidence scores provide the additional signal: a low-confidence transcription of "fly" (0.62) is likely a transcription error, while a high-confidence transcription of "three" (0.94) is likely what the pilot actually said.

---

### 2.2 Phraseology Compliance

**What it measures:** Adherence to ICAO standard radiotelephony phraseology — using prescribed phrases rather than colloquial language.

**Research evidence:**
- **IATA CBTA Framework:** Observable Behavior 2.9 — "Uses standard radiotelephone phraseology" — one of **9 of 10 Communication Observable Behaviors** that are automatable from voice data
- **Observable Behavior 2.3** — "Conveys messages clearly, accurately, and concisely" — measurable via communication duration and word count relative to information content
- Common deviations documented in HAAWAII: use of "point" instead of "decimal" for frequencies, omission of callsigns, dropping altitude units

**Scoring approach:** NLU-based template matching against ICAO standard phrase templates in `data/phraseology.ts`. Credit for using correct phrases ("descend and maintain," "squawk," "roger"); deductions for colloquial equivalents ("go down to," "okay," "got it").

---

### 2.3 Callsign Usage

**What it measures:** Whether the pilot includes the correct callsign in their readback.

**Research evidence:**
- HAAWAII system achieves **97% callsign recognition** when combining voice with radar data
- ATCO2 Named Entity Recognition pipeline extracts callsigns as a distinct annotation class
- Callsign omission is one of the most common phraseology errors in pilot communications

**Scoring approach:** Binary (correct/incorrect) with callsign extracted via keyword matching against the drill's assigned callsign. Deepgram keyword boosting for the active callsign reduces STT errors on this critical element.

---

### 2.4 Clarification Request Frequency

**What it measures:** How often the pilot asks ATC to "say again" or requests clarification — an indicator of comprehension difficulty.

**Research evidence:**

| Study | Finding |
|-------|---------|
| FAA research | **33% of foreign-registry communication problems** were requests for repetition |
| FAA research | **50% for native speakers** — repetition requests are normal; it's the rate that is diagnostic |

**Scoring approach:** Not penalized per se (requesting clarification is correct behavior when uncertain), but tracked as a signal. Elevated clarification requests combined with high cognitive load biomarkers may indicate task saturation.

---

## 3. Response Latency

### 3.1 Pilot Reaction Time (PTT Onset)

**What it measures:** Time elapsed from the end of ATC audio playback to the pilot pressing the PTT button. This captures cognitive processing time — how long the pilot needs to comprehend the instruction and decide to respond.

**Research evidence:**

| Source | Threshold | Context |
|--------|-----------|---------|
| FAA research | **400 milliseconds** maximum for ATC operations | Beyond this becomes operationally problematic |
| HAAWAII system | **30-second missing readback flag** | No pilot response within 30 seconds = flagged |

**Our thresholds:**
- < 200ms speech onset from PTT: possibly pre-rehearsed or anticipated — noted but not penalized
- 200-400ms: normal reaction time
- 400-3000ms: acceptable but elevated — may indicate processing difficulty
- \> 3000ms: cognitive load indicator — contributes to WLM (Workload Management) competency impact

---

### 3.2 Why Network-Corrected Latency Is Mandatory

**The problem:** Deepgram's `words[0].start` timestamp includes ~300ms of network round-trip + processing overhead. If used naively as speech onset, it inflates the measured latency by the system's own delay — penalizing the pilot for network conditions, not cognitive performance.

**The solution:** Measure speech onset locally via Web Audio API Voice Activity Detection (VAD). The AudioWorkletNode computes per-frame RMS energy from the raw microphone stream. When RMS exceeds 2x the silence baseline (measured in the first ~50ms after PTT press), `localSpeechOnsetTimestamp` is recorded. This timestamp is purely local — zero network dependency.

**Decomposition:**
```
pilotReactionMs     = pttPressTimestamp - atcAudioEndTimestamp     (local only)
speechOnsetMs       = localSpeechOnsetTimestamp - pttPressTimestamp (local only)
totalPilotLatencyMs = pilotReactionMs + speechOnsetMs              (used for scoring)
```

Deepgram's word timestamps are retained as a **cross-check** and for network latency estimation, but they do not feed into the pilot's latency score.

**Limitation:** PTT press timing measures motor response + cognitive processing jointly — it cannot separate "time to comprehend" from "time to physically move finger to button." This is inherent to any PTT-based measurement and is acknowledged in the FAA research that established the 400ms threshold.

---

## 4. Decision Quality & PilotPredict Trap Detection

### 4.1 Decision Correctness & Time-to-Decision

**What it measures:** Whether the pilot selects the correct option in a timed decision scenario, and how long they take.

**Research evidence for automation trust calibration:**

| Source | Finding |
|--------|---------|
| 1999 Australian survey (Report A) | **73% of pilots** have inadvertently selected wrong automation modes |
| PARC/CAST (Report A) | Insufficient crew knowledge of automated systems was a factor in **>33% of accidents and serious incidents** |

**Why this matters for Anthem specifically:** Anthem's PilotPredict feature actively suggests actions to pilots. If pilots develop uncalibrated trust in AI suggestions (accepting them without verification), the 73% inadvertent-mode-selection problem gets worse, not better. Decision drills with deliberately wrong PilotPredict suggestions test whether pilots maintain critical evaluation of AI recommendations.

### 4.2 PilotPredict Trap Detection

**What it measures:** Whether the pilot rejects an intentionally incorrect suggestion from PilotPredict (e.g., suggesting the wrong frequency during a handoff).

**Scoring:**
- **Trap detected (reject):** Full credit. Time-to-reject is secondary — fast rejection suggests the pilot noticed immediately; slow rejection suggests they had to think about it but ultimately caught the error.
- **Trap missed (accept):** Zero credit. Feedback is shown explaining why the suggestion was wrong and what the correct action was.

**Research grounding:** The 73% inadvertent mode selection finding and the >33% accident rate linked to insufficient automation knowledge establish that blind trust in cockpit automation is a documented safety problem. PilotPredict trap detection directly measures automation trust calibration — a novel training objective that has no equivalent in traditional avionics training.

**Limitation:** Trap detection is a binary, somewhat artificial test. In real operations, wrong suggestions from AI systems may be more subtle and context-dependent. The drill scenarios deliberately make the trap detectable (with sufficient aviation knowledge) to ensure face validity — the purpose is to test knowledge application, not trick pilots.

---

## 5. CBTA Competency Mapping

### 5.1 Framework Basis

**Standard:** ICAO/IATA Competency-Based Training and Assessment framework.

**Communication (COM) Observable Behaviors:**
- IATA defines **10 Observable Behaviors** for the Communication competency
- **9 of 10 are automatable** from ATC interaction data (Report B)
- The only non-automatable OB is **2.8 (non-verbal communication)** — inherently impossible from voice-only data

**Key automatable OBs:**
- **OB 2.5** (active listening): Demonstrated by correct readback accuracy
- **OB 2.9** (standard radiotelephone phraseology adherence): Extractable from voice transcript
- **OB 2.3** (clear, accurate, concise message conveyance): Measurable via word count, duration, and accuracy

### 5.2 Cross-Competency Mapping

Voice and interaction data map beyond Communication to four additional competencies:

| Competency | Automated Indicators | Evidence |
|-----------|---------------------|----------|
| **Workload Management (WLM)** | Communication timing during high-workload phases, cognitive load voice biomarkers, delayed/missed radio calls, task completion time | Report B cross-competency mapping |
| **Situational Awareness (SAW)** | Response latency to traffic calls, decision correctness when given conflicting information, PilotPredict trap detection | Report B cross-competency mapping |
| **Knowledge (KNO)** | Correct aviation terminology use, holding pattern entry correctness, PilotPredict trap detection, procedural correctness | Report B cross-competency mapping |
| **Problem Solving & Decision Making (PSD)** | Decision correctness, time-to-decision, clarification requests, alternative course-of-action communications | Report B cross-competency mapping |
| **Flight Path Management (FPM)** | Flight plan modifications, altitude/heading selections, mode selections | Cockpit touch interaction data |

### 5.3 Human Inter-Rater Reliability — The Benchmark AI Must Meet

**The critical benchmark:** Any automated assessment system must demonstrate AI-human agreement **at or above** human-human agreement to be considered valid.

| Metric | Value | Source |
|--------|-------|--------|
| Human inter-rater reliability (CBTA) | **~0.5 kappa** (Cohen's κ) | DLR NOTECHS studies |
| Self-rating/instructor agreement | **~0.5** average | Report B |
| Overall CBTA reliability | Described as **"excessively complex"** by practitioners | Report B |

**Implication:** The bar for automated assessment is not perfection — it is matching human consistency, which is itself only moderate (~0.5 κ). This is achievable with the metrics described in this document, particularly for Communication competency where 9 of 10 OBs are automatable.

**AI grading bias warning:** Wetzler et al. (2024) found that AI grading tends to be **more lenient on low performers** and **harsher on high performers**. This bias must be monitored and reported. The assessment dashboard should flag when a pilot's scores cluster suspiciously near the population mean (possible regression-to-mean bias).

### 5.4 Regulatory Classification

**EASA AI Concept Paper (Issue 2, 2023/2024):**
- AI use case: **F.5.1** ("Assessment of training performance") in Training/FSTD domain
- Classification: **Level 1 AI application** ("assistance to human")
- Required trustworthiness building blocks: Learning Assurance, AI Explainability, Ethics-based Assessment, Safety Risk Mitigation

**FAA Advanced Qualification Program (AC 120-54A):**
- Explicit language: "Innovation in the methods and technology that are used during instruction and evaluation" is encouraged
- "Alternate means are encouraged and will be evaluated on their merit"

**Our position:** Level 1 — decision support for instructors. The system provides objective metrics; the instructor retains absolute authority over proficiency determinations. This is non-negotiable.

---

## 6. CBTA Competency Scoring — Aggregation Method

### 6.1 Per-Drill CBTA Scores

Each drill maps to 2-3 competencies (defined in the drill definition). For each competency tested by a drill:

**COM scoring formula:**
```
COM = (readbackAccuracy × 0.40) + (phraseologyScore × 0.25) +
      (latencyScore × 0.20) + (callsignScore × 0.15)

where latencyScore = 100 if totalPilotLatencyMs < 400
                   = max(0, 100 - ((totalPilotLatencyMs - 400) / 26))  // linear decay to 0 at 3000ms
```

**WLM scoring formula:**
```
WLM = (taskCompletionTimeScore × 0.35) + (cognitiveLoadScore_inverted × 0.35) +
      (sequentialTaskScore × 0.30)

where cognitiveLoadScore_inverted = 100 - compositeLoad  // High load = low WLM score, for routine tasks
```

**SAW, KNO, PSD, FPM:** Primarily driven by decision correctness, trap detection, and procedural correctness scores from drill events. Cognitive load provides context (high load during expected-complex events is not penalized).

### 6.2 Rolling Session Aggregate

CBTA scores are weighted rolling averages across the last 20 drill attempts (or all attempts if fewer than 20). More recent drills are weighted higher:

```
weight_i = 0.95^(N - i)   // Exponential decay, most recent = highest weight
```

This ensures the radar chart reflects current proficiency, not historical performance.

---

## 7. STT Accuracy & WER Impact on All Metrics

### 7.1 The Measurement Floor Problem

**Core issue:** Every voice-derived metric has a measurement floor set by the STT Word Error Rate. If 1 in 10 words is misrecognized, the system cannot distinguish a 90% accurate readback from a 100% accurate readback — both look the same after STT processing.

| STT System | WER (Controllers) | WER (Pilots) | Source |
|-----------|-------------------|--------------|--------|
| HAAWAII (state of art) | **< 5%** | **< 10%** | HAAWAII validation, 500+ hours |
| HAAWAII PROSA | **3% average** (range 0.7-8.2%) | — | Austro Control validation |
| Deepgram Nova-2 (general) | ~8% general | ~8-10% estimated | Industry benchmarks |
| OpenAI Whisper (raw, no fine-tuning) | — | **95% WER** on ATC data | Report B — essentially unusable |
| Whisper Large v3 (fine-tuned) | — | **6.5% WER** | Domain-adapted |
| Wav2Vec 2.0 (ATCOSIM corpus) | **1.67% WER** | — | Controllers only |

**Key finding from Report B:** Pilot speech recognition is **roughly 2x harder** than controller speech (Airbus 2018 Challenge). Primary driver: pilot accents are unpredictable, controllers operate from known locations.

### 7.2 The Accent Problem

| Accent Region | WER (Fine-Tuned Models) | Source |
|--------------|------------------------|--------|
| Native English | ~5-7% | Industry estimates |
| European | ~6-8% | HAAWAII data |
| Southeast Asian | **9.82%** | Aviation-specific test data |

**Mitigation strategies in our system:**
1. **Keyword boosting:** Deepgram keyword boosting for aviation terms reduces errors on critical elements. MALORCA project demonstrated error rate reduction from **18.9% to 3.2%** (Vienna) and **7.9% to 3.2%** (Prague) with semi-supervised adaptation using **< 4 hours of transcribed data**.
2. **Confidence thresholds:** Per-word confidence scores from Deepgram enable the system to identify likely STT errors and exclude them from scoring (see Section 7.3).
3. **Accent group tracking:** Pilot profiles include accent group, enabling WER stratification in population analytics. Instructors can see whether low scores correlate with accent-related STT difficulties.

### 7.3 Confidence-Weighted Scoring

**The three-tier approach:**

| Tier | Deepgram Confidence | Scoring Treatment | Rationale |
|------|-------------------|-------------------|-----------|
| High | >= 0.85 | Full weight (1.0×) | High probability word was correctly transcribed |
| Medium | 0.60-0.84 | Half weight (0.5×) | Uncertain — may be STT error; don't fully penalize |
| Low | < 0.60 | Excluded (0.0×), flagged | Likely STT error — penalizing the pilot would be unjust |

**Abstention rule:** If mean transcript confidence < 0.50 OR > 40% of words are low-confidence, the system **does not score the readback** and flags it for instructor review. This directly implements Report B's recommendation to "abstain when uncertain rather than scoring incorrectly."

**Estimated WER per transcript:**
```
estimatedWER ≈ Σ(1 - confidence_i) / totalWords    (for all words)
```

This is displayed alongside every readback score so instructors can see the STT quality context for each assessment.

### 7.4 What the System Cannot Reliably Measure at 8-10% WER

**Honest boundaries:**
- **Subtle phraseology differences** (e.g., "decimal" vs "point" for frequencies) — may be below STT discrimination threshold
- **Exact word order** — LCS handles this, but true word-order errors (which matter for some clearances) may be masked by STT reordering
- **Accent-specific pronunciation quality** — the system can measure whether words are recognized, but not whether pronunciation is causing comprehension difficulty for controllers
- **Very short readbacks** (< 4 words) — insufficient data for reliable scoring; confidence interval too wide

---

## 8. Population Analytics & Statistical Validity

### 8.1 Why Centralized Storage Is Necessary (Not Nice-to-Have)

**ICAO Doc 9995 (Manual of Evidence-Based Training):**
- Mandates "flight data analysis to tailor training programs"
- Requires: "Implement standardized competency frameworks to facilitate the analysis and benchmarking of the training and safety data"
- Any competency assessed below standard must be linked to specific observable behaviors

**Final Synthesis Layer 3:** Explicitly calls for "population-level training data identifying systematic competency gaps across pilot fleet."

**What centralized storage enables:**
- Cross-pilot CBTA comparison (population radar overlay with P25/P75 bands)
- Accent-group stratified WER analysis (are Southeast Asian-accented pilots being unfairly scored?)
- Drill difficulty calibration (which drills produce the lowest scores across the population?)
- Training efficacy trends (are pilots improving with repeated sessions?)
- Identification of systematic competency gaps (is WLM consistently the weakest competency fleet-wide?)

None of this is possible with browser-local storage.

### 8.2 Minimum Sample Sizes

**Report B validation design:** Minimum **100 pilot training sessions** with **3+ expert graders** for validation of automated assessment against instructor ratings.

**Statistical requirements:**
- Population baseline requires ~30 pilots for stable mean/std estimates per competency
- Cohort analysis (e.g., accent group comparison) requires ~15 pilots per group
- Trend analysis requires ~5 sessions per pilot to detect improvement

### 8.3 Competitive Context

| Competitor | Data Scale | Approach |
|-----------|-----------|----------|
| **CAE Rise** | **240+ training centers** | AI drives 20% of crew-level, 10% of individual pilot training content |
| **FlightSafety FlightSmart** | USAF deployments | Real-time monitoring of **4,000+ variables** |
| **APC PROJECT ORCA** | Customer deployment Q1 2026 | Process audio/video directly, bypassing STT |
| **AXIS Flight Simulation** | Training centers | Automated maneuver recognition + CBTA debriefing |

A prototype that stores data only in `localStorage` cannot demonstrate competitiveness with systems operating at this scale. Centralized storage (even SQLite) enables the population-level analytics that differentiate a serious training assessment tool from a toy demo.

---

## 9. Composite Scoring Weights — Derivation Methodology

### 9.1 How Weights Were Assigned

The composite cognitive load score weights were derived using a **relative evidence strength** methodology:

1. **Literature survey:** Ranked each biomarker by number of independent studies confirming its cognitive load association in aviation or high-workload contexts
2. **Effect size comparison:** Compared the magnitude and consistency of reported effects
3. **Measurement reliability in prototype conditions:** Assessed how well each biomarker can be extracted from browser audio (vs. lab-grade recording equipment)
4. **Cross-study replication:** Higher weight for biomarkers confirmed across multiple independent research groups

| Biomarker | Independent Confirmations | Effect Consistency | Prototype Reliability | Final Weight |
|-----------|--------------------------|-------------------|----------------------|-------------|
| F0 mean | Huttunen, Bittner/NASA, Johnstone & Scherer (meta) | High (consistently upward) | Good (YIN algorithm well-established) | **0.35** |
| Disfluency | Fox Tree, Clark & Fox Tree, Goldman-Eisler | High (consistently upward) | Good (transcript-based, robust) | **0.25** |
| F0 range | Huttunen, Springer | Moderate | Good (same YIN pipeline) | **0.15** |
| Speech rate | Bittner, Springer, Johnstone & Scherer | Moderate (directionally complex) | Good (word timestamps reliable) | **0.15** |
| Intensity | Huttunen | Moderate (narrow range) | Poor (mic-dependent, AGC interference) | **0.10** |

### 9.2 Future Calibration

**After 100+ pilot sessions:** Perform multiple regression with instructor-rated workload (5-point scale) as dependent variable and the five biomarker z-scores as independent variables. The resulting beta coefficients become the empirically optimized weights for this specific system and population.

**After 500+ sessions:** Stratify by accent group and experience level to determine whether weights should vary by cohort.

---

## 10. Limitations & Honest Boundaries

### What This Prototype CAN Measure With Confidence

- **Readback accuracy** (confidence-weighted, with honest WER disclosure)
- **Response latency** (locally measured, network-corrected)
- **Decision correctness and time-to-decision** (binary, objective)
- **PilotPredict trap detection** (binary, objective)
- **F0 shift relative to personal baseline** (within-speaker only)
- **Disfluency rate changes** (relative to baseline)
- **Speech rate changes** (relative to baseline)
- **CBTA competency trends over time** (with sufficient session count)

### What It CANNOT Measure Reliably

- **Absolute cognitive load level** — only relative to personal baseline; cannot compare load between pilots
- **Subtle phraseology errors** below STT discrimination threshold (~8-10% WER)
- **Non-verbal communication** (IATA OB 2.8) — impossible from voice-only data
- **Accent quality** — whether the pilot's pronunciation causes comprehension difficulty for real controllers
- **True operational readiness** — this is a drill, not a full-fidelity simulator; procedural proficiency in a browser app does not equal proficiency in a cockpit
- **Cross-individual cognitive load comparison** — NASA Ames established this is scientifically invalid

### The Gap Between Research and Prototype Conditions

| Factor | Research Conditions | Prototype Conditions |
|--------|-------------------|---------------------|
| Audio quality | Lab-grade microphones, controlled environment | Browser mic, variable quality, ambient noise |
| F0 extraction | PRAAT or dedicated analysis software | YIN algorithm in Web Audio API AudioWorklet |
| Speech recognition | Domain-fine-tuned models (1.67% WER) | Deepgram Nova-2 general model (~8-10% WER) |
| Sample size | 13-97 participants in controlled studies | Unknown, growing with usage |
| Ground truth | Physiological measures (EEG, HRV) + self-report | No physiological ground truth; calibration relies on assumed low-load during initial utterances |

**This gap is disclosed, not hidden.** The prototype demonstrates that the concept works and produces directionally valid metrics. Production deployment would require domain-adapted STT, higher-quality audio capture, and validation against physiological ground truth.

### Why Instructor Authority Remains Non-Negotiable

All of the above limitations converge on a single conclusion: **the AI assessment system is a decision-support tool, not an autonomous grader.**

- EASA classifies this as **Level 1** AI ("assistance to human")
- FAA AQP language explicitly encourages "innovation" but within instructor-supervised frameworks
- Human inter-rater reliability is only ~0.5 κ — even humans disagree on CBTA ratings
- AI grading shows bias toward the mean (Wetzler et al., 2024)
- STT WER creates a measurement floor that cannot be eliminated, only managed

The correct role for this system: surface objective data that instructors cannot easily see (response latency to the millisecond, disfluency rate changes, F0 shifts), present it clearly with confidence indicators and WER context, and let the instructor decide what it means for that pilot's proficiency.

---

## References

1. Bittner, A. C., Begault, D. R., & Christopher, B. W. (2013). *Speech analysis for assessing cognitive workload.* NASA Ames Research Center.
2. Clark, H. H., & Fox Tree, J. E. (2002). Using uh and um in spontaneous speaking. *Cognition, 84*(1), 73-111.
3. Fox Tree, J. E. (1995). The effects of false starts and repetitions on the processing of subsequent words in spontaneous speech. *Journal of Memory and Language, 34*(6), 709-738.
4. Goldman-Eisler, F. (1968). *Psycholinguistics: Experiments in Spontaneous Speech.* Academic Press.
5. Huttunen, K., Keränen, H., Väyrynen, E., Päkkilä, P., & Leino, T. (2011). Effect of cognitive load on speech prosody in aviation. *Applied Ergonomics, 42*(2), 348-357.
6. Johnstone, T., & Scherer, K. R. (2004). Vocal communication of emotion. In M. Lewis & J. M. Haviland-Jones (Eds.), *Handbook of Emotions* (2nd ed., pp. 220-235).
7. Magnusdottir, E. H., et al. (2022). Cognitive workload classification using cardiovascular measures and dynamic features. *IEEE International Conference on Systems, Man, and Cybernetics.*
8. Prinzo, O. V., Hendrix, A. M., & Hendrix, R. (2006). *The outcome of ATC message complexity on pilot readback performance.* FAA Civil Aerospace Medical Institute. DOT/FAA/AM-06/25.
9. Springer, F. (2018). Analysis of cognitive workload effects on speech. *DLR Institute of Flight Guidance.*
10. Wetzler, J., et al. (2024). Bias in AI-based assessment of pilot competencies. *International Journal of Aviation Psychology.*
11. HAAWAII Consortium (2022). *Highly Automated Air Traffic Controller Workstations with Artificial Intelligence Integration: Final Report.* SESAR Joint Undertaking.
12. ICAO (2013). *Doc 9995: Manual of Evidence-Based Training.* International Civil Aviation Organization.
13. IATA (2019). *Evidence-Based Training Implementation Guide* (2nd ed.). International Air Transport Association.
14. EASA (2024). *Artificial Intelligence Concept Paper: Issue 2.* European Union Aviation Safety Agency.
15. FAA (2006). *Advisory Circular 120-54A: Advanced Qualification Program.* Federal Aviation Administration.
