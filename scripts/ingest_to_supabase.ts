
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- Types (Simplified version of schema.ts) ---

interface Country {
    id: string;
    name: string;
    iso2: string;
    curated: boolean;
    centroid_lng: number;
    centroid_lat: number;
}

interface Region {
    id: string;
    country_id: string;
    name: string;
    centroid_lng: number;
    centroid_lat: number;
    population: number;
    need_level: string;
}

interface Organization {
    id: string;
    name: string;
    type: string;
}

interface AidEdge {
    id: string;
    org_id: string;
    region_id: string;
    aid_type: string;
    project_count: number;
    is_synthetic: boolean;
    source: string;
}

// --- Metrics Constants (Mirrored from metrics.ts) ---

const NEED_FACTORS: Record<string, number> = {
    high: 1.5,
    medium: 1.0,
    low: 0.8,
};

const AID_TYPE_WEIGHTS: Record<string, number> = {
    food: 1.2,
    medical: 1.5,
    infrastructure: 1.0,
    other: 0.5,
};

const NORMALIZATION = {
    MIN_POPULATION: 1000,
    MIN_COVERAGE_INDEX: 0,
    MAX_COVERAGE_INDEX: 10,
    OUTLIER_PERCENTILE: 95,
};

// --- Helper Functions ---

function safeDiv(numerator: number, denominator: number, fallback = 0): number {
    if (denominator === 0 || !isFinite(denominator)) return fallback;
    const result = numerator / denominator;
    return isFinite(result) ? result : fallback;
}

