'use client';

import { useEffect, useState } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
} from 'recharts';

interface DomainScore {
    domain_id: string;
    domain_name: string;
    score: number;
    total_questions: number;
    correct_answers: number;
}

interface DomainChartProps {
    scores: DomainScore[];
    passPercentage?: number;
}

const COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#f97316', '#eab308',
];

// Tracks whether the viewport is below Tailwind's `sm` breakpoint (640px) so
// charts can use tighter margins/heights on mobile instead of hardcoded desktop values.
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia('(max-width: 639px)');
        const update = () => setIsMobile(mql.matches);
        update();
        mql.addEventListener('change', update);
        return () => mql.removeEventListener('change', update);
    }, []);

    return isMobile;
}

export function DomainRadarChart({ scores, passPercentage = 70 }: DomainChartProps) {
    const isMobile = useIsMobile();
    const data = scores.map(s => ({
        domain: s.domain_name.length > 15 ? s.domain_name.slice(0, 12) + '...' : s.domain_name,
        score: s.score,
        fullMark: 100,
    }));

    return (
        <div className="chart-container">
            <h3 className="chart-title">Domain Performance</h3>
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 350}>
                <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                        dataKey="domain"
                        tick={{ fontSize: isMobile ? 10 : 12, fill: '#6b7280' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <Radar
                        name="Your Score"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.5}
                        strokeWidth={2}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function DomainBarChart({ scores, passPercentage = 70 }: DomainChartProps) {
    const isMobile = useIsMobile();
    const data = scores.map((s, index) => ({
        name: s.domain_name.length > 20 ? s.domain_name.slice(0, 17) + '...' : s.domain_name,
        score: s.score,
        correct: s.correct_answers,
        total: s.total_questions,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <div className="chart-container">
            <h3 className="chart-title">Score by Domain</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 20, right: isMobile ? 12 : 30, left: isMobile ? 50 : 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: isMobile ? 10 : 12, fill: '#374151' }}
                        width={isMobile ? 70 : 90}
                    />
                    <Tooltip
                        formatter={(value, name, props) => {
                            const item = props.payload;
                            return [`${value}% (${item.correct}/${item.total})`, 'Score'];
                        }}
                        contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                    />
                    <Bar
                        dataKey="score"
                        radius={[0, 4, 4, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.score >= passPercentage ? '#10b981' : '#ef4444'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} />
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Pass ({passPercentage}%+)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Needs Work</span>
                </div>
            </div>
        </div>
    );
}
