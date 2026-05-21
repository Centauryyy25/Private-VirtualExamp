'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store/examStore';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNav from '@/components/exam/QuestionNav';
import ExamTimer from '@/components/exam/ExamTimer';
import ThemeToggle from '@/components/ThemeToggle';

export default function ExamPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const {
        exam,
        mode,
        sessionId,
        currentQuestionIndex,
        getQuestion,
        getProgress,
        getAnswersForSubmit,
        clearSession,
        setCurrentQuestion
    } = useExamStore();
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = getQuestion();
    const progress = getProgress();


    // Redirect if no exam loaded
    useEffect(() => {
        if (!exam) {
            router.push('/upload');
        }
    }, [exam, router]);

    if (!exam || !currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading exam environment...</p>
                </div>
            </div>
        );
    }

    const handleTimeUp = () => {
        handleSubmit();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        const answers = getAnswersForSubmit();

        // Always store in sessionStorage for results page
        sessionStorage.setItem('examAnswers', JSON.stringify(answers));
        sessionStorage.setItem('examData', JSON.stringify(exam.parsed_data));
        sessionStorage.setItem('examInfo', JSON.stringify({
            title: exam.title,
            pass_percentage: exam.pass_percentage,
            total_questions: exam.total_questions,
        }));

        // If user is logged in and we have a session ID, submit to backend
        if (isAuthenticated && sessionId) {
            try {
                await api.submitSession(sessionId, answers);
            } catch (error) {
                console.error('Failed to submit to backend:', error);
            }
        }

        setIsSubmitting(false);
        router.push('/results');
    };

    const handleExit = () => {
        if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
            clearSession();
            router.push('/');
        }
    };

    const completionPercentage = Math.round((progress.answered / progress.total) * 100);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 border-b bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
                            <span className="material-symbols-outlined text-white text-xl">school</span>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-lg leading-tight">VirtualExamp</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                {exam.title}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <ExamTimer onTimeUp={handleTimeUp} />

                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-32">
                {/* Progress Visual */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Question</span>
                            <span className="text-2xl font-bold">{currentQuestionIndex + 1}</span>
                            <span className="text-sm font-semibold text-slate-400">of {progress.total}</span>
                        </div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {completionPercentage}% Completed
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="bg-blue-600 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Question Section */}
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                        <QuestionCard question={currentQuestion} />
                    </div>

                    {/* Desktop Navigator */}
                    <aside className="hidden lg:block w-72 shrink-0">
                        <div className="sticky top-24 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">Exam Navigator</h3>
                            <QuestionNav />

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <div className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm"></div> Answered
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <div className="w-3.5 h-3.5 rounded bg-amber-500 shadow-sm"></div> Flagged
                                </div>
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 shadow-sm"></div> Unanswered
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Fixed Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] z-40">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Primary Nav */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => useExamStore.getState().prevQuestion()}
                            disabled={currentQuestionIndex === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Previous
                        </button>
                        <button
                            onClick={() => useExamStore.getState().nextQuestion()}
                            disabled={currentQuestionIndex === progress.total - 1}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            Next
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleExit}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-slate-500 hover:text-red-500 dark:hover:text-red-400 font-bold transition-all"
                        >
                            Exit
                        </button>
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                        >
                            Submit Exam
                        </button>
                    </div>
                </div>
            </footer>

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-reveal-up">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <span className="material-symbols-outlined text-primary text-3xl">fact_check</span>
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-2">Ready to submit?</h3>
                        <p className="text-slate-500 dark:text-slate-300 text-center mb-8">
                            You've answered <span className="font-bold text-slate-900 dark:text-white">{progress.answered}</span> of <span className="font-bold text-slate-900 dark:text-white">{progress.total}</span> questions.
                            {progress.flagged > 0 && (
                                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                                    ⚠️ {progress.flagged} question(s) still flagged for review.
                                </span>
                            )}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowSubmitModal(false)}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
            `}</style>
        </div>
    );
}
