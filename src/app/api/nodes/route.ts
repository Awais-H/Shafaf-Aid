/**
 * API route for fetching nodes by viewport bounds
 * Used in Supabase mode for viewport-based loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getDataMode } from '@/core/data/supabaseClient';
import { loadStaticData } from '@/core/data/loadData';
import { computeWorldScores, computeCountryScores } from '@/core/graph/metrics';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse viewport bounds
  const minLng = parseFloat(searchParams.get('minLng') || '-180');
  const maxLng = parseFloat(searchParams.get('maxLng') || '180');
  const minLat = parseFloat(searchParams.get('minLat') || '-90');
  const maxLat = parseFloat(searchParams.get('maxLat') || '90');
  const zoom = parseFloat(searchParams.get('zoom') || '2');
  const countryId = searchParams.get('countryId');

  const dataMode = getDataMode();

  try {
    if (dataMode === 'supabase') {
      const client = getSupabaseClient();
      if (!client) {
        return NextResponse.json(
          { error: 'Supabase not configured' },
          { status: 500 }
        );
      }

      // Query regions within bounds
      let query = client
        .from('regions')
        .select('*')
        .gte('centroid_lng', minLng)
        .lte('centroid_lng', maxLng)
        .gte('centroid_lat', minLat)
        .lte('centroid_lat', maxLat);

      if (countryId) {
        query = query.eq('country_id', countryId);
      }

      const { data: regions, error: regionsError } = await query;

      if (regionsError) {
        throw regionsError;
      }

      // Get related data
      const regionIds = (regions || []).map((r: { id: string }) => r.id);
      const countryIds = [...new Set((regions || []).map((r: { country_id: string }) => r.country_id))];

      const [
        { data: countries, error: countriesError },
        { data: aidEdges, error: edgesError },
      ] = await Promise.all([
        client.from('countries').select('*').in('id', countryIds),
        client.from('aid_edges').select('*').in('region_id', regionIds),
      ]);

      if (countriesError) throw countriesError;
      if (edgesError) throw edgesError;

      const orgIds = [...new Set((aidEdges || []).map((e: { org_id: string }) => e.org_id))];
      const { data: organizations, error: orgsError } = await client
        .from('orgs')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      return NextResponse.json({
        countries: countries || [],
        regions: regions || [],
        organizations: organizations || [],
        aidEdges: aidEdges || [],
        viewport: { minLng, maxLng, minLat, maxLat, zoom },
      });
    } else {
      // Static mode - load from JSON and filter
      const data = await loadStaticData();

      // Filter regions by bounds
      const filteredRegions = data.regions.filter((r) => {
        const [lng, lat] = r.centroid;
        const inBounds =
          lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        const matchesCountry = !countryId || r.countryId === countryId;
        return inBounds && matchesCountry;
      });

      const regionIds = new Set(filteredRegions.map((r) => r.id));
      const countryIds = new Set(filteredRegions.map((r) => r.countryId));

      const filteredCountries = data.countries.filter((c) =>
        countryIds.has(c.id)
      );
      const filteredEdges = data.aidEdges.filter((e) =>
        regionIds.has(e.regionId)
      );
      const orgIds = new Set(filteredEdges.map((e) => e.orgId));
      const filteredOrgs = data.organizations.filter((o) => orgIds.has(o.id));

      return NextResponse.json({
        countries: filteredCountries,
        regions: filteredRegions,
        organizations: filteredOrgs,
        aidEdges: filteredEdges,
        viewport: { minLng, maxLng, minLat, maxLat, zoom },
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}
