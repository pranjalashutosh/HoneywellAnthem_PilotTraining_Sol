# Change Task Plan 2: Interactive Speed Tape & Heading Tape

## Objective

Make the PFD Speed Tape (left) and Heading Tape (bottom) interactive with drag-to-set bug markers, backed by a headless flight simulation engine.

## Architectural Constraints

- **AC-1: Headless simulation engine** — All physics/convergence logic lives in a module-scoped service (`flight-simulation.ts`), NOT in React hooks. `setInterval` handles are module-scoped variables. Component unmount/re-render cannot kill timers.
- **AC-2: Smooth animation** — 50ms tick rate (~20fps) with proportionally small increments (0.2 kts/tick, 0.2 deg/tick). No 500ms choppy jumps.
- **AC-3: Single consolidated tick** — Altitude, speed, and heading converge in one `tick()` function. One interval, one store read per cycle.
- **AC-4: UI input hooks are React** — `useBugDrag` is a pointer-event handler (UI input), correctly lives as a React hook. It translates drag gestures into store actions.
- **AC-5: Existing altitude simulation migrated** — `useAltitudeSimulation` becomes a thin lifecycle bridge calling `startSimulation()`/`stopSimulation()`. Actual timer logic moves to the headless service.

---

## Step 1: Extend CockpitState types

**Files:** `app/src/types/cockpit.ts`, `app/src/types/scenario.ts`

- [ ] 1.1 Add `desiredSpeed?: number` to `CockpitState` interface
- [ ] 1.2 Add `selectedHeading?: number` to `CockpitState` interface
- [ ] 1.3 Add `'desiredSpeed' | 'selectedHeading'` to `CockpitSuccessCondition.field` union in `scenario.ts`

---

## Step 2: Extend cockpit store

**File:** `app/src/stores/cockpit-store.ts`

- [ ] 2.1 Add `desiredSpeed: number` to `CockpitStore` interface and `defaultState` (default: `280`)
- [ ] 2.2 Add `selectedHeading: number` to `CockpitStore` interface and `defaultState` (default: `360`)
- [ ] 2.3 Add `setDesiredSpeed(spd: number)` action — clamp 0-500
- [ ] 2.4 Add `setSelectedHeading(hdg: number)` action — normalize 0-360
- [ ] 2.5 Add `adjustDesiredSpeed(direction: 'up' | 'down', step?: number)` action — step default 5 kts
- [ ] 2.6 Add `adjustSelectedHeading(direction: 'left' | 'right', step?: number)` action — step default 1 deg, wraps 0/360
- [ ] 2.7 Update `applyCockpitState()` to include `desiredSpeed` and `selectedHeading`
- [ ] 2.8 Update `applyCockpitOverrides()` — already uses spread, but verify fields pass through
- [ ] 2.9 Update `reset()` to include new defaults

---

## Step 3: Create headless flight-simulation service

**New file:** `app/src/services/flight-simulation.ts`

- [ ] 3.1 Create file with module-scoped `simIntervalId` handle (no React imports)
- [ ] 3.2 Define `TICK_MS = 50` constant
- [ ] 3.3 Define altitude rates per mode: `{ VNAV: 200, FLCH: 400, VS: 300 }` ft/s with 200 ft/s default
- [ ] 3.4 Define speed rate: 4 kts/s (0.2 kts/tick at 50ms)
- [ ] 3.5 Define heading rate: 4 deg/s (0.2 deg/tick at 50ms)
- [ ] 3.6 Implement `tick()` function — altitude convergence (with VNAV constraint floor)
- [ ] 3.7 Implement `tick()` — speed convergence (gated by `autoThrottle === true`)
- [ ] 3.8 Implement `tick()` — heading convergence (gated by `selectedMode === 'HDG'`, shortest-arc turning, 0/360 wrap)
- [ ] 3.9 Export `startSimulation()` — creates interval if not already running
- [ ] 3.10 Export `stopSimulation()` — clears interval and nulls handle

---

## Step 4: Deprecate useAltitudeSimulation internal timer

**File:** `app/src/hooks/useAltitudeSimulation.ts`

- [ ] 4.1 Replace internal `setInterval` logic with import of `startSimulation`/`stopSimulation` from flight-simulation service
- [ ] 4.2 Keep the `useAltitudeSimulation(active: boolean)` signature so call sites don't change
- [ ] 4.3 Verify AmbientCockpitView still works without modification

---

## Step 5: Create useBugDrag hook (UI input handler)

**New file:** `app/src/hooks/useBugDrag.ts`

