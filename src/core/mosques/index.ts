/**
 * Mosque data: geo, API fetch, synthetic funding, necessity, map points
 */

import type { MapPoint } from '@/core/data/schema';
import type { HotspotScore } from '@/core/data/schema';
import {
    loadGeoData,
    getCountriesFromGeo,
    getCitiesFromGeo,
    fetchMosquesForCountry,
    fetchMosquesForCity,
    topNeedMosques,
    normalizeNecessity,
    type GeoCenters,
    type GeoCenter,
    type CountryNeedItem,
} from './service';
import type { MosqueWithFunding } from '@/core/data/schema';

export {
    loadGeoData,
    getCountriesFromGeo,
    getCitiesFromGeo,
    fetchMosquesForCountry,
    fetchMosquesForCity,
    topNeedMosques,
    normalizeNecessity,
    computeNecessityScore,
    attachSyntheticFunding,
} from './service';
export type { GeoCenters, GeoCenter, CountryNeedItem } from './service';

/** High need -> red: use normalizedValue = 1 - normalizedNeed for existing color scale */
function toNormalizedValue(normalizedNeed: number): number {
    return 1 - Math.max(0, Math.min(1, normalizedNeed));
}

/** World mode: country-level hotspot points only (from countryNeedScores) */
export function getWorldHotspotPoints(
    countryNeedScores: CountryNeedItem[]
): MapPoint[] {
    const raw = countryNeedScores.map((c) => c.necessityScore);
    const { normalized } = normalizeNecessity(raw);
    return countryNeedScores.map((c, i) => ({
        id: `country-${c.country}`,
        coordinates: [c.lng, c.lat] as [number, number],
        value: c.necessityScore,
        normalizedValue: toNormalizedValue(normalized[i]),
        type: 'mosque' as const,
        name: c.country,
        data: {
            tier: 'country' as const,
            mosqueName: c.country,
            mosqueNeedScore: c.necessityScore,
            normalizedNeed: normalized[i],
        } satisfies HotspotScore,
    }));
}

/** Country mode: city-level hotspot points (aggregated by city) + top-N mosque points */
export function getCountryHotspotPoints(
    mosques: MosqueWithFunding[],
    geoCenters: GeoCenters,
    country: string,
    topN: number
): { hotspots: MapPoint[]; mosquePoints: MapPoint[] } {
    const byCity = new Map<string, MosqueWithFunding[]>();
    for (const m of mosques) {
        const list = byCity.get(m.city) ?? [];
        list.push(m);
        byCity.set(m.city, list);
    }

    const cityCenters = geoCenters[country];
    const hotspotEntries: { city: string; lat: number; lng: number; score: number }[] = [];
    for (const [city, list] of byCity) {
        const geo = cityCenters?.[city];
        if (!geo) continue;
        const score = list.reduce((s, m) => s + m.necessityScore, 0);
        hotspotEntries.push({ city, lat: geo.lat, lng: geo.lng, score });
    }

    const allScores = hotspotEntries.map((e) => e.score);
    const { normalized: cityNorm } = normalizeNecessity(allScores);

    const hotspots: MapPoint[] = hotspotEntries.map((e, i) => ({
        id: `city-${country}-${e.city}`,
        coordinates: [e.lng, e.lat] as [number, number],
        value: e.score,
        normalizedValue: toNormalizedValue(cityNorm[i]),
        type: 'mosque' as const,
        name: e.city,
        data: {
            tier: 'city' as const,
            mosqueName: e.city,
            mosqueNeedScore: e.score,
            normalizedNeed: cityNorm[i],
        } satisfies HotspotScore,
    }));

    const top = topNeedMosques(mosques, topN);
    const mosqueScores = top.map((m: MosqueWithFunding) => m.necessityScore);
    const { normalized: mosqueNorm } = normalizeNecessity(mosqueScores);

    const mosquePoints: MapPoint[] = top.map((m: MosqueWithFunding, i: number) => ({
        id: m.id,
        coordinates: [m.lng, m.lat] as [number, number],
        value: m.necessityScore,
        normalizedValue: toNormalizedValue(mosqueNorm[i]),
        type: 'mosque' as const,
        name: m.name,
        data: {
            tier: 'mosque' as const,
            mosqueId: m.id,
            mosqueName: m.name,
            mosqueNeedScore: m.necessityScore,
            normalizedNeed: mosqueNorm[i],
        } satisfies HotspotScore,
    }));

    return { hotspots, mosquePoints };
}

/** City mode: one city hotspot + all mosque points */
export function getCityHotspotPoints(
    geo: GeoCenter,
    mosques: MosqueWithFunding[],
    country: string,
    city: string
): { hotspots: MapPoint[]; mosquePoints: MapPoint[] } {
    const cityScore = mosques.reduce((s, m) => s + m.necessityScore, 0);
    const mosqueScores = mosques.map((m) => m.necessityScore);
    const allScores = [cityScore, ...mosqueScores];
    const { normalized } = normalizeNecessity(allScores);
    const cityNorm = normalized[0];
    const mosqueNorm = normalized.slice(1);

    const hotspots: MapPoint[] = [
        {
            id: `city-${country}-${city}`,
            coordinates: [geo.lng, geo.lat] as [number, number],
            value: cityScore,
            normalizedValue: toNormalizedValue(cityNorm),
            type: 'mosque' as const,
            name: city,
            data: {
                tier: 'city' as const,
                mosqueName: city,
                mosqueNeedScore: cityScore,
                normalizedNeed: cityNorm,
            } satisfies HotspotScore,
        },
    ];

    const mosquePoints: MapPoint[] = mosques.map((m, i) => ({
        id: m.id,
        coordinates: [m.lng, m.lat] as [number, number],
        value: m.necessityScore,
        normalizedValue: toNormalizedValue(mosqueNorm[i] ?? 0),
        type: 'mosque' as const,
        name: m.name,
        data: {
            tier: 'mosque' as const,
            mosqueId: m.id,
            mosqueName: m.name,
            mosqueNeedScore: m.necessityScore,
            normalizedNeed: mosqueNorm[i] ?? 0,
        } satisfies HotspotScore,
    }));

    return { hotspots, mosquePoints };
}
