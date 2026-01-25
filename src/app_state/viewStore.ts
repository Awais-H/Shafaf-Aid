/**
 * Global view state store for Shafaf Aid 2.0
 * Manages current view, selections, simulation, and UI state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MapViewState, AppData, WorldScore, RegionScore, RegionDetail, AidType } from '@/core/data/schema';
import { MAP_CONFIG } from '@/core/graph/constants';

// ============================================================================
// Simulation Types
// ============================================================================

export interface SimulationState {
  enabled: boolean;
  additionalAid: number;
  aidType: AidType;
  targetRegionId: string | null;
}

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
  searchOpen: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Map state
  mapViewState: MapViewState;
  isTransitioning: boolean;
  
  // Data cache (derived)
  appData: AppData | null;
  worldScores: WorldScore[];
  countryScores: RegionScore[];
  regionDetail: RegionDetail | null;
  
  // Simulation overlay state
  simulation: SimulationState;
  
  // Animation state
  animationTime: number;
  
  // Actions
  setCurrentView: (view: 'world' | 'country') => void;
  selectCountry: (countryId: string | null) => void;
  /** Batch country + scores update for smooth transitions when switching via map */
  selectCountryWithScores: (countryId: string, scores: RegionScore[]) => void;
  selectRegion: (regionId: string | null) => void;
  openSidePanel: () => void;
  closeSidePanel: () => void;
  toggleExplainDrawer: () => void;
  toggleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMapViewState: (viewState: MapViewState) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  setAppData: (data: AppData) => void;
  setWorldScores: (scores: WorldScore[]) => void;
  setCountryScores: (scores: RegionScore[]) => void;
  setRegionDetail: (detail: RegionDetail | null) => void;
  updateAnimationTime: (time: number) => void;
  // Simulation actions
  setSimulationEnabled: (enabled: boolean) => void;
  setSimulationAid: (amount: number) => void;
  setSimulationAidType: (type: AidType) => void;
  resetSimulation: () => void;
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

const initialSimulation: SimulationState = {
  enabled: false,
  additionalAid: 0,
  aidType: 'food',
  targetRegionId: null,
};

// ============================================================================
// Store (with selector middleware for performance)
// ============================================================================

export const useViewStore = create<ViewStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    currentView: 'world',
    selectedCountryId: null,
    selectedRegionId: null,
    sidePanelOpen: false,
    explainDrawerOpen: false,
    searchOpen: false,
    isLoading: true,
    error: null,
    mapViewState: initialMapViewState,
    isTransitioning: false,
    appData: null,
    worldScores: [],
    countryScores: [],
    regionDetail: null,
    simulation: initialSimulation,
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
      simulation: initialSimulation,
    }),

    selectCountryWithScores: (countryId, scores) => set({
      selectedCountryId: countryId,
      currentView: 'country',
      selectedRegionId: null,
      sidePanelOpen: false,
      countryScores: scores,
      regionDetail: null,
      simulation: initialSimulation,
    }),

    selectRegion: (regionId) => set((state) => ({
      selectedRegionId: regionId,
      sidePanelOpen: regionId !== null,
      regionDetail: regionId === state.selectedRegionId ? state.regionDetail : null,
      simulation: { ...state.simulation, targetRegionId: regionId },
    })),
    
    openSidePanel: () => set({ sidePanelOpen: true }),
    
    closeSidePanel: () => set({
      sidePanelOpen: false,
      selectedRegionId: null,
      simulation: initialSimulation,
    }),
    
    toggleExplainDrawer: () => set((state) => ({
      explainDrawerOpen: !state.explainDrawerOpen,
    })),

    toggleSearch: () => set((state) => ({
      searchOpen: !state.searchOpen,
    })),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error, isLoading: false }),
    
    setMapViewState: (viewState) => set({ mapViewState: viewState }),

    setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
    
    setAppData: (data) => set({ appData: data }),
    
    setWorldScores: (scores) => set({ worldScores: scores }),
    
    setCountryScores: (scores) => set({ countryScores: scores }),
    
    setRegionDetail: (detail) => set({ regionDetail: detail }),
    
    updateAnimationTime: (time) => set({ animationTime: time }),
    
    // Simulation actions
    setSimulationEnabled: (enabled) => set((state) => ({
      simulation: { ...state.simulation, enabled },
    })),
    
    setSimulationAid: (amount) => set((state) => ({
      simulation: { ...state.simulation, additionalAid: amount },
    })),
    
    setSimulationAidType: (type) => set((state) => ({
      simulation: { ...state.simulation, aidType: type },
    })),
    
    resetSimulation: () => set({ simulation: initialSimulation }),
    
    reset: () => set({
      currentView: 'world',
      selectedCountryId: null,
      selectedRegionId: null,
      sidePanelOpen: false,
      explainDrawerOpen: false,
      searchOpen: false,
      error: null,
      mapViewState: initialMapViewState,
      isTransitioning: false,
      worldScores: [],
      countryScores: [],
      regionDetail: null,
      simulation: initialSimulation,
      animationTime: 0,
    }),
  }))
);
