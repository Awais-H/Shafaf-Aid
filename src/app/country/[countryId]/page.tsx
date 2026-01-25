'use client';

/**
 * Country page - shows regional coverage breakdown
 * Displays region polygons/points and allows drilling into region details
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useViewStore } from '@/app_state/viewStore';
import { useRegionMapPoints } from '@/app_state/selectors';
import { loadAppData, loadCountryData } from '@/core/data/loadData';
import { computeCountryScores, getRegionDetail } from '@/core/graph/metrics';
import { getCountryViewState } from '@/components/map/MapUtils';
import { createSyntheticGeoJson } from '@/components/map/RegionPolygons';
import type { MapPoint, MapViewState, RegionDetail } from '@/core/data/schema';

import MapView from '@/components/map/MapView';
import Header from '@/components/layout/Header';
import Legend from '@/components/layout/Legend';
import SidePanel from '@/components/layout/SidePanel';
import DisclaimerBanner from '@/components/layout/DisclaimerBanner';
import ExplainDrawer from '@/components/layout/ExplainDrawer';
import LoadingState from '@/components/layout/LoadingState';

export default function CountryPage() {
  const params = useParams();
  const router = useRouter();
  const countryId = params.countryId as string;

  // Store state
  const isLoading = useViewStore((state) => state.isLoading);
  const error = useViewStore((state) => state.error);
  const appData = useViewStore((state) => state.appData);
  const countryScores = useViewStore((state) => state.countryScores);
  const selectedRegionId = useViewStore((state) => state.selectedRegionId);
  const regionDetail = useViewStore((state) => state.regionDetail);
  
  const setLoading = useViewStore((state) => state.setLoading);
  const setError = useViewStore((state) => state.setError);
  const setAppData = useViewStore((state) => state.setAppData);
  const selectCountryWithScores = useViewStore((state) => state.selectCountryWithScores);
  const selectRegion = useViewStore((state) => state.selectRegion);
  const setRegionDetail = useViewStore((state) => state.setRegionDetail);

  // Local state for detail loading
  const [detailLoading, setDetailLoading] = useState(false);

  // Derived state
  const mapPoints = useRegionMapPoints();

  // Get country info
  const country = useMemo(
    () => appData?.countries.find((c) => c.id === countryId),
    [appData, countryId]
  );

  // Calculate initial view state based on country centroid
  const initialViewState = useMemo<MapViewState | undefined>(() => {
    if (country) {
      return getCountryViewState(country.centroid);
    }
    return undefined;
  }, [country]);

  // Create synthetic GeoJSON for region polygons
  const regionGeoJson = useMemo(() => {
    if (!appData || countryScores.length === 0) return null;

    const regionCentroids = new Map(
      appData.regions
        .filter((r) => r.countryId === countryId)
        .map((r) => [r.id, r.centroid])
    );

    return createSyntheticGeoJson(countryScores, regionCentroids);
  }, [appData, countryId, countryScores]);

  // Load country data on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // Load app data if not already loaded
        let data = appData;
        if (!data) {
          data = await loadAppData();
          if (!mounted) return;
          setAppData(data);
        }

        // Compute country scores, then batch update store for smooth transition
        const scores = computeCountryScores(countryId, data);
        selectCountryWithScores(countryId, scores);

        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load country data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load country data');
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [
    countryId,
    appData,
    setLoading,
    setError,
    setAppData,
    selectCountryWithScores,
  ]);

  // Load region detail when a region is selected
  useEffect(() => {
    if (!selectedRegionId || !appData) {
      setRegionDetail(null);
      return;
    }

    setDetailLoading(true);

    // Use setTimeout to prevent blocking UI
    const timeoutId = setTimeout(() => {
      const detail = getRegionDetail(selectedRegionId, appData);
      setRegionDetail(detail);
      setDetailLoading(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [selectedRegionId, appData, setRegionDetail]);

  // Handle region click
  const handleRegionClick = useCallback(
    (point: MapPoint) => {
      selectRegion(point.id);
    },
    [selectRegion]
  );

  // Handle polygon click (from GeoJSON layer)
  const handlePolygonClick = useCallback(
    (regionId: string) => {
      selectRegion(regionId);
    },
    [selectRegion]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState message={`Loading ${country?.name || 'country'} data...`} />;
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Back to World
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Country not found
  if (!country) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-white mb-2">Country Not Found</h2>
          <p className="text-gray-400 mb-4">
            The country "{countryId}" was not found in the dataset.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
          >
            Back to World
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <Header />

      {/* Disclaimer Banner */}
      <div className="pt-14">
        <DisclaimerBanner />
      </div>

      {/* Main content */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar - Regions (Command Center) */}
        <div className="w-56 bg-slate-950/95 border-r border-slate-700/60 flex flex-col z-10 backdrop-blur-sm transition-opacity duration-300">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-1">Regions</h3>
            <p className="text-slate-500 text-xs">Select to view details</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="space-y-0.5">
              {countryScores
                .sort((a, b) => a.normalizedCoverage - b.normalizedCoverage)
                .map((score) => (
                  <li key={score.regionId}>
                    <button
                      onClick={() => selectRegion(score.regionId)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-between group ${
                        selectedRegionId === score.regionId
                          ? 'bg-cyan-500/15 border border-cyan-500/40 text-white'
                          : 'hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <span className="text-slate-300 text-sm group-hover:text-white truncate flex-1 mr-2">
                        {score.regionName}
                      </span>
                      <span
                        className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded flex-shrink-0 ${
                          score.normalizedCoverage < 0.33
                            ? 'bg-red-900/50 text-red-400'
                            : score.normalizedCoverage < 0.66
                            ? 'bg-amber-900/50 text-amber-400'
                            : 'bg-emerald-900/50 text-emerald-400'
                        }`}
                      >
                        {(score.normalizedCoverage * 100).toFixed(0)}%
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <MapView
            points={mapPoints}
            regionGeoJson={regionGeoJson}
            onPointClick={handleRegionClick}
            onRegionClick={handlePolygonClick}
            selectedId={selectedRegionId}
            showGlow={true}
            showPulse={true}
            initialViewState={initialViewState}
          />

          {/* Legend - Bottom Right */}
          <div className="absolute right-4 bottom-4 z-10">
            <Legend />
          </div>
        </div>
      </div>

      {/* Side Panel for Region Detail */}
      <SidePanel detail={regionDetail} isLoading={detailLoading} />

      {/* Explain Drawer */}
      <ExplainDrawer />
    </div>
  );
}
