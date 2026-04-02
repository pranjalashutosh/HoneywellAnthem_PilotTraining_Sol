# Scenario Engine Fix — Task Plan

> Fixes the "split personality" flaw: the frontend UI enforces Hostile constraints, but the scenario engine ignores cockpit state, and assessment is blind to physical instrument manipulation.

---

## Architectural Constraints (apply to ALL steps)

- **Headless evaluation**: All state transitions, timer management, and cockpit verification run as pure store-to-store logic. React components are read-only consumers — they display state, they never drive it.
- **No useEffect for state logic**: React `useEffect` hooks may only be used for display concerns (elapsed tickers, animations). Never for evaluation, timers, or subscriptions that drive drill progression.
- **Module-scoped handles**: All `setTimeout` IDs and `subscribe()` unsubscribe functions are declared at module scope in `scenario-store.ts` (outside `create()`), so every store action can reach and clear them. Never trap handles as local variables inside an action closure.
- **Guard stale callbacks**: Every timer callback checks `get().phase === 'active'` before mutating state. If the drill has already moved to `outcome` or `idle`, the callback is a no-op.
- **Exhaustive cleanup**: Every exit path (`reset()`, `completeDrill()`, verification completion, timeout) must clear all active handles. No orphaned timers.

---

## Step 1: Pending Cockpit Verification via Store-to-Store Subscription

> When a readback succeeds on an `atc_instruction` event with `expectedActions`, the scenario store enters a `pending` state and subscribes directly to the cockpit store, re-evaluating on every state change.

### Tasks

- [ ] **1.1** Export `CockpitSnapshot` interface from `app/src/lib/cockpit-action-utils.ts` (currently private)

- [ ] **1.2** Add `evaluateAllCockpitActions()` to `app/src/lib/cockpit-action-utils.ts`
  - Signature: `(expected: CockpitAction[], state: CockpitSnapshot, baseline?: CockpitSnapshot) => { allMet: boolean; results: { action: CockpitAction; met: boolean }[] }`
  - Iterates `expected`, calls existing `evaluateCockpitAction` for each, returns aggregate
  - Constraint: reuse existing `evaluateCockpitAction`, do not duplicate logic

- [ ] **1.3** Declare module-scoped handles at top of `app/src/stores/scenario-store.ts`
  ```
  let complianceTimerId   — for cockpit verification timeout
  let cockpitUnsubscribe  — for cockpit store subscription
  let escalationTimerId   — for interactive_cockpit escalation (Step 2)
  let timeLimitTimerId    — for interactive_cockpit time limit (Step 2)
  ```
  - Constraint: declared OUTSIDE `create()`, at file scope
  - Constraint: all four initialized to `null`

- [ ] **1.4** Add `cockpitVerification` state to `scenario-store.ts`
  ```
  cockpitVerification: {
    status: 'idle' | 'pending' | 'verified' | 'timed_out';
    expectedActions: CockpitAction[];
    startedAt: number;
    timeoutMs: number;
    actionResults: { action: CockpitAction; met: boolean }[];
    cockpitSnapshot: { selectedMode, desiredAltitude, constraintViolationCount } | null;
  } | null
  ```

- [ ] **1.5** Implement `beginCockpitVerification(expectedActions, timeoutMs)` action
  - Sets `cockpitVerification` to `{ status: 'pending', ... }`
  - Immediately evaluates current cockpit state — if all met, short-circuit to verified
  - Otherwise: `cockpitUnsubscribe = useCockpitStore.subscribe(callback)`
  - Callback runs `evaluateAllCockpitActions` on every cockpit state change
  - When all met: unsubscribe, clear timer, snapshot state, set `status: 'verified'`, call `_advanceAfterVerification(true)`
  - Starts `complianceTimerId = setTimeout(...)` for the timeout path
  - Constraint: subscription is store-to-store (Zustand `.subscribe()`), NOT a React hook
  - Constraint: handles assigned to module-scoped variables, not closure locals

- [ ] **1.6** Implement `clearCockpitVerification()` action
  - Clears `complianceTimerId` (if set)
  - Calls `cockpitUnsubscribe()` (if set)
  - Sets both handles to `null`
  - Sets `cockpitVerification = null`

