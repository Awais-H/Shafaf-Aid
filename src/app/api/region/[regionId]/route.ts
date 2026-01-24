/**
 * API route for fetching region details
 * Used in Supabase mode for region-specific queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getDataMode } from '@/core/data/supabaseClient';
import { loadStaticData } from '@/core/data/loadData';
import { getRegionDetail } from '@/core/graph/metrics';
import { getTopOrgsForRegion } from '@/core/graph/ranking';

interface RouteParams {
  params: {
    regionId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { regionId } = params;
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

      // Fetch region
      const { data: region, error: regionError } = await client
        .from('regions')
        .select('*')
        .eq('id', regionId)
        .single();

      if (regionError) {
        if (regionError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Region not found' },
            { status: 404 }
          );
        }
        throw regionError;
      }

      // Fetch country
      const { data: country, error: countryError } = await client
        .from('countries')
        .select('*')
        .eq('id', region.country_id)
        .single();

      if (countryError) throw countryError;

      // Fetch aid edges for this region
      const { data: aidEdges, error: edgesError } = await client
        .from('aid_edges')
        .select('*')
        .eq('region_id', regionId);

      if (edgesError) throw edgesError;

      // Fetch organizations
      const orgIds = [...new Set((aidEdges || []).map((e) => e.org_id))];
      const { data: organizations, error: orgsError } = await client
        .from('orgs')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      // Calculate metrics
      // Note: For full accuracy, we'd need to load all regions for normalization
      // This is a simplified version for the API

      // Aid type breakdown
      const aidTypeBreakdown: Record<string, number> = {};
      let totalProjects = 0;

      for (const edge of aidEdges || []) {
        aidTypeBreakdown[edge.aid_type] =
          (aidTypeBreakdown[edge.aid_type] || 0) + edge.project_count;
        totalProjects += edge.project_count;
      }

      const aidTypes = Object.entries(aidTypeBreakdown).map(([type, count]) => ({
        aidType: type,
        count,
        percentage: totalProjects > 0 ? (count / totalProjects) * 100 : 0,
      }));

      // Organization presence
      const orgPresence = new Map<
        string,
        { aidTypes: Set<string>; projectCount: number }
      >();

      for (const edge of aidEdges || []) {
        if (!orgPresence.has(edge.org_id)) {
          orgPresence.set(edge.org_id, { aidTypes: new Set(), projectCount: 0 });
        }
        const presence = orgPresence.get(edge.org_id)!;
        presence.aidTypes.add(edge.aid_type);
        presence.projectCount += edge.project_count;
      }

      const orgsList = Array.from(orgPresence.entries()).map(([orgId, info]) => {
        const org = (organizations || []).find((o) => o.id === orgId);
        return {
          orgId,
          orgName: org?.name || orgId,
          aidTypes: Array.from(info.aidTypes),
          projectCount: info.projectCount,
        };
      });

      return NextResponse.json({
        regionId,
        regionName: region.name,
        countryId: country.id,
        countryName: country.name,
        population: region.population,
        needLevel: region.need_level,
        organizations: orgsList,
        aidTypes,
        totalProjects,
        orgCount: orgIds.length,
      });
    } else {
      // Static mode
      const data = await loadStaticData();
      const detail = getRegionDetail(regionId, data);

      if (!detail) {
        return NextResponse.json(
          { error: 'Region not found' },
          { status: 404 }
        );
      }

      const topOrgs = getTopOrgsForRegion(regionId, data, 20);

      return NextResponse.json({
        ...detail,
        topOrgs,
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch region details' },
      { status: 500 }
    );
  }
}
