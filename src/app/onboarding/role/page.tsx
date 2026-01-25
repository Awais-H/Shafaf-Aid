'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';

type Role = 'donor' | 'mosque';

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [step, setStep] = useState<'role' | 'details'>('role');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [displayName, setDisplayName] = useState('');
    const [mosqueDetails, setMosqueDetails] = useState({
        name: '',
        website: '',
        country: '',
        city: '',
        email: '',
        description: ''
    });

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setStep('details');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !supabase || !selectedRole) return;

        setLoading(true);
        setError(null);

        try {
            // Create the appropriate profile based on role
            // NOTE: The deprecated 'profiles' table is no longer used
            if (selectedRole === 'donor') {
                const { error: donorError } = await supabase
                    .from('donor_profiles')
                    .insert({
                        user_id: user.id,
                        display_name: displayName || user.email?.split('@')[0]
                    });
                if (donorError) throw donorError;
                router.push('/donor');
            } else {
                const { error: mosqueError } = await supabase
                    .from('mosque_profiles')
                    .insert({
                        user_id: user.id,
                        mosque_name: mosqueDetails.name,
                        website_url: mosqueDetails.website,
                        country: mosqueDetails.country,
                        city: mosqueDetails.city,
                        contact_email: mosqueDetails.email,
                        short_description: mosqueDetails.description
                    });
                if (mosqueError) throw mosqueError;
                router.push('/mosque');
            }

            router.refresh();
        } catch (err: unknown) {
            console.error('Onboarding error:', err);
            setError(err instanceof Error ? err.message : 'Failed to create profile');
            // If profile creation failed, we might want to rollback or handle partial state
            // For MVP, we'll just show error
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">

                {step === 'role' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-3xl font-bold text-white text-center">How will you use Shafaf?</h1>
                        <p className="text-gray-400 text-center -mt-4">Choose your role to get started</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => handleRoleSelect('donor')}
                                className="group relative p-8 bg-gray-900 border-2 border-gray-700 rounded-xl hover:border-blue-500 transition-all text-left"
                            >
                                <div className="w-12 h-12 mb-4 text-blue-400"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg></div>
                                <h3 className="text-xl font-semibold text-white mb-2">I want to Donate</h3>
                                <p className="text-gray-400 text-sm">Find urgent needs and support verified mosques and organizations.</p>
                                <div className="absolute inset-0 border-2 border-blue-500 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none" />
                            </button>

                            <button
                                onClick={() => handleRoleSelect('mosque')}
                                className="group relative p-8 bg-gray-900 border-2 border-gray-700 rounded-xl hover:border-green-500 transition-all text-left"
                            >
                                <div className="w-12 h-12 mb-4 text-green-400"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.84L18 11v7H6v-7l6-5.16z" /></svg></div>
                                <h3 className="text-xl font-semibold text-white mb-2">I represent a Mosque</h3>
                                <p className="text-gray-400 text-sm">Submit aid requests and track funding for your community needs.</p>
                                <div className="absolute inset-0 border-2 border-green-500 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'details' && selectedRole === 'donor' && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div>
                            <button
                                type="button"
                                onClick={() => setStep('role')}
                                className="text-sm text-gray-500 hover:text-white mb-4 flex items-center gap-1"
                            >
                                ← Back
                            </button>
                            <h1 className="text-2xl font-bold text-white">Donor Profile</h1>
                            <p className="text-gray-400 text-sm">Tell us how you'd like to be known</p>
                        </div>

                        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name (Optional)</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g. Abdullah A."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating Profile...' : 'Complete Setup'}
                        </button>
                    </form>
                )}

                {step === 'details' && selectedRole === 'mosque' && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div>
                            <button
                                type="button"
                                onClick={() => setStep('role')}
                                className="text-sm text-gray-500 hover:text-white mb-4 flex items-center gap-1"
                            >
                                ← Back
                            </button>
                            <h1 className="text-2xl font-bold text-white">Mosque Details</h1>
                            <p className="text-gray-400 text-sm">We verify all organizations. Please provide accurate details.</p>
                        </div>

                        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mosque / Org Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={mosqueDetails.name}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, name: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Country *</label>
                                <input
                                    type="text"
                                    required
                                    value={mosqueDetails.country}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, country: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">City *</label>
                                <input
                                    type="text"
                                    required
                                    value={mosqueDetails.city}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, city: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Website URL *</label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://..."
                                    value={mosqueDetails.website}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, website: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={mosqueDetails.email}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, email: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Short Description (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={mosqueDetails.description}
                                    onChange={e => setMosqueDetails({ ...mosqueDetails, description: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating Profile...' : 'Complete Setup'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