- [ ] **1.7** Implement `_advanceAfterVerification(verified: boolean)` internal helper
  - Builds enriched `EventResult` with `cockpitVerified`, `actionResults`, `cockpitSnapshot`
  - Calls `recordEventResult()`
  - Calls `advanceEvent()` or `completeDrill()` depending on last-event check
  - Calls `clearCockpitVerification()` after recording

- [ ] **1.8** Wire cleanup: `reset()` and `completeDrill()` both call `clearCockpitVerification()`

- [ ] **1.9** Modify voice auto-advance in `app/src/components/drill/DrillActiveView.tsx` (lines 60-87)
  - When `readbackReceived` and event has `expectedActions.length > 0`: call `scenario.beginCockpitVerification(expectedActions, 15000)`. Do NOT advance here — store handles it.
  - When `readbackReceived` and no `expectedActions`: advance immediately (current behavior)
  - Record readback result with `details: { mode: 'voice' }` only (cockpit telemetry recorded by store)
  - Constraint: DrillActiveView triggers verification, does not evaluate it

- [ ] **1.10** Modify keyboard fallback in `DrillActiveView.tsx` (lines 185-216)
  - "Readback Correct" with `expectedActions` → triggers `beginCockpitVerification`
  - "Skip" → advances with `cockpitVerified: false` (no verification window)

- [ ] **1.11** Add pending verification UI indicator in `DrillActiveView.tsx`
  - When `cockpitVerification?.status === 'pending'`: show "Awaiting cockpit action..." with countdown
  - Read-only display from store — no logic

- [ ] **1.12** Validation: `npx tsc --noEmit` ✓ | `pnpm lint` ✓ | `pnpm build` ✓

- [ ] **1.13** Manual test: speak readback → spin knob within 15s → `cockpitVerified: true`, auto-advance

- [ ] **1.14** Manual test: speak readback → don't touch cockpit → 15s timeout → `cockpitVerified: false`, auto-advance

- [ ] **1.15** Manual test: speak readback → immediately click "Try Again" → wait 15s → confirm NO ghost timer fires

---

## Step 2: Move Timer/Escalation to Scenario Store

> The 60s time limit and 30s escalation timer for `interactive_cockpit` events move from React `useEffect` hooks into the store.

### Tasks

- [ ] **2.1** Add `eventTimers` state to `app/src/stores/scenario-store.ts`
  ```
  eventTimers: {
    startedAt: number;
    timeLimitMs: number;
    escalationDelayMs: number;
    escalationTriggered: boolean;
    timedOut: boolean;
  } | null
  ```

- [ ] **2.2** Implement `startEventTimers(config)` action
  - Config: `{ timeLimitMs, escalationDelayMs?, onEscalation?, onTimeout }`
  - Sets `eventTimers` state with `startedAt = Date.now()`
  - Creates `escalationTimerId = setTimeout(...)` if `escalationDelayMs` provided
  - Creates `timeLimitTimerId = setTimeout(...)` for time limit
  - Constraint: callbacks guard `get().phase === 'active' && get().eventTimers !== null`
  - Constraint: handles assigned to module-scoped variables (declared in Step 1.3)

- [ ] **2.3** Implement `clearEventTimers()` action
  - Clears both `escalationTimerId` and `timeLimitTimerId`
  - Sets handles to `null`
  - Sets `eventTimers = null`

- [ ] **2.4** Implement `markEscalationTriggered()` and `markTimedOut()` setters

- [ ] **2.5** Wire cleanup: `reset()` and `completeDrill()` both call `clearEventTimers()`

- [ ] **2.6** Refactor `app/src/hooks/useInteractiveCockpitTracker.ts`
  - Remove escalation `useEffect` (lines 175-194)
  - Remove time-limit `useEffect` (lines 197-216)
  - Remove elapsed ticker `useEffect` (lines 219-228)
  - Add single `useEffect` on mount: call `startEventTimers(...)`, cleanup calls `clearEventTimers()`
  - Derive `elapsedMs` from `Date.now() - eventTimers.startedAt` in a display-only `setInterval`
  - Read `escalationTriggered` from `useScenarioStore` instead of local state
  - Constraint: cockpit subscription effect (lines 100-155) and completion effect (lines 158-172) unchanged

