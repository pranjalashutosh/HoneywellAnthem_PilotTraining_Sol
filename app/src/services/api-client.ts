// T4.9 — Supabase API client
// All CRUD operations + RPC calls for population analytics

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  PilotProfile,
  AccentGroup,
  ExperienceLevel,
  DrillResult,
  CBTAScores,
  ReadbackScore,
  CognitiveLoadBaseline,
  PopulationBaseline,
  PercentileRank,
  DrillMetrics,
} from '@/types';

// ─── Helpers ───────────────────────────────────────────────

function toSnakeCase(profile: Omit<PilotProfile, 'id' | 'createdAt' | 'lastActiveAt'>) {
  return {
    name: profile.name,
    accent_group: profile.accentGroup,
    experience_level: profile.experienceLevel,
    total_hours: profile.totalHours,
    anthem_hours: profile.anthemHours,
    previous_platform: profile.previousPlatform,
  };
}

function toPilotProfile(row: Record<string, unknown>): PilotProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    accentGroup: row.accent_group as AccentGroup,
    experienceLevel: row.experience_level as ExperienceLevel,
    totalHours: row.total_hours as number,
    anthemHours: row.anthem_hours as number,
    previousPlatform: row.previous_platform as string,
    createdAt: new Date(row.created_at as string).getTime(),
    lastActiveAt: new Date(row.last_active_at as string).getTime(),
  };
}

// ─── Pilots ────────────────────────────────────────────────

export async function fetchPilots(): Promise<PilotProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('pilots')
    .select('*')
    .order('last_active_at', { ascending: false });

  if (error) throw new Error(`fetchPilots: ${error.message}`);
  return (data ?? []).map(toPilotProfile);
}

export async function createPilot(
  profile: Omit<PilotProfile, 'id' | 'createdAt' | 'lastActiveAt'>,
): Promise<PilotProfile> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('pilots')
    .insert(toSnakeCase(profile))
    .select()
    .single();

  if (error) throw new Error(`createPilot: ${error.message}`);
  return toPilotProfile(data);
}

export async function updatePilot(
  id: string,
  updates: Partial<Omit<PilotProfile, 'id' | 'createdAt'>>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.accentGroup !== undefined) mapped.accent_group = updates.accentGroup;
  if (updates.experienceLevel !== undefined) mapped.experience_level = updates.experienceLevel;
  if (updates.totalHours !== undefined) mapped.total_hours = updates.totalHours;
  if (updates.anthemHours !== undefined) mapped.anthem_hours = updates.anthemHours;
  if (updates.previousPlatform !== undefined) mapped.previous_platform = updates.previousPlatform;
  if (updates.lastActiveAt !== undefined) mapped.last_active_at = new Date(updates.lastActiveAt).toISOString();

  const { error } = await supabase.from('pilots').update(mapped).eq('id', id);
  if (error) throw new Error(`updatePilot: ${error.message}`);
}

// ─── Sessions ──────────────────────────────────────────────

export async function createSession(pilotId: string): Promise<string> {
  if (!isSupabaseConfigured()) return crypto.randomUUID();

  const { data, error } = await supabase
    .from('sessions')
    .insert({ pilot_id: pilotId })
    .select('id')
    .single();

  if (error) throw new Error(`createSession: ${error.message}`);
  return data.id as string;
}

export async function endSession(sessionId: string, drillCount: number): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString(), drill_count: drillCount })
    .eq('id', sessionId);

  if (error) throw new Error(`endSession: ${error.message}`);
}

// ─── Drill Results ─────────────────────────────────────────

export async function saveDrillResult(result: {
  sessionId: string;
  pilotId: string;
  drillId: string;
  overallScore: number;
  metrics: DrillMetrics;
  cbta: CBTAScores;
  cognitiveLoad: unknown[];
  transcriptConfidence: number | null;
  estimatedWer: number | null;
}): Promise<string> {
  if (!isSupabaseConfigured()) return crypto.randomUUID();

  const { data, error } = await supabase
    .from('drill_results')
    .insert({
      session_id: result.sessionId,
      pilot_id: result.pilotId,
      drill_id: result.drillId,
      overall_score: result.overallScore,
      metrics_json: result.metrics,
      cbta_scores_json: result.cbta,
      cognitive_load_json: result.cognitiveLoad,
      transcript_confidence: result.transcriptConfidence,
      estimated_wer: result.estimatedWer,
    })
    .select('id')
    .single();

  if (error) throw new Error(`saveDrillResult: ${error.message}`);
  return data.id as string;
}

