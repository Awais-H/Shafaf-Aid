'use client';

/**
 * Country page - shows regional coverage breakdown
 * Displays region polygons/points and allows drilling into region details
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useViewStore } from '@/app_state/viewStore';
import { useRegionMapPoints, useCountrySummary } from '@/app_state/selectors';
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
  const setCountryScores = useViewStore((state) => state.setCountryScores);
  const selectCountry = useViewStore((state) => state.selectCountry);
  const selectRegion = useViewStore((state) => state.selectRegion);
  const setRegionDetail = useViewStore((state) => state.setRegionDetail);

  // Local state for detail loading
  const [detailLoading, setDetailLoading] = useState(false);

  // Derived state
  const mapPoints = useRegionMapPoints();
  const countrySummary = useCountrySummary();

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

        // Set selected country
        selectCountry(countryId);

        // Compute country scores
        const scores = computeCountryScores(countryId, data);
        setCountryScores(scores);

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
    selectCountry,
    setCountryScores,
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
      <div className="flex-1 relative">
        {/* Map */}
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

        {/* Legend */}
        <div className="absolute left-4 bottom-4 z-10">
          <Legend title="Regional Coverage" showNeedLevels={true} />
        </div>

        {/* Country Summary */}
        {countrySummary && (
          <div className="absolute right-4 bottom-4 z-10 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-700 max-w-xs">
            <h3 className="text-white font-semibold text-sm mb-3">
              {countrySummary.countryName}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 block text-xs">Regions</span>
                <span className="text-white font-medium">
                  {countrySummary.totalRegions}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Organizations</span>
                <span className="text-white font-medium">
                  {countrySummary.totalOrgs}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Avg Coverage</span>
                <span className="text-white font-medium">
                  {(countrySummary.averageCoverage * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Variance</span>
                <span className="text-white font-medium">
                  {(countrySummary.coverageVariance * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* High gap regions */}
            {countrySummary.highGapRegions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h4 className="text-red-400 text-xs font-medium mb-2">
                  High Gap Regions ({countrySummary.highGapRegions.length})
                </h4>
                <ul className="space-y-1">
                  {countrySummary.highGapRegions.slice(0, 3).map((region) => (
                    <li key={region.regionId}>
                      <button
                        onClick={() => selectRegion(region.regionId)}
                        className="text-xs text-gray-400 hover:text-white transition-colors text-left w-full truncate"
                      >
                        {region.regionName} ({(region.normalizedCoverage * 100).toFixed(0)}%)
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Regions List */}
        <div className="absolute left-4 top-4 z-10 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-700 max-w-xs max-h-96 overflow-hidden flex flex-col">
          <h3 className="text-white font-semibold text-sm mb-2">Regions</h3>
          <p className="text-gray-400 text-xs mb-3">
            Click a region for detailed coverage analysis
          </p>
          <div className="flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {countryScores
                .sort((a, b) => a.normalizedCoverage - b.normalizedCoverage)
                .map((score) => (
                  <li key={score.regionId}>
                    <button
                      onClick={() => selectRegion(score.regionId)}
                      className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors flex items-center justify-between group ${
                        selectedRegionId === score.regionId ? 'bg-gray-700' : ''
                      }`}
                    >
                      <span className="text-gray-300 text-sm group-hover:text-white truncate flex-1 mr-2">
                        {score.regionName}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          score.normalizedCoverage < 0.33
                            ? 'bg-red-900/50 text-red-400'
                            : score.normalizedCoverage < 0.66
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-green-900/50 text-green-400'
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
      </div>

      {/* Side Panel for Region Detail */}
      <SidePanel detail={regionDetail} isLoading={detailLoading} />

      {/* Explain Drawer */}
      <ExplainDrawer />
    </div>
  );
}
