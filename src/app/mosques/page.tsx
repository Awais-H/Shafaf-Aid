'use client';

/**
 * Mosques Explorer Page
 * Browse mosques by country and city, view funding needs and map
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import MapView from '@/components/map/MapView';
import LoadingState from '@/components/layout/LoadingState';
import {
    loadGeoData,
    getCountriesFromGeo,
    getCitiesFromGeo,
    fetchMosquesForCity,
    fetchMosquesForCountry,
    getCityHotspotPoints,
    getCountryHotspotPoints,
    type GeoCenters,
    type GeoCenter,
} from '@/core/mosques';
import type { MosqueWithFunding, MapPoint } from '@/core/data/schema';

// Mosque card component
function MosqueCard({
    mosque,
    onClick,
    selected,
}: {
    mosque: MosqueWithFunding;
    onClick: () => void;
    selected: boolean;
}) {
    const progress = mosque.goalAmount > 0 ? (mosque.raisedAmount / mosque.goalAmount) * 100 : 0;
    const urgencyColors = {
        low: 'bg-green-900/40 text-green-400',
        med: 'bg-yellow-900/40 text-yellow-400',
        high: 'bg-red-900/40 text-red-400',
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selected
                ? 'bg-white/10 border-blue-500'
                : 'bg-white/5 border-gray-800 hover:bg-white/8 hover:border-gray-700'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white text-sm truncate flex-1 mr-2">
                    {mosque.name}
                </h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${urgencyColors[mosque.urgency]}`}>
                    {mosque.urgency}
                </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">{mosque.city}</p>

            {/* Funding progress */}
            <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-mono">
                        ${mosque.raisedAmount.toLocaleString()} / ${mosque.goalAmount.toLocaleString()}
                    </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            </div>

            {mosque.emergencyAppeal && (
                <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-800/50 rounded text-xs text-red-400">
                    [!] {mosque.emergencyAppeal}
                </div>
            )}
        </div>
    );
}