function clamp(value: number, min: number, max: number): number {
    if (!isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function normalizeValues(values: number[]): number[] {
    if (values.length === 0) return [];
    if (values.length === 1) return [0.5];

    const sorted = [...values].sort((a, b) => a - b);
    const percentileIdx = Math.floor(sorted.length * (NORMALIZATION.OUTLIER_PERCENTILE / 100));
    const maxVal = sorted[Math.min(percentileIdx, sorted.length - 1)];
    const minVal = sorted[0];

    const range = maxVal - minVal;
    if (range === 0) return values.map(() => 0.5);

    return values.map(v => {
        const normalized = (v - minVal) / range;
        return clamp(normalized, 0, 1);
    });
}

// --- Ingestion Logic ---

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
let envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']; // Use Service Role Key in production for full access, but anon works if RLS allows or verified setup

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ingestData() {
    console.log('🚀 Starting Data Ingestion & Computation...');

    const dataDir = path.resolve(process.cwd(), 'src/data');

    // 1. Load Local Data
    console.log('📖 Reading local JSON files...');
    const countries = JSON.parse(fs.readFileSync(path.join(dataDir, 'countries.json'), 'utf-8'));
    const regions = JSON.parse(fs.readFileSync(path.join(dataDir, 'regions.json'), 'utf-8'));
    const orgs = JSON.parse(fs.readFileSync(path.join(dataDir, 'orgs.json'), 'utf-8'));
    const aidEdges = JSON.parse(fs.readFileSync(path.join(dataDir, 'aid_edges.json'), 'utf-8'));

    // Transform to DB Schema (camelCase -> snake_case)
    const dbCountries = countries.map((c: any) => ({
        id: c.id,
        name: c.name,
        iso2: c.iso2,
        curated: c.curated,
        centroid_lng: c.centroid[0],
        centroid_lat: c.centroid[1]
    }));

    const dbRegions = regions.map((r: any) => ({
        id: r.id,
        country_id: r.countryId,
        name: r.name,
        centroid_lng: r.centroid[0],
        centroid_lat: r.centroid[1],
        population: r.population,
        need_level: r.needLevel
    }));

    const dbOrgs = orgs.map((o: any) => ({
        id: o.id,
        name: o.name,
        type: o.type
    }));

    const dbEdges = aidEdges.map((e: any) => ({
        id: e.id,
        org_id: e.orgId,
        region_id: e.regionId,
        aid_type: e.aidType,
        project_count: e.projectCount,
        is_synthetic: e.isSynthetic,
        source: e.source
    }));

    // 2. Upload Base Data
    console.log('📤 Uploading Base Data...');

    await upsertBatched('countries', dbCountries);
    await upsertBatched('regions', dbRegions);
    await upsertBatched('orgs', dbOrgs);
    await upsertBatched('aid_edges', dbEdges);

    // 3. Compute Metrics
    console.log('🧮 Computing Metrics...');

    const regionScores: any[] = [];
    const rawCountryScores: number[] = [];
    const countryDataMap: Record<string, { totalAid: number, regionCount: number, rawScores: number[] }> = {};

    // Setup Country Map
    dbCountries.forEach((c: any) => {
        countryDataMap[c.id] = { totalAid: 0, regionCount: 0, rawScores: [] };
    });

    // Calculate Region Metrics
    dbRegions.forEach((region: any) => {
        // Find edges for this region
        const edges = dbEdges.filter((e: any) => e.region_id === region.id);

        // Calculate Weighted Aid Presence
        let weightedAid = 0;
        edges.forEach((e: any) => {
            weightedAid += (e.project_count * (AID_TYPE_WEIGHTS[e.aid_type] || 0.5));
        });

        // Calculate Coverage Index
        const needFactor = NEED_FACTORS[region.need_level] || 1.0;
        const popK = Math.max(region.population, NORMALIZATION.MIN_POPULATION) / 1000;
        const rawCoverage = clamp(
            safeDiv(weightedAid, popK * needFactor),
            NORMALIZATION.MIN_COVERAGE_INDEX,
            NORMALIZATION.MAX_COVERAGE_INDEX
        );

        // Overlap Score (Degree Centrality)
        const uniqueOrgs = new Set(edges.map((e: any) => e.org_id)).size;
        const overlapScore = safeDiv(uniqueOrgs, dbOrgs.length);

        // Store Region Analytics
        regionScores.push({
            region_id: region.id,
            country_id: region.country_id,
            coverage_index: rawCoverage,
            normalized_coverage: 0, // Set later
            need_factor: needFactor,
            overlap_score: overlapScore
        });

        // Aggregate Update Country Stats
        if (countryDataMap[region.country_id]) {
            countryDataMap[region.country_id].totalAid += weightedAid;
            countryDataMap[region.country_id].regionCount += 1;
            countryDataMap[region.country_id].rawScores.push(rawCoverage);
        }
    });

    // Normalize Region Scores (Global for now, could be per country)
    const allRegionRawScores = regionScores.map(r => r.coverage_index);
    const normalizedRegionScores = normalizeValues(allRegionRawScores);
    regionScores.forEach((r, i) => {
        r.normalized_coverage = normalizedRegionScores[i];
    });

    // 4. Compute Country Scores
    const countryScoresUpload: any[] = [];

    for (const countryId in countryDataMap) {
        const data = countryDataMap[countryId];
        if (data.regionCount === 0) continue;

        // Avg coverage of regions
        const avgRawCoverage = data.rawScores.reduce((a, b) => a + b, 0) / data.regionCount;

        countryScoresUpload.push({
            country_id: countryId,
            raw_coverage: avgRawCoverage,
            normalized_coverage: 0, // Set next
            region_count: data.regionCount,
            total_aid_presence: data.totalAid
        });

        rawCountryScores.push(avgRawCoverage);
    }

    // Normalize Country Scores
    const normalizedCountryScores = normalizeValues(rawCountryScores);
    countryScoresUpload.forEach((c, i) => {
        c.normalized_coverage = normalizedCountryScores[i];
    });

    // 5. Upload Computed Analytics
    console.log('📤 Uploading Computed Analytics...');
    await upsertBatched('country_scores', countryScoresUpload);
    await upsertBatched('region_analytics', regionScores);

    console.log('✅ Ingestion Complete!');
}

async function upsertBatched(table: string, items: any[]) {
    if (items.length === 0) return;
    console.log(`   - Upserting ${items.length} records into ${table}...`);

    // Batch in chunks of 100 to avoid request size limits
    const chunkSize = 100;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk);
        if (error) {
            console.error(`❌ Error upserting to ${table}:`, error.message);
        }
    }
}

ingestData();
