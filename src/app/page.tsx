'use client';

/**
 * World page - main entry point for Shafaf Aid
 * Shows global map with curated country nodes
 * Features 3D globe and 2D map views with smooth transitions
 */

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useViewStore } from '@/app_state/viewStore';
import { useWorldMapPoints, useCuratedCountries } from '@/app_state/selectors';
import { loadAppData } from '@/core/data/loadData';
import { computeWorldScores } from '@/core/graph/metrics';
import { getWorldViewState } from '@/components/map/MapUtils';
import type { MapPoint } from '@/core/data/schema';
import { useAuth } from '@/components/auth/AuthProvider';

import MapView from '@/components/map/MapView';
import MapboxGlobe from '@/components/map/MapboxGlobe';
import ViewToggle from '@/components/layout/ViewToggle';
import Header from '@/components/layout/Header';
import Legend from '@/components/layout/Legend';
import DisclaimerBanner from '@/components/layout/DisclaimerBanner';
import ExplainDrawer from '@/components/layout/ExplainDrawer';
import LoadingState from '@/components/layout/LoadingState';

export default function WorldPage() {
  const router = useRouter();

  // Auth check
  const { user, loading: authLoading } = useAuth();

  // View mode: '3d' (globe) or '2d' (flat map)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');

  // Track if intro is complete (title hidden, full interaction enabled)
  const [introComplete, setIntroComplete] = useState(false);

  // Title opacity (fades as user scrolls/zooms)
  const [titleOpacity, setTitleOpacity] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Store state
  const isLoading = useViewStore((state) => state.isLoading);
  const error = useViewStore((state) => state.error);
  const setLoading = useViewStore((state) => state.setLoading);
  const setError = useViewStore((state) => state.setError);
  const setAppData = useViewStore((state) => state.setAppData);
  const setWorldScores = useViewStore((state) => state.setWorldScores);
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  // Derived state
  const mapPoints = useWorldMapPoints();
  const curatedCountries = useCuratedCountries();

  // Initial view state
  const initialViewState = useMemo(() => getWorldViewState(), []);

  // Auth redirect: if not loading and no user, go to login
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Handle scroll/wheel in 3D intro mode - fades title
  useEffect(() => {
    if (viewMode !== '3d' || introComplete) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        setTitleOpacity(prev => {
          const newOpacity = Math.max(0, prev - 0.1);
          if (newOpacity <= 0) {
            setIntroComplete(true);
          }
          return newOpacity;
        });
      } else if (!introComplete) {
        setTitleOpacity(prev => Math.min(1, prev + 0.08));
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode, introComplete]);

  // Handle intro complete from GlobeView
  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    setTitleOpacity(0);
  }, []);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await loadAppData();

        if (!mounted) return;

        setAppData(data);

        const scores = computeWorldScores(data);
        setWorldScores(scores);

        setCurrentView('world');
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [setLoading, setError, setAppData, setWorldScores, setCurrentView]);

  // Handle country click
  const handleCountryClick = useCallback(
    (point: MapPoint) => {
      if (point.type === 'country') {
        router.push(`/country/${point.id}`);
      }
    },
    [router]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading world data..." />;
  }

  // Error state
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

  const showUI = viewMode === '2d' || introComplete;

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col bg-[#050505] overflow-hidden">
      {/* Header */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: showUI ? 1 : 0,
          transform: showUI ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: showUI ? 'auto' : 'none',
          zIndex: 30,
        }}
      >
        <Header />
      </div>

      {/* Disclaimer Banner - only in 2D mode */}
      {viewMode === '2d' && (
        <div className="pt-14" style={{ zIndex: 25 }}>
          <DisclaimerBanner />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar */}
        <div
          className="w-56 border-r border-gray-800/30 flex flex-col transition-all duration-700 ease-out"
          style={{
            background: 'rgba(8, 8, 8, 0.95)',
            backdropFilter: 'blur(16px)',
            opacity: showUI ? 1 : 0,
            transform: showUI ? 'translateX(0)' : 'translateX(-100%)',
            pointerEvents: showUI ? 'auto' : 'none',
            zIndex: 20,
          }}
        >
          <div className="p-4">
            <h3 className="text-white font-semibold text-sm mb-1">Countries</h3>
            <p className="text-gray-500 text-xs">Select to explore regions</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <ul className="space-y-1">
              {curatedCountries.map(({ country, score }) => (
                <li key={country.id}>
                  <button
                    onClick={() => router.push(`/country/${country.id}`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-300 flex items-center justify-between group"
                  >
                    <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                      {country.name}
                    </span>
                    {score && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${score.normalizedCoverage < 0.33
                          ? 'bg-red-900/40 text-red-400'
                          : score.normalizedCoverage < 0.66
                            ? 'bg-yellow-900/40 text-yellow-400'
                            : 'bg-green-900/40 text-green-400'
                          }`}
                      >
                        {(score.normalizedCoverage * 100).toFixed(0)}%
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Map/Globe Area */}
        <div className="flex-1 relative">
          {/* 3D Globe View - Real Mapbox globe */}
          {viewMode === '3d' && (
            <div
              className="absolute inset-0"
              style={{ zIndex: 10 }}
            >
              <MapboxGlobe
                points={mapPoints}
                onPointClick={handleCountryClick}
                introComplete={introComplete}
                onIntroComplete={handleIntroComplete}
                autoRotate={!introComplete}
              />
            </div>
          )}

          {/* 2D Map View */}
          {viewMode === '2d' && (
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
              <MapView
                points={mapPoints}
                onPointClick={handleCountryClick}
                showGlow={true}
                showPulse={true}
                initialViewState={initialViewState}
              />
            </div>
          )}

          {/* View Toggle */}
          <div
            className="absolute top-4 right-4 z-30 transition-opacity duration-500"
            style={{ opacity: showUI ? 1 : 0.6 }}
          >
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>

          {/* Legend */}
          {showUI && (
            <div
              className="absolute right-4 bottom-4 z-20 transition-all duration-500"
              style={{ opacity: showUI ? 1 : 0 }}
            >
              <Legend />
            </div>
          )}
        </div>
      </div>

      {/* Explain Drawer */}
      <ExplainDrawer />
    </div>
  );
}
