/**
 * Humanitarian Data Ingestion Script (Real Data)
 * 
 * Strategy:
 * 1. Search HDX CKAN for "3W" (Who does What Where) datasets for each country
 * 2. Find and download the CSV resource
 * 3. Parse CSV rows to extract:
 *    - Real Admin1/Admin2 region names (to replace regions.json)
 *    - Real Organizations (to replace orgs.json)
 *    - Real Activities (to replace aid_edges.json)
 * 
 * Usage: npx ts-node --esm scripts/ingest_humanitarian_data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    // Target countries
    countries: [
        { id: 'somalia', name: 'Somalia', iso3: 'SOM', queries: ['3W Somalia', 'Somalia Operational Presence', 'Somalia 3W matrix'], centroid: [45.0, 6.0] },
        { id: 'bangladesh', name: 'Bangladesh', iso3: 'BGD', queries: ['Who doing What Where Bangladesh', '3W Bangladesh', '4W Bangladesh', 'Bangladesh Operational Presence'], centroid: [90.0, 24.0] },
        { id: 'yemen', name: 'Yemen', iso3: 'YEM', queries: ['Yemen 3W', 'Yemen Operational Presence', 'Who doing What Where Yemen'], centroid: [48.0, 15.5] },
        { id: 'south_sudan', name: 'South Sudan', iso3: 'SSD', queries: ['South Sudan 3W', 'Operational Presence South Sudan'], centroid: [30.0, 7.0] },
        { id: 'afghanistan', name: 'Afghanistan', iso3: 'AFG', queries: ['Afghanistan 3W', 'Afghanistan Operational Presence'], centroid: [66.0, 33.0] },
        { id: 'palestine', name: 'Palestine', iso3: 'PSE', queries: ['oPt 3W', 'Occupied Palestinian Territory 3W', 'Palestine Operational Presence'], centroid: [35.2, 31.9] },
    ],

    // HDX API
    hdxCkanBaseUrl: 'https://data.humdata.org/api/3/action',

    // Output
    outputDir: path.join(__dirname, '..', 'public', 'data'),
};

// ============================================================================
// Types
// ============================================================================

interface CkanResource {
    id: string;
    name: string;
    format: string;
    url: string;
    description: string;
}

interface CkanDataset {
    id: string;
    title: string;
    resources: CkanResource[];
}

interface Region {
    id: string;
    countryId: string;
    name: string;
    centroid: [number, number];
    population: number;
    needLevel: 'low' | 'medium' | 'high';
}

interface Organization {
    id: string;
    name: string;
    type: string;
}

interface AidEdge {
    id: string;
    orgId: string;
    regionId: string;
    aidType: 'food' | 'medical' | 'infrastructure';
    projectCount: number;
    isSynthetic: boolean;
    source: string;
}

// ============================================================================
// API & Download Helpers
// ============================================================================

async function searchDatasets(query: string): Promise<CkanDataset[]> {
    const url = `${CONFIG.hdxCkanBaseUrl}/package_search?q=${encodeURIComponent(query)}&rows=5`;
    console.log(`  🔍 Searching for "${query}"...`);
    try {
        const res = await fetch(url);
        const json = (await res.json()) as any;
        return json.result?.results || [];
    } catch (err) {
        console.warn(`  ❌ Search failed:`, err);
        return [];
    }
}

async function downloadCsv(url: string, destPath: string): Promise<boolean> {
    console.log(`  ⬇️ Downloading CSV: ${url}`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buffer));
        return true;
    } catch (err) {
        console.warn(`  ❌ Download failed:`, err);
        return false;
    }
}

// ============================================================================
// CSV Parsing Logic (Heuristics)
// ============================================================================

/**
 * Identify column indices for key fields based on common header names
 */
function identifyColumns(header: string[]) {
    const norm = header.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

    const findCol = (keywords: string[]) =>
        norm.findIndex(col => keywords.some(k => col.includes(k)));

    return {
        org: findCol(['partner', 'organization', 'agency', 'implementing', 'reporting', 'organisation']),
        admin1: findCol(['state', 'province', 'governorate', 'admin1', 'division', 'adm1', 'region']),
        admin2: findCol(['district', 'city', 'admin2', 'county', 'adm2', 'nahia', 'upazila']),
        sector: findCol(['sector', 'cluster', 'category', 'theme']),
        status: findCol(['status', 'activitystatus', 'projectstatus']),
    };
}

/**
 * Classify organization type based on name
 */
function classifyOrg(name: string): string {
    const n = name.toLowerCase();
    if (['wfp', 'unhcr', 'unicef', 'who', 'iom', 'fao', 'undp', 'unfpa', 'unocha'].some(x => n.includes(x))) return 'UN';
    if (n.includes('red cross') || n.includes('red crescent') || n.includes('icrc')) return 'Red Cross';
    if (n.includes('government') || n.includes('ministry')) return 'Government';
    return 'INGO';
}

