'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MosqueDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [requests, setRequests] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || role !== 'mosque')) {
            router.push('/login');
            return;
        }

        if (user && role === 'mosque' && supabase) {
            fetchRequests();
        }
    }, [user, role, loading, supabase]);

    const fetchRequests = async () => {
        if (!supabase || !user) return;
        try {
            const { data, error } = await supabase
                .from('aid_requests')
                .select('*')
                .eq('mosque_user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || loadingData) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Mosque Dashboard</h1>
                        <p className="text-gray-400">Manage your aid requests and track funding status.</p>
                    </div>
                    <Link
                        href="/mosque/request/new"
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                        + New Request
                    </Link>
                </div>

                {requests.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                        <div className="w-16 h-16 mx-auto mb-4 text-gray-500"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /></svg></div>
                        <h3 className="text-xl font-semibold mb-2">No Requests Yet</h3>
                        <p className="text-gray-400 mb-6">Create your first aid request to start receiving support.</p>
                        <Link
                            href="/mosque/request/new"
                            className="text-green-400 hover:text-green-300 font-medium"
                        >
                            Create Request →
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                onClick={() => router.push(`/mosque/requests/${req.id}`)}
                                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${req.status === 'approved' ? 'bg-green-900/40 text-green-400' :
                                                req.status === 'rejected' ? 'bg-red-900/40 text-red-400' :
                                                    'bg-yellow-900/40 text-yellow-400'
                                                }`}>
                                                {req.status}
                                            </span>
                                            <span className="text-gray-400 text-sm">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-1 group-hover:text-green-400 transition-colors">
                                            {req.purpose_detail.length > 60 ? req.purpose_detail.substring(0, 60) + '...' : req.purpose_detail}
                                        </h3>
                                        <p className="text-sm text-gray-400 capitalize">
                                            Category: {req.purpose_category} • Urgency: {req.urgency_level}/5
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold font-mono">
                                            ${req.amount_requested.toLocaleString()}
                                        </p>
                                        {req.needed_by_date && (
                                            <p className="text-xs text-red-400 mt-1">
                                                Due: {new Date(req.needed_by_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
