# Honeywell Anthem Cockpit — Pilot Training Prototype

---

## Context Loading Protocol (MANDATORY)

**Before writing ANY code**, Claude MUST read:

1. **`knowledge_map.md`** — Read FIRST. File catalog grouped by feature pipeline. Use to locate files, understand relationships, avoid duplicates.

**After reading**, Claude must:
- Understand the file landscape before making changes
- Use the knowledge map to identify which files to read and modify for any given task
- Read actual source files directly — code is the source of truth

2. **`ARCHITECTURE.md`** — Read when: (a) user explicitly asks, (b) working on a new subsystem, or (c) need tech stack, design rationale, data flows, or integration specs. Contains: system diagrams, tech stack, directory structure, store design, drill schema, assessment engine, CSS theme, Supabase backend, approved commands.

3. **Reference-only** (read if asked): `implementation_plan.md`, `implementation_tasks.md`, `Metrics_research.md`, `brain_StormDocuments/`

---

## Validation Loop (MANDATORY after every code change)

After writing or modifying code, Claude MUST run this validation loop before marking any task complete:

```
┌─────────────────────────────────────┐
│  1. TypeScript Compile Check        │
│     cd app && npx tsc --noEmit      │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  2. Lint Check                      │
│     cd app && pnpm lint             │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  3. Build Check                     │
│     cd app && pnpm build            │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  4. Test Check (if tests exist)     │
│     cd app && pnpm test             │
│              ↓                      │
│     ❌ Fix errors → restart loop    │
│     ✅ Continue                     │
├─────────────────────────────────────┤
│  5. Mark task(s) [x] in            │
│     implementation_tasks.md         │
│              ↓                      │
│  6. Update Progress Summary table   │
│     in implementation_tasks.md      │
└─────────────────────────────────────┘
```

**Rules:**
- The loop runs until ALL checks pass with zero errors
- If a check fails, fix the issue and restart FROM STEP 1 (not just the failing step)
- Never mark a task `[x]` until the full loop passes
- Never skip lint or build — even for "small changes"
- If lint/build tooling is not yet set up (Phase 0), run only `npx tsc --noEmit`
- Log which validation steps passed in the commit message body if relevant

---

## Documentation Consistency (MANDATORY after every code change)

After completing code work (and after the Validation Loop passes), Claude MUST check and update:

1. **`knowledge_map.md`** — If any files were **created, renamed, moved, or deleted**, update the knowledge map to reflect the change. Add new files under the correct feature pipeline group with a one-line description. Remove entries for deleted files.

2. **`ARCHITECTURE.md`** — If the code change introduces something **not already documented** in ARCHITECTURE.md, update the relevant section. This includes:
   - New subsystems, services, or modules
   - New data flows or integration points
   - New stores, types, or API endpoints
   - Changes to the directory structure
   - New dependencies or tech stack additions
   - New or changed Supabase tables, Edge Functions, or RPC functions

**Rules:**
- Do NOT update these docs for routine bug fixes or minor edits to existing files
- DO update for any structural change: new files, new patterns, new integrations
- When in doubt, update — stale docs are worse than a small extra write
- Keep entries concise and consistent with the existing style in each document

---

## MCP Tools — Development Workflow

Two MCP servers are connected via `.mcp.json`. Claude MUST use these proactively during development instead of asking the user to run commands manually or writing files that require manual deployment.

### Available Servers

| Server | Purpose |
|--------|---------|
| **fetch** | Retrieve web pages, API docs, external references |
| **supabase-mcp** | Manage Supabase: database schema, Edge Functions, types, logs |

### Supabase MCP — When to Use

**Database schema work:**
- `apply_migration` — Create/alter tables. Prefer this over writing SQL files and telling the user to run them manually.
- `list_tables` — Verify deployed schema matches ARCHITECTURE.md before and after changes.
- `execute_sql` — Seed test data, run analytics queries, verify data integrity, test RPC functions.
- `list_migrations` — Check what migrations exist before creating new ones to avoid conflicts.
- `list_extensions` — Verify required PostgreSQL extensions (e.g., `uuid-ossp`, `pgcrypto`) are enabled.

**Edge Functions:**
- `deploy_edge_function` — Deploy functions (Claude API proxy, LiveKit token generation, etc.).
- `get_edge_function` — Inspect currently deployed function code.
- `list_edge_functions` — See what's deployed before creating or updating functions.

**Type generation:**
- `generate_typescript_types` — Run after every migration to keep `src/types/` in sync with the database schema.

