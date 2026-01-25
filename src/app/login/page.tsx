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

                // If signup successful and we have a user, create their profile with selected role
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            user_id: authData.user.id,
                            role: selectedRole,
                        });

                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                        // Don't throw - user is created, profile might need RLS fix
                    }

                    // Check if email confirmation is required
                    if (authData.session) {
                        // No email confirmation needed, redirect based on role
                        router.refresh();
                        router.push(selectedRole === 'donor' ? '/donor' : '/mosque');
                    } else {
                        setSuccessMessage('Check your email to confirm your account!');
                    }
                }
            } else {
                // Sign in
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                // Fetch user role to redirect to correct dashboard
                if (data.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('user_id', data.user.id)
                        .single();

                    router.refresh();
                    if (profile?.role === 'admin') {
                        router.push('/admin');
                    } else if (profile?.role === 'mosque') {
                        router.push('/mosque');
                    } else if (profile?.role === 'donor') {
                        router.push('/donor');
                    } else {
                        // No role yet, go to main page
                        router.push('/');
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h1>

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-900/50 border border-green-500/50 text-green-200 p-3 rounded-lg mb-4 text-sm">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Role Selection - Only for Sign Up */}
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('donor')}
                                    className={`p-4 rounded-lg border-2 transition-all text-center ${selectedRole === 'donor'
                                            ? 'border-blue-500 bg-blue-500/20 text-white'
                                            : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">💝</div>
                                    <div className="font-semibold">Donor</div>
                                    <div className="text-xs opacity-70">I want to give</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('mosque')}
                                    className={`p-4 rounded-lg border-2 transition-all text-center ${selectedRole === 'mosque'
                                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                                            : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">🕌</div>
                                    <div className="font-semibold">Mosque</div>
                                    <div className="text-xs opacity-70">I need support</div>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    <p>
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            className="text-blue-400 hover:text-blue-300 font-medium ml-1"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
