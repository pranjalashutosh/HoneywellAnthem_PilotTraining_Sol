// T4.10 — localStorage offline fallback with sync queue

import { isSupabaseConfigured } from '@/lib/supabase';
import type { PilotProfile, DrillResult, CognitiveLoadBaseline } from '@/types';

const KEYS = {
  pilots: 'hpt-pilots',
  drillResults: 'hpt-drill-results',
  baselines: 'hpt-baselines',
  syncQueue: 'hpt-sync-queue',
} as const;

interface SyncQueueEntry {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert';
  payload: Record<string, unknown>;
  timestamp: number;
}

// ─── Generic localStorage helpers ──────────────────────────

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    console.warn(`[storage] Failed to save to localStorage key: ${key}`);
  }
}

// ─── Sync Queue ────────────────────────────────────────────

export function addToSyncQueue(entry: Omit<SyncQueueEntry, 'id' | 'timestamp'>): void {
  const queue = load<SyncQueueEntry>(KEYS.syncQueue);
  queue.push({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  save(KEYS.syncQueue, queue);
}

export function getSyncQueue(): SyncQueueEntry[] {
  return load<SyncQueueEntry>(KEYS.syncQueue);
}

export function clearSyncQueue(): void {
  save<SyncQueueEntry>(KEYS.syncQueue, []);
}

// ─── Offline Pilot Storage ─────────────────────────────────

export function loadLocalPilots(): PilotProfile[] {
  return load<PilotProfile>(KEYS.pilots);
}

export function saveLocalPilots(pilots: PilotProfile[]): void {
  save(KEYS.pilots, pilots);
}

// ─── Offline Drill Results ─────────────────────────────────

export function loadLocalDrillResults(pilotId: string): DrillResult[] {
  return load<DrillResult>(KEYS.drillResults).filter(
    (r) => r.pilotId === pilotId,
  );
}

export function saveLocalDrillResult(result: DrillResult): void {
  const all = load<DrillResult>(KEYS.drillResults);
  all.push(result);
  save(KEYS.drillResults, all);
}

// ─── Offline Baselines ─────────────────────────────────────

export function loadLocalBaseline(pilotId: string): CognitiveLoadBaseline | null {
  const baselines = load<CognitiveLoadBaseline>(KEYS.baselines);
  return baselines.find((b) => b.pilotId === pilotId) ?? null;
}

export function saveLocalBaseline(baseline: CognitiveLoadBaseline): void {
  const baselines = load<CognitiveLoadBaseline>(KEYS.baselines);
  const idx = baselines.findIndex((b) => b.pilotId === baseline.pilotId);
  if (idx >= 0) {
    baselines[idx] = baseline;
  } else {
    baselines.push(baseline);
  }
  save(KEYS.baselines, baselines);
}

// ─── Active Pilot Persistence ─────────────────────────────

export function saveActivePilotId(id: string): void {
  localStorage.setItem('hpt-active-pilot-id', id);
}

export function loadActivePilotId(): string | null {
  return localStorage.getItem('hpt-active-pilot-id');
}

// ─── Online status ─────────────────────────────────────────

export function isOnline(): boolean {
  return isSupabaseConfigured() && navigator.onLine;
}