- [ ] **2.7** Verify `InteractiveCockpitView.tsx` needs no changes (reads from tracker state which now derives from store)

- [ ] **2.8** Validation: `npx tsc --noEmit` ✓ | `pnpm lint` ✓ | `pnpm build` ✓

- [ ] **2.9** Manual test: wait 30s → escalation fires

- [ ] **2.10** Manual test: wait 60s → timeout fires, `timedOut: true`

- [ ] **2.11** Manual test: click "Try Again" mid-event → no orphaned timers

---

## Step 3: Enrich Assessment Payload and Scoring Pipeline

> New `ATCInstructionScore` type captures cockpit telemetry. Scoring pipeline penalizes verbal-only compliance.

**Depends on**: Step 1 (which populates `cockpitVerified` and `actionResults` in EventResult details).

### Tasks

- [ ] **3.1** Add `ATCInstructionScore` interface to `app/src/types/assessment.ts`
  ```
  readbackSuccess: boolean
  cockpitVerified: boolean
  actionResults: { action: { type, value }; met: boolean }[]
  cockpitSnapshot: { selectedMode, desiredAltitude, constraintViolationCount }
  completionMethod: 'voice' | 'keyboard-fallback'
  violationsTriggered: number
  complianceTimeMs: number  // time from readback to verification (0 if not verified)
  ```

- [ ] **3.2** Add `atcInstructionScores: ATCInstructionScore[]` to `DrillMetrics` interface

- [ ] **3.3** Export `ATCInstructionScore` from `app/src/types/index.ts`

- [ ] **3.4** Add `recordATCInstructionScore()` to `app/src/stores/assessment-store.ts`
  - Appends to `currentDrillMetrics.atcInstructionScores`
  - Initialize `atcInstructionScores: []` in `initDrillMetrics`

- [ ] **3.5** Route enriched data in `app/src/services/scenario-runner.ts`
  - In `case 'atc_instruction':` block: construct `ATCInstructionScore` from `result.details`, call `assessment.recordATCInstructionScore(score)`

