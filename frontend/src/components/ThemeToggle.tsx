'use client';

import { usePreference } from '@/lib/preference-context';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const { theme, updateTheme, isLoading } = usePreference();
    const [isEffectiveDark, setIsEffectiveDark] = useState(false);

    useEffect(() => {
        const checkSystem = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (theme === 'system') {
            setIsEffectiveDark(checkSystem());
        } else {
            setIsEffectiveDark(theme === 'dark');
        }

        // Listen for system changes if preference is system
        if (theme === 'system') {
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = (e: MediaQueryListEvent) => setIsEffectiveDark(e.matches);
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        }
    }, [theme]);

    if (isLoading) {
        return <div style={{ width: '40px', height: '40px' }} />;
    }

    const toggle = () => {
        // Toggle to the opposite of what is currently visible
        updateTheme(isEffectiveDark ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggle}
            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-transparent flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
            title={isEffectiveDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
        >
            <span className="material-symbols-outlined text-xl">
                {isEffectiveDark ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    );
}
