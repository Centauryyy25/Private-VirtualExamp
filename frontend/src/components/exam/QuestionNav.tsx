'use client';

import { useExamStore } from '@/lib/store/examStore';

export default function QuestionNav() {
    const { exam, currentQuestionIndex, answers, setCurrentQuestion } = useExamStore();

    if (!exam) return null;

    const questions = exam.parsed_data.questions;

    const getItemClass = (index: number) => {
        const question = questions[index];
        const answer = answers[question.id];

        let base = "w-10 h-10 flex items-center justify-center text-xs font-bold rounded-lg transition-all duration-200 border-2 ";

        if (index === currentQuestionIndex) {
            return base + "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/30 ring-offset-2 dark:ring-offset-slate-900 shadow-lg shadow-blue-500/20";
        }

        if (answer?.flagged) {
            return base + "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border-amber-400/50";
        }

        if (answer?.answer && answer.answer.length > 0) {
            return base + "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-400/50";
        }

        return base + "bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600";
    };

    return (
        <div className="grid grid-cols-5 gap-2.5">
            {questions.map((_, index: number) => (
                <button
                    key={index}
                    type="button"
                    className={getItemClass(index)}
                    onClick={() => setCurrentQuestion(index)}
                    title={`Question ${index + 1}`}
                >
                    {index + 1}
                </button>
            ))}
        </div>
    );
}
