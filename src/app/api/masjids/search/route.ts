/**
 * Proxy for MasjidNear.me API (avoids CORS)
 * GET /api/masjids/search?lat={lat}&lng={lng}&rad={meters}
 */

import { NextRequest, NextResponse } from 'next/server';

const MASJID_NEAR_ME = 'https://api.masjidnear.me/v1/masjids/search';

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const rad = searchParams.get('rad') || '20000';

    if (!lat || !lng) {
        return NextResponse.json(
            { error: 'lat and lng are required' },
            { status: 400 }
        );
    }

    const url = new URL(MASJID_NEAR_ME);
    url.searchParams.set('lat', lat);
    url.searchParams.set('lng', lng);
    url.searchParams.set('rad', rad);

    try {
        const res = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            next: { revalidate: 3600 },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { error: (data as Record<string, unknown>)?.message || 'MasjidNear.me request failed' },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        console.error('MasjidNear.me proxy error:', e);
        return NextResponse.json(
            { error: 'Failed to fetch masjids' },
            { status: 502 }
        );
    }
}
