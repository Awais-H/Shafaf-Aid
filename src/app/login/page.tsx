'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<'donor' | 'mosque'>('donor');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!supabase) {
            setError('Supabase client not available');
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                // Sign up
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;

                // If signup successful and we have a user, create profile based on role
                if (authData.user) {
                    if (selectedRole === 'donor') {
                        // Donor: create donor_profiles entry directly
                        const { error: profileError } = await supabase
                            .from('donor_profiles')
                            .insert({
                                user_id: authData.user.id,
                                display_name: email.split('@')[0],
                            });

                        if (profileError) {
                            console.error('Donor profile creation error:', profileError);
                        }

                        if (authData.session) {
                            router.refresh();
                            router.push('/donor');
                        } else {
                            setSuccessMessage('Check your email to confirm your account!');
                        }
                    } else {
                        // Mosque: redirect to onboarding to collect required mosque details
                        if (authData.session) {
                            router.refresh();
                            router.push('/onboarding/role');
                        } else {
                            setSuccessMessage('Check your email to confirm your account, then complete your mosque profile!');
                        }
                    }
                }
            } else {
                // Sign in
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                // Fetch user role from profile tables to redirect to correct dashboard
                if (data.user) {
                    const userId = data.user.id;

                    // Check Admin Profile
                    const { data: adminProfile } = await supabase
                        .from('admin_profiles')
                        .select('role')
                        .eq('user_id', userId)
                        .single();

                    if (adminProfile?.role) {
                        router.refresh();
                        router.push('/admin');
                        return;
                    }

                    // Check Mosque Profile
                    const { data: mosqueProfile } = await supabase
                        .from('mosque_profiles')
                        .select('role')
                        .eq('user_id', userId)
                        .single();

                    if (mosqueProfile?.role) {
                        router.refresh();
                        router.push('/mosque');
                        return;
                    }

                    // Check Donor Profile
                    const { data: donorProfile } = await supabase
                        .from('donor_profiles')
                        .select('role')
                        .eq('user_id', userId)
                        .single();

                    if (donorProfile?.role) {
                        router.refresh();
                        router.push('/donor');
                        return;
                    }

                    // No profile found - send to onboarding
                    router.refresh();
                    router.push('/onboarding/role');
                }
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!supabase) {
            setError('Supabase client not available');
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#18181b] rounded-2xl shadow-2xl p-8 border border-[#27272a]">
                {/* Logo Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#27272a] flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Product Name */}
                <h1 className="text-2xl font-bold text-white mb-8 text-center">
                    Shafaf
                </h1>

                {error && (
                    <div className="bg-red-900/30 border border-red-500/30 text-red-300 p-3 rounded-xl mb-4 text-sm">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl mb-4 text-sm">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {/* Email Input */}
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full bg-[#27272a] border-none rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                        required
                    />

                    {/* Password Input */}
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-[#27272a] border-none rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                        required
                        minLength={6}
                    />

                    {/* Role Selection - Only for Sign Up */}
                    {isSignUp && (
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-gray-400 mb-3">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('donor')}
                                    className={`p-4 rounded-xl border-2 transition-all text-center ${selectedRole === 'donor'
                                        ? 'border-emerald-500 bg-emerald-500/20 text-white'
                                        : 'border-[#27272a] bg-[#27272a] text-gray-400 hover:border-[#3f3f46]'
                                        }`}
                                >
                                    <div className="font-semibold">Donor</div>
                                    <div className="text-xs opacity-70">I want to give</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('mosque')}
                                    className={`p-4 rounded-xl border-2 transition-all text-center ${selectedRole === 'mosque'
                                        ? 'border-emerald-500 bg-emerald-500/20 text-white'
                                        : 'border-[#27272a] bg-[#27272a] text-gray-400 hover:border-[#3f3f46]'
                                        }`}
                                >
                                    <div className="font-semibold">Mosque</div>
                                    <div className="text-xs opacity-70">I need support</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sign In / Create Account Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white font-medium py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign in'}
                    </button>

                    {/* Continue with Google Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white font-medium py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>
                </form>

                {/* Toggle Sign Up / Sign In Link */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>
                        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            className="text-white hover:underline font-medium"
                        >
                            {isSignUp ? 'Sign in' : 'Sign up, it\'s free!'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
