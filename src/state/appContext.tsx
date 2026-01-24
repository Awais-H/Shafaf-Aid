import { createContext, useContext, useState, ReactNode } from 'react';
import { loadAidGapData, type AidGapData } from '../core';

interface AppState {
    data: AidGapData;
    selectedCountryId: string | null;
    setSelectedCountryId: (id: string | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

    // Load data once at app startup
    const data = loadAidGapData();

    return (
        <AppContext.Provider value={{ data, selectedCountryId, setSelectedCountryId }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppState must be used within AppProvider');
    }
    return context;
}

export function useAidGapData() {
    return useAppState().data;
}
