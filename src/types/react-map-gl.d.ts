/**
 * Type declarations for react-map-gl/maplibre
 */

declare module 'react-map-gl/maplibre' {
  import { ComponentType, RefObject } from 'react';

  export interface MapProps {
    initialViewState?: {
      longitude?: number;
      latitude?: number;
      zoom?: number;
      pitch?: number;
      bearing?: number;
    };
    mapStyle?: string | object;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    ref?: RefObject<MapRef>;
    maxBounds?: [[number, number], [number, number]];
    renderWorldCopies?: boolean;
  }

  export interface MapRef {
    getMap(): unknown;
  }

  export const Map: ComponentType<MapProps>;
  export const MapProvider: ComponentType<{ children?: React.ReactNode }>;
  export function useMap(): { resize: () => void } & unknown;
}
