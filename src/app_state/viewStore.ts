/**
 * Global view state store for Shafaf Aid 2.0
 * Manages current view, selections, simulation, and UI state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MapViewState, AppData, WorldScore, RegionScore, RegionDetail, AidType } from '@/core/data/schema';
import { MAP_CONFIG } from '@/core/graph/constants';
import type { CrisisScenario } from '@/core/graph/constants';
import type { UrgencyRankItem, DeploymentPlanItem, CoordinationSuggestion } from '@/core/recommendations';

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
// Recommendations / Action Mode Types
// ============================================================================

export interface BeforeAfterMetrics {
  globalCoverageBefore: number;
  globalCoverageAfter: number;
  improvementPercent: number;
  countriesImproved: string[];
  regionsLiftedCritical: string[];
}

export interface RecommendationsState {
  priorityRegions: UrgencyRankItem[];
  deploymentPlan: DeploymentPlanItem[];
  coordinationSuggestions: CoordinationSuggestion[];
  scenarioMode: CrisisScenario;
  availableAidBudget: number;
  beforeAfterMetrics: BeforeAfterMetrics | null;
  actionModeOpen: boolean;
  beforeAfterView: 'before' | 'after';
  demoStep: number;
  actionPlanGenerated: boolean;
  demoActive: boolean;
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
  
  // Recommendations / Action Mode
  recommendations: RecommendationsState;
  
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
  // Recommendations actions
  setPriorityRegions: (regions: UrgencyRankItem[]) => void;
  setDeploymentPlan: (plan: DeploymentPlanItem[]) => void;
  setCoordinationSuggestions: (suggestions: CoordinationSuggestion[]) => void;
  setScenarioMode: (mode: CrisisScenario) => void;
  setAvailableAidBudget: (budget: number) => void;
  setBeforeAfterMetrics: (m: BeforeAfterMetrics | null) => void;
  toggleActionMode: () => void;
  setBeforeAfterView: (view: 'before' | 'after') => void;
  setDemoStep: (step: number) => void;
  setActionPlanGenerated: (v: boolean) => void;
  setDemoActive: (v: boolean) => void;
  resetRecommendations: () => void;
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

const initialRecommendations: RecommendationsState = {
  priorityRegions: [],
  deploymentPlan: [],
  coordinationSuggestions: [],
  scenarioMode: 'none',
  availableAidBudget: 20,
  beforeAfterMetrics: null,
  actionModeOpen: false,
  beforeAfterView: 'before',
  demoStep: 0,
  actionPlanGenerated: false,
  demoActive: false,
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
    recommendations: initialRecommendations,
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
    
    setPriorityRegions: (regions) => set((s) => ({
      recommendations: { ...s.recommendations, priorityRegions: regions },
    })),
    setDeploymentPlan: (plan) => set((s) => ({
      recommendations: { ...s.recommendations, deploymentPlan: plan },
    })),
    setCoordinationSuggestions: (suggestions) => set((s) => ({
      recommendations: { ...s.recommendations, coordinationSuggestions: suggestions },
    })),
    setScenarioMode: (mode) => set((s) => ({
      recommendations: { ...s.recommendations, scenarioMode: mode },
    })),
    setAvailableAidBudget: (budget) => set((s) => ({
      recommendations: { ...s.recommendations, availableAidBudget: budget },
    })),
    setBeforeAfterMetrics: (m) => set((s) => ({
      recommendations: { ...s.recommendations, beforeAfterMetrics: m },
    })),
    toggleActionMode: () => set((s) => ({
      recommendations: { ...s.recommendations, actionModeOpen: !s.recommendations.actionModeOpen },
    })),
    setBeforeAfterView: (view) => set((s) => ({
      recommendations: { ...s.recommendations, beforeAfterView: view },
    })),
    setDemoStep: (step) => set((s) => ({
      recommendations: { ...s.recommendations, demoStep: step },
    })),
    setActionPlanGenerated: (v) => set((s) => ({
      recommendations: { ...s.recommendations, actionPlanGenerated: v },
    })),
    setDemoActive: (v) => set((s) => ({
      recommendations: { ...s.recommendations, demoActive: v },
    })),
    resetRecommendations: () => set({ recommendations: initialRecommendations }),
    
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
      recommendations: initialRecommendations,
      animationTime: 0,
    }),
  }))
);
