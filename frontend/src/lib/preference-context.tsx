'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type Theme = 'system' | 'light' | 'dark';

interface UserPreferences {
    theme: Theme;
    season: string | null;
}

interface PreferenceContextType {
    theme: Theme;
    season: string | null;
    updateTheme: (theme: Theme) => Promise<void>;
    updateSeason: (season: string | null) => Promise<void>;
    isLoading: boolean;
}

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

export function PreferenceProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [theme, setTheme] = useState<Theme>('light'); // Default to light, not system
    const [season, setSeason] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Apply theme to DOM
    const applyTheme = (newTheme: Theme) => {
        if (typeof window === 'undefined') return;

        const root = document.documentElement;

        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else if (newTheme === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    // Load preferences on mount
    useEffect(() => {
        setMounted(true);

        const loadPreferences = async () => {
            if (isAuthenticated && user) {
                // Load from backend for authenticated users
                try {
                    const result = await api.getPreferences();
                    if (result.data) {
                        setTheme(result.data.theme as Theme);
                        setSeason(result.data.season);
                        applyTheme(result.data.theme as Theme);
                    } else {
                        // Fallback to user object preferences
                        if (user.theme_preference) {
                            setTheme(user.theme_preference as Theme);
                            applyTheme(user.theme_preference as Theme);
                        }
                        if (user.season_preference) {
                            setSeason(user.season_preference);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load preferences from backend:', error);
                    // Fallback to localStorage
                    loadFromLocalStorage();
                }
            } else {
                // Load from localStorage for guest users
                loadFromLocalStorage();
            }
            setIsLoading(false);
        };

        const loadFromLocalStorage = () => {
            const savedTheme = localStorage.getItem('theme') as Theme;
            const savedSeason = localStorage.getItem('season');

            if (savedTheme) {
                setTheme(savedTheme);
                applyTheme(savedTheme);
            } else {
                applyTheme('light'); // Default to light if no preference found
            }

            if (savedSeason) {
                setSeason(savedSeason);
            }
        };

        if (mounted) {
            loadPreferences();
        }
    }, [mounted, isAuthenticated, user]);

    // Update theme
    const updateTheme = async (newTheme: Theme) => {
        setTheme(newTheme);
        applyTheme(newTheme);

        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', newTheme);
        }

        // Save to backend if authenticated
        if (isAuthenticated) {
            try {
                await api.updatePreferences({ theme: newTheme });
            } catch (error) {
                console.error('Failed to save theme preference:', error);
            }
        }
    };

    // Update season
    const updateSeason = async (newSeason: string | null) => {
        setSeason(newSeason);

        // Save to localStorage
        if (typeof window !== 'undefined') {
            if (newSeason) {
                localStorage.setItem('season', newSeason);
            } else {
                localStorage.removeItem('season');
            }
        }

        // Save to backend if authenticated
        if (isAuthenticated) {
            try {
                await api.updatePreferences({ season: newSeason });
            } catch (error) {
                console.error('Failed to save season preference:', error);
            }
        }
    };

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => applyTheme('system');

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return (
        <PreferenceContext.Provider
            value={{
                theme,
                season,
                updateTheme,
                updateSeason,
                isLoading,
            }}
        >
            {children}
        </PreferenceContext.Provider>
    );
}

export function usePreference() {
    const context = useContext(PreferenceContext);
    if (context === undefined) {
        throw new Error('usePreference must be used within a PreferenceProvider');
    }
    return context;
}
