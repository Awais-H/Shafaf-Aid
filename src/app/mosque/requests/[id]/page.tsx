'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';

export default function MosqueRequestDetail() {
    const { id } = useParams();
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [request, setRequest] = useState<any>(null);
    const [pledges, setPledges] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || role !== 'mosque')) {
            router.push('/login');
            return;
        }

        if (user && role === 'mosque' && supabase && id) {
            fetchData();
        }
    }, [user, role, loading, supabase, id]);

    const fetchData = async () => {
        if (!supabase || !id) return;
        try {
            // Fetch request details
            const { data: reqData, error: reqError } = await supabase
                .from('aid_requests')
                .select('*')
                .eq('id', id)
                .single();

            if (reqError) throw reqError;
            setRequest(reqData);

            // If approved, fetch pledges
            if (reqData.status === 'approved') {
                const { data: pfData, error: pfError } = await supabase
                    .from('donor_pledges')
                    .select('*, donor_profiles(display_name)')
                    .eq('request_id', id)
                    .order('created_at', { ascending: false });

                if (!pfError) {
                    setPledges(pfData || []);
                }
            }
        } catch (err) {
            console.error('Error fetching details:', err);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || loadingData) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
    }

    if (!request) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Request not found</div>;
    }

    const totalPledged = pledges.reduce((sum, p) => sum + (p.pledge_amount || 0), 0);
    const progress = Math.min(100, (totalPledged / request.amount_requested) * 100);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-4xl mx-auto">
                <Link href="/mosque" className="text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1">
                    ← Back to Dashboard
                </Link>

                {/* Header Status */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Request Details</h1>
                        <p className="text-gray-400 text-sm">Created on {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wider ${request.status === 'approved' ? 'bg-green-600' :
                            request.status === 'rejected' ? 'bg-red-600' :
                                'bg-yellow-600 text-black'
                        }`}>
                        {request.status}
                    </div>
                </div>

                {/* Admin Feedback */}
                {request.status !== 'submitted' && request.admin_notes && (
                    <div className={`mb-8 p-6 rounded-xl border ${request.status === 'approved' ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'
                        }`}>
                        <h3 className="text-lg font-semibold mb-2">Admin Feedback</h3>
                        <p className="text-gray-300">{request.admin_notes}</p>
                        {request.approved_at && (
                            <p className="text-xs text-gray-500 mt-2">Decided on {new Date(request.approved_at).toLocaleDateString()}</p>
                        )}
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Request Information</h2>
                            <div className="space-y-4">
                                <div>
                                    <span className="block text-gray-400 text-sm">Category</span>
                                    <span className="text-lg capitalize">{request.purpose_category}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400 text-sm">Details</span>
                                    <p className="text-gray-300 leading-relaxed mt-1">{request.purpose_detail}</p>
                                </div>
                                <div>
                                    <span className="block text-gray-400 text-sm">Region Focus</span>
                                    <span>{request.region_focus || 'N/A'}</span>
                                </div>
                                {request.supporting_link && (
                                    <div>
                                        <span className="block text-gray-400 text-sm">Supporting Documents</span>
                                        <a href={request.supporting_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                                            {request.supporting_link}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pledges List (Only if approved) */}
                        {request.status === 'approved' && (
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <h2 className="text-xl font-semibold mb-4">Recent Pledges</h2>
                                {pledges.length === 0 ? (
                                    <p className="text-gray-400">No pledges recorded yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {pledges.map((pledge) => (
                                            <div key={pledge.id} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                                                <div>
                                                    <div className="font-semibold">{pledge.donor_profiles?.display_name || 'Anonymous Donor'}</div>
                                                    {pledge.donor_note && <div className="text-sm text-gray-400">"{pledge.donor_note}"</div>}
                                                </div>
                                                <div className="text-green-400 font-mono font-bold">
                                                    {pledge.pledge_amount ? `$${pledge.pledge_amount.toLocaleString()}` : 'Promised'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-gray-400 text-sm mb-1">Target Amount</h3>
                            <div className="text-3xl font-bold font-mono text-green-400 mb-1">
                                ${request.amount_requested.toLocaleString()}
                            </div>
                            {request.needed_by_date && (
                                <div className="text-sm text-red-400">
                                    Needed by {new Date(request.needed_by_date).toLocaleDateString()}
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-gray-400 text-sm mb-1">Urgency Level</h3>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${request.urgency_level >= 4 ? 'text-red-500' : 'text-yellow-500'
                                    }`}>
                                    {request.urgency_level}/5
                                </span>
                                <span className="text-sm text-gray-400">
                                    {request.urgency_level >= 4 ? 'Critical' : 'Important'}
                                </span>
                            </div>
                        </div>

                        {/* Progress Widget (Only if approved) */}
                        {request.status === 'approved' && (
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <h3 className="text-gray-400 text-sm mb-2">Funding Progress</h3>
                                <div className="w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-400 font-bold">${totalPledged.toLocaleString()}</span>
                                    <span className="text-gray-400">{progress.toFixed(0)}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
