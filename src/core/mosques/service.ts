/**
 * Mosques service: MasjidNear.me API, synthetic funding, necessity score
 */

import type { Mosque, MosqueWithFunding, MosqueUrgency } from '@/core/data/schema';

export interface GeoCenter {
  lat: number;
  lng: number;
  radius: number;
}

export type GeoCenters = Record<string, Record<string, GeoCenter>>;

export interface CountryNeedItem {
  country: string;
  lat: number;
  lng: number;
  necessityScore: number;
}

const URGENCY_MULT: Record<MosqueUrgency, number> = {
  low: 1,
  med: 1.5,
  high: 2,
};

const GOAL_BUCKETS = [10_000, 25_000, 50_000, 100_000, 150_000, 200_000, 300_000];
const URGENCIES: MosqueUrgency[] = ['low', 'med', 'high'];

/** Deterministic numeric hash from string (djb2-like) */
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h) >>> 0;
}

/** Float in [0, 1) from seed */
function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Normalize necessity scores to 0–1 within set; clamp for heatmap weight */
export function normalizeNecessity(
  scores: number[],
  _factor?: number
): { normalized: number[]; maxRaw: number } {
  if (scores.length === 0) return { normalized: [], maxRaw: 1 };
  if (scores.length === 1) return { normalized: [0.5], maxRaw: Math.max(scores[0], 1) };
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const maxRaw = Math.max(max, 1);
  const span = max - min || 1;
  const normalized = scores.map((s) => Math.max(0, Math.min(1, (s - min) / span)));
  return { normalized, maxRaw };
}

/** remaining = max(goal - raised, 0); necessityScore = remaining * urgencyMult */
export function computeNecessityScore(
  goalAmount: number,
  raisedAmount: number,
  urgency: MosqueUrgency
): number {
  const remaining = Math.max(goalAmount - raisedAmount, 0);
  return remaining * URGENCY_MULT[urgency];
}

/** Fetch from our proxy -> MasjidNear.me */
async function fetchMasjidNearMe(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<unknown> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(radiusMeters),
  });
  const res = await fetch(`/api/masjids/search?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? `MasjidNear.me error: ${res.status}`);
  return data;
}

/** Normalize API response to Mosque[]. MasjidNear.me uses data.masjids, masjidName, masjidLocation.coordinates [lng,lat]. */
function normalizeApiResponse(
  raw: unknown,
  country: string,
  city: string
): Mosque[] {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : (raw as any)?.data?.masjids ?? (raw as any)?.masjids ?? (raw as any)?.data ?? [];
  const out: Mosque[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const loc = o.masjidLocation as { coordinates?: [number, number] } | undefined;
    const coords = loc?.coordinates;
    const lng = Array.isArray(coords) ? Number(coords[0]) : Number(o.longitude ?? o.lng ?? 0);
    const lat = Array.isArray(coords) ? Number(coords[1]) : Number(o.latitude ?? o.lat ?? 0);
    const name = String(o.masjidName ?? o.name ?? o.title ?? 'Mosque').trim();
    if (!name || (lat === 0 && lng === 0)) continue;
    const key = `${name}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = String(o._id ?? o.id ?? key);
    out.push({
      id,
      name,
      country,
      city,
      lat,
      lng,
      website: o.website ? String(o.website) : undefined,
    });
  }
  return out;
}

/** Attach deterministic synthetic funding to a mosque */
export function attachSyntheticFunding(
  m: Mosque,
  country: string,
  city: string
): MosqueWithFunding {
  const seed = hashSeed(`${m.id}|${m.name}|${m.lat}|${m.lng}`);
  const r = (offset: number) => rand(seed + offset);

  const goalIdx = Math.floor(r(1) * GOAL_BUCKETS.length);
  const goalAmount = GOAL_BUCKETS[goalIdx];
  const progress = r(2);
  const raisedAmount = Math.round(goalAmount * progress);

  const urgIdx = Math.floor(r(3) * URGENCIES.length);
  const urgency = URGENCIES[urgIdx];
  const necessityScore = computeNecessityScore(goalAmount, raisedAmount, urgency);

  const hasEmergency = r(4) < 0.3;
  const emergencyAppeal = hasEmergency
    ? 'Emergency appeal for urgent support'
    : undefined;

  const allScores = [necessityScore];
  const { normalized } = normalizeNecessity(allScores);
  const normalizedNecessity = normalized[0];

  return {
    ...m,
    goalAmount,
    raisedAmount,
    urgency,
    emergencyAppeal,
    necessityScore,
    normalizedNecessity,
  };
}

