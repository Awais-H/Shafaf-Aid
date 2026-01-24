/**
 * Type declarations for react-map-gl/maplibre
 */

declare module 'react-map-gl/maplibre' {
  import { ComponentType } from 'react';
  
  export interface MapProps {
    mapStyle?: string | object;
    attributionControl?: boolean;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  const Map: ComponentType<MapProps>;
  export default Map;
}