- [ ] **3.6** Update `computeOverallScore()` in `app/src/lib/scoring.ts`
  - If `atcInstructionScores` has entries with non-empty `actionResults` and `cockpitVerified === false`: apply 0.85x penalty to readback weight
  - Guard: only when `atcInstructionScores.length > 0` (doesn't break other drills)

- [ ] **3.7** Update `computeFPM()` in `app/src/lib/scoring.ts`
  - When `atcInstructionScores` exist alongside `interactiveCockpitScores`:
    - `atcCompliancePct * 0.2 + touchPct * 0.3 + interactivePct * 0.5`
  - Guard: only when `atcInstructionScores.length > 0`

- [ ] **3.8** Validation: `npx tsc --noEmit` ✓ | `pnpm lint` ✓ | `pnpm build` ✓

- [ ] **3.9** Manual test: complete drill without cockpit actions → lower overall score than with

---

## Step 4: LLM Instructor Narrative (New Edge Function)

> Post-drill LLM narrative reads enriched telemetry and produces instructor-quality feedback. Displayed alongside algorithmic scores — scores are source of truth, narrative is presentation layer.

**Depends on**: Step 3 (enriched `DrillMetrics`).

### Tasks

- [ ] **4.1** Create `supabase/functions/assessment-narrative/index.ts`
  - Follow exact pattern of `supabase/functions/atc/index.ts` (CORS, OPTIONS, POST-only, env var check)
  - Model: `gpt-4o-mini`, `max_tokens: 768`
  - Request payload: `{ drillTitle, drillDescription, overallScore, cbta, elapsedSeconds, atcInstructionScores, interactiveCockpitScores, readbackSummary }`
  - System prompt rules:
    - "You are a CBTA flight instructor reviewing simulator telemetry"
    - "Physical actions override verbal statements. If cockpitVerified is false, the pilot failed to execute."
    - "Reference specific CBTA competencies (COM, FPM, SAW, PSD, WLM, KNO)"
    - "Under 200 words. Professional aviation training language."
  - Returns JSON: `{ narrative, strengths: string[], improvements: string[] }`

- [ ] **4.2** Create `app/src/services/narrative-engine.ts`
  - `generateInstructorNarrative(metrics, drill, cbta, elapsedSeconds)` → `{ narrative, strengths, improvements } | null`
  - Calls `supabase.functions.invoke('assessment-narrative', { body })`
  - Fallback when Supabase not configured: template-based static narrative from metrics

- [ ] **4.3** Add narrative state to `app/src/stores/assessment-store.ts`
  - `instructorNarrative: { narrative, strengths, improvements } | null`
  - `narrativeLoading: boolean`
  - `setInstructorNarrative()` and `setNarrativeLoading()` actions
  - Clear both in `reset()` and `initDrillMetrics()`

- [ ] **4.4** Trigger narrative in `app/src/services/assessment-engine.ts`
  - In `finalizeDrillAssessment()`, after computing scores: fire-and-forget call to `generateInstructorNarrative()`
  - Set `narrativeLoading = true` before, `false` in `.finally()`

- [ ] **4.5** Add narrative section to `app/src/components/drill/DrillOutcome.tsx`
  - Between CBTA chips and readback details
  - Loading state: pulsing skeleton "Generating instructor assessment..."
  - Loaded state: narrative paragraph + two-column strengths/improvements
  - Styled with `border-anthem-border, bg-anthem-bg-tertiary` pattern

- [ ] **4.6** Deploy Edge Function via Supabase MCP `deploy_edge_function`

- [ ] **4.7** Validation: `npx tsc --noEmit` ✓ | `pnpm lint` ✓ | `pnpm build` ✓

- [ ] **4.8** Manual test: complete drill → narrative loads in 1-3s → displays correctly

- [ ] **4.9** Manual test: no OPENAI_API_KEY → graceful fallback

---

## Execution Order

```
Step 1  →  Step 2  →  Step 3  →  Step 4
 │            │           │           │
 └─ headless  └─ timers   └─ scoring  └─ LLM
    store-to-    to store     enriched    narrative
    store                     payload
```

## Files Changed Summary

| File | Steps | Action |
|------|-------|--------|
| `app/src/lib/cockpit-action-utils.ts` | 1 | Modify — export CockpitSnapshot, add batch evaluator |
| `app/src/stores/scenario-store.ts` | 1, 2 | Modify — module-scoped handles, verification + timer subsystems |
| `app/src/components/drill/DrillActiveView.tsx` | 1 | Modify — trigger verification on readback, pending UI |
| `app/src/hooks/useInteractiveCockpitTracker.ts` | 2 | Modify — remove 3 effects, delegate to store |
| `app/src/types/assessment.ts` | 3 | Modify — add ATCInstructionScore, extend DrillMetrics |
| `app/src/types/index.ts` | 3 | Modify — export new type |
| `app/src/stores/assessment-store.ts` | 3, 4 | Modify — add recording method + narrative state |
| `app/src/services/scenario-runner.ts` | 3 | Modify — build + record ATCInstructionScore |
| `app/src/lib/scoring.ts` | 3 | Modify — adjust computeOverallScore + computeFPM |
| `supabase/functions/assessment-narrative/index.ts` | 4 | **Create** — new Edge Function |
| `app/src/services/narrative-engine.ts` | 4 | **Create** — client service |
| `app/src/services/assessment-engine.ts` | 4 | Modify — trigger narrative generation |
| `app/src/components/drill/DrillOutcome.tsx` | 4 | Modify — render narrative section |

## Documentation Updates (post-implementation)

- `ARCHITECTURE.md` — Add new files to directory structure
- `docs/arch-drill-system.md` — Document headless verification, store-to-store subscriptions
- `docs/arch-assessment.md` — Document ATCInstructionScore, scoring weights, LLM narrative
- `docs/arch-supabase.md` — Document assessment-narrative Edge Function
- `docs/arch-data-flows.md` — Document pending verification state machine
