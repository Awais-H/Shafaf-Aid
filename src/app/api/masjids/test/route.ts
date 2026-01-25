/**
 * Test MasjidNear.me API for a city.
 * GET /api/masjids/test?city=Toronto&country=Canada
 * GET /api/masjids/test?city=Waterloo&country=Canada&raw=1
 *
 * Query params:
 *   city, country – which city to test (default: Toronto, Canada)
 *   raw=1        – include full raw API response as rawResponse (for structure / keys)
 *
 * Returns: { ok, status, url, city, country, count, rawKeys, sample, rawResponse? }
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO: Record<string, Record<string, { lat: number; lng: number; radius: number }>> = {
  Canada: {
    Toronto: { lat: 43.6532, lng: -79.3832, radius: 25000 },
    Waterloo: { lat: 43.4643, lng: -80.5204, radius: 20000 },
  },
  USA: { 'New York': { lat: 40.7128, lng: -74.006, radius: 30000 } },
  Pakistan: { Lahore: { lat: 31.5204, lng: 74.3587, radius: 28000 } },
};
const DEFAULT_GEO = { lat: 43.6532, lng: -79.3832, radius: 25000 };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country') || 'Canada';
  const city = searchParams.get('city') || 'Toronto';
  const includeRaw = searchParams.get('raw') === '1';
  const geo = GEO[country]?.[city] ?? DEFAULT_GEO;

  const url = `https://api.masjidnear.me/v1/masjids/search?lat=${geo.lat}&lng=${geo.lng}&rad=${geo.radius}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : data?.data?.masjids ?? data?.masjids ?? data?.data ?? [];
    const arr = Array.isArray(list) ? list : [];
    const rawKeys = Array.isArray(data) ? ['(root is array)'] : Object.keys(data ?? {});
    const sample = arr.slice(0, 3).map((m: Record<string, unknown>) => ({
      _id: m?._id ?? m?.id,
      masjidName: m?.masjidName ?? m?.name ?? m?.title,
      masjidLocation: m?.masjidLocation,
      lat: (m?.masjidLocation as { coordinates?: [number, number] })?.coordinates?.[1] ?? m?.latitude ?? m?.lat,
      lng: (m?.masjidLocation as { coordinates?: [number, number] })?.coordinates?.[0] ?? m?.longitude ?? m?.lng,
    }));

    const body: Record<string, unknown> = {
      ok: res.ok,
      status: res.status,
      url,
      city,
      country,
      count: arr.length,
      rawKeys,
      sample,
    };
    if (includeRaw) {
      body.rawResponse = data;
    }
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'fetch failed',
      url,
      city,
      country,
    });
  }
}
