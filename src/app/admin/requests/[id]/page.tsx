'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';

export default function AdminRequestReview() {
    const { id } = useParams();
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [request, setRequest] = useState<any>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && (!user || role !== 'admin')) {
            router.push('/login');
            return;
        }

        if (user && role === 'admin' && supabase && id) {
            fetchData();
        }
    }, [user, role, loading, supabase, id]);

    const fetchData = async () => {
        if (!supabase || !id) return;

        const { data, error } = await supabase
            .from('aid_requests')
            .select('*, mosque_profiles(*)')
            .eq('id', id)
            .single();

        if (!error && data) {
            setRequest(data);
        }
    };

    const handleDecision = async (status: 'approved' | 'rejected') => {
        if (!supabase || !id || processing) return;
        if (status === 'rejected' && !adminNotes) {
            alert('Please provide a reason for rejection.');
            return;
        }

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('aid_requests')
                .update({
                    status,
                    admin_notes: adminNotes,
                    approved_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            router.push('/admin');
        } catch (err) {
            console.error('Update error:', err);
            setProcessing(false);
        }
    };

    if (!request) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-4xl mx-auto">
                <Link href="/admin" className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
                    ← Back to Dashboard
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Request Details */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h1 className="text-2xl font-bold mb-4">Request Review</h1>

                            <div className="space-y-4">
                                <div>
                                    <span className="block text-gray-400 text-sm">Mosque / Organization</span>
                                    <div className="font-semibold text-lg">{request.mosque_profiles?.mosque_name}</div>
                                    <div className="text-gray-400 text-sm">{request.mosque_profiles?.city}, {request.mosque_profiles?.country}</div>
                                    {request.mosque_profiles?.website_url && (
                                        <a href={request.mosque_profiles.website_url} target="_blank" className="text-blue-400 text-sm hover:underline">Verify Website</a>
                                    )}
                                </div>

                                <div className="bg-gray-900/50 p-4 rounded-lg">
                                    <span className="block text-gray-400 text-sm mb-1">Request Details</span>
                                    <p className="text-gray-200">{request.purpose_detail}</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded text-xs uppercase">{request.purpose_category}</span>
                                        <span className={`px-2 py-1 rounded text-xs uppercase ${request.urgency_level >= 4 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                            Urgency: {request.urgency_level}/5
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <span className="text-gray-400">Requested Amount</span>
                                    <span className="font-mono font-bold text-green-400 text-xl">${request.amount_requested.toLocaleString()}</span>
                                </div>

                                {request.supporting_link && (
                                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                                        <span className="block text-blue-300 text-sm font-semibold mb-1">Evidence Provided</span>
                                        <a href={request.supporting_link} target="_blank" className="text-blue-400 hover:underline break-all text-sm">
                                            {request.supporting_link}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 sticky top-24">
                            <h2 className="text-xl font-bold mb-4">Admin Decision</h2>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Admin Notes (Required for rejection)</label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add internal notes or feedback for the mosque..."
                                    rows={4}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleDecision('rejected')}
                                    disabled={processing}
                                    className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleDecision('approved')}
                                    disabled={processing}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-green-900/20 transition-all disabled:opacity-50"
                                >
                                    Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
