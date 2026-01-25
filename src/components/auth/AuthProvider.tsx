'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: 'donor' | 'mosque' | 'admin' | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'donor' | 'mosque' | 'admin' | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const supabase = createBrowserClient();

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchUserRole(session.user.id);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    async function fetchUserRole(userId: string) {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (!error && data) {
                setRole(data.role as any);
            } else {
                console.warn('User has no profile role yet');
                setRole(null);
            }
        } catch (err) {
            console.error('Error fetching role:', err);
        } finally {
            setLoading(false);
        }
    }

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
