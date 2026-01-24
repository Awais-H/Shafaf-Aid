/**
 * Synthetic data generator for AidGap stress testing
 * Generates large datasets for performance testing (50k+ points)
 * 
 * Usage: npx ts-node --esm scripts/generateSyntheticData.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  seed: 42,
  numCountries: 50,
  regionsPerCountry: { min: 10, max: 30 },
  numOrgs: 100,
  edgesPerRegion: { min: 1, max: 8 },
  outputDir: './src/data/stress',
};

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// Types
interface Country {
  id: string;
  name: string;
  iso2: string;
  curated: boolean;
  centroid: [number, number];
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

// Generator functions
function generateCountries(rng: SeededRandom, count: number): Country[] {
  const countries: Country[] = [];
  
  for (let i = 0; i < count; i++) {
    const lat = rng.next() * 140 - 70; // -70 to 70
    const lng = rng.next() * 360 - 180; // -180 to 180
    
    countries.push({
      id: `country_${i.toString().padStart(3, '0')}`,
      name: `Country ${i + 1}`,
      iso2: `C${i.toString().padStart(1, '0')}`,
      curated: i < 5,
      centroid: [lng, lat],
    });
  }
  
  return countries;
}

function generateRegions(
  rng: SeededRandom,
  countries: Country[]
): Region[] {
  const regions: Region[] = [];
  const needLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  
  for (const country of countries) {
    const numRegions = rng.nextInt(
      CONFIG.regionsPerCountry.min,
      CONFIG.regionsPerCountry.max
    );
    
    for (let i = 0; i < numRegions; i++) {
      // Generate region centroid near country centroid
      const offsetLat = (rng.next() - 0.5) * 10;
      const offsetLng = (rng.next() - 0.5) * 10;
      
      regions.push({
        id: `${country.id}_region_${i.toString().padStart(2, '0')}`,
        countryId: country.id,
        name: `${country.name} Region ${i + 1}`,
        centroid: [
          country.centroid[0] + offsetLng,
          country.centroid[1] + offsetLat,
        ],
        population: rng.nextInt(50000, 5000000),
        needLevel: rng.pick(needLevels),
      });
    }
  }
  
  return regions;
}

function generateOrganizations(count: number): Organization[] {
  const types = ['UN', 'International', 'NGO', 'Government'];
  const orgs: Organization[] = [];
  
  for (let i = 0; i < count; i++) {
    orgs.push({
      id: `org_${i.toString().padStart(3, '0')}`,
      name: `Organization ${i + 1}`,
      type: types[i % types.length],
    });
  }
  
  return orgs;
}

function generateAidEdges(
  rng: SeededRandom,
  regions: Region[],
  orgs: Organization[]
): AidEdge[] {
  const edges: AidEdge[] = [];
  const aidTypes: Array<'food' | 'medical' | 'infrastructure'> = [
    'food',
    'medical',
    'infrastructure',
  ];
  
  let edgeId = 0;
  
  for (const region of regions) {
    const numEdges = rng.nextInt(
      CONFIG.edgesPerRegion.min,
      CONFIG.edgesPerRegion.max
    );
    
    // Select random orgs for this region
    const selectedOrgs = new Set<string>();
    for (let i = 0; i < numEdges; i++) {
      selectedOrgs.add(rng.pick(orgs).id);
    }
    
    for (const orgId of selectedOrgs) {
      edges.push({
        id: `edge_${(edgeId++).toString().padStart(5, '0')}`,
        orgId,
        regionId: region.id,
        aidType: rng.pick(aidTypes),
        projectCount: rng.nextInt(1, 15),
        isSynthetic: true,
        source: 'stress-test-generator',
      });
    }
  }
  
  return edges;
}

// Main generator
async function main() {
  console.log('Generating synthetic stress test data...');
  console.log(`Seed: ${CONFIG.seed}`);
  
  const rng = new SeededRandom(CONFIG.seed);
  
  // Generate data
  console.log(`Generating ${CONFIG.numCountries} countries...`);
  const countries = generateCountries(rng, CONFIG.numCountries);
  
  console.log('Generating regions...');
  const regions = generateRegions(rng, countries);
  console.log(`Generated ${regions.length} regions`);
  
  console.log(`Generating ${CONFIG.numOrgs} organizations...`);
  const orgs = generateOrganizations(CONFIG.numOrgs);
  
  console.log('Generating aid edges...');
  const edges = generateAidEdges(rng, regions, orgs);
  console.log(`Generated ${edges.length} aid edges`);
  
  // Create output directory
  const outputDir = path.resolve(CONFIG.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write files
  console.log(`Writing files to ${outputDir}...`);
  
  fs.writeFileSync(
    path.join(outputDir, 'countries.json'),
    JSON.stringify(countries, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'regions.json'),
    JSON.stringify(regions, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'orgs.json'),
    JSON.stringify(orgs, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'aid_edges.json'),
    JSON.stringify(edges, null, 2)
  );
  
  // Summary
  console.log('\n=== Generation Complete ===');
  console.log(`Countries: ${countries.length}`);
  console.log(`Regions: ${regions.length}`);
  console.log(`Organizations: ${orgs.length}`);
  console.log(`Aid Edges: ${edges.length}`);
  console.log(`Total data points: ${regions.length + edges.length}`);
  console.log(`\nFiles written to: ${outputDir}`);
  console.log('\nTo use this data, copy files to src/data/ or update loadData.ts');
}

main().catch(console.error);
