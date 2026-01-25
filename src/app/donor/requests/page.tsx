'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/core/data/supabaseClient';
import Link from 'next/link';

export default function BrowseRequestsPage() {
    const supabase = createBrowserClient();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const fetchRequests = async () => {
        if (!supabase) return;
        setLoading(true);

        let query = supabase
            .from('aid_requests')
            .select('*, mosque_profiles(mosque_name, city, country)')
            .eq('status', 'approved')
            .order('urgency_level', { ascending: false })
            .order('needed_by_date', { ascending: true });

        if (filter !== 'all') {
            query = query.eq('purpose_category', filter);
        }

        const { data, error } = await query;
        if (!error && data) {
            setRequests(data);
        }
        setLoading(false);
    };

    const categories = ['all', 'food', 'medical', 'shelter', 'education', 'orphans', 'other'];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Urgent Aid Requests</h1>
                <p className="text-gray-400 mb-8">Verified requests from our partner mosques needing immediate support.</p>

                {/* Filters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === cat
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                        <p className="text-gray-400">No active requests found in this category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <Link href={`/donor/requests/${req.id}`} key={req.id} className="block group">
                                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all h-full flex flex-col">
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${req.urgency_level >= 4 ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                                                }`}>
                                                Urgency: {req.urgency_level}/5
                                            </span>
                                            <span className="text-xs text-gray-500 capitalize">{req.purpose_category}</span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                                            {req.purpose_detail}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                                            <span>🕌 {req.mosque_profiles?.mosque_name || 'Verified Mosque'}</span>
                                            <span>•</span>
                                            <span>📍 {req.mosque_profiles?.city || req.region_focus}, {req.mosque_profiles?.country}</span>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-gray-500">Target</div>
                                            <div className="font-mono font-bold text-green-400">${req.amount_requested.toLocaleString()}</div>
                                        </div>
                                        <span className="text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                                            View Details →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