export async function fetchDrillHistory(pilotId: string): Promise<DrillResult[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('drill_results')
    .select('*')
    .eq('pilot_id', pilotId)
    .order('completed_at', { ascending: true });

  if (error) throw new Error(`fetchDrillHistory: ${error.message}`);

  return (data ?? []).map((row) => {
    // Normalize metrics_json — seed data may lack cognitiveLoadScores, drillId, etc.
    const rawMetrics = (row.metrics_json ?? {}) as Partial<DrillMetrics>;
    const metrics: DrillMetrics = {
      drillId: rawMetrics.drillId ?? (row.drill_id as string),
      readbackScores: rawMetrics.readbackScores ?? [],
      decisionScores: rawMetrics.decisionScores ?? [],
      trapScores: rawMetrics.trapScores ?? [],
      touchScores: rawMetrics.touchScores ?? [],
      interactiveCockpitScores: rawMetrics.interactiveCockpitScores ?? [],
      cognitiveLoadScores: rawMetrics.cognitiveLoadScores ?? [],
      overallScore: rawMetrics.overallScore ?? (row.overall_score as number),
      completedAt: rawMetrics.completedAt ?? new Date(row.completed_at as string).getTime(),
    };

    return {
      id: row.id as string,
      pilotId: row.pilot_id as string,
      drillId: row.drill_id as string,
      metrics,
      cbta: row.cbta_scores_json as CBTAScores,
      sessionId: row.session_id as string,
      timestamp: new Date(row.completed_at as string).getTime(),
      instructorOverride: (row.instructor_override_json as Record<string, unknown>) ?? null,
    };
  });
}

// ─── Readback Scores ───────────────────────────────────────

export async function saveReadbackScore(score: {
  drillResultId: string;
  pilotId: string;
  eventIndex: number;
  rawAccuracy: number;
  confidenceAdjustedAccuracy: number;
  latencyRawMs: number;
  latencyAdjustedMs: number;
  scoringBasis: ReadbackScore['scoringBasis'];
  confidenceWords: unknown[];
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.from('readback_scores').insert({
    drill_result_id: score.drillResultId,
    pilot_id: score.pilotId,
    event_index: score.eventIndex,
    raw_accuracy: score.rawAccuracy,
    confidence_adjusted_accuracy: score.confidenceAdjustedAccuracy,
    latency_raw_ms: score.latencyRawMs,
    latency_adjusted_ms: score.latencyAdjustedMs,
    scoring_basis: score.scoringBasis,
    confidence_words_json: score.confidenceWords,
  });

  if (error) throw new Error(`saveReadbackScore: ${error.message}`);
}

// ─── Cognitive Load Baselines ──────────────────────────────

export async function fetchBaseline(pilotId: string): Promise<CognitiveLoadBaseline | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('cognitive_load_baselines')
    .select('*')
    .eq('pilot_id', pilotId)
    .maybeSingle();

  if (error) throw new Error(`fetchBaseline: ${error.message}`);
  if (!data) return null;

  return {
    pilotId: data.pilot_id as string,
    sampleCount: data.sample_count as number,
    f0Mean: data.f0_mean as number,
    f0Std: data.f0_std as number,
    f0RangeMean: data.f0_range_mean as number,
    intensityMean: data.intensity_mean as number,
    intensityStd: data.intensity_std as number,
    speechRateMean: data.speech_rate_mean as number,
    speechRateStd: data.speech_rate_std as number,
    disfluencyRateMean: data.disfluency_rate_mean as number,
    disfluencyRateStd: data.disfluency_rate_std as number,
    isCalibrated: data.is_calibrated as boolean,
  };
}

export async function saveCognitiveLoadBaseline(
  baseline: CognitiveLoadBaseline,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('cognitive_load_baselines')
    .upsert(
      {
        pilot_id: baseline.pilotId,
        sample_count: baseline.sampleCount,
        f0_mean: baseline.f0Mean,
        f0_std: baseline.f0Std,
        f0_range_mean: baseline.f0RangeMean,
        intensity_mean: baseline.intensityMean,
        intensity_std: baseline.intensityStd,
        speech_rate_mean: baseline.speechRateMean,
        speech_rate_std: baseline.speechRateStd,
        disfluency_rate_mean: baseline.disfluencyRateMean,
        disfluency_rate_std: baseline.disfluencyRateStd,
        is_calibrated: baseline.isCalibrated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pilot_id' },
    );

  if (error) throw new Error(`saveCognitiveLoadBaseline: ${error.message}`);
}

// ─── Population Analytics (RPC) ────────────────────────────

export async function fetchPopulationBaseline(
  accentGroup?: string | null,
  experienceLevel?: string | null,
): Promise<PopulationBaseline[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase.rpc('population_cbta_baseline', {
    accent_group_filter: accentGroup ?? null,
    experience_level_filter: experienceLevel ?? null,
  });

  if (error) throw new Error(`fetchPopulationBaseline: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    competency: row.competency as PopulationBaseline['competency'],
    p25: row.p25 as number,
    p50: row.p50 as number,
    p75: row.p75 as number,
    sampleSize: row.sample_size as number,
  }));
}

export async function fetchPilotPercentile(
  pilotId: string,
  accentGroup?: string | null,
  experienceLevel?: string | null,
): Promise<PercentileRank[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase.rpc('pilot_percentile_rank', {
    target_pilot_id: pilotId,
    accent_group_filter: accentGroup ?? null,
    experience_level_filter: experienceLevel ?? null,
  });

  if (error) throw new Error(`fetchPilotPercentile: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    pilotId,
    competency: row.competency as PercentileRank['competency'],
    rank: row.rank as number,
    totalPilots: row.total_pilots as number,
  }));
}

// ─── Instructor Override ───────────────────────────────────

export async function saveInstructorOverride(
  drillResultId: string,
  override: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('drill_results')
    .update({ instructor_override_json: override })
    .eq('id', drillResultId);

  if (error) throw new Error(`saveInstructorOverride: ${error.message}`);
}
