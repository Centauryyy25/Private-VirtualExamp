'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ExamHistoryEntry } from '@/lib/store/historyStore';

interface PerformanceChartProps {
    history: ExamHistoryEntry[];
    timeRange: 30 | 90 | 365;
}

interface ChartDataPoint {
    date: string;
    score: number;
    examTitle: string;
    passed: boolean;
}

export default function PerformanceChart({ history, timeRange }: PerformanceChartProps) {
    const chartData = useMemo(() => {
        // Filter by time range
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeRange);

        const filtered = history
            .filter(entry => new Date(entry.completedAt) >= cutoffDate)
            .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

        // Transform to chart data
        return filtered.map(entry => ({
            date: new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: Math.round(entry.score),
            examTitle: entry.examTitle,
            passed: entry.passed,
        }));
    }, [history, timeRange]);

    if (chartData.length === 0) {
        return (
            <div style={{
                height: '300px',
                background: 'linear-gradient(to bottom, var(--primary-50), white)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--gray-200)',
                gap: 'var(--space-2)'
            }}>
                <p className="text-muted" style={{ fontSize: '1rem' }}>📊 No exam data available</p>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Complete some exams to see your performance trend
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                    dataKey="date"
                    stroke="var(--gray-400)"
                    style={{ fontSize: '0.75rem' }}
                />
                <YAxis
                    domain={[0, 100]}
                    stroke="var(--gray-400)"
                    style={{ fontSize: '0.75rem' }}
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontSize: '0.75rem', fill: 'var(--gray-500)' } }}
                />
                <Tooltip
                    contentStyle={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--gray-300)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        boxShadow: 'var(--shadow-md)'
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                    formatter={(value: number | undefined, name: string, props: any) => {
                        if (value === undefined) return ['', ''];
                        const { payload } = props;
                        return [
                            <div key="tooltip" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontWeight: 700, color: payload.passed ? 'var(--success-600)' : 'var(--error-600)' }}>
                                    {value}%
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                                    {payload.examTitle}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: payload.passed ? 'var(--success-600)' : 'var(--error-600)' }}>
                                    {payload.passed ? '✓ Passed' : '✗ Failed'}
                                </div>
                            </div>,
                            ''
                        ];
                    }}
                />
                {/* Cutoff line at 72% */}
                <ReferenceLine
                    y={72}
                    stroke="var(--warning-500)"
                    strokeDasharray="5 5"
                    label={{
                        value: 'Passing: 72%',
                        position: 'right',
                        style: { fontSize: '0.75rem', fill: 'var(--warning-600)' }
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary-600)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--primary-600)', r: 5 }}
                    activeDot={{ r: 7, fill: 'var(--primary-700)' }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
