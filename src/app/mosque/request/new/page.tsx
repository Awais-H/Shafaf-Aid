'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/core/data/supabaseClient';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';

const PURPOSE_CATEGORIES = [
    { id: 'food', label: '🍎 Food Aid', desc: 'Meals, packages, water' },
    { id: 'orphans', label: '👶 Orphans', desc: 'Sponsorship, care, essentials' },
    { id: 'education', label: '📚 Education', desc: 'Fees, books, school supplies' },
    { id: 'medical', label: '🏥 Medical', desc: 'Surgeries, medicine, access' },
    { id: 'shelter', label: '🏠 Shelter', desc: 'Rent, repairs, winterization' },
    { id: 'other', label: '✨ Other', desc: 'Community projects, debts, etc.' },
];

export default function NewRequestWizard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const supabase = createBrowserClient();

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        purpose_category: '',
        purpose_detail: '',
        urgency_level: 3,
        amount_requested: '',
        needed_by_date: '',
        region_focus: '',
        supporting_link: ''
    });

    const updateField = (key: string, val: string | number) => {
        setFormData(prev => ({ ...prev, [key]: val }));
    };

    const nextStep = () => {
        if (step < 6) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const isValidStep = () => {
        switch (step) {
            case 1: return !!formData.purpose_category;
            case 2: return !!formData.purpose_detail && formData.purpose_detail.length > 10;
            case 3: return true; // default 3
            case 4: return !!formData.amount_requested && !isNaN(Number(formData.amount_requested));
            case 5: return true; // optional
            default: return true;
        }
    };

    const handleSubmit = async () => {
        if (!user || !supabase || submitting) return;
        setSubmitting(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('aid_requests')
                .insert({
                    mosque_user_id: user.id,
                    purpose_category: formData.purpose_category,
                    purpose_detail: formData.purpose_detail,
                    urgency_level: formData.urgency_level,
                    amount_requested: Number(formData.amount_requested),
                    needed_by_date: formData.needed_by_date || null,
                    region_focus: formData.region_focus,
                    supporting_link: formData.supporting_link,
                    status: 'submitted'
                });

            if (error) throw error;
            router.push('/mosque');
        } catch (err: unknown) {
            console.error('Submission error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-white p-8">Loading...</div>;
    if (!user || role !== 'mosque') {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center pt-24 pb-12 px-4">
            <div className="w-full max-w-2xl">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-green-500' : 'bg-gray-700'}`}
                        />
                    ))}
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                    {/* Step 1: Category */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">What is this request for?</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PURPOSE_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => updateField('purpose_category', cat.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.purpose_category === cat.id
                                            ? 'border-green-500 bg-green-900/20'
                                            : 'border-gray-700 hover:border-gray-500 bg-gray-900'
                                            }`}
                                    >
                                        <div className="font-semibold text-white text-lg mb-1">{cat.label}</div>
                                        <div className="text-gray-400 text-sm">{cat.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-2">Tell us the details</h2>
                            <p className="text-gray-400 mb-6 text-sm">Be specific. Who is it for? Why is it needed?</p>
                            <textarea
                                value={formData.purpose_detail}
                                onChange={e => updateField('purpose_detail', e.target.value)}
                                placeholder="e.g. Providing 50 food parcels for widows in the community..."
                                rows={6}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-green-500 outline-none resize-none text-lg"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Step 3: Urgency */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-4">How urgent is this?</h2>
                            <p className="text-gray-400 mb-8">Rate from 1 (Low) to 5 (Critical Emergency)</p>

                            <div className="flex flex-col gap-4">
                                {[5, 4, 3, 2, 1].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => updateField('urgency_level', level)}
                                        className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${formData.urgency_level === level
                                            ? 'border-green-500 bg-green-900/20'
                                            : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${level >= 4 ? 'bg-red-500 text-white' :
                                            level === 3 ? 'bg-yellow-500 text-black' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                            {level}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-white font-semibold">
                                                {level === 5 ? 'Critical Emergency (Life Threatening)' :
                                                    level === 4 ? 'Urgent (Needs Immediate Action)' :
                                                        level === 3 ? 'High Priority (Needed soon)' :
                                                            level === 2 ? 'Moderate (Can wait a bit)' :
                                                                'Low Priority (Long term)'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Amount & Date */}
                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">Funding & Timeline</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Amount Needed ($)</label>
                                    <input
                                        type="number"
                                        value={formData.amount_requested}
                                        onChange={e => updateField('amount_requested', e.target.value)}
                                        placeholder="2500"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-2xl font-mono focus:ring-2 focus:ring-green-500 outline-none"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Needed By (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.needed_by_date}
                                        onChange={e => updateField('needed_by_date', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Region & Links */}
                    {step === 5 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">Location & Proof</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Specific Region/Area</label>
                                    <input
                                        type="text"
                                        value={formData.region_focus}
                                        onChange={e => updateField('region_focus', e.target.value)}
                                        placeholder="e.g. North Gaza, Block 4"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Supporting Link (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.supporting_link}
                                        onChange={e => updateField('supporting_link', e.target.value)}
                                        placeholder="Google Drive folder, Website post, etc."
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Link to images or documents verification.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Review */}
                    {step === 6 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">Review & Submit</h2>

                            <div className="bg-gray-900 rounded-xl p-6 space-y-4 mb-6">
                                <div className="flex justify-between border-b border-gray-700 pb-2">
                                    <span className="text-gray-400">Category</span>
                                    <span className="text-white capitalize font-medium">{formData.purpose_category}</span>
                                </div>
                                <div className="border-b border-gray-700 pb-2">
                                    <span className="block text-gray-400 text-sm mb-1">Details</span>
                                    <p className="text-white text-sm leading-relaxed">{formData.purpose_detail}</p>
                                </div>
                                <div className="flex justify-between border-b border-gray-700 pb-2">
                                    <span className="text-gray-400">Amount</span>
                                    <span className="text-green-400 font-mono font-bold">${Number(formData.amount_requested).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Urgency</span>
                                    <span className="text-white">{formData.urgency_level}/5</span>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                        {step > 1 ? (
                            <button
                                onClick={prevStep}
                                className="text-gray-400 hover:text-white px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                                disabled={submitting}
                            >
                                Back
                            </button>
                        ) : (
                            <Link href="/mosque" className="text-gray-500 hover:text-gray-300 px-4 py-2">
                                Cancel
                            </Link>
                        )}

                        {step < 6 && (
                            <button
                                onClick={nextStep}
                                disabled={!isValidStep()}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next Step
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