/**
 * Classify aid type from sector name
 */
function classifyAidType(sector: string): 'food' | 'medical' | 'infrastructure' {
    const s = sector.toLowerCase();
    if (s.includes('food') || s.includes('nutrition') || s.includes('agriculture') || s.includes('fsac')) return 'food';
    if (s.includes('health') || s.includes('medic') || s.includes('wash') || s.includes('water')) return 'medical';
    return 'infrastructure';
}

// ============================================================================
// Processing Logic
// ============================================================================

async function processCountry(country: typeof CONFIG.countries[0]) {
    console.log(`\n🌍 Processing ${country.name}...`);

    // 1. Find best dataset
    let bestResource: CkanResource | null = null;

    for (const q of country.queries) {
        if (bestResource) break;

        const datasets = await searchDatasets(q);
        for (const ds of datasets) {
            // Prioritize 3W/Presence specific titles
            const title = ds.title.toLowerCase();
            const isRelevant = title.includes('3w') || title.includes('who') || title.includes('presence') || title.includes('activity');
            if (!isRelevant) continue;

            // Look for CSVs, prioritizing ones with '3w' in the filename too
            const csvs = ds.resources.filter(r => r.format.toUpperCase() === 'CSV');

            // Best: CSV with '3w' in name
            let candidate = csvs.find(r => r.name.toLowerCase().includes('3w') || r.name.toLowerCase().includes('presence'));

            // Good: Any CSV if dataset title is strong
            if (!candidate && csvs.length > 0) candidate = csvs[0];

            if (candidate) {
                console.log(`  ✅ Found candidate: "${ds.title}" -> [${candidate.name}]`);
                bestResource = candidate;
                break;
            }
        }
    }

    if (!bestResource) {
        console.warn(`  ⚠️ No suitable CSV found for ${country.name}. Skipping.`);
        return null;
    }

    // 2. Download
    const tmpPath = path.join(__dirname, `temp_${country.id}.csv`);
    const success = await downloadCsv(bestResource.url, tmpPath);
    if (!success) return null;

    // 3. Parse CSV line-by-line
    const regionsMap = new Map<string, Region>();
    const orgsMap = new Map<string, Organization>();
    const edges: AidEdge[] = [];

    const fileStream = fs.createReadStream(tmpPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headerDetails: ReturnType<typeof identifyColumns> | null = null;
    let isHeader = true;
    let lineCount = 0;

    for await (const line of rl) {
        // Simple CSV parse (handles quotes poorly but fast for this use case)
        // For robust parsing we'd use 'csv-parse' but trying to stay dep-light
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

        if (isHeader) {
            headerDetails = identifyColumns(cols);
            // Validate we found enough columns
            if (headerDetails.org === -1 || (headerDetails.admin1 === -1 && headerDetails.admin2 === -1)) {
                console.warn('  ⚠️ Header parsing failed (missing required columns). Trying next dataset if exists...');
                // In a real script we would retry, here we just abort this file
                break;
            }
            isHeader = false;
            continue;
        }

        // skip invalid rows
        if (!headerDetails) break;

        const orgName = cols[headerDetails.org];
        const regionName = cols[headerDetails.admin1] || cols[headerDetails.admin2];
        const sector = headerDetails.sector > -1 ? cols[headerDetails.sector] : 'General';

        if (!orgName || !regionName) continue;

        // -- Entity Creation --

        // Region
        const regionId = `${country.id}_${regionName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!regionsMap.has(regionId)) {
            regionsMap.set(regionId, {
                id: regionId,
                countryId: country.id,
                name: regionName,
                // Approximate centroid generation (jittered from country center)
                centroid: [
                    country.centroid[0] + (Math.random() - 0.5) * 4,
                    country.centroid[1] + (Math.random() - 0.5) * 4,
                ] as [number, number],
                population: 100000 + Math.floor(Math.random() * 900000), // Mock pop for now
                needLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any, // Mock need for now
            });
        }

        // Org
        const orgId = `org_${orgName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
        if (!orgsMap.has(orgId)) {
            orgsMap.set(orgId, {
                id: orgId,
                name: orgName,
                type: classifyOrg(orgName),
            });
        }

        // Edge
        const aidType = classifyAidType(sector);
        edges.push({
            id: `edge_${Math.random().toString(36).substr(2, 9)}`,
            orgId,
            regionId,
            aidType,
            projectCount: 1,
            isSynthetic: false,
            source: 'hdx_ckan_3w',
        });

        lineCount++;
    }

    // Clean up
    fs.unlinkSync(tmpPath);

    console.log(`  📊 Extracted: ${regionsMap.size} regions, ${orgsMap.size} orgs, ${lineCount} activities`);

    return {
        regions: Array.from(regionsMap.values()),
        orgs: Array.from(orgsMap.values()),
        edges,
    };
}

// ============================================================================
// Main Execution
// ============================================================================

// ... (previous imports)

// ============================================================================
// Fallback Data Loading
// ============================================================================

async function loadFallbackData() {
    console.log('  ⚠️ Loading fallback mock data from src/data/...');
    try {
        const srcDir = path.join(__dirname, '..', 'src', 'data');

        // Helper to read JSON
        const read = (f: string) => {
            const p = path.join(srcDir, f);
            if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
            return [];
        };

        return {
            regions: read('regions.json') as Region[],
            orgs: read('orgs.json') as Organization[],
            edges: read('aid_edges.json') as AidEdge[]
        };
    } catch (err) {
        console.warn(`  ❌ Failed to load fallbacks:`, err);
        return { regions: [], orgs: [], edges: [] };
    }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
    console.log('🚀 Starting Automated 3W Data Ingestion...');

    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

    const allRegions: Region[] = [];
    const allOrgs = new Map<string, Organization>();
    const allEdges: AidEdge[] = [];

    // Transform countries to target schema (static for now)
    const countriesData = CONFIG.countries.map(c => ({
        id: c.id,
        name: c.name,
        iso2: c.iso3.substring(0, 2), // rough approx
        curated: true,
        centroid: c.centroid,
    }));

    // Track successful vs failed countries
    const successfulCountries = new Set<string>();

    for (const c of CONFIG.countries) {
        const data = await processCountry(c);

        if (data && data.regions.length > 0) {
            console.log(`  ✅ Successfully ingested real data for ${c.name}`);
            data.regions.forEach(r => allRegions.push(r));
            data.orgs.forEach(o => allOrgs.set(o.id, o));
            data.edges.forEach(e => allEdges.push(e));
            successfulCountries.add(c.id);
        } else {
            console.warn(`  ⚠️ Failed to ingest ${c.name}. Will rely on fallback mock data.`);
        }
    }

    // Fallback Logic:
    // If we missed any country, load its data from the existing src/data files
    const fallbacks = await loadFallbackData();

    // Mix in fallback data for countries that failed
    if (fallbacks.regions.length > 0) {
        let addedCount = 0;

        // Filter fallback regions to only those from failed countries
        const fallbackRegions = fallbacks.regions.filter(r => !successfulCountries.has(r.countryId));
        fallbackRegions.forEach(r => allRegions.push(r));
        addedCount += fallbackRegions.length;

        // Add related edges
        const failedRegionIds = new Set(fallbackRegions.map(r => r.id));
        const fallbackEdges = fallbacks.edges.filter(e => failedRegionIds.has(e.regionId));
        fallbackEdges.forEach(e => allEdges.push(e));

        // Add related orgs (if not already present)
        const fallbackOrgIds = new Set(fallbackEdges.map(e => e.orgId));
        const fallbackOrgs = fallbacks.orgs.filter(o => fallbackOrgIds.has(o.id));
        fallbackOrgs.forEach(o => {
            if (!allOrgs.has(o.id)) allOrgs.set(o.id, o);
        });

        console.log(`\n📦 Integrated fallback data for ${CONFIG.countries.length - successfulCountries.size} countries (${addedCount} regions added).`);
    }

    // Write Files
    console.log('\n💾 Saving files...');

    fs.writeFileSync(path.join(CONFIG.outputDir, 'countries.json'), JSON.stringify(countriesData, null, 2));
    fs.writeFileSync(path.join(CONFIG.outputDir, 'regions.json'), JSON.stringify(allRegions, null, 2));
    fs.writeFileSync(path.join(CONFIG.outputDir, 'orgs.json'), JSON.stringify(Array.from(allOrgs.values()), null, 2));
    fs.writeFileSync(path.join(CONFIG.outputDir, 'aid_edges.json'), JSON.stringify(allEdges, null, 2));

    // Meta
    const meta = {
        updated: new Date().toISOString(),
        source: `HDX 3W Automated Ingestion (+ ${CONFIG.countries.length - successfulCountries.size} fallback)`,
        successful_countries: Array.from(successfulCountries),
        stats: {
            countries: countriesData.length,
            regions: allRegions.length,
            orgs: allOrgs.size,
            edges: allEdges.length
        }
    };
    fs.writeFileSync(path.join(CONFIG.outputDir, 'meta.json'), JSON.stringify(meta, null, 2));

    console.log('✅ Done! Data ingestion complete.');
}

main().catch(console.error);
