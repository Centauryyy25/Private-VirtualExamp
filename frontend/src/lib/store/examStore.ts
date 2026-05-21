/**
 * Exam Store - Zustand state management for exam session
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface Question {
    id: string;
    type: string;
    domain_id?: string;
    text: string;
    media: string[];
    options: { id: string; text: string }[];
    correct_answers: string[];
    explanation?: string;
    choose_count?: number;
}

export interface Exam {
    id: string;
    title: string;
    description?: string;
    total_questions: number;
    pass_percentage: number;
    time_limit_minutes?: number;
    domains?: Record<string, number>;
    parsed_data: {
        metadata: {
            title: string;
            pass_percentage: number;
            time_limit_minutes?: number;
        };
        domains: { id: string; name: string; weight: number }[];
        questions: Question[];
    };
}

export interface UserAnswer {
    questionId: string;
    answer: string[];
    timeSpent: number;
    flagged: boolean;
}

interface ExamState {
    // Current session
    sessionId: string | null;
    exam: Exam | null;
    mode: 'timed' | 'training' | 'review';

    // Question navigation
    currentQuestionIndex: number;
    answers: Record<string, UserAnswer>;

    // Timer
    startTime: number | null;
    timeLimit: number | null; // in seconds
    timeRemaining: number | null;

    // UI state
    isLoading: boolean;
    error: string | null;

    // Actions
    setExam: (exam: Exam) => void;
    startSession: (sessionId: string, mode: 'timed' | 'training' | 'review', timeLimitMinutes?: number, shuffle?: boolean, questionLimit?: number) => void;
    setCurrentQuestion: (index: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    setAnswer: (questionId: string, answer: string[]) => void;
    toggleFlag: (questionId: string) => void;
    updateTimeRemaining: (seconds: number) => void;
    clearSession: () => void;

    // Computed getters
    getQuestion: () => Question | null;
    getProgress: () => { answered: number; total: number; flagged: number };
    getAnswersForSubmit: () => Array<{
        question_id: string;
        answer: string[];
        time_spent_seconds: number;
        flagged: boolean;
    }>;
}

export const useExamStore = create<ExamState>()(
    persist(
        (set, get) => ({
            // Initial state
            sessionId: null,
            exam: null,
            mode: 'training',
            currentQuestionIndex: 0,
            answers: {},
            startTime: null,
            timeLimit: null,
            timeRemaining: null,
            isLoading: false,
            error: null,

            // Actions
            setExam: (exam) => set({ exam }),

            startSession: (sessionId, mode, timeLimitMinutes, shuffle = false, questionLimit) => {
                const state = get();
                const timeLimit = timeLimitMinutes ? timeLimitMinutes * 60 : null;

                let updatedExam = state.exam;
                if (state.exam) {
                    let questions = [...state.exam.parsed_data.questions];

                    // Fisher-Yates Shuffle (if enabled)
                    if (shuffle) {
                        for (let i = questions.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [questions[i], questions[j]] = [questions[j], questions[i]];
                        }
                    }

                    // Apply question limit
                    if (questionLimit && questionLimit < questions.length) {
                        questions = questions.slice(0, questionLimit);
                    }

                    updatedExam = {
                        ...state.exam,
                        total_questions: questions.length,
                        parsed_data: {
                            ...state.exam.parsed_data,
                            questions: questions
                        }
                    };
                }

                set({
                    sessionId,
                    mode,
                    exam: updatedExam,
                    startTime: Date.now(),
                    timeLimit,
                    timeRemaining: timeLimit,
                    currentQuestionIndex: 0,
                    answers: {},
                    error: null,
                });
            },

            setCurrentQuestion: (index) => {
                const state = get();
                const totalQuestions = state.exam?.parsed_data.questions.length || 0;
                if (index >= 0 && index < totalQuestions) {
                    set({ currentQuestionIndex: index });
                }
            },

            nextQuestion: () => {
                const state = get();
                const totalQuestions = state.exam?.parsed_data.questions.length || 0;
                if (state.currentQuestionIndex < totalQuestions - 1) {
                    set({ currentQuestionIndex: state.currentQuestionIndex + 1 });
                }
            },

            prevQuestion: () => {
                const state = get();
                if (state.currentQuestionIndex > 0) {
                    set({ currentQuestionIndex: state.currentQuestionIndex - 1 });
                }
            },

            setAnswer: (questionId, answer) => {
                const state = get();
                const prevAnswer = state.answers[questionId];
                set({
                    answers: {
                        ...state.answers,
                        [questionId]: {
                            questionId,
                            answer,
                            timeSpent: (prevAnswer?.timeSpent || 0) + 1,
                            flagged: prevAnswer?.flagged || false,
                        },
                    },
                });
            },

            toggleFlag: (questionId) => {
                const state = get();
                const prevAnswer = state.answers[questionId] || {
                    questionId,
                    answer: [],
                    timeSpent: 0,
                    flagged: false,
                };
                set({
                    answers: {
                        ...state.answers,
                        [questionId]: {
                            ...prevAnswer,
                            flagged: !prevAnswer.flagged,
                        },
                    },
                });
            },

            updateTimeRemaining: (seconds) => set({ timeRemaining: seconds }),

            clearSession: () => set({
                sessionId: null,
                exam: null,
                mode: 'training',
                currentQuestionIndex: 0,
                answers: {},
                startTime: null,
                timeLimit: null,
                timeRemaining: null,
                isLoading: false,
                error: null,
            }),

            // Getters
            getQuestion: () => {
                const state = get();
                if (!state.exam?.parsed_data?.questions) return null;
                return state.exam.parsed_data.questions[state.currentQuestionIndex] || null;
            },

            getProgress: () => {
                const state = get();
                const total = state.exam?.parsed_data.questions.length || 0;
                const answeredQuestions = Object.values(state.answers).filter(a => a.answer.length > 0);
                const flaggedQuestions = Object.values(state.answers).filter(a => a.flagged);
                return {
                    answered: answeredQuestions.length,
                    total,
                    flagged: flaggedQuestions.length,
                };
            },

            getAnswersForSubmit: () => {
                const state = get();
                return Object.values(state.answers).map(a => ({
                    question_id: a.questionId,
                    answer: a.answer,
                    time_spent_seconds: a.timeSpent,
                    flagged: a.flagged,
                }));
            },
        }),
        {
            name: 'virtualexamp-session',
            partialize: (state) => ({
                sessionId: state.sessionId,
                exam: state.exam,
                mode: state.mode,
                currentQuestionIndex: state.currentQuestionIndex,
                answers: state.answers,
                startTime: state.startTime,
                timeLimit: state.timeLimit,
                timeRemaining: state.timeRemaining,
            }),
        }
    )
);
