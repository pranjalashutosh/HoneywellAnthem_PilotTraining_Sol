-- 001_initial_schema.sql
-- Honeywell Anthem Cockpit Pilot Training Prototype
-- Tables: pilots, sessions, drill_results, readback_scores, cognitive_load_baselines
-- RPC: population_cbta_baseline(), pilot_percentile_rank()

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- PILOTS
------------------------------------------------------------
CREATE TABLE pilots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  accent_group  TEXT NOT NULL CHECK (accent_group IN (
    'native_us', 'native_uk', 'native_aus',
    'south_asian', 'east_asian', 'european',
    'middle_eastern', 'latin_american', 'african', 'other'
  )),
  experience_level TEXT NOT NULL CHECK (experience_level IN (
    'student', 'low_time', 'mid_time', 'high_time', 'atp'
  )),
  total_hours       INT NOT NULL DEFAULT 0,
  anthem_hours      INT NOT NULL DEFAULT 0,
  previous_platform TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- SESSIONS
------------------------------------------------------------
CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pilot_id    UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  drill_count INT NOT NULL DEFAULT 0
);

------------------------------------------------------------
-- DRILL RESULTS
------------------------------------------------------------
CREATE TABLE drill_results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  pilot_id              UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  drill_id              TEXT NOT NULL,
  overall_score         FLOAT NOT NULL DEFAULT 0,
  metrics_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  cbta_scores_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  cognitive_load_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript_confidence FLOAT,
  estimated_wer         FLOAT,
  instructor_override_json JSONB,
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- READBACK SCORES
------------------------------------------------------------
CREATE TABLE readback_scores (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drill_result_id             UUID NOT NULL REFERENCES drill_results(id) ON DELETE CASCADE,
  pilot_id                    UUID NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  event_index                 INT NOT NULL,
  raw_accuracy                FLOAT NOT NULL,
  confidence_adjusted_accuracy FLOAT NOT NULL,
  latency_raw_ms              FLOAT NOT NULL,
  latency_adjusted_ms         FLOAT NOT NULL,
  scoring_basis               TEXT NOT NULL CHECK (scoring_basis IN (
    'confident', 'uncertain', 'abstained'
  )),
  confidence_words_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- COGNITIVE LOAD BASELINES (one per pilot)
------------------------------------------------------------
CREATE TABLE cognitive_load_baselines (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pilot_id              UUID NOT NULL UNIQUE REFERENCES pilots(id) ON DELETE CASCADE,
  sample_count          INT NOT NULL DEFAULT 0,
  f0_mean               FLOAT NOT NULL DEFAULT 0,
  f0_std                FLOAT NOT NULL DEFAULT 0,
  f0_range_mean         FLOAT NOT NULL DEFAULT 0,
  intensity_mean        FLOAT NOT NULL DEFAULT 0,
  intensity_std         FLOAT NOT NULL DEFAULT 0,
  speech_rate_mean      FLOAT NOT NULL DEFAULT 0,
  speech_rate_std       FLOAT NOT NULL DEFAULT 0,
  disfluency_rate_mean  FLOAT NOT NULL DEFAULT 0,
  disfluency_rate_std   FLOAT NOT NULL DEFAULT 0,
  is_calibrated         BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- INDEXES (T4.2)
------------------------------------------------------------
CREATE INDEX idx_sessions_pilot_id ON sessions(pilot_id);
CREATE INDEX idx_drill_results_pilot_id ON drill_results(pilot_id);
CREATE INDEX idx_drill_results_drill_id ON drill_results(drill_id);
CREATE INDEX idx_drill_results_session_id ON drill_results(session_id);
CREATE INDEX idx_readback_scores_drill_result_id ON readback_scores(drill_result_id);
CREATE INDEX idx_readback_scores_pilot_id ON readback_scores(pilot_id);

------------------------------------------------------------
-- RPC: population_cbta_baseline (T4.3)
-- Returns P25/P50/P75 for each CBTA competency,
-- filtered by accent group and experience level.
-- Pass NULL to skip a filter.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION population_cbta_baseline(
  accent_group_filter TEXT DEFAULT NULL,
  experience_level_filter TEXT DEFAULT NULL
)
RETURNS TABLE (competency TEXT, p25 FLOAT, p50 FLOAT, p75 FLOAT, sample_size BIGINT) AS $$
  SELECT
    t.competency,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY t.score::float) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY t.score::float) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY t.score::float) AS p75,
    COUNT(*)::BIGINT AS sample_size
  FROM (
    SELECT
      (jsonb_each_text(dr.cbta_scores_json)).key   AS competency,
      (jsonb_each_text(dr.cbta_scores_json)).value  AS score
    FROM drill_results dr
    JOIN pilots p ON dr.pilot_id = p.id
    WHERE (accent_group_filter IS NULL OR p.accent_group = accent_group_filter)
      AND (experience_level_filter IS NULL OR p.experience_level = experience_level_filter)
  ) t
  GROUP BY t.competency;
$$ LANGUAGE sql STABLE;

------------------------------------------------------------
-- RPC: pilot_percentile_rank (T4.4)
-- Returns the pilot's percentile rank for each CBTA
-- competency within a filtered cohort.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION pilot_percentile_rank(
  target_pilot_id UUID,
  accent_group_filter TEXT DEFAULT NULL,
  experience_level_filter TEXT DEFAULT NULL
)
RETURNS TABLE (competency TEXT, rank FLOAT, total_pilots BIGINT) AS $$
  WITH pilot_latest AS (
    -- Get each pilot's most recent drill result with CBTA scores
    SELECT DISTINCT ON (dr.pilot_id)
      dr.pilot_id,
      dr.cbta_scores_json
    FROM drill_results dr
    JOIN pilots p ON dr.pilot_id = p.id
    WHERE (accent_group_filter IS NULL OR p.accent_group = accent_group_filter)
      AND (experience_level_filter IS NULL OR p.experience_level = experience_level_filter)
      AND dr.cbta_scores_json != '{}'::jsonb
    ORDER BY dr.pilot_id, dr.completed_at DESC
  ),
  expanded AS (
    SELECT
      pl.pilot_id,
      (jsonb_each_text(pl.cbta_scores_json)).key   AS competency,
      (jsonb_each_text(pl.cbta_scores_json)).value::float AS score
    FROM pilot_latest pl
  ),
  ranked AS (
    SELECT
      e.competency,
      e.pilot_id,
      PERCENT_RANK() OVER (PARTITION BY e.competency ORDER BY e.score) * 100.0 AS rank,
      COUNT(*) OVER (PARTITION BY e.competency) AS total_pilots
    FROM expanded e
  )
  SELECT
    r.competency,
    r.rank,
    r.total_pilots
  FROM ranked r
  WHERE r.pilot_id = target_pilot_id;
$$ LANGUAGE sql STABLE;
