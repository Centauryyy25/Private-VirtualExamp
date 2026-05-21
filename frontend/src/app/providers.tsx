'use client';

import { AuthProvider } from '@/lib/auth-context';
import { PreferenceProvider } from '@/lib/preference-context';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <PreferenceProvider>
                {children}
            </PreferenceProvider>
        </AuthProvider>
    );
}