const SYNTHETIC_NAMES = [
  'Central Mosque',
  'Community Islamic Centre',
  'Masjid Al-Noor',
  'Jamia Masjid',
  'Islamic Foundation',
  'Al-Huda Mosque',
  'Baitul Mukarram',
  'Masjid Al-Rahman',
  'Ummah Community Centre',
  'Dar Al-Salam',
  'Masjid Al-Falah',
  'Islamic Cultural Centre',
  'Local Musallah',
  'Masjid Al-Taqwa',
  'Neighbourhood Mosque',
];

/** Generate deterministic synthetic mosques when API returns nothing or errors. */
function generateSyntheticMosquesForCity(
  geo: GeoCenter,
  country: string,
  city: string
): Mosque[] {
  const seed = hashSeed(`${country}|${city}`);
  const r = (offset: number) => rand(seed + offset);
  const count = 10 + Math.floor(r(0) * 6); // 10–15
  const out: Mosque[] = [];

  for (let i = 0; i < count; i++) {
    const latOffset = (r(i * 3 + 1) - 0.5) * 0.08;
    const lngOffset = (r(i * 3 + 2) - 0.5) * 0.1;
    const lat = geo.lat + latOffset;
    const lng = geo.lng + lngOffset;
    const nameIdx = Math.floor(r(i * 3 + 3) * SYNTHETIC_NAMES.length);
    const name = `${SYNTHETIC_NAMES[nameIdx]} ${city}`;
    const id = `syn-${hashSeed(`${country}|${city}|${i}`).toString(36)}-${i}`;
    out.push({ id, name, country, city, lat, lng });
  }
  return out;
}

/** Fetch mosques for a single city (center + radius), attach funding. Use real API; fallback to synthetic for any city when API empty/fails. */
export async function fetchMosquesForCity(
  geo: GeoCenter,
  country: string,
  city: string
): Promise<MosqueWithFunding[]> {
  let mosques: Mosque[];

  try {
    const raw = await fetchMasjidNearMe(geo.lat, geo.lng, geo.radius);
    const list = (raw as any)?.data?.masjids;
    mosques = Array.isArray(list)
      ? normalizeApiResponse(raw, country, city)
      : [];
    if (mosques.length === 0) mosques = generateSyntheticMosquesForCity(geo, country, city);
  } catch {
    mosques = generateSyntheticMosquesForCity(geo, country, city);
  }

  return mosques.map((m) => attachSyntheticFunding(m, country, city));
}

/** Fetch mosques for a country (multiple city centers), merge & dedupe, attach funding */
export async function fetchMosquesForCountry(
  geoCenters: GeoCenters,
  country: string
): Promise<MosqueWithFunding[]> {
  const cities = geoCenters[country];
  if (!cities) return [];

  const byKey = new Map<string, MosqueWithFunding>();
  const cityEntries = Object.entries(cities);

  for (const [city, geo] of cityEntries) {
    try {
      const list = await fetchMosquesForCity(geo, country, city);
      for (const m of list) {
        const key = `${m.id}|${m.lat.toFixed(5)}|${m.lng.toFixed(5)}`;
        if (!byKey.has(key)) byKey.set(key, m);
      }
    } catch {
      // skip city on API error
    }
  }

  return [...byKey.values()];
}

/** Load geo_centers and countryNeedScores */
export async function loadGeoData(): Promise<{
  geoCenters: GeoCenters;
  countryNeedScores: CountryNeedItem[];
}> {
  const [geoCenters, countryNeedScores] = await Promise.all([
    import('@/data/geo_centers.json').then((m) => m.default as GeoCenters),
    import('@/data/countryNeedScores.json').then(
      (m) => m.default as CountryNeedItem[]
    ),
  ]);
  return { geoCenters, countryNeedScores };
}

/** Countries from geo_centers */
export function getCountriesFromGeo(geoCenters: GeoCenters): string[] {
  return Object.keys(geoCenters).sort();
}

/** Cities for a country from geo_centers */
export function getCitiesFromGeo(
  geoCenters: GeoCenters,
  country: string
): string[] {
  const c = geoCenters[country];
  return c ? Object.keys(c).sort() : [];
}

/** Top N mosques by necessityScore (highest need first) */
export function topNeedMosques(
  list: MosqueWithFunding[],
  n: number
): MosqueWithFunding[] {
  return [...list]
    .sort((a, b) => b.necessityScore - a.necessityScore)
    .slice(0, n);
}
