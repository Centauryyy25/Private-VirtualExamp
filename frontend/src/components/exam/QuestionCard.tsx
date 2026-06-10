'use client';

import { useState, useEffect } from 'react';
import { useExamStore, Question } from '@/lib/store/examStore';

interface QuestionCardProps {
    question: Question;
    showAnswer?: boolean;
}

export default function QuestionCard({ question, showAnswer = false }: QuestionCardProps) {
    const {
        answers,
        setAnswer,
        toggleFlag,
        mode,
        nextQuestion,
        currentQuestionIndex
    } = useExamStore();
    const answer = answers[question.id];
    const selectedOptions = answer?.answer || [];
    const isFlagged = answer?.flagged || false;

    // State for instant feedback functionality in Training Mode
    const [showInstantFeedback, setShowInstantFeedback] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial check: If question is already answered in Training Mode, show feedback immediately
    useEffect(() => {
        setIsProcessing(false);
        if (mode === 'training' && selectedOptions.length > 0) {
            setShowInstantFeedback(true);
        } else {
            setShowInstantFeedback(false);
        }
    }, [question.id]);

    const handleOptionClick = (optionId: string) => {
        if (showAnswer || isProcessing || showInstantFeedback || (mode === 'training' && selectedOptions.length > 0)) return;

        let newAnswer: string[];
        const isSingleChoice = question.choose_count ? question.choose_count === 1 : question.correct_answers.length <= 1;

        if (mode === 'training') {
            newAnswer = [optionId];
            setAnswer(question.id, newAnswer);
            setIsProcessing(true);
            setShowInstantFeedback(true);
            setTimeout(() => {
                nextQuestion();
            }, 1000);
            return;
        }

        if (question.type === 'multiple_choice' && isSingleChoice) {
            newAnswer = [optionId];
        } else {
            if (selectedOptions.includes(optionId)) {
                newAnswer = selectedOptions.filter(id => id !== optionId);
            } else {
                newAnswer = [...selectedOptions, optionId];
            }
        }
        setAnswer(question.id, newAnswer);
    };

    const hasAnswerKey = question.correct_answers && question.correct_answers.length > 0;
    const shouldReveal = showAnswer || showInstantFeedback || (mode === 'training' && selectedOptions.length > 0);

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
            {/* Header / Info */}
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-[0.1em]">
                        {question.type?.replace('_', ' ') || 'Multiple Choice'}
                    </span>
                    {question.domain_id && (
                        <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-[0.1em]">
                            {question.domain_id}
                        </span>
                    )}
                    {isFlagged && (
                        <span className="inline-block px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-[0.1em] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">flag</span>
                            Flagged
                        </span>
                    )}
                    {question.choose_count && question.choose_count > 1 && (
                        <span className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-[0.1em] shadow-sm animate-pulse">
                            Choose {question.choose_count}
                        </span>
                    )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                    {question.text}
                </h2>

                {mode === 'training' && question.correct_answers.length > 1 && (
                    <p className="mt-4 text-sm text-slate-500 italic">
                        Note: In training mode, selecting any correct option will proceed to the next question.
                    </p>
                )}
            </div>


            {/* Media */}
            {question.media && question.media.length > 0 && (
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap gap-4 justify-center">
                    {question.media.map((mediaUrl, index) => (
                        <img
                            key={index}
                            src={mediaUrl}
                            alt={`Question visual helper ${index + 1}`}
                            className="max-w-full rounded-xl shadow-md border border-slate-200 dark:border-slate-700 hover:scale-[1.02] transition-transform duration-300"
                        />
                    ))}
                </div>
            )}

            {/* Options */}
            <div className={`p-6 sm:p-8 grid gap-4 ${question.options.length > 6 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {question.options.map((option, index) => {
                    const isSelected = selectedOptions.includes(option.id);
                    const isCorrect = hasAnswerKey && question.correct_answers.includes(option.id);

                    let cardStyles = "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30";
                    let circleStyles = "border-slate-300 dark:border-slate-600 text-slate-400";
                    let textStyles = "text-slate-700 dark:text-slate-300";
                    let statusIcon = null;

                    if (isSelected) {
                        cardStyles = "border-primary bg-primary/5 dark:bg-primary/10";
                        circleStyles = "border-primary bg-primary text-white";
                        textStyles = "text-primary dark:text-primary-400 font-semibold";
                    }

                    if (shouldReveal && hasAnswerKey) {
                        if (isCorrect) {
                            cardStyles = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20";
                            circleStyles = "border-emerald-500 bg-emerald-500 text-white";
                            textStyles = "text-emerald-900 dark:text-emerald-100 font-semibold";
                            statusIcon = <span className="material-symbols-outlined text-emerald-500 animate-fade-in text-xl shrink-0">check_circle</span>;
                        } else if (isSelected) {
                            cardStyles = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/20";
                            circleStyles = "border-red-500 bg-red-500 text-white";
                            textStyles = "text-red-900 dark:text-red-100 font-semibold";
                            statusIcon = <span className="material-symbols-outlined text-red-500 animate-fade-in text-xl shrink-0">cancel</span>;
                        }
                    }

                    return (
                        <div
                            key={`${option.id}-${index}`}
                            onClick={() => handleOptionClick(option.id)}
                            className={`relative group cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 hover:shadow-md active:scale-[0.99] flex items-start gap-4 ${cardStyles}`}
                        >
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 font-bold text-xs ${circleStyles}`}>
                                {String.fromCharCode(65 + index)}
                            </div>
                            <div className={`flex-1 ${textStyles} text-sm leading-relaxed`}>
                                {option.text}
                            </div>
                            {statusIcon}
                        </div>
                    );
                })}
            </div>

            {/* Explanation */}
            {shouldReveal && question.explanation && (
                <div className="mx-6 sm:mx-8 mb-8 p-6 bg-blue-50 dark:bg-[#2563eb]/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-reveal-up">
                    <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400 font-bold text-sm">
                        <span className="material-symbols-outlined text-lg">info</span>
                        Explanation
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {question.explanation}
                    </div>
                </div>
            )}

            {/* Quick Nav Buttons (flag + prev/next) — available on mobile too */}
            <div className="flex px-6 sm:px-8 py-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 justify-between items-center">
                <button
                    onClick={() => toggleFlag(question.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isFlagged
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-500/30'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                >
                    <span className="material-symbols-outlined text-lg">flag</span>
                    {isFlagged ? 'Flagged' : 'Flag for Review'}
                </button>

                <div className="flex gap-4">
                    <button
                        onClick={() => useExamStore.getState().prevQuestion()}
                        disabled={currentQuestionIndex === 0}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        onClick={() => useExamStore.getState().nextQuestion()}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
