'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isLoading: authLoading, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    useEffect(() => {
        if (isAuthenticated) {
            router.push(redirectUrl);
        }
    }, [isAuthenticated, router, redirectUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        const result = await login(email, password);
        if (result.success) {
            router.push(redirectUrl);
        } else {
            setError(result.error || 'Login failed');
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 md:p-6 transition-colors duration-300">
            <div className="w-full max-w-[440px] animate-reveal-up">
                {/* Back Link */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group">
                        <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        Back to home
                    </Link>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden p-8 md:p-10 relative">
                    {/* Decorative Gradient */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400"></div>

                    {/* Logo & Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl font-bold">fact_check</span>
                            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">VirtualExamp</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your details to sign in</p>
                    </div>

                    {/* Redirect notice */}
                    {redirectUrl !== '/dashboard' && (
                        <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-2xl text-primary-700 dark:text-primary-300 text-sm font-semibold flex items-center gap-3">
                            <span className="material-symbols-outlined text-lg">info</span>
                            Sign in to access this feature
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3 animate-bounce-subtle">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                                <input
                                    id="email"
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white transition-all font-medium"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="password">
                                    Password
                                </label>
                                <Link href="#" className="text-xs font-bold text-primary hover:text-primary-600 transition-colors">Forgot Password?</Link>
                            </div>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                                <input
                                    id="password"
                                    type="password"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                            disabled={authLoading}
                        >
                            {authLoading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Register Link */}
                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Don&apos;t have an account?{' '}
                            <Link
                                href={`/register${redirectUrl !== '/dashboard' ? `?redirect=${redirectUrl}` : ''}`}
                                className="text-primary font-bold hover:text-primary-600 transition-colors"
                            >
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    © 2026 VirtualExamp Systems
                </p>
            </div>
        </main>
    );
}
