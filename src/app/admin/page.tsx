'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [requests, setRequests] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || role !== 'admin')) {
            router.push('/login');
            return;
        }

        if (user && role === 'admin' && supabase) {
            fetchRequests();
        }
    }, [user, role, loading, supabase]);

    const fetchRequests = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('aid_requests')
                .select('*, mosque_profiles(mosque_name)')
                .eq('status', 'submitted')
                .order('created_at', { ascending: true });

            if (!error) {
                setRequests(data || []);
            }
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || loadingData) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Admin...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard - Pending Approvals</h1>

                {requests.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                        <h3 className="text-xl font-semibold mb-2">All Cleared!</h3>
                        <p className="text-gray-400">No pending requests waiting for approval.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-semibold text-blue-400">{req.mosque_profiles?.mosque_name}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-sm text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {req.purpose_detail.length > 80 ? req.purpose_detail.substring(0, 80) + '...' : req.purpose_detail}
                                    </h3>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span>Category: <span className="text-gray-300 capitalize">{req.purpose_category}</span></span>
                                        <span>Amount: <span className="text-green-400 font-mono">${req.amount_requested.toLocaleString()}</span></span>
                                        <span>Urgency: <span className={req.urgency_level >= 4 ? 'text-red-400' : 'text-yellow-400'}>{req.urgency_level}/5</span></span>
                                    </div>
                                </div>

                                <Link
                                    href={`/admin/requests/${req.id}`}
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Review
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
