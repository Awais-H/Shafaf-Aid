import { useRef, useEffect, useState, useCallback, createContext, useContext } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAP_CENTER, ZOOM_WORLD, ZOOM_COUNTRY, getCountryCentroid } from './MapUtils';

interface MapViewProps {
    onCountryClick?: (countryId: string) => void;
    selectedCountryId?: string;
    children?: React.ReactNode;
}

// Note: Token should be set via environment variable VITE_MAPBOX_TOKEN
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Context to share map instance with child layers
export const MapContext = createContext<mapboxgl.Map | null>(null);
export const useMap = () => useContext(MapContext);

export default function MapView({ onCountryClick, selectedCountryId, children }: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: selectedCountryId ? getCountryCentroid(selectedCountryId) : MAP_CENTER,
            zoom: selectedCountryId ? ZOOM_COUNTRY : ZOOM_WORLD,
            projection: 'globe',
        });

        map.current.on('load', () => {
            setMapInstance(map.current);

            // Add atmosphere for globe effect
            map.current?.setFog({
                color: 'rgb(15, 23, 42)',
                'high-color': 'rgb(15, 23, 42)',
                'horizon-blend': 0.1,
                'space-color': 'rgb(15, 23, 42)',
                'star-intensity': 0.0
            });
        });

        // Cleanup
        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Fly to country when selection changes
    useEffect(() => {
        if (!map.current || !mapInstance) return;

        if (selectedCountryId) {
            const center = getCountryCentroid(selectedCountryId);
            map.current.flyTo({
                center,
                zoom: ZOOM_COUNTRY,
                duration: 1500,
            });
        } else {
            map.current.flyTo({
                center: MAP_CENTER,
                zoom: ZOOM_WORLD,
                duration: 1500,
            });
        }
    }, [selectedCountryId, mapInstance]);

    return (
        <div className="map-container" ref={mapContainer}>
            <MapContext.Provider value={mapInstance}>
                {children}
            </MapContext.Provider>
        </div>
    );
}

// Export map ref type for child components
export type MapRef = mapboxgl.Map;
