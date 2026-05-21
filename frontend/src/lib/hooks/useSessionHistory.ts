'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useHistoryStore, ExamHistoryEntry } from '@/lib/store/historyStore';
import { api, SessionListItem, AnalyticsSummary } from '@/lib/api';

export interface SessionStats {
    total: number;
    passed: number;
    avgScore: number;
    totalTimeHours: number;
    passRate: number;
    weakDomains: Array<{ domain_id: string; domain_name: string; avg_score: number }>;
}

const defaultStats: SessionStats = {
    total: 0,
    passed: 0,
    avgScore: 0,
    totalTimeHours: 0,
    passRate: 0,
    weakDomains: [],
};

function serverSessionToHistory(session: SessionListItem): ExamHistoryEntry {
    return {
        id: session.id,
        examTitle: session.exam_title,
        mode: session.mode as 'timed' | 'training',
        score: session.score ?? 0,
        passed: session.passed ?? false,
        totalQuestions: session.total_questions ?? 0,
        correctAnswers: session.correct_answers ?? 0,
        completedAt: session.end_time ?? session.start_time,
    };
}

export function useSessionHistory() {
    const { isAuthenticated } = useAuth();
    const localStore = useHistoryStore();

    const [serverHistory, setServerHistory] = useState<ExamHistoryEntry[]>([]);
    const [serverStats, setServerStats] = useState<SessionStats>(defaultStats);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchServerData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const [sessionsResult, analyticsResult] = await Promise.all([
                api.listSessions(),
                api.getAnalyticsSummary(),
            ]);

            if (sessionsResult.data) {
                // Only include completed sessions (with end_time)
                const completed = sessionsResult.data.filter(s => s.end_time !== null);
                setServerHistory(completed.map(serverSessionToHistory));
            }

            if (analyticsResult.data) {
                const a = analyticsResult.data;
                setServerStats({
                    total: a.total_exams,
                    passed: Math.round(a.total_exams * a.pass_rate / 100),
                    avgScore: a.average_score,
                    totalTimeHours: a.total_time_hours,
                    passRate: a.pass_rate,
                    weakDomains: a.weak_domains,
                });
            }
        } catch (error) {
            console.error('Failed to fetch session history:', error);
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated && !hasFetched) {
            fetchServerData();
        }
    }, [isAuthenticated, hasFetched, fetchServerData]);

    // Reset when auth state changes
    useEffect(() => {
        if (!isAuthenticated) {
            setServerHistory([]);
            setServerStats(defaultStats);
            setHasFetched(false);
        }
    }, [isAuthenticated]);

    if (isAuthenticated) {
        return {
            history: serverHistory,
            stats: serverStats,
            isLoading,
            refresh: fetchServerData,
        };
    }

    // Guest: use local store
    const localStats = localStore.getStats();
    return {
        history: localStore.history,
        stats: {
            ...defaultStats,
            total: localStats.total,
            passed: localStats.passed,
            avgScore: localStats.avgScore,
        },
        isLoading: false,
        refresh: async () => {},
    };
}
