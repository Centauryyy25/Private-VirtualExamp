'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    theme_preference?: string;
    season_preference?: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const result = await api.getMe();
            if (result.data) {
                setUser(result.data as User);
            } else {
                setUser(null);
                api.setToken(null);
            }
        } catch {
            setUser(null);
            api.setToken(null);
        }
    };

    useEffect(() => {
        // Check if user is logged in on mount
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (token) {
            refreshUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const result = await api.login(email, password);
            if (result.data) {
                api.setToken(result.data.access_token);
                localStorage.setItem('refresh_token', result.data.refresh_token);
                await refreshUser();
                return { success: true };
            }
            return { success: false, error: result.error || 'Login failed' };
        } catch (error) {
            return { success: false, error: 'An error occurred' };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, displayName?: string) => {
        setIsLoading(true);
        try {
            const result = await api.register(email, password, displayName);
            if (result.data) {
                // Auto-login after registration
                return await login(email, password);
            }
            return { success: false, error: result.error || 'Registration failed' };
        } catch (error) {
            return { success: false, error: 'An error occurred' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        api.setToken(null);
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
