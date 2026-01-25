'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';

export default function DonorRequestDetail() {
    const { id } = useParams();
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [request, setRequest] = useState<any>(null);
    const [pledgeAmount, setPledgeAmount] = useState('');
    const [donorNote, setDonorNote] = useState('');
    const [showPledgeForm, setShowPledgeForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyPledged, setAlreadyPledged] = useState(false);

    useEffect(() => {
        if (!loading && (!user || role !== 'donor')) {
            router.push('/login');
            return;
        }

        if (user && role === 'donor' && supabase && id) {
            fetchData();
        }
    }, [user, role, loading, supabase, id]);

    const fetchData = async () => {
        if (!supabase || !id) return;

        // Fetch request details
        const { data: reqData } = await supabase
            .from('aid_requests')
            .select('*, mosque_profiles(*)')
            .eq('id', id)
            .single();

        if (reqData) {
            setRequest(reqData);
            if (reqData.status !== 'approved') {
                router.push('/donor/requests'); // Donors can only see approved
            }
        }

        // Check if already pledged
        const { data: pledgeData } = await supabase
            .from('donor_pledges')
            .select('id')
            .eq('request_id', id)
            .eq('donor_user_id', user!.id)
            .single();

        if (pledgeData) setAlreadyPledged(true);
    };

    const handleDonate = () => {
        // Open mosque website in new tab
        if (request?.mosque_profiles?.website_url) {
            window.open(request.mosque_profiles.website_url, '_blank');
        }
        // Show pledge form
        setShowPledgeForm(true);
    };

    const handlePledge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !supabase || !id) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('donor_pledges')
                .insert({
                    request_id: id,
                    donor_user_id: user.id,
                    pledge_amount: Number(pledgeAmount),
                    donor_note: donorNote
                });

            if (error) throw error;
            setAlreadyPledged(true);
            setShowPledgeForm(false);
        } catch (err) {
            console.error('Pledge error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!request) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-4xl mx-auto">
                <Link href="/donor/requests" className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
                    ← Back to Requests
                </Link>

                {/* Hero Section */}
                <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <span className="text-9xl">🕌</span>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-900/40 text-blue-400`}>
                                {request.purpose_category}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${request.urgency_level >= 4 ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                                }`}>
                                Urgency: {request.urgency_level}/5
                            </span>
                        </div>

                        <h1 className="text-3xl font-bold mb-4">{request.purpose_detail}</h1>

                        <div className="flex items-center gap-2 text-gray-300 mb-6">
                            <span className="font-semibold">{request.mosque_profiles?.mosque_name}</span>
                            <span>•</span>
                            <span>{request.mosque_profiles?.city}, {request.mosque_profiles?.country}</span>
                            {request.region_focus && (
                                <>
                                    <span>•</span>
                                    <span>Target Area: {request.region_focus}</span>
                                </>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {!alreadyPledged ? (
                                <button
                                    onClick={handleDonate}
                                    className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg shadow-green-900/40 transition-all transform hover:scale-105"
                                >
                                    Donate Now
                                </button>
                            ) : (
                                <div className="bg-green-900/30 border border-green-500/30 text-green-400 px-6 py-3 rounded-lg flex items-center gap-2 font-medium">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Donation Recorded. Thank you!
                                </div>
                            )}

                            {request.supporting_link && (
                                <a
                                    href={request.supporting_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                    View Docs/Proof
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Col: Details */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Pledge Form Modal/Inline */}
                        {showPledgeForm && !alreadyPledged && (
                            <div className="bg-gray-800 border-2 border-green-500/50 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-xl font-bold mb-2">Confirm Your Donation</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    You've been redirected to the mosque's donation page.
                                    Please record your contribution below so we can track the impact.
                                </p>
                                <form onSubmit={handlePledge} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Amount Donated ($)</label>
                                        <input
                                            type="number"
                                            required
                                            value={pledgeAmount}
                                            onChange={e => setPledgeAmount(e.target.value)}
                                            placeholder="Amount"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Message (Optional)</label>
                                        <textarea
                                            value={donorNote}
                                            onChange={e => setDonorNote(e.target.value)}
                                            placeholder="Leave a message for the mosque..."
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-green-500 resize-none h-20"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium">
                                            {submitting ? 'Recording...' : 'Record Donation'}
                                        </button>
                                        <button type="button" onClick={() => setShowPledgeForm(false)} className="text-gray-400 hover:text-white px-4 py-2">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">About the Organization</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Name</span>
                                    <span className="font-medium">{request.mosque_profiles?.mosque_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Location</span>
                                    <span>{request.mosque_profiles?.city}, {request.mosque_profiles?.country}</span>
                                </div>
                                {request.mosque_profiles?.short_description && (
                                    <div>
                                        <span className="block text-gray-400 text-sm mb-1">Bio</span>
                                        <p className="text-gray-300 text-sm leading-relaxed">{request.mosque_profiles.short_description}</p>
                                    </div>
                                )}
                                <div className="pt-2">
                                    <a
                                        href={request.mosque_profiles?.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                    >
                                        Visit Website ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Stats */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-gray-400 text-sm mb-1">Funding Goal</h3>
                            <div className="text-3xl font-bold font-mono text-green-400">
                                ${request.amount_requested.toLocaleString()}
                            </div>
                        </div>

                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-gray-400 text-sm mb-2">Why Urgent?</h3>
                            <p className="text-gray-300 text-sm">
                                This request is marked as <strong className="text-white">Level {request.urgency_level}</strong> urgency.
                                {request.needed_by_date && (
                                    <> Needs to be fulfilled by <span className="text-red-400 font-semibold">{new Date(request.needed_by_date).toLocaleDateString()}</span>.</>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
