// T1.14 + T4.12 — Assessment store: wired to Supabase via api-client

import { create } from 'zustand';
import type {
  DrillMetrics,
  DrillResult,
  CBTAScores,
  ReadbackScore,
  DecisionScore,
  TrapScore,
  TouchScore,
  InteractiveCockpitScore,
  CognitiveLoadBaseline,
  CognitiveLoadScore,
} from '@/types';
import * as api from '@/services/api-client';
import { isOnline, loadLocalDrillResults, saveLocalDrillResult, loadLocalBaseline, saveLocalBaseline } from '@/lib/storage';

interface AssessmentStore {
  currentDrillMetrics: DrillMetrics | null;
  sessionHistory: DrillResult[];
  cbta: CBTAScores;
  cognitiveLoadBaseline: CognitiveLoadBaseline | null;
  currentEventCognitiveLoad: CognitiveLoadScore[];
  activePilotId: string | null;
  activeSessionId: string | null;

  recordReadbackScore: (score: ReadbackScore) => void;
  recordCognitiveLoadScore: (score: CognitiveLoadScore) => void;
  recordDecisionScore: (score: DecisionScore) => void;
  recordTrapScore: (score: TrapScore) => void;
  recordTouchScore: (score: TouchScore) => void;
  recordInteractiveCockpitScore: (score: InteractiveCockpitScore) => void;
  initDrillMetrics: (drillId: string) => void;
  finalizeDrillMetrics: () => void;
  setCBTA: (scores: CBTAScores) => void;
  setCognitiveLoadBaseline: (baseline: CognitiveLoadBaseline) => void;
  setActivePilotId: (pilotId: string | null) => void;
  loadFromServer: (pilotId: string) => Promise<void>;
  saveToServer: () => Promise<void>;
  reset: () => void;
}

const defaultCBTA: CBTAScores = {
  COM: 0,
  WLM: 0,
  SAW: 0,
  KNO: 0,
  PSD: 0,
  FPM: 0,
};

const defaultState = {
  currentDrillMetrics: null as DrillMetrics | null,
  sessionHistory: [] as DrillResult[],
  cbta: { ...defaultCBTA },
  cognitiveLoadBaseline: null as CognitiveLoadBaseline | null,
  currentEventCognitiveLoad: [] as CognitiveLoadScore[],
  activePilotId: null as string | null,
  activeSessionId: null as string | null,
};

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  ...defaultState,

  initDrillMetrics: (drillId) =>
    set({
      currentDrillMetrics: {
        drillId,
        readbackScores: [],
        decisionScores: [],
        trapScores: [],
        touchScores: [],
        interactiveCockpitScores: [],
        cognitiveLoadScores: [],
        overallScore: 0,
        completedAt: 0,
      },
      currentEventCognitiveLoad: [],
    }),

  recordReadbackScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          readbackScores: [...state.currentDrillMetrics.readbackScores, score],
        },
      };
    }),

  recordCognitiveLoadScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          cognitiveLoadScores: [
            ...state.currentDrillMetrics.cognitiveLoadScores,
            score,
          ],
        },
        currentEventCognitiveLoad: [
          ...state.currentEventCognitiveLoad,
          score,
        ],
      };
    }),

  recordDecisionScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          decisionScores: [
            ...state.currentDrillMetrics.decisionScores,
            score,
          ],
        },
      };
    }),

  recordTrapScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          trapScores: [...state.currentDrillMetrics.trapScores, score],
        },
      };
    }),

  recordTouchScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          touchScores: [...state.currentDrillMetrics.touchScores, score],
        },
      };
    }),

  recordInteractiveCockpitScore: (score) =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          interactiveCockpitScores: [
            ...state.currentDrillMetrics.interactiveCockpitScores,
            score,
          ],
        },
      };
    }),

  finalizeDrillMetrics: () =>
    set((state) => {
      if (!state.currentDrillMetrics) return state;
      return {
        currentDrillMetrics: {
          ...state.currentDrillMetrics,
          completedAt: Date.now(),
        },
      };
    }),

  setCBTA: (scores) => set({ cbta: scores }),

  setCognitiveLoadBaseline: (baseline) =>
    set({ cognitiveLoadBaseline: baseline }),

  setActivePilotId: (pilotId) => set({ activePilotId: pilotId }),

  loadFromServer: async (pilotId: string) => {
    set({ activePilotId: pilotId });

    if (isOnline()) {
      try {
        const [history, baseline] = await Promise.all([
          api.fetchDrillHistory(pilotId),
          api.fetchBaseline(pilotId),
        ]);

        // Derive CBTA from most recent drill result
        const latest = history[history.length - 1];
        const cbta = latest ? latest.cbta : { ...defaultCBTA };

        set({
          sessionHistory: history,
          cbta,
          cognitiveLoadBaseline: baseline,
        });
        return;
      } catch (err) {
        console.warn('[assessment-store] Supabase load failed, using local:', err);
      }
    }

    // Offline fallback
    const localHistory = loadLocalDrillResults(pilotId);
    const localBaseline = loadLocalBaseline(pilotId);
    const latest = localHistory[localHistory.length - 1];
    set({
      sessionHistory: localHistory,
      cbta: latest ? latest.cbta : { ...defaultCBTA },
      cognitiveLoadBaseline: localBaseline,
    });
  },

  saveToServer: async () => {
    const state = get();
    if (!state.currentDrillMetrics || !state.activePilotId) return;

    // Try to persist to server first to get a valid session ID
    let sessionId = state.activeSessionId ?? '';

    if (isOnline()) {
      try {
        // Create session if needed
        if (!sessionId) {
          sessionId = await api.createSession(state.activePilotId);
          set({ activeSessionId: sessionId });
        }

        // Compute aggregate transcript confidence and WER from readback scores
        const readbacks = state.currentDrillMetrics.readbackScores;
        const transcriptConfidence = readbacks.length > 0
          ? readbacks.reduce((s, r) => s + r.transcriptConfidence, 0) / readbacks.length
          : null;
        const estimatedWer = readbacks.length > 0
          ? readbacks.reduce((s, r) => s + r.estimatedWER, 0) / readbacks.length
          : null;

        await api.saveDrillResult({
          sessionId,
          pilotId: state.activePilotId,
          drillId: state.currentDrillMetrics.drillId,
          overallScore: state.currentDrillMetrics.overallScore,
          metrics: state.currentDrillMetrics,
          cbta: state.cbta,
          cognitiveLoad: state.currentDrillMetrics.cognitiveLoadScores,
          transcriptConfidence,
          estimatedWer,
        });

        if (state.cognitiveLoadBaseline) {
          await api.saveCognitiveLoadBaseline(state.cognitiveLoadBaseline);
        }
      } catch (err) {
        console.warn('[assessment-store] Supabase save failed:', err);
      }
    }

    const result: DrillResult = {
      id: crypto.randomUUID(),
      pilotId: state.activePilotId,
      drillId: state.currentDrillMetrics.drillId,
      metrics: state.currentDrillMetrics,
      cbta: state.cbta,
      sessionId,
      timestamp: Date.now(),
      instructorOverride: null,
    };

    // Always save locally as fallback
    saveLocalDrillResult(result);

    if (state.cognitiveLoadBaseline) {
      saveLocalBaseline(state.cognitiveLoadBaseline);
    }

    set((s) => ({
      sessionHistory: [...s.sessionHistory, result],
    }));
  },

  reset: () => set(defaultState),
}));