export default function MosquesPage() {
    const router = useRouter();

    // Data state
    const [geoCenters, setGeoCenters] = useState<GeoCenters | null>(null);
    const [mosques, setMosques] = useState<MosqueWithFunding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMosques, setIsLoadingMosques] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selection state
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);

    // Load geo data on mount
    useEffect(() => {
        async function init() {
            try {
                const { geoCenters: geo } = await loadGeoData();
                setGeoCenters(geo);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to load geo data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
                setIsLoading(false);
            }
        }
        init();
    }, []);

    // Countries list
    const countries = useMemo(() => {
        if (!geoCenters) return [];
        return getCountriesFromGeo(geoCenters);
    }, [geoCenters]);

    // Cities for selected country
    const cities = useMemo(() => {
        if (!geoCenters || !selectedCountry) return [];
        return getCitiesFromGeo(geoCenters, selectedCountry);
    }, [geoCenters, selectedCountry]);

    // Fetch mosques when country/city changes
    useEffect(() => {
        if (!geoCenters || !selectedCountry) {
            setMosques([]);
            return;
        }

        async function fetchData() {
            if (!geoCenters) return;
            setIsLoadingMosques(true);
            setMosques([]);
            try {
                let data: MosqueWithFunding[];
                if (selectedCity) {
                    const geo = geoCenters[selectedCountry]?.[selectedCity];
                    if (geo) {
                        data = await fetchMosquesForCity(geo, selectedCountry, selectedCity);
                    } else {
                        data = [];
                    }
                } else {
                    data = await fetchMosquesForCountry(geoCenters, selectedCountry);
                }
                setMosques(data);
            } catch (err) {
                console.error('Failed to fetch mosques:', err);
            } finally {
                setIsLoadingMosques(false);
            }
        }

        fetchData();
    }, [geoCenters, selectedCountry, selectedCity]);

    // Map points
    const mapPoints = useMemo((): MapPoint[] => {
        if (!geoCenters || mosques.length === 0) return [];

        if (selectedCity) {
            const geo = geoCenters[selectedCountry]?.[selectedCity];
            if (!geo) return [];
            const { mosquePoints } = getCityHotspotPoints(geo, mosques, selectedCountry, selectedCity);
            return mosquePoints;
        } else if (selectedCountry) {
            const { hotspots, mosquePoints } = getCountryHotspotPoints(mosques, geoCenters, selectedCountry, 50);
            return [...hotspots, ...mosquePoints];
        }
        return [];
    }, [geoCenters, mosques, selectedCountry, selectedCity]);

    // Map view state
    const mapViewState = useMemo(() => {
        if (selectedCity && geoCenters?.[selectedCountry]?.[selectedCity]) {
            const geo = geoCenters[selectedCountry][selectedCity];
            return { longitude: geo.lng, latitude: geo.lat, zoom: 12, pitch: 0, bearing: 0 };
        } else if (selectedCountry && cities.length > 0 && geoCenters?.[selectedCountry]) {
            const firstCity = Object.values(geoCenters[selectedCountry])[0];
            return { longitude: firstCity.lng, latitude: firstCity.lat, zoom: 8, pitch: 0, bearing: 0 };
        }
        return { longitude: 0, latitude: 20, zoom: 2, pitch: 0, bearing: 0 };
    }, [selectedCountry, selectedCity, cities, geoCenters]);

    // Handle country change
    const handleCountryChange = useCallback((country: string) => {
        setSelectedCountry(country);
        setSelectedCity('');
        setSelectedMosqueId(null);
    }, []);

    // Handle city change
    const handleCityChange = useCallback((city: string) => {
        setSelectedCity(city);
        setSelectedMosqueId(null);
    }, []);

    // Handle mosque card click
    const handleMosqueCardClick = useCallback((mosque: MosqueWithFunding) => {
        setSelectedMosqueId(mosque.id);
    }, []);

    // Sorted mosques by necessity
    const sortedMosques = useMemo(() => {
        return [...mosques].sort((a, b) => b.necessityScore - a.necessityScore);
    }, [mosques]);

    const isCity = !!selectedCity;
    const listMosques = sortedMosques;

    if (isLoading) {
        return <LoadingState message="Loading mosque data..." />;
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-[#050505] flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-[#050505] overflow-hidden">
            {/* Header */}
            <Header />

            {/* Main content */}
            <div className="flex-1 flex pt-14">
                {/* Left Sidebar */}
                <div
                    className="w-72 border-r border-gray-800/30 flex flex-col min-h-0"
                    style={{
                        background: 'rgba(8, 8, 8, 0.95)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <div className="p-4 border-b border-gray-800/30 shrink-0">
                        <h3 className="text-white font-semibold text-sm mb-1">Mosques</h3>
                        <p className="text-gray-500 text-xs">Select country & city to explore</p>
                    </div>

                    {/* Country/City Selectors */}
                    <div className="p-4 space-y-3 border-b border-gray-800/30 shrink-0">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Country</label>
                            <select
                                value={selectedCountry}
                                onChange={(e) => handleCountryChange(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Select country...</option>
                                {countries.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {selectedCountry && cities.length > 0 && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">City</label>
                                <select
                                    value={selectedCity}
                                    onChange={(e) => handleCityChange(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">All cities</option>
                                    {cities.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Mosque List - scrollable */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
                        {!selectedCountry ? (
                            <div className="text-center text-gray-500 text-sm py-8">
                                Select a country to view mosques and donation needs.
                            </div>
                        ) : isLoadingMosques ? (
                            <div className="text-center text-gray-400 text-sm py-8">
                                Loading mosques…
                            </div>
                        ) : listMosques.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">
                                No mosques found.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 px-2 py-1">
                                    {isCity ? 'Full list' : 'Top need'} · {listMosques.length} mosque{listMosques.length !== 1 ? 's' : ''}
                                </div>
                                {listMosques.map((m) => (
                                    <MosqueCard
                                        key={m.id}
                                        mosque={m}
                                        onClick={() => handleMosqueCardClick(m)}
                                        selected={m.id === selectedMosqueId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative">
                    <MapView
                        points={mapPoints}
                        onPointClick={() => { }}
                        showGlow={true}
                        showPulse={true}
                        mosqueMode={true}
                        initialViewState={mapViewState}
                    />

                    {/* Back button */}
                    <button
                        onClick={() => router.push('/')}
                        className="absolute top-4 left-4 z-20 px-4 py-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors flex items-center gap-2 backdrop-blur-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to World
                    </button>
                </div>
            </div>
        </div>
    );
}