**Project credentials:**
- `get_project_url` + `get_publishable_keys` — Retrieve `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for `.env` setup.

**Monitoring & debugging:**
- `get_logs` — Check Edge Function execution logs when debugging server-side issues.
- `get_advisors` — Get database performance and security recommendations.

**Branching (preview environments):**
- `create_branch` / `merge_branch` — Test schema changes in isolation before applying to the main database.

**Documentation lookup:**
- `search_docs` — Search Supabase documentation for API usage, RLS policies, Edge Function patterns, etc.

### Fetch MCP — When to Use

- Looking up LiveKit, Deepgram, ElevenLabs, or Supabase documentation pages
- Checking API references when implementing integrations
- Fetching any external resource referenced in implementation tasks or ARCHITECTURE.md

### MCP Workflow Rules

- **Prefer MCP over manual CLI** — use Supabase MCP tools instead of asking the user to run `supabase` CLI commands
- **Verify after mutations** — after `apply_migration`, confirm with `list_tables` or `execute_sql`
- **Generate types after schema changes** — always run `generate_typescript_types` after applying a migration
- **Check before creating** — use `list_tables` / `list_migrations` before writing new migrations to avoid conflicts
- **Use `search_docs` before guessing** — when unsure about Supabase API usage, query the docs via MCP first

---

## Git Commit Protocol (MANDATORY)

### Commit Message Format

Use **Conventional Commits** with scope:

```
<type>(<scope>): <concise description>

<optional body — what and why, not how>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Types
| Type | When to use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `style` | Formatting, CSS, no logic change |
| `test` | Adding or updating tests |
| `chore` | Build config, tooling, dependency updates |
| `perf` | Performance improvement |

### Scopes (match project domains)
| Scope | Covers |
|-------|--------|
| `scaffold` | Project setup, config, build tooling |
| `types` | TypeScript type definitions |
| `stores` | Zustand store implementations |
| `ui` | Shared components, theme |
| `layout` | TopNavBar, CockpitShell, StatusBar |
| `cockpit` | Cockpit panels, controls |
| `data` | Static data (flight plans, frequencies, drills) |
| `telemetry` | Anthem telemetry abstraction |
| `db` | Supabase schema, migrations, seed data |
| `edge` | Supabase Edge Functions |
| `api` | api-client, Supabase integration |
| `drills` | Drill definitions |
| `drill-ui` | Drill UI components |
| `drill-engine` | Scenario runner, drill hooks |
| `agent` | Python LiveKit agent |
| `livekit` | LiveKit client, room hooks |
| `voice` | Voice UI components |
| `assessment` | Assessment engine, scoring |
| `dashboard` | Assessment dashboard charts |
| `integration` | End-to-end wiring, degradation |

### Commit Frequency Rules
- **Commit after each logical unit of work** — typically after completing a group of related tasks (see suggested commits in `implementation_tasks.md`)
- **Never commit broken code** — the validation loop must pass before committing
- **Never bundle unrelated changes** — one concern per commit
- **Stage specific files** — use `git add <file>` not `git add .` or `git add -A`
- **Include task IDs in commit body** when helpful: `Implements T0.1-T0.11`
- **Keep subject line under 72 characters**

### Commit Cadence by Phase
Each phase in `implementation_tasks.md` has suggested commit points marked with **"Commit:"** lines. Follow these natural break points. If a phase is large, prefer multiple smaller commits over one large one.

### Example Commits
```
feat(types): add complete TypeScript type system for all domain models

Define interfaces for cockpit, scenario, assessment, voice, cognitive-load,
latency, pilot, ATC, and analytics domains. All types compile under strict
mode with zero errors.

Implements T1.1-T1.10

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

```
feat(cockpit): add FlightPlan and Radios panels with waypoint and frequency editing

FlightPlanPanel renders scrollable waypoint list from cockpit-store.
RadiosPanel shows active/standby frequencies with swap functionality.
FrequencyTuner steps by 0.025 MHz with numpad direct entry.

Implements T3.1-T3.5
Validation: tsc ✓ | lint ✓ | build ✓

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

```
fix(assessment): exclude low-confidence STT words from readback scoring

Words with Deepgram confidence < 0.60 were incorrectly penalizing pilots.
Now excluded per confidence tier rules (ARCHITECTURE.md assessment engine).

Fixes T7.11
Validation: tsc ✓ | lint ✓ | build ✓ | test ✓

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Constraints

- Must work for **Part 91 and Part 135 operators** — AQP (Part 121 only) is not the default pathway
- **Instructor authority is non-negotiable** — AI assessment is decision-support only
- Anthem is **not yet certified** — no FSB activity, qualified FTD, or formal transition syllabus exists
- Training approach should build progressively: **Epic → Epic 3.0 → Anthem**
- This is a **prototype** — Supabase persistence, no authentication, trust-based pilot identity
- Must work on **touch screens** (large monitors + tablets)
- Be **technically honest** about what is achievable today vs. what requires further development
- **Cognitive load measurement uses per-speaker baseline calibration** — no cross-pilot comparisons of raw biomarker values are valid
- **Readback scoring must use confidence-weighted assessment** — low-confidence STT words must not penalize pilots
- **Response latency scoring must use locally-measured values** — not network-dependent timestamps
- **Population analytics require pilot profiles** — no auth, but centralized server-side storage is required
