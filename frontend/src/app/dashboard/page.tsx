'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSessionHistory } from '@/lib/hooks/useSessionHistory';
import PerformanceChart from '@/components/charts/PerformanceChart';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { history, stats, isLoading: historyLoading } = useSessionHistory();
    const [mounted, setMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<30 | 90 | 365>(30);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading || historyLoading || !mounted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="text-muted">Loading...</p>
            </div>
        );
    }

    return (
        <main style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
            {/* Modern Navigation Bar */}
            <header style={{
                background: 'var(--card-bg)',
                borderBottom: '1px solid var(--card-border)',
                padding: '0',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--space-6)' }}>
                    {/* Brand */}
                    <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-600)', padding: 'var(--space-4) 0' }}>
                        VirtualExam
                    </Link>

                    {/* Navigation Menu */}
                    <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <Link href="/upload" style={{
                            padding: 'var(--space-4) var(--space-4)',
                            color: 'var(--gray-600)',
                            textDecoration: 'none',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            borderBottom: '2px solid transparent',
                            transition: 'all var(--transition-fast)'
                        }}>
                            Exams
                        </Link>
                        <Link href="/dashboard" style={{
                            padding: 'var(--space-4) var(--space-4)',
                            color: 'var(--primary-600)',
                            textDecoration: 'none',
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            borderBottom: '2px solid var(--primary-600)',
                            transition: 'all var(--transition-fast)'
                        }}>
                            Performance Dashboard
                        </Link>
                        <span style={{
                            padding: 'var(--space-4) var(--space-4)',
                            color: 'var(--gray-400)',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            borderBottom: '2px solid transparent',
                            cursor: 'not-allowed'
                        }}>
                            Library
                        </span>
                        <span style={{
                            padding: 'var(--space-4) var(--space-4)',
                            color: 'var(--gray-400)',
                            fontSize: '0.9375rem',
                            fontWeight: 500,
                            borderBottom: '2px solid transparent',
                            cursor: 'not-allowed'
                        }}>
                            Settings
                        </span>
                    </nav>

                    {/* User Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <ThemeToggle />
                        {isAuthenticated && user ? (
                            <>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-100)',
                                    color: 'var(--primary-600)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}>
                                    {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    {user.display_name || user.email}
                                </span>
                            </>
                        ) : (
                            <Link href="/login" className="btn btn-primary btn-sm">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
                {/* Page Header */}
                <div style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--foreground)' }}>
                        Account & Progress
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.9375rem' }}>
                        A consolidated view of your professional certification journey and performance analytics.
                    </p>
                </div>

                {/* KPI Summary Cards - 3 cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)'
                }}>
                    {/* AVG SCORE */}
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--primary-50)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            📊
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-1)' }}>
                                AVG SCORE
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                {stats.total > 0 ? Math.round(stats.avgScore) : 0}%
                            </div>
                        </div>
                    </div>

                    {/* COMPLETED */}
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--success-50)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            ✓
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-1)' }}>
                                COMPLETED
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                {stats.total}
                            </div>
                        </div>
                    </div>

                    {/* STUDY TIME */}
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--warning-50)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            ⏱️
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-1)' }}>
                                STUDY TIME
                            </div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>
                                {stats.totalTimeHours > 0 ? `${Math.round(stats.totalTimeHours)}h` : '0h'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Trend Section */}
                <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Performance Trend</h2>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: 'var(--success-50)',
                                    color: 'var(--success-600)'
                                }}>
                                    +5.2% this period
                                </span>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
                                Historical view of your exam scores vs. certification cutoffs.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                onClick={() => setTimeRange(30)}
                                style={{
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${timeRange === 30 ? 'var(--primary-500)' : 'var(--card-border)'}`,
                                    background: timeRange === 30 ? 'var(--primary-50)' : 'transparent',
                                    color: timeRange === 30 ? 'var(--primary-600)' : 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    fontWeight: timeRange === 30 ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}>
                                30 Days
                            </button>
                            <button
                                onClick={() => setTimeRange(90)}
                                style={{
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${timeRange === 90 ? 'var(--primary-500)' : 'var(--card-border)'}`,
                                    background: timeRange === 90 ? 'var(--primary-50)' : 'transparent',
                                    color: timeRange === 90 ? 'var(--primary-600)' : 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    fontWeight: timeRange === 90 ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}>
                                90 Days
                            </button>
                            <button
                                onClick={() => setTimeRange(365)}
                                style={{
                                    padding: 'var(--space-2) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${timeRange === 365 ? 'var(--primary-500)' : 'var(--card-border)'}`,
                                    background: timeRange === 365 ? 'var(--primary-50)' : 'transparent',
                                    color: timeRange === 365 ? 'var(--primary-600)' : 'var(--foreground)',
                                    fontSize: '0.875rem',
                                    fontWeight: timeRange === 365 ? 600 : 500,
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}>
                                1 Year
                            </button>
                        </div>
                    </div>
                    {/* Performance Chart */}
                    <PerformanceChart history={history} timeRange={timeRange} />
                </div>

                {/* Recent Activity Table */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--gray-200)' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>Recent Activity</h2>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
                                Detailed breakdown of your last 10 simulation sessions.
                            </p>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span>📥</span>
                            Export CSV
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                            <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                                You haven&apos;t taken any exams yet.
                            </p>
                            <Link href="/demo" className="btn btn-primary">
                                Take Your First Exam
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXAM DETAILS</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE COMPLETED</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCORE</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.slice(0, 10).map((entry) => (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background var(--transition-fast)' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: 'var(--space-4) var(--space-3)' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--gray-900)', marginBottom: '2px' }}>
                                                        {entry.examTitle}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                                        {entry.mode === 'timed' ? 'Full Simulation' : 'Training Mode'} • SAA-C03
                                                    </div>
                                                </td>
                                                <td style={{ padding: 'var(--space-4) var(--space-3)', fontSize: '0.9375rem' }}>
                                                    <div style={{ color: 'var(--gray-700)' }}>
                                                        {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                                        {new Date(entry.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: 'var(--space-4) var(--space-3)' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: entry.passed ? 'var(--success-50)' : entry.score >= 50 ? 'var(--warning-50)' : 'var(--error-50)',
                                                        color: entry.passed ? 'var(--success-600)' : entry.score >= 50 ? 'var(--warning-600)' : 'var(--error-600)',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {entry.passed ? 'PASSED' : entry.score >= 50 ? 'PARTIAL' : 'FAILED'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--space-4) var(--space-3)' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                                                        {Math.round(entry.score)}
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                        /{entry.totalQuestions * 10}
                                                    </span>
                                                </td>
                                                <td style={{ padding: 'var(--space-4) var(--space-3)' }}>
                                                    <Link href={isAuthenticated ? `/results?session=${entry.id}` : '/results'} style={{
                                                        color: 'var(--primary-600)',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 500,
                                                        textDecoration: 'none'
                                                    }}>
                                                        View Breakdown
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: 'var(--space-4)', textAlign: 'right' }}>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                    Showing 1-{Math.min(10, history.length)} of {history.length} sessions
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: 'var(--space-12)',
                    paddingTop: 'var(--space-6)',
                    borderTop: '1px solid var(--gray-200)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'var(--space-6)'
                }}>
                    <a href="#" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Privacy Policy</a>
                    <a href="#" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Support Center</a>
                    <a href="#" className="text-muted" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>Terms of Service</a>
                </div>

                {/* Sign in prompt */}
                {!isAuthenticated && history.length > 0 && (
                    <div style={{
                        marginTop: 'var(--space-6)',
                        padding: 'var(--space-4)',
                        background: 'var(--primary-50)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}>
                        <p style={{ marginBottom: 'var(--space-3)', color: 'var(--primary-700)' }}>
                            Your history is saved locally. Sign in to sync across devices!
                        </p>
                        <Link href="/register" className="btn btn-primary btn-sm">
                            Create Free Account
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
