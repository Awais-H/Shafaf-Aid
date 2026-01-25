'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DonorDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [stats, setStats] = useState({ totalDonated: 0, requestsSupport: 0 });
    const [recentPledges, setRecentPledges] = useState<any[]>([]);

    useEffect(() => {
        if (!loading && (!user || role !== 'donor')) {
            router.push('/login');
            return;
        }

        if (user && role === 'donor' && supabase) {
            fetchDonorData();
        }
    }, [user, role, loading, supabase]);

    const fetchDonorData = async () => {
        if (!supabase || !user) return;

        // Fetch pledges
        const { data: pledges } = await supabase
            .from('donor_pledges')
            .select('*, aid_requests(purpose_category, purpose_detail)')
            .eq('donor_user_id', user.id)
            .order('created_at', { ascending: false });

        if (pledges) {
            setRecentPledges(pledges.slice(0, 5));
            const total = pledges.reduce((sum, p) => sum + (p.pledge_amount || 0), 0);
            setStats({
                totalDonated: total,
                requestsSupport: pledges.length
            });
        }
    };

    if (loading) return <div className="text-white p-8">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 mb-8 border border-blue-500/30 relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.email?.split('@')[0]}</h1>
                        <p className="text-gray-300 mb-6 max-w-xl">
                            Your contributions make a real difference. Today there are urgent requests needing your attention.
                        </p>
                        <Link
                            href="/donor/requests"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/40 inline-block"
                        >
                            Browse Urgent Requests
                        </Link>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Stats Cards */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-gray-400 text-sm mb-1">Total Impact</h3>
                        <div className="text-3xl font-bold font-mono text-green-400">
                            ${stats.totalDonated.toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pledged to date</p>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-gray-400 text-sm mb-1">Projects Supported</h3>
                        <div className="text-3xl font-bold font-mono text-blue-400">
                            {stats.requestsSupport}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Mosques & Communities</p>
                    </div>

                    {/* Quick Action */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col justify-center">
                        <h3 className="text-gray-400 text-sm mb-2">Find Opportunities</h3>
                        <Link href="/donor/requests" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 group">
                            Filter by Category <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                        <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1 mt-2 group">
                            Explore Impact Map <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Activity */}
                <h2 className="text-xl font-bold mt-10 mb-4">Recent Activity</h2>
                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    {recentPledges.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            No donations yet. Start your journey today!
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {recentPledges.map((pledge) => (
                                <div key={pledge.id} className="p-4 hover:bg-gray-750 transition-colors flex justify-between items-center">
                                    <div>
                                        <div className="font-semibold text-white">
                                            {pledge.aid_requests?.purpose_detail?.substring(0, 50)}...
                                        </div>
                                        <div className="text-xs text-gray-400 capitalize">
                                            {pledge.aid_requests?.purpose_category} • {new Date(pledge.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-mono font-bold">
                                        ${pledge.pledge_amount.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
