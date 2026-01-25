'use client';

/**
 * Mosques page: World / Country / City modes, MasjidNear.me API, synthetic funding
 * Same map + sidebar layout; 3-tier hotspots; no "World" default; list rules per mode.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadGeoData,
  getCountriesFromGeo,
  getCitiesFromGeo,
  fetchMosquesForCountry,
  fetchMosquesForCity,
  topNeedMosques,
  getWorldHotspotPoints,
  getCountryHotspotPoints,
  getCityHotspotPoints,
} from '@/core/mosques';
import { getWorldViewState, createViewState } from '@/components/map/MapUtils';
import type { MapPoint } from '@/core/data/schema';
import type { MosqueWithFunding } from '@/core/data/schema';
import type { GeoCenter } from '@/core/mosques/service';

import MapView from '@/components/map/MapView';
import Header from '@/components/layout/Header';
import Legend from '@/components/layout/Legend';
import DisclaimerBanner from '@/components/layout/DisclaimerBanner';
import ExplainDrawer from '@/components/layout/ExplainDrawer';
import LoadingState from '@/components/layout/LoadingState';
import MosqueSidePanel from '@/components/layout/MosqueSidePanel';
import MosqueCard from '@/components/ui/MosqueCard';

const TOP_NEED_N = 15;

export default function MosquesPage() {
  const [geoLoaded, setGeoLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoCenters, setGeoCenters] = useState<Record<string, Record<string, GeoCenter>>>({});
  const [countryNeedScores, setCountryNeedScores] = useState<{ country: string; lat: number; lng: number; necessityScore: number }[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);

  const [countryMosques, setCountryMosques] = useState<MosqueWithFunding[]>([]);
  const [cityMosques, setCityMosques] = useState<MosqueWithFunding[]>([]);
  const [loadingCountry, setLoadingCountry] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);

  const countries = useMemo(() => getCountriesFromGeo(geoCenters), [geoCenters]);
  const cities = useMemo(
    () => (selectedCountry ? getCitiesFromGeo(geoCenters, selectedCountry) : []),
    [geoCenters, selectedCountry]
  );

  const isWorld = selectedCountry == null;
  const isCountry = selectedCountry != null && selectedCity == null;
  const isCity = selectedCountry != null && selectedCity != null;

  // Dev: test MasjidNear.me API for Toronto (open /api/masjids/test?city=Toronto&country=Canada)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    fetch('/api/masjids/test?city=Toronto&country=Canada')
      .then((r) => r.json())
      .then((d) => console.log('[Mosques] API test Toronto:', d))
      .catch((e) => console.warn('[Mosques] API test failed:', e));
  }, []);

  // Geo data on mount
  useEffect(() => {
    let mounted = true;
    loadGeoData()
      .then(({ geoCenters: g, countryNeedScores: c }) => {
        if (!mounted) return;
        setGeoCenters(g);
        setCountryNeedScores(c);
        setGeoLoaded(true);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load geo data');
      });
    return () => { mounted = false; };
  }, []);

  // Fetch country mosques when entering country mode
  useEffect(() => {
    if (!geoLoaded || !selectedCountry || selectedCity != null) {
      setCountryMosques([]);
      return;
    }
    let mounted = true;
    setLoadingCountry(true);
    fetchMosquesForCountry(geoCenters, selectedCountry)
      .then((list) => {
        if (!mounted) return;
        setCountryMosques(list);
      })
      .catch(() => {
        if (!mounted) return;
        setCountryMosques([]);
      })
      .finally(() => {
        if (mounted) setLoadingCountry(false);
      });
    return () => { mounted = false; };
  }, [geoLoaded, selectedCountry, selectedCity, geoCenters]);

  // Fetch city mosques when entering city mode
  useEffect(() => {
    if (!geoLoaded || !selectedCountry || !selectedCity) {
      setCityMosques([]);
      return;
    }
    const geo = geoCenters[selectedCountry]?.[selectedCity];
    if (!geo) {
      setCityMosques([]);
      return;
    }
    let mounted = true;
    setLoadingCity(true);
    fetchMosquesForCity(geo, selectedCountry, selectedCity)
      .then((list) => {
        if (!mounted) return;
        setCityMosques(list);
      })
      .catch(() => {
        if (!mounted) return;
        setCityMosques([]);
      })
      .finally(() => {
        if (mounted) setLoadingCity(false);
      });
    return () => { mounted = false; };
  }, [geoLoaded, selectedCountry, selectedCity, geoCenters]);

  const { mapPoints, initialViewState } = useMemo(() => {
    const worldView = getWorldViewState();

    if (isWorld) {
      const points = getWorldHotspotPoints(countryNeedScores);
      return { mapPoints: points, initialViewState: worldView };
    }

    if (isCountry) {
      const { hotspots, mosquePoints } = getCountryHotspotPoints(
        countryMosques,
        geoCenters,
        selectedCountry!,
        TOP_NEED_N
      );
      const points = [...hotspots, ...mosquePoints];
      const countryItem = countryNeedScores.find((c) => c.country === selectedCountry);
      const view = countryItem
        ? createViewState(countryItem.lng, countryItem.lat, 4)
        : worldView;
      return { mapPoints: points, initialViewState: view };
    }

    const geo = geoCenters[selectedCountry!]?.[selectedCity!];
    if (!geo) return { mapPoints: [] as MapPoint[], initialViewState: worldView };
    const { hotspots, mosquePoints } = getCityHotspotPoints(
      geo,
      cityMosques,
      selectedCountry!,
      selectedCity!
    );
    const points = [...hotspots, ...mosquePoints];
    const view = createViewState(geo.lng, geo.lat, 10);
    return { mapPoints: points, initialViewState: view };
  }, [
    isWorld,
    isCountry,
    isCity,
    countryNeedScores,
    countryMosques,
    cityMosques,
    geoCenters,
    selectedCountry,
    selectedCity,
  ]);

  const viewStateWithMosque = useMemo(() => {
    if (!selectedMosqueId) return initialViewState;
    const m = cityMosques.find((x) => x.id === selectedMosqueId) ?? countryMosques.find((x) => x.id === selectedMosqueId);
    if (!m) return initialViewState;
    return createViewState(m.lng, m.lat, 14);
  }, [initialViewState, selectedMosqueId, cityMosques, countryMosques]);

  const selectedMosque = useMemo(() => {
    if (!selectedMosqueId) return null;
    const inCountry = countryMosques.find((m) => m.id === selectedMosqueId);
    const inCity = cityMosques.find((m) => m.id === selectedMosqueId);
    return inCity ?? inCountry ?? null;
  }, [selectedMosqueId, countryMosques, cityMosques]);

  const listMosques = useMemo(() => {
    if (isCity) return [...cityMosques].sort((a, b) => b.necessityScore - a.necessityScore);
    if (isCountry) return topNeedMosques(countryMosques, TOP_NEED_N);
    return [];
  }, [isCountry, isCity, countryMosques, cityMosques]);

  const showList = isCountry || isCity;
  const resizeKey = `${selectedCountry ?? ''}-${selectedCity ?? ''}-${selectedMosqueId ?? ''}`;

  const handleCountryChange = useCallback((v: string) => {
    const next = v || null;
    setSelectedCountry(next);
    setSelectedCity(null);
    setSelectedMosqueId(null);
  }, []);

  const handleCityChange = useCallback((v: string) => {
    setSelectedCity(v || null);
    setSelectedMosqueId(null);
  }, []);

  const handleMosqueClick = useCallback((point: MapPoint) => {
    setSelectedMosqueId(point.id);
  }, []);

  const handleMosqueCardClick = useCallback((m: MosqueWithFunding) => {
    setSelectedMosqueId(m.id);
  }, []);

  const closeDetails = useCallback(() => setSelectedMosqueId(null), []);

  if (!geoLoaded && !error) {
    return <LoadingState message="Loading mosque data..." />;
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
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
    <div className="fixed inset-0 flex flex-col">
      <Header />
      <div className="pt-14">
        <DisclaimerBanner />
      </div>

      <div className="flex-1 flex relative">
        {/* Left sidebar – match donor Countries layout */}
        <div className="w-56 bg-gray-900/95 border-r border-gray-700 flex flex-col z-10 flex-shrink-0">
          <div className="p-4">
            <h3 className="text-white font-semibold text-sm mb-1">Mosques</h3>
            <p className="text-gray-500 text-xs">Select country & city to explore</p>
          </div>

          <div className="px-3 pb-3 space-y-2 border-b border-gray-700/50">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Country</label>
              <select
                value={selectedCountry ?? ''}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-200 text-sm border border-gray-600 focus:border-gray-500 focus:outline-none"
              >
                <option value="">Select a country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <select
                value={selectedCity ?? ''}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!selectedCountry}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 text-gray-200 text-sm border border-gray-600 focus:border-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a city</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
            {isWorld && (
              <p className="text-gray-500 text-sm px-2 mt-3">
                Select a country to view mosques and donation needs.
              </p>
            )}
            {showList && (loadingCountry || loadingCity) && (
              <p className="text-gray-500 text-sm px-2 mt-3">Loading mosques…</p>
            )}
            {showList && !loadingCountry && !loadingCity && (
              <ul className="space-y-1 mt-2">
                <li className="px-2 py-1">
                  <span className="text-xs text-gray-500">
                    {isCity ? 'Full list' : 'Top need'} · {listMosques.length} mosque{listMosques.length !== 1 ? 's' : ''}
                  </span>
                </li>
                {listMosques.map((m) => (
                  <li key={m.id}>
                    <MosqueCard
                      mosque={m}
                      onClick={() => handleMosqueCardClick(m)}
                      selected={m.id === selectedMosqueId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Map Area – same structure as donor/country */}
        <div className="flex-1 relative">
          <MapView
            points={mapPoints}
            onPointClick={handleMosqueClick}
            selectedId={selectedMosqueId}
            showGlow
            showPulse
            initialViewState={viewStateWithMosque}
            mode="mosques"
            resizeKey={resizeKey}
          />
          <div className="absolute right-4 bottom-4 z-10">
            <Legend />
          </div>
        </div>
      </div>

      {selectedMosque && (
        <MosqueSidePanel mosque={selectedMosque} onClose={closeDetails} />
      )}

      <ExplainDrawer />
    </div>
  );
}
