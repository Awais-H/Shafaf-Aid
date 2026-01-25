/**
 * Global view state store for AidGap
 * Manages current view, selections, and UI state
 */

import { create } from 'zustand';
import type { MapViewState, AppData, WorldScore, RegionScore, RegionDetail } from '@/core/data/schema';
import { MAP_CONFIG } from '@/core/graph/constants';

// ============================================================================
// State Types
// ============================================================================

interface ViewStore {
  // Current view
  currentView: 'world' | 'country';
  selectedCountryId: string | null;
  selectedRegionId: string | null;
  
  // UI state
  sidePanelOpen: boolean;
  explainDrawerOpen: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Map state
  mapViewState: MapViewState;
  
  // Data cache (derived)
  appData: AppData | null;
  worldScores: WorldScore[];
  countryScores: RegionScore[];
  regionDetail: RegionDetail | null;
  
  // Animation state
  animationTime: number;
  
  // Actions
  setCurrentView: (view: 'world' | 'country') => void;
  selectCountry: (countryId: string | null) => void;
  selectRegion: (regionId: string | null) => void;
  openSidePanel: () => void;
  closeSidePanel: () => void;
  toggleExplainDrawer: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMapViewState: (viewState: MapViewState) => void;
  setAppData: (data: AppData) => void;
  setWorldScores: (scores: WorldScore[]) => void;
  setCountryScores: (scores: RegionScore[]) => void;
  setRegionDetail: (detail: RegionDetail | null) => void;
  updateAnimationTime: (time: number) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialMapViewState: MapViewState = {
  longitude: MAP_CONFIG.INITIAL_VIEW.longitude,
  latitude: MAP_CONFIG.INITIAL_VIEW.latitude,
  zoom: MAP_CONFIG.INITIAL_VIEW.zoom,
  pitch: MAP_CONFIG.INITIAL_VIEW.pitch,
  bearing: MAP_CONFIG.INITIAL_VIEW.bearing,
};

// ============================================================================
// Store
// ============================================================================

export const useViewStore = create<ViewStore>((set) => ({
  // Initial state
  currentView: 'world',
  selectedCountryId: null,
  selectedRegionId: null,
  sidePanelOpen: false,
  explainDrawerOpen: false,
  isLoading: true,
  error: null,
  mapViewState: initialMapViewState,
  appData: null,
  worldScores: [],
  countryScores: [],
  regionDetail: null,
  animationTime: 0,
  
  // Actions
  setCurrentView: (view) => set({ currentView: view }),
  
  selectCountry: (countryId) => set({
    selectedCountryId: countryId,
    currentView: countryId ? 'country' : 'world',
    selectedRegionId: null,
    sidePanelOpen: false,
    countryScores: [],
    regionDetail: null,
  }),
  
  selectRegion: (regionId) => set((state) => ({
    selectedRegionId: regionId,
    sidePanelOpen: regionId !== null,
    regionDetail: regionId === state.selectedRegionId ? state.regionDetail : null,
  })),
  
  openSidePanel: () => set({ sidePanelOpen: true }),
  
  closeSidePanel: () => set({
    sidePanelOpen: false,
    selectedRegionId: null,
  }),
  
  toggleExplainDrawer: () => set((state) => ({
    explainDrawerOpen: !state.explainDrawerOpen,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  setMapViewState: (viewState) => set({ mapViewState: viewState }),
  
  setAppData: (data) => set({ appData: data }),
  
  setWorldScores: (scores) => set({ worldScores: scores }),
  
  setCountryScores: (scores) => set({ countryScores: scores }),
  
  setRegionDetail: (detail) => set({ regionDetail: detail }),
  
  updateAnimationTime: (time) => set({ animationTime: time }),
  
  reset: () => set({
    currentView: 'world',
    selectedCountryId: null,
    selectedRegionId: null,
    sidePanelOpen: false,
    explainDrawerOpen: false,
    error: null,
    mapViewState: initialMapViewState,
    worldScores: [],
    countryScores: [],
    regionDetail: null,
    animationTime: 0,
  }),
}));
