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

import MapView from '@/components/map/MapView';
import GlobeView from '@/components/map/GlobeView';
import HeroSection from '@/components/layout/HeroSection';
import ViewToggle from '@/components/layout/ViewToggle';
import Header from '@/components/layout/Header';
import Legend from '@/components/layout/Legend';
import DisclaimerBanner from '@/components/layout/DisclaimerBanner';
import ExplainDrawer from '@/components/layout/ExplainDrawer';
import LoadingState from '@/components/layout/LoadingState';

export default function WorldPage() {
  const router = useRouter();
  
  // View mode: '3d' (globe) or '2d' (flat map)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  
  // Scroll progress for transitions (0 = top, 1 = scrolled)
  const [scrollProgress, setScrollProgress] = useState(0);
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

  // Handle scroll for hero fade effect in 3D mode
  useEffect(() => {
    if (viewMode !== '3d') return;
    
    const handleWheel = (e: WheelEvent) => {
      // Update scroll progress based on scroll direction
      setScrollProgress(prev => {
        const delta = e.deltaY > 0 ? 0.1 : -0.1;
        return Math.max(0, Math.min(1, prev + delta));
      });
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);
  
  // Reset scroll progress when switching to 3D
  useEffect(() => {
    if (viewMode === '3d') {
      setScrollProgress(0);
    }
  }, [viewMode]);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await loadAppData();
        
        if (!mounted) return;
        
        setAppData(data);
        
        // Compute world scores
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

  // Handle country click - navigate to country view
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

  // Calculate hero opacity based on scroll progress
  const heroOpacity = Math.max(0, 1 - scrollProgress * 2);
  const showSidebar = viewMode === '2d' || scrollProgress > 0.5;

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col bg-[#050505]">
      {/* Header - only show in 2D mode or when scrolled */}
      <div 
        className="transition-all duration-300"
        style={{
          opacity: viewMode === '2d' ? 1 : scrollProgress,
          transform: viewMode === '2d' ? 'none' : `translateY(${(1 - scrollProgress) * -100}%)`,
        }}
      >
        <Header />
      </div>

      {/* Disclaimer Banner - only in 2D mode */}
      {viewMode === '2d' && (
        <div className="pt-14">
          <DisclaimerBanner />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar - Curated Countries (visible in 2D or when scrolled in 3D) */}
        <div 
          className="w-56 border-r border-gray-800/50 flex flex-col z-10 transition-all duration-500"
          style={{
            background: 'rgba(5, 5, 5, 0.95)',
            backdropFilter: 'blur(12px)',
            opacity: showSidebar ? 1 : 0,
            transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
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
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-gray-300 text-sm group-hover:text-white">
                      {country.name}
                    </span>
                    {score && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          score.normalizedCoverage < 0.33
                            ? 'bg-red-900/50 text-red-400'
                            : score.normalizedCoverage < 0.66
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-green-900/50 text-green-400'
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
          {/* 3D Globe View */}
          {viewMode === '3d' && (
            <div className="absolute inset-0">
              <GlobeView
                points={mapPoints}
                onPointClick={handleCountryClick}
                scrollProgress={scrollProgress}
                autoRotate={scrollProgress < 0.3}
              />
            </div>
          )}
          
          {/* 2D Map View */}
          {viewMode === '2d' && (
            <div className="absolute inset-0">
              <MapView
                points={mapPoints}
                onPointClick={handleCountryClick}
                showGlow={true}
                showPulse={true}
                initialViewState={initialViewState}
              />
            </div>
          )}

          {/* Hero Section (3D mode only) */}
          {viewMode === '3d' && (
            <HeroSection 
              opacity={heroOpacity} 
              visible={scrollProgress < 1}
            />
          )}

          {/* View Toggle - Top Right */}
          <div className="absolute top-4 right-4 z-30">
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>

          {/* Scroll Hint (3D mode, when not scrolled) */}
          {viewMode === '3d' && scrollProgress < 0.3 && (
            <div 
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-center transition-opacity duration-500"
              style={{ opacity: 1 - scrollProgress * 3 }}
            >
              <p className="text-gray-500 text-sm mb-2">Scroll to explore</p>
              <div className="w-6 h-10 rounded-full border-2 border-gray-600 mx-auto flex items-start justify-center p-1">
                <div 
                  className="w-1.5 h-2.5 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDuration: '1.5s' }}
                />
              </div>
            </div>
          )}

          {/* Legend - Bottom Right (show when sidebar visible) */}
          {showSidebar && (
            <div className="absolute right-4 bottom-4 z-10 transition-opacity duration-300">
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
