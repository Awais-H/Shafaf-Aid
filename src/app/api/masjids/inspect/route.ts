/**
 * Inspect MasjidNear.me API: test Toronto, Waterloo, Lahore.
 * GET /api/masjids/inspect
 *
 * Returns full raw API response for each city so you can see structure, keys,
 * and compare patterns (Toronto vs Waterloo vs Lahore).
 */

import { NextResponse } from 'next/server';

const CITIES: { country: string; city: string; lat: number; lng: number; radius: number }[] = [
  { country: 'Canada', city: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 25000 },
  { country: 'Canada', city: 'Waterloo', lat: 43.4643, lng: -80.5204, radius: 20000 },
  { country: 'Pakistan', city: 'Lahore', lat: 31.5204, lng: 74.3587, radius: 28000 },
];

async function fetchMasjidNearMe(lat: number, lng: number, rad: number) {
  const url = `https://api.masjidnear.me/v1/masjids/search?lat=${lat}&lng=${lng}&rad=${rad}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  const list = Array.isArray(data) ? data : data?.data?.masjids ?? data?.masjids ?? data?.data ?? [];
  const arr = Array.isArray(list) ? list : [];
  return {
    url,
    ok: res.ok,
    status: res.status,
    count: arr.length,
    rawKeys: Array.isArray(data) ? ['(root is array)'] : Object.keys(data ?? {}),
    rawResponse: data,
    firstMasjidKeys: arr[0] ? Object.keys(arr[0] as object) : [],
  };
}

export async function GET() {
  const results: Record<string, Awaited<ReturnType<typeof fetchMasjidNearMe>>> = {};
  for (const { country, city, lat, lng, radius } of CITIES) {
    const key = `${country} - ${city}`;
    results[key] = await fetchMasjidNearMe(lat, lng, radius);
  }
  const summary = Object.fromEntries(
    Object.entries(results).map(([k, v]) => [
      k,
      {
        ok: v.ok,
        status: v.status,
        count: v.count,
        rawKeys: v.rawKeys,
        firstMasjidKeys: v.firstMasjidKeys,
        hasRawResponse: !!v.rawResponse,
      },
    ])
  );

  return NextResponse.json({
    message: 'MasjidNear.me API inspect: Toronto, Waterloo, Lahore. Full rawResponse per city.',
    cities: CITIES.map((c) => `${c.country} - ${c.city}`),
    summary,
    results,
  });
}
