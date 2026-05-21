'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useExamStore } from '@/lib/store/examStore';
import { useHistoryStore, ExamHistoryEntry } from '@/lib/store/historyStore';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import ScoreGauge from '@/components/charts/ScoreGauge';
import { DomainBarChart } from '@/components/charts/DomainCharts';
import ThemeToggle from '@/components/ThemeToggle';

interface DomainScore {
    domain_id: string;
    domain_name: string;
    score: number;
    total_questions: number;
    correct_answers: number;
}

interface ExamInfo {
    title: string;
    pass_percentage: number;
    total_questions: number;
}

export default function ResultsPageWrapper() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <ResultsPage />
        </Suspense>
    );
}

function ResultsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { clearSession } = useExamStore();
    const { addEntry } = useHistoryStore();
    const { isAuthenticated } = useAuth();
    const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
    const savedRef = useRef(false);
    const [results, setResults] = useState<{
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        domainScores: DomainScore[];
        questions: any[];
        userAnswers: Record<string, string[]>;
    } | null>(null);

    // Load results from backend session or sessionStorage
    useEffect(() => {
        // Synchronous guard: survives React Strict Mode re-runs
        if (!savedRef.current) {
            savedRef.current = sessionStorage.getItem('resultsSaved') === 'true';
        }

        const sessionId = searchParams.get('session');

        if (sessionId && isAuthenticated) {
            loadFromBackend(sessionId);
        } else {
            loadFromSessionStorage();
        }
    }, [searchParams, isAuthenticated]);

    const loadFromBackend = async (sessionId: string) => {
        try {
            const sessionResult = await api.getSession(sessionId);
            if (sessionResult.error || !sessionResult.data) {
                router.push('/dashboard');
                return;
            }

            const session = sessionResult.data as any;
            const examResult = await api.getExam(session.exam_id);
            if (examResult.error || !examResult.data) {
                router.push('/dashboard');
                return;
            }

            const examData = (examResult.data as any).parsed_data;
            const info: ExamInfo = {
                title: examData.metadata?.title || (examResult.data as any).title || 'Exam',
                pass_percentage: examData.metadata?.pass_percentage || 70,
                total_questions: examData.questions?.length || 0,
            };
            setExamInfo(info);

            // Rebuild answer map from session's user_answers
            const answerMap: Record<string, string[]> = {};
            const userAnswers = session.user_answers || [];
            userAnswers.forEach((a: { question_id: string; answer: string[] }) => {
                answerMap[a.question_id] = a.answer;
            });

            // Calculate domain scores from exam data
            const domainStats: Record<string, { name: string; total: number; correct: number }> = {};
            examData.domains?.forEach((d: { id: string; name: string }) => {
                domainStats[d.id] = { name: d.name, total: 0, correct: 0 };
            });
            domainStats['_general'] = { name: 'General', total: 0, correct: 0 };

            let totalCorrect = 0;
            const totalQuestions = examData.questions.length;

            examData.questions.forEach((q: { id: string; domain_id?: string; correct_answers: string[] }) => {
                const domainId = q.domain_id || '_general';
                if (!domainStats[domainId]) {
                    domainStats[domainId] = { name: domainId, total: 0, correct: 0 };
                }
                domainStats[domainId].total++;
                const userAnswer = answerMap[q.id] || [];
                const isCorrect = userAnswer.length === q.correct_answers.length &&
                    userAnswer.every(a => q.correct_answers.includes(a));
                if (isCorrect) {
                    totalCorrect++;
                    domainStats[domainId].correct++;
                }
            });

            const score = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
            const domainScores: DomainScore[] = Object.entries(domainStats)
                .filter(([_, stats]) => stats.total > 0)
                .map(([id, stats]) => ({
                    domain_id: id,
                    domain_name: stats.name,
                    score: (stats.correct / stats.total) * 100,
                    total_questions: stats.total,
                    correct_answers: stats.correct,
                }));

            setResults({
                score,
                passed: score >= info.pass_percentage,
                correct: totalCorrect,
                total: totalQuestions,
                domainScores,
                questions: examData.questions,
                userAnswers: answerMap,
            });
        } catch (error) {
            console.error('Failed to load session from backend:', error);
            router.push('/dashboard');
        }
    };

    const loadFromSessionStorage = () => {
        const answersJson = sessionStorage.getItem('examAnswers');
        const examDataJson = sessionStorage.getItem('examData');
        const examInfoJson = sessionStorage.getItem('examInfo');

        if (!answersJson || !examDataJson) {
            router.push('/');
            return;
        }

        const answers = JSON.parse(answersJson);
        const examData = JSON.parse(examDataJson);
        const info: ExamInfo = examInfoJson ? JSON.parse(examInfoJson) : {
            title: examData.metadata?.title || 'Exam',
            pass_percentage: examData.metadata?.pass_percentage || 70,
            total_questions: examData.questions?.length || 0,
        };

        setExamInfo(info);

        const answerMap: Record<string, string[]> = {};
        answers.forEach((a: { question_id: string; answer: string[] }) => {
            answerMap[a.question_id] = a.answer;
        });

        const domainStats: Record<string, { name: string; total: number; correct: number }> = {};
        examData.domains?.forEach((d: { id: string; name: string }) => {
            domainStats[d.id] = { name: d.name, total: 0, correct: 0 };
        });
        domainStats['_general'] = { name: 'General', total: 0, correct: 0 };

        let totalCorrect = 0;
        const totalQuestions = examData.questions.length;

        examData.questions.forEach((q: { id: string; domain_id?: string; correct_answers: string[] }) => {
            const domainId = q.domain_id || '_general';
            if (!domainStats[domainId]) {
                domainStats[domainId] = { name: domainId, total: 0, correct: 0 };
            }
            domainStats[domainId].total++;
            const userAnswer = answerMap[q.id] || [];
            const isCorrect = userAnswer.length === q.correct_answers.length &&
                userAnswer.every(a => q.correct_answers.includes(a));
            if (isCorrect) {
                totalCorrect++;
                domainStats[domainId].correct++;
            }
        });

        const score = (totalCorrect / totalQuestions) * 100;
        const domainScores: DomainScore[] = Object.entries(domainStats)
            .filter(([_, stats]) => stats.total > 0)
            .map(([id, stats]) => ({
                domain_id: id,
                domain_name: stats.name,
                score: (stats.correct / stats.total) * 100,
                total_questions: stats.total,
                correct_answers: stats.correct,
            }));

        const calculatedResults = {
            score,
            passed: score >= info.pass_percentage,
            correct: totalCorrect,
            total: totalQuestions,
            domainScores,
            questions: examData.questions,
            userAnswers: answerMap,
        };

        setResults(calculatedResults);

        // Only add to local history for guest users (authenticated users have server history)
        // Use ref as synchronous guard to prevent double-add from React Strict Mode
        if (!savedRef.current && !isAuthenticated) {
            savedRef.current = true;
            sessionStorage.setItem('resultsSaved', 'true');
            const modeStr = sessionStorage.getItem('examMode') || 'training';
            addEntry({
                examTitle: info.title,
                mode: modeStr as 'timed' | 'training',
                score: calculatedResults.score,
                passed: calculatedResults.passed,
                totalQuestions: calculatedResults.total,
                correctAnswers: calculatedResults.correct,
            });
        } else if (!savedRef.current) {
            // Authenticated: just mark as saved, no local entry needed
            savedRef.current = true;
            sessionStorage.setItem('resultsSaved', 'true');
        }
    };

    const handleDashboard = () => {
        clearSession();
        router.push('/dashboard');
    };

    if (!results || !examInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const strokeDashoffset = 364.4 - (364.4 * results.score) / 100;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-3xl">verified</span>
                        <span className="font-bold text-xl tracking-tight">Virtual<span className="text-blue-600">Examp</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <button onClick={handleDashboard} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Dashboard
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Score Summary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <div className="lg:col-span-1 bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-fade-in">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">Your Final Score</h2>
                        <div className="relative flex items-center justify-center mb-6">
                            <svg className="w-36 h-36 transform -rotate-90">
                                <circle className="text-slate-100 dark:text-slate-800" cx="72" cy="72" fill="transparent" r="58" stroke="currentColor" strokeWidth="10"></circle>
                                <circle
                                    className="text-blue-600 transition-all duration-1000 ease-out"
                                    cx="72" cy="72" fill="transparent" r="58"
                                    stroke="currentColor" strokeWidth="10"
                                    strokeDasharray="364.4"
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                ></circle>
                            </svg>
                            <span className="absolute text-3xl font-black">{Math.round(results.score)}%</span>
                        </div>
                        <div className={`px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-sm ${results.passed
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                            }`}>
                            <span className="material-symbols-outlined text-lg">{results.passed ? 'check_circle' : 'cancel'}</span>
                            {results.passed ? 'PASSED' : 'FAILED'}
                        </div>
                        <p className="mt-6 text-xs font-bold text-slate-400 truncate max-w-full">
                            {examInfo.title}
                        </p>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in delay-100">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h3 className="text-lg font-bold">Exam Statistics</h3>
                                <p className="text-xs text-slate-400 font-medium">Performance summary across all domains</p>
                            </div>
                            <button className="text-blue-600 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/50">
                                <span className="material-symbols-outlined text-sm">file_download</span>
                                Report
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-10">
                            {[
                                { label: 'Questions', value: `${results.correct} / ${results.total}`, color: 'text-slate-900 dark:text-white' },
                                { label: 'Correct', value: `${results.correct}`, color: 'text-emerald-500' },
                                { label: 'Accuracy', value: `${Math.round(results.score)}%`, color: 'text-blue-500' }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 shadow-inner">
                                    <p className="text-[10px] text-slate-400 mb-1 uppercase font-black tracking-tight">{stat.label}</p>
                                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Performance by Domain</h4>
                            <div className="space-y-4">
                                {results.domainScores.map((domain, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{domain.domain_name}</span>
                                            <span className="font-black text-blue-600 dark:text-blue-400">{Math.round(domain.score)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${domain.score >= examInfo.pass_percentage ? 'bg-emerald-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${domain.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Review */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 underline-offset-8">
                        <div>
                            <h2 className="text-2xl font-black">Detailed Review</h2>
                            <p className="text-sm text-slate-400 font-medium mt-1">Review your answers and learn from explanations</p>
                        </div>
                        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                            <button className="px-4 py-2 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 shadow-sm text-blue-600">All Questions</button>
                            <button className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Incorrect</button>
                            <button className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Flagged</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {results.questions.map((q, idx) => {
                            const userAnswer = results.userAnswers[q.id] || [];
                            const isCorrect = userAnswer.length === q.correct_answers.length &&
                                userAnswer.every(a => q.correct_answers.includes(a));

                            return (
                                <div key={idx} className={`bg-white dark:bg-[#1e293b] border-l-4 rounded-2xl shadow-sm border-2 border-transparent overflow-hidden transition-all hover:bg-slate-50 dark:hover:bg-slate-900/30 ${isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'
                                    }`}>
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${isCorrect
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                    }`}>
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md uppercase tracking-widest">
                                                        {q.type?.replace('_', ' ') || 'Multiple Choice'}
                                                    </span>
                                                    {q.domain_id && <span className="text-[9px] font-bold text-slate-400 ml-1">{q.domain_id}</span>}
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-2xl ${isCorrect ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                                                {isCorrect ? 'check_circle' : 'cancel'}
                                            </span>
                                        </div>

                                        <p className="text-lg font-bold mb-8 leading-relaxed text-slate-800 dark:text-slate-100">{q.text}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                            {q.options.map((opt: any, optIdx: number) => {
                                                const isUserChoice = userAnswer.includes(opt.id);
                                                const isCorrectChoice = q.correct_answers.includes(opt.id);

                                                let stateStyles = "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30";
                                                let icon = null;

                                                if (isCorrectChoice) {
                                                    stateStyles = "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20";
                                                    icon = <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>;
                                                } else if (isUserChoice && !isCorrectChoice) {
                                                    stateStyles = "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/20";
                                                    icon = <span className="material-symbols-outlined text-red-500 text-sm">close</span>;
                                                }

                                                return (
                                                    <div key={optIdx} className={`p-4 border-2 rounded-xl flex items-center justify-between transition-all ${stateStyles}`}>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border transition-colors ${isCorrectChoice ? 'bg-emerald-500 text-white border-emerald-500' :
                                                                (isUserChoice ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600')
                                                                }`}>
                                                                {String.fromCharCode(65 + optIdx)}
                                                            </span>
                                                            <span className={`text-sm font-medium ${isCorrectChoice ? 'text-emerald-800 dark:text-emerald-300' :
                                                                (isUserChoice ? 'text-red-800 dark:text-red-300' : 'text-slate-600 dark:text-slate-400')
                                                                }`}>
                                                                {opt.text}
                                                                {isUserChoice && <span className="ml-2 opacity-50 text-[10px] font-bold">(Your Answer)</span>}
                                                            </span>
                                                        </div>
                                                        {icon}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {q.explanation && (
                                            <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
                                                <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400">
                                                    <span className="material-symbols-outlined text-xl">info</span>
                                                    <h5 className="font-black text-xs uppercase tracking-widest">Explanation</h5>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                    {q.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-12 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={() => router.push('/upload')} className="w-full sm:w-auto px-8 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-black hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm">
                        Try Another Exam
                    </button>
                    <button onClick={handleDashboard} className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-xl shadow-blue-500/25 active:scale-95 transition-all text-sm">
                        View Dashboard
                    </button>
                </div>
            </main>
        </div>
    );
}