- [ ] 5.1 Define `BugDragConfig` interface: `axis`, `pxPerUnit`, `min`, `max`, `step`, `invert?`, `wrap?`, `currentValue`, `onValueChange`
- [ ] 5.2 Implement `onPointerDown` — call `setPointerCapture` for reliable cross-device dragging
- [ ] 5.3 Implement `onPointerMove` — accumulate pixel delta, convert via `pxPerUnit`, snap to `step`
- [ ] 5.4 Implement clamping (min/max) and wrapping (heading 0<->360)
- [ ] 5.5 Implement `onPointerUp` / `onLostPointerCapture` — release capture
- [ ] 5.6 Return `{ onPointerDown }` handler for SVG element attachment

---

## Step 6: Modify SpeedTape — add drag bug

**File:** `app/src/components/cockpit/pfd/SpeedTape.tsx`

- [ ] 6.1 Add `desiredSpeed` and `onAdjustDesiredSpeed` props to interface
- [ ] 6.2 Compute `desiredY` position: `CENTER_Y + (speed - desiredSpeed) * PX_PER_KNOT`
- [ ] 6.3 Render cyan dashed horizontal line at `desiredY` (clipped to scroll area)
- [ ] 6.4 Render draggable bug triangle on right edge of tape at `desiredY`
- [ ] 6.5 Attach `useBugDrag` to bug: `axis: 'vertical'`, `pxPerUnit: PX_PER_KNOT (7.0)`, `min: 100`, `max: 400`, `step: 5`, `invert: true`
- [ ] 6.6 Update top cap to show `desiredSpeed` (target value) instead of current speed
- [ ] 6.7 Keep current speed displayed in the center pointer box

---

## Step 7: Modify HeadingTape — add drag bug

**File:** `app/src/components/cockpit/pfd/HeadingTape.tsx`

- [ ] 7.1 Add `selectedHeading` and `onAdjustSelectedHeading` props to interface
- [ ] 7.2 Compute bug X position using shortest-arc signed angular difference: `TAPE_W/2 + signedDiff * PX_PER_DEG`
- [ ] 7.3 Render cyan vertical bug line from top of tape with triangle marker
- [ ] 7.4 Attach `useBugDrag`: `axis: 'horizontal'`, `pxPerUnit: PX_PER_DEG (5)`, `min: 0`, `max: 360`, `step: 1`, `wrap: true`
- [ ] 7.5 Show `selectedHeading` label near the bug marker

---

## Step 8: Wire in InteractivePFD

**File:** `app/src/components/cockpit/pfd/InteractivePFD.tsx`

- [ ] 8.1 Add store subscriptions: `desiredSpeed`, `selectedHeading`, `setDesiredSpeed`, `setSelectedHeading`
- [ ] 8.2 Pass `desiredSpeed` + `onAdjustDesiredSpeed` to `SpeedTape`
- [ ] 8.3 Pass `selectedHeading` + `onAdjustSelectedHeading` to `HeadingTape`

---

## Step 9: Update AutopilotControlBar readouts

**File:** `app/src/components/cockpit/AutopilotControlBar.tsx`

- [ ] 9.1 Subscribe to `desiredSpeed` and `selectedHeading` from cockpit store
- [ ] 9.2 Change SPD readout to show `desiredSpeed` instead of current `speed`
- [ ] 9.3 Add HDG readout pill: `HDG 270` in same teal box style as SPD/ALT readouts

---

## Step 10: Update evaluateCondition for new fields

**File:** `app/src/hooks/useInteractiveCockpitTracker.ts`

- [ ] 10.1 Add `case 'desiredSpeed': actual = state.desiredSpeed; break;` to evaluateCondition switch
- [ ] 10.2 Add `case 'selectedHeading': actual = state.selectedHeading; break;` to evaluateCondition switch

---

## Validation (after all steps)

- [ ] V.1 `cd app && npx tsc --noEmit` — zero errors
- [ ] V.2 `cd app && pnpm lint` — zero warnings
- [ ] V.3 `cd app && pnpm build` — clean build
- [ ] V.4 Manual test: Speed Tape shows cyan bug line, drag changes desiredSpeed, SPD readout updates
- [ ] V.5 Manual test: autoThrottle ON causes smooth speed convergence (~20fps)
- [ ] V.6 Manual test: Heading Tape shows cyan bug, drag changes selectedHeading, HDG readout updates
- [ ] V.7 Manual test: HDG mode causes smooth heading convergence with shortest-arc turning
- [ ] V.8 Manual test: Heading wrap-around works (drag past 360->0 boundary)
- [ ] V.9 Manual test: Altitude simulation still works (migrated to headless engine)
- [ ] V.10 Manual test: descent-conflict drill interactive cockpit tracker still evaluates correctly
- [ ] V.11 Update ARCHITECTURE.md with new files
- [ ] V.12 Update relevant docs/arch-*.md if needed
