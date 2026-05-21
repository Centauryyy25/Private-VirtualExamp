'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useExamStore } from '@/lib/store/examStore';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function ConfigureExamPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const { exam, startSession } = useExamStore();
    const [isDark, setIsDark] = useState(false);

    // Settings
    const [mode, setMode] = useState<'exam' | 'training'>('exam');
    const [timeLimitEnabled, setTimeLimitEnabled] = useState(true);
    const [customTime, setCustomTime] = useState<number>(130);
    const [randomizationEnabled, setRandomizationEnabled] = useState(true);
    const [questionCount, setQuestionCount] = useState<number>(50);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleDarkMode = () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDark(true);
        }
    };


    // Redirect if no exam loaded
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login?redirect=/upload');
        }
        if (!exam) {
            router.push('/upload');
        }
    }, [authLoading, isAuthenticated, exam, router]);



    const [isStarting, setIsStarting] = useState(false);

    const handleStartExam = async () => {
        if (!exam || isStarting) return;
        setIsStarting(true);

        const examMode = mode === 'exam' ? 'timed' : 'training';
        const timeLimit = timeLimitEnabled ? customTime : undefined;
        let sessionIdentifier = exam.id;

        // For authenticated users, create a real backend session
        if (isAuthenticated) {
            try {
                const result = await api.startSession(exam.id, examMode, timeLimit);
                if (result.data?.id) {
                    sessionIdentifier = result.data.id;
                } else if (result.error) {
                    console.error('Backend session creation failed:', result.error);
                }
            } catch (error) {
                console.error('Failed to create backend session:', error);
            }
        }

        startSession(
            sessionIdentifier,
            examMode,
            timeLimit,
            randomizationEnabled,
            questionCount
        );

        sessionStorage.setItem('examMode', examMode);
        sessionStorage.removeItem('resultsSaved');
        setIsStarting(false);
        router.push('/exam');
    };

    if (authLoading || !exam) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
        );
    }

    return (

        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 transition-colors duration-200 min-h-screen">
            {/* Navigation */}
            <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-800 p-1.5 rounded-lg">
                                <span className="material-symbols-outlined text-white text-xl">school</span>
                            </div>
                            <Link href="/" className="text-xl font-bold tracking-tight text-blue-800 dark:text-blue-400">
                                VirtualExamp
                            </Link>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <span className={`material-symbols-outlined ${isDark ? 'hidden' : 'block'}`}>dark_mode</span>
                                <span className={`material-symbols-outlined ${isDark ? 'block' : 'hidden'}`}>light_mode</span>
                            </button>
                            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800">
                                <div className="text-right">
                                    <p className="text-sm font-semibold">{user?.display_name || user?.email || 'User'}</p>
                                    <p className="text-xs text-slate-500">Premium Account</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-500">person</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Breadcrumb */}
                <div className="mb-10">
                    <nav aria-label="Breadcrumb" className="flex mb-4 text-sm text-slate-500 dark:text-slate-400">
                        <ol className="flex items-center space-x-2">
                            <li><Link href="/dashboard" className="hover:text-blue-800">Dashboard</Link></li>
                            <li><span className="material-symbols-outlined text-xs">chevron_right</span></li>
                            <li><Link href="/upload" className="hover:text-blue-800">Upload</Link></li>
                            <li><span className="material-symbols-outlined text-xs">chevron_right</span></li>
                            <li className="font-medium text-slate-900 dark:text-slate-100">{exam.title}</li>
                        </ol>
                    </nav>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Configure Your Exam</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Tailor the simulation parameters to match your study objectives and preferred testing environment.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Mode Selection */}
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-blue-800">psychology</span>
                                <h2 className="text-lg font-semibold">Mode Selection</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label
                                    className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${mode === 'exam'
                                        ? 'border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    onClick={() => setMode('exam')}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-bold uppercase tracking-wider ${mode === 'exam' ? 'text-blue-800 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            Exam Mode
                                        </span>
                                        <span className={`material-symbols-outlined ${mode === 'exam' ? 'text-blue-800' : 'text-slate-300 dark:text-slate-700'
                                            }`}>
                                            {mode === 'exam' ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Strict timing, no instant feedback, and randomized conditions to simulate real certification.
                                    </p>
                                </label>

                                <label
                                    className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${mode === 'training'
                                        ? 'border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    onClick={() => setMode('training')}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-bold uppercase tracking-wider ${mode === 'training' ? 'text-blue-800 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            Training Mode
                                        </span>
                                        <span className={`material-symbols-outlined ${mode === 'training' ? 'text-blue-800' : 'text-slate-300 dark:text-slate-700'
                                            }`}>
                                            {mode === 'training' ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Instant feedback after each answer, hints enabled, and no strict time pressure.
                                    </p>
                                </label>
                            </div>
                        </section>

                        {/* Session Settings */}
                        <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-blue-800">settings</span>
                                <h2 className="text-lg font-semibold">Session Settings</h2>
                            </div>

                            {/* Time Limit */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-medium">Time Limit</h3>
                                    <p className="text-sm text-slate-500">Set a maximum duration for this exam session.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Toggle Switch */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={timeLimitEnabled}
                                            onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-800"></div>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={customTime}
                                            onChange={(e) => setCustomTime(Number(e.target.value))}
                                            disabled={!timeLimitEnabled}
                                            className="w-20 px-3 py-1.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded focus:ring-blue-800 focus:border-blue-800 disabled:opacity-50"
                                        />
                                        <span className="text-sm text-slate-500 font-medium">min</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            {/* Question Randomization */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-medium">Question Randomization</h3>
                                    <p className="text-sm text-slate-500">Shuffle the order of questions and answer options.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={randomizationEnabled}
                                        onChange={(e) => setRandomizationEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-800"></div>
                                </label>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            {/* Total Questions */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-medium">Total Questions</h3>
                                    <p className="text-sm text-slate-500">Number of questions to include in this session.</p>
                                </div>
                                <select
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                                    className="w-full md:w-48 px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:ring-blue-800 focus:border-blue-800 text-sm"
                                >
                                    <option value="10">10 Questions</option>
                                    <option value="20">20 Questions</option>
                                    <option value="50">50 Questions (Standard)</option>
                                    <option value="100">100 Questions</option>
                                    <option value="150">150 Questions</option>
                                    <option value="200">200 Questions</option>
                                </select>
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Summary */}
                    <div className="space-y-6">
                        {/* Exam Summary Card */}
                        <div className="bg-blue-800 text-white p-6 rounded-xl shadow-lg">
                            <h2 className="text-lg font-bold mb-4">Exam Summary</h2>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-sm mt-1 opacity-70">description</span>
                                    <div>
                                        <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Exam Title</p>
                                        <p className="text-sm font-medium">{exam.title}</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-sm mt-1 opacity-70">timer</span>
                                    <div>
                                        <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Duration</p>
                                        <p className="text-sm font-medium">
                                            {timeLimitEnabled ? `${customTime} Minutes` : 'Unlimited'}
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-sm mt-1 opacity-70">list</span>
                                    <div>
                                        <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Question Count</p>
                                        <p className="text-sm font-medium">{questionCount} Questions</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-sm mt-1 opacity-70">gavel</span>
                                    <div>
                                        <p className="text-xs opacity-70 uppercase font-bold tracking-wider">Passing Score</p>
                                        <p className="text-sm font-medium">{exam.pass_percentage}%</p>
                                    </div>
                                </li>
                            </ul>
                            <button
                                onClick={handleStartExam}
                                className="w-full bg-white text-blue-800 py-3 px-4 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                            >
                                Start Simulation
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>

                        {/* Pro Tip */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-amber-500 text-sm">lightbulb</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pro Tip</h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                If you're preparing for the actual exam, we recommend using <strong>Exam Mode</strong> with the standard time limit to build mental stamina.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-10 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-500">© 2024 VirtualExamp Professional Platform. All rights reserved.</p>
            </footer>
        </div>
    );
}
