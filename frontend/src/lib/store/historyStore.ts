/**
 * Local Exam History Store - Zustand with localStorage persistence
 * This is a backup for when backend session storage isn't available (e.g., demo exams)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExamHistoryEntry {
    id: string;
    examTitle: string;
    mode: 'timed' | 'training';
    score: number;
    passed: boolean;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
}

interface HistoryState {
    history: ExamHistoryEntry[];
    addEntry: (entry: Omit<ExamHistoryEntry, 'id' | 'completedAt'>) => void;
    clearHistory: () => void;
    getStats: () => { total: number; passed: number; avgScore: number };
}

export const useHistoryStore = create<HistoryState>()(
    persist(
        (set, get) => ({
            history: [],

            addEntry: (entry) => {
                const newEntry: ExamHistoryEntry = {
                    ...entry,
                    id: crypto.randomUUID(),
                    completedAt: new Date().toISOString(),
                };
                set((state) => ({
                    history: [newEntry, ...state.history].slice(0, 50), // Keep last 50
                }));
            },

            clearHistory: () => set({ history: [] }),

            getStats: () => {
                const { history } = get();
                const total = history.length;
                const passed = history.filter((h) => h.passed).length;
                const avgScore = total > 0
                    ? history.reduce((sum, h) => sum + h.score, 0) / total
                    : 0;
                return { total, passed, avgScore };
            },
        }),
        {
            name: 'virtualexamp-history',
        }
    )
);
