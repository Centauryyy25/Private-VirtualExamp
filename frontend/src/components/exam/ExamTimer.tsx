'use client';

import { useEffect, useRef } from 'react';
import { useExamStore } from '@/lib/store/examStore';

interface ExamTimerProps {
    onTimeUp?: () => void;
}

export default function ExamTimer({ onTimeUp }: ExamTimerProps) {
    const { mode, timeRemaining, timeLimit, updateTimeRemaining } = useExamStore();
    const onTimeUpRef = useRef(onTimeUp);

    onTimeUpRef.current = onTimeUp;

    useEffect(() => {
        if (mode !== 'timed' || !timeLimit) return;

        const startTime = Date.now();
        const endTime = startTime + (timeRemaining || timeLimit) * 1000;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            updateTimeRemaining(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                onTimeUpRef.current?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [mode, timeLimit]);

    if (mode !== 'timed' || timeRemaining === null) {
        return (
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Training</span>
            </div>
        );
    }

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    const formatTime = (value: number) => value.toString().padStart(2, '0');
    const isWarning = timeRemaining < 300;

    return (
        <div className="flex flex-col items-end min-w-[100px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time Remaining</span>
            <span className={`text-xl font-mono font-black tabular-nums transition-colors duration-300 ${isWarning ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
                }`}>
                {hours > 0 && `${formatTime(hours)}:`}
                {formatTime(minutes)}:{formatTime(seconds)}
            </span>
        </div>
    );
}
