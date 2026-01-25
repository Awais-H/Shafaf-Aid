/**
 * Synthetic data generator for Shafaf Aid (5-country demo)
 * Generates regions, orgs, and aid edges for Afghanistan, Somalia, Bangladesh, Yemen, South Sudan.
 *
 * Usage: npx ts-node --esm scripts/generateSyntheticData.ts
 *        or: npx tsx scripts/generateSyntheticData.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve('./src/data');

// -----------------------------------------------------------------------------
// Seeded RNG
// -----------------------------------------------------------------------------

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
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// -----------------------------------------------------------------------------
// Fixed 5 countries
// -----------------------------------------------------------------------------

const COUNTRIES = [
  { id: 'somalia', name: 'Somalia', iso2: 'SO', curated: true, centroid: [45.0, 6.0] as [number, number] },
  { id: 'bangladesh', name: 'Bangladesh', iso2: 'BD', curated: true, centroid: [90.0, 24.0] as [number, number] },
  { id: 'yemen', name: 'Yemen', iso2: 'YE', curated: true, centroid: [48.0, 15.5] as [number, number] },
  { id: 'south_sudan', name: 'South Sudan', iso2: 'SS', curated: true, centroid: [30.0, 7.0] as [number, number] },
  { id: 'afghanistan', name: 'Afghanistan', iso2: 'AF', curated: true, centroid: [66.0, 33.0] as [number, number] },
];

// -----------------------------------------------------------------------------
// Afghanistan: 34 provinces [lng, lat], population, needLevel
// -----------------------------------------------------------------------------

const AFGHANISTAN_PROVINCES: Array<{
  id: string;
  name: string;
  centroid: [number, number];
  population: number;
  needLevel: 'low' | 'medium' | 'high';
}> = [
  { id: 'afghanistan_badakhshan', name: 'Badakhshan Province', centroid: [70.8, 36.7], population: 920_000, needLevel: 'high' },
  { id: 'afghanistan_badghis', name: 'Badghis Province', centroid: [63.8, 35.0], population: 520_000, needLevel: 'high' },
  { id: 'afghanistan_baghlan', name: 'Baghlan Province', centroid: [68.8, 36.1], population: 950_000, needLevel: 'medium' },
  { id: 'afghanistan_balkh', name: 'Balkh Province', centroid: [66.9, 36.8], population: 1_400_000, needLevel: 'medium' },
  { id: 'afghanistan_bamyan', name: 'Bamyan Province', centroid: [67.8, 34.8], population: 490_000, needLevel: 'medium' },
  { id: 'afghanistan_daykundi', name: 'Daykundi Province', centroid: [66.0, 33.5], population: 450_000, needLevel: 'high' },
  { id: 'afghanistan_farah', name: 'Farah Province', centroid: [62.1, 32.4], population: 510_000, needLevel: 'high' },
  { id: 'afghanistan_faryab', name: 'Faryab Province', centroid: [64.9, 36.1], population: 1_030_000, needLevel: 'medium' },
  { id: 'afghanistan_ghazni', name: 'Ghazni Province', centroid: [68.4, 33.5], population: 1_350_000, needLevel: 'high' },
  { id: 'afghanistan_ghor', name: 'Ghor Province', centroid: [64.9, 34.5], population: 740_000, needLevel: 'high' },
  { id: 'afghanistan_helmand', name: 'Helmand Province', centroid: [64.4, 31.6], population: 960_000, needLevel: 'high' },
  { id: 'afghanistan_herat', name: 'Herat Province', centroid: [62.2, 34.3], population: 2_000_000, needLevel: 'medium' },
  { id: 'afghanistan_jowzjan', name: 'Jowzjan Province', centroid: [65.7, 36.8], population: 580_000, needLevel: 'medium' },
  { id: 'afghanistan_kabul', name: 'Kabul Province', centroid: [69.2, 34.5], population: 4_600_000, needLevel: 'high' },
  { id: 'afghanistan_kandahar', name: 'Kandahar Province', centroid: [65.7, 31.6], population: 1_300_000, needLevel: 'high' },
  { id: 'afghanistan_kapisa', name: 'Kapisa Province', centroid: [69.6, 35.0], population: 450_000, needLevel: 'medium' },
  { id: 'afghanistan_khost', name: 'Khost Province', centroid: [69.9, 33.3], population: 590_000, needLevel: 'high' },
  { id: 'afghanistan_kunar', name: 'Kunar Province', centroid: [71.1, 35.0], population: 450_000, needLevel: 'high' },
  { id: 'afghanistan_kunduz', name: 'Kunduz Province', centroid: [68.9, 36.7], population: 1_050_000, needLevel: 'high' },
  { id: 'afghanistan_laghman', name: 'Laghman Province', centroid: [70.2, 34.7], population: 445_000, needLevel: 'medium' },
  { id: 'afghanistan_logar', name: 'Logar Province', centroid: [69.2, 34.0], population: 390_000, needLevel: 'high' },
  { id: 'afghanistan_nangarhar', name: 'Nangarhar Province', centroid: [70.6, 34.2], population: 1_600_000, needLevel: 'high' },
  { id: 'afghanistan_nimroz', name: 'Nimroz Province', centroid: [62.2, 31.0], population: 165_000, needLevel: 'medium' },
  { id: 'afghanistan_nuristan', name: 'Nuristan Province', centroid: [70.9, 35.3], population: 150_000, needLevel: 'high' },
  { id: 'afghanistan_paktika', name: 'Paktika Province', centroid: [68.8, 32.5], population: 430_000, needLevel: 'high' },
  { id: 'afghanistan_paktia', name: 'Paktia Province', centroid: [69.5, 33.6], population: 590_000, needLevel: 'high' },
  { id: 'afghanistan_panjshir', name: 'Panjshir Province', centroid: [69.7, 35.4], population: 155_000, needLevel: 'medium' },
  { id: 'afghanistan_parwan', name: 'Parwan Province', centroid: [69.2, 35.0], population: 700_000, needLevel: 'medium' },
  { id: 'afghanistan_samangan', name: 'Samangan Province', centroid: [67.9, 36.3], population: 380_000, needLevel: 'medium' },
  { id: 'afghanistan_sar_e_pol', name: "Sar-e Pol Province", centroid: [66.0, 36.0], population: 550_000, needLevel: 'high' },
  { id: 'afghanistan_takhar', name: 'Takhar Province', centroid: [69.8, 36.7], population: 1_000_000, needLevel: 'high' },
  { id: 'afghanistan_uruzgan', name: 'Uruzgan Province', centroid: [66.0, 32.9], population: 390_000, needLevel: 'high' },
  { id: 'afghanistan_wardak', name: 'Wardak Province', centroid: [68.4, 34.2], population: 600_000, needLevel: 'high' },
  { id: 'afghanistan_zabul', name: 'Zabul Province', centroid: [67.2, 32.1], population: 300_000, needLevel: 'high' },
];

// -----------------------------------------------------------------------------
// Somalia: 12 regions
// -----------------------------------------------------------------------------

const SOMALIA_REGIONS: Array<{ id: string; name: string; centroid: [number, number]; population: number; needLevel: 'low' | 'medium' | 'high' }> = [
  { id: 'somalia_banadir', name: 'Banadir (Mogadishu)', centroid: [45.3, 2.0], population: 2_500_000, needLevel: 'high' },
  { id: 'somalia_bay', name: 'Bay', centroid: [43.6, 2.8], population: 800_000, needLevel: 'high' },
  { id: 'somalia_gedo', name: 'Gedo', centroid: [42.0, 3.5], population: 550_000, needLevel: 'high' },
  { id: 'somalia_hiraan', name: 'Hiraan', centroid: [45.5, 4.3], population: 520_000, needLevel: 'medium' },
  { id: 'somalia_lower_juba', name: 'Lower Juba', centroid: [42.1, 0.5], population: 490_000, needLevel: 'high' },
  { id: 'somalia_middle_juba', name: 'Middle Juba', centroid: [42.5, 2.0], population: 370_000, needLevel: 'medium' },
  { id: 'somalia_lower_shabelle', name: 'Lower Shabelle', centroid: [44.5, 1.8], population: 1_200_000, needLevel: 'high' },
  { id: 'somalia_middle_shabelle', name: 'Middle Shabelle', centroid: [45.9, 2.8], population: 520_000, needLevel: 'medium' },
  { id: 'somalia_bakool', name: 'Bakool', centroid: [44.1, 4.4], population: 310_000, needLevel: 'high' },
  { id: 'somalia_mudug', name: 'Mudug', centroid: [47.8, 6.6], population: 720_000, needLevel: 'medium' },
  { id: 'somalia_galgaduud', name: 'Galgaduud', centroid: [46.8, 5.2], population: 570_000, needLevel: 'medium' },
  { id: 'somalia_nugaal', name: 'Nugaal', centroid: [49.8, 8.0], population: 390_000, needLevel: 'low' },
];

// -----------------------------------------------------------------------------
// Bangladesh: 10 regions
// -----------------------------------------------------------------------------

const BANGLADESH_REGIONS: Array<{ id: string; name: string; centroid: [number, number]; population: number; needLevel: 'low' | 'medium' | 'high' }> = [
  { id: 'bangladesh_dhaka', name: 'Dhaka Division', centroid: [90.4, 23.8], population: 36_500_000, needLevel: 'medium' },
  { id: 'bangladesh_chittagong', name: 'Chittagong Division', centroid: [91.8, 22.3], population: 28_400_000, needLevel: 'medium' },
  { id: 'bangladesh_coxs_bazar', name: "Cox's Bazar District", centroid: [92.0, 21.4], population: 2_300_000, needLevel: 'high' },
  { id: 'bangladesh_sylhet', name: 'Sylhet Division', centroid: [91.9, 24.9], population: 9_900_000, needLevel: 'medium' },
  { id: 'bangladesh_rajshahi', name: 'Rajshahi Division', centroid: [88.6, 24.4], population: 18_500_000, needLevel: 'medium' },
  { id: 'bangladesh_khulna', name: 'Khulna Division', centroid: [89.5, 22.8], population: 15_700_000, needLevel: 'medium' },
  { id: 'bangladesh_barishal', name: 'Barishal Division', centroid: [90.4, 22.7], population: 8_200_000, needLevel: 'high' },
  { id: 'bangladesh_rangpur', name: 'Rangpur Division', centroid: [89.3, 25.7], population: 15_800_000, needLevel: 'medium' },
  { id: 'bangladesh_mymensingh', name: 'Mymensingh Division', centroid: [90.4, 24.8], population: 11_400_000, needLevel: 'low' },
  { id: 'bangladesh_teknaf', name: 'Teknaf Upazila', centroid: [92.3, 20.9], population: 265_000, needLevel: 'high' },
];

// -----------------------------------------------------------------------------
// Yemen: 10 regions
// -----------------------------------------------------------------------------

const YEMEN_REGIONS: Array<{ id: string; name: string; centroid: [number, number]; population: number; needLevel: 'low' | 'medium' | 'high' }> = [
  { id: 'yemen_sanaa', name: "Sana'a Governorate", centroid: [44.2, 15.4], population: 3_900_000, needLevel: 'high' },
  { id: 'yemen_aden', name: 'Aden Governorate', centroid: [45.0, 12.8], population: 870_000, needLevel: 'high' },
  { id: 'yemen_taiz', name: 'Taiz Governorate', centroid: [44.0, 13.6], population: 2_900_000, needLevel: 'high' },
  { id: 'yemen_hodeidah', name: 'Hodeidah Governorate', centroid: [43.0, 14.8], population: 2_200_000, needLevel: 'high' },
  { id: 'yemen_hajjah', name: 'Hajjah Governorate', centroid: [43.6, 16.1], population: 1_900_000, needLevel: 'high' },
  { id: 'yemen_ibb', name: 'Ibb Governorate', centroid: [44.2, 14.0], population: 2_600_000, needLevel: 'medium' },
  { id: 'yemen_marib', name: 'Marib Governorate', centroid: [45.3, 15.5], population: 320_000, needLevel: 'high' },
  { id: 'yemen_lahij', name: 'Lahij Governorate', centroid: [44.9, 13.1], population: 990_000, needLevel: 'medium' },
  { id: 'yemen_abyan', name: 'Abyan Governorate', centroid: [46.0, 13.6], population: 530_000, needLevel: 'high' },
  { id: 'yemen_dhamar', name: 'Dhamar Governorate', centroid: [44.4, 14.5], population: 1_700_000, needLevel: 'medium' },
];

// -----------------------------------------------------------------------------
// South Sudan: 10 regions
// -----------------------------------------------------------------------------

const SOUTH_SUDAN_REGIONS: Array<{ id: string; name: string; centroid: [number, number]; population: number; needLevel: 'low' | 'medium' | 'high' }> = [
  { id: 'south_sudan_juba', name: 'Central Equatoria', centroid: [31.6, 4.9], population: 1_200_000, needLevel: 'high' },
  { id: 'south_sudan_unity', name: 'Unity State', centroid: [29.7, 8.5], population: 760_000, needLevel: 'high' },
  { id: 'south_sudan_upper_nile', name: 'Upper Nile', centroid: [32.5, 9.9], population: 860_000, needLevel: 'high' },
  { id: 'south_sudan_jonglei', name: 'Jonglei', centroid: [32.0, 7.0], population: 1_400_000, needLevel: 'high' },
  { id: 'south_sudan_lakes', name: 'Lakes', centroid: [30.2, 6.8], population: 690_000, needLevel: 'medium' },
  { id: 'south_sudan_warrap', name: 'Warrap', centroid: [28.6, 8.0], population: 970_000, needLevel: 'high' },
  { id: 'south_sudan_nbg', name: 'Northern Bahr el Ghazal', centroid: [27.0, 8.5], population: 820_000, needLevel: 'high' },
  { id: 'south_sudan_wbg', name: 'Western Bahr el Ghazal', centroid: [25.3, 8.8], population: 350_000, needLevel: 'medium' },
  { id: 'south_sudan_we', name: 'Western Equatoria', centroid: [28.2, 5.3], population: 620_000, needLevel: 'medium' },
  { id: 'south_sudan_ee', name: 'Eastern Equatoria', centroid: [33.4, 4.6], population: 910_000, needLevel: 'medium' },
];

// -----------------------------------------------------------------------------
// Organizations with website_url (official / OCHA FTS)
// -----------------------------------------------------------------------------

const ORGS: Array<{ id: string; name: string; type: string; website_url: string }> = [
  { id: 'org_wfp', name: 'World Food Programme', type: 'UN', website_url: 'https://www.wfp.org' },
  { id: 'org_unhcr', name: 'UNHCR', type: 'UN', website_url: 'https://www.unhcr.org' },
  { id: 'org_unicef', name: 'UNICEF', type: 'UN', website_url: 'https://www.unicef.org' },
  { id: 'org_who', name: 'World Health Organization', type: 'UN', website_url: 'https://www.who.int' },
  { id: 'org_icrc', name: 'ICRC', type: 'International', website_url: 'https://www.icrc.org' },
  { id: 'org_msf', name: 'Médecins Sans Frontières', type: 'International', website_url: 'https://www.msf.org' },
  { id: 'org_irc', name: 'International Rescue Committee', type: 'International', website_url: 'https://www.rescue.org' },
  { id: 'org_oxfam', name: 'Oxfam International', type: 'International', website_url: 'https://www.oxfam.org' },
  { id: 'org_care', name: 'CARE International', type: 'International', website_url: 'https://www.care.org' },
  { id: 'org_save', name: 'Save the Children', type: 'International', website_url: 'https://www.savethechildren.org' },
  { id: 'org_mercy', name: 'Mercy Corps', type: 'International', website_url: 'https://www.mercycorps.org' },
  { id: 'org_nrc', name: 'Norwegian Refugee Council', type: 'International', website_url: 'https://www.nrc.no' },
  { id: 'org_acted', name: 'ACTED', type: 'International', website_url: 'https://www.acted.org' },
  { id: 'org_iom', name: 'IOM', type: 'UN', website_url: 'https://www.iom.int' },
  { id: 'org_fao', name: 'FAO', type: 'UN', website_url: 'https://www.fao.org' },
  { id: 'org_undp', name: 'UNDP', type: 'UN', website_url: 'https://www.undp.org' },
  { id: 'org_wvi', name: 'World Vision International', type: 'International', website_url: 'https://www.wvi.org' },
  { id: 'org_crs', name: 'Catholic Relief Services', type: 'International', website_url: 'https://www.crs.org' },
  { id: 'org_drc', name: 'Danish Refugee Council', type: 'International', website_url: 'https://drc.ngo' },
  { id: 'org_hi', name: 'Humanity & Inclusion', type: 'International', website_url: 'https://www.hi.org' },
];

// -----------------------------------------------------------------------------
// Build regions array
// -----------------------------------------------------------------------------

interface RegionRow {
  id: string;
  countryId: string;
  name: string;
  centroid: [number, number];
  population: number;
  needLevel: 'low' | 'medium' | 'high';
}

function buildRegions(): RegionRow[] {
  const rows: RegionRow[] = [];
  const af = AFGHANISTAN_PROVINCES.map((r) => ({
    ...r,
    countryId: 'afghanistan',
  }));
  const so = SOMALIA_REGIONS.map((r) => ({ ...r, countryId: 'somalia' }));
  const bd = BANGLADESH_REGIONS.map((r) => ({ ...r, countryId: 'bangladesh' }));
  const ye = YEMEN_REGIONS.map((r) => ({ ...r, countryId: 'yemen' }));
  const ss = SOUTH_SUDAN_REGIONS.map((r) => ({ ...r, countryId: 'south_sudan' }));
  return [...so, ...bd, ...ye, ...ss, ...af];
}

// -----------------------------------------------------------------------------
// Aid edges: realistic density across all regions
// -----------------------------------------------------------------------------

const AID_TYPES = ['food', 'medical', 'infrastructure'] as const;

function generateAidEdges(rng: SeededRandom, regions: RegionRow[]): Array<{
  id: string;
  orgId: string;
  regionId: string;
  aidType: 'food' | 'medical' | 'infrastructure';
  projectCount: number;
  isSynthetic: boolean;
  source: string;
}> {
  const edges: Array<{
    id: string;
    orgId: string;
    regionId: string;
    aidType: 'food' | 'medical' | 'infrastructure';
    projectCount: number;
    isSynthetic: boolean;
    source: string;
  }> = [];
  let edgeId = 0;

  for (const region of regions) {
    const numOrgs = region.needLevel === 'high'
      ? rng.nextInt(4, 8)
      : region.needLevel === 'medium'
      ? rng.nextInt(2, 6)
      : rng.nextInt(1, 4);
    const selected = new Set<string>();
    while (selected.size < Math.min(numOrgs, ORGS.length)) {
      selected.add(rng.pick(ORGS).id);
    }

    for (const orgId of selected) {
      const baseProjects = region.needLevel === 'high' ? rng.nextInt(2, 18) : rng.nextInt(1, 12);
      edges.push({
        id: `e${(++edgeId).toString().padStart(4, '0')}`,
        orgId,
        regionId: region.id,
        aidType: rng.pick([...AID_TYPES]),
        projectCount: baseProjects,
        isSynthetic: true,
        source: 'generateSyntheticData',
      });
    }
  }

  return edges;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const rng = new SeededRandom(42);
  const regions = buildRegions();
  const edges = generateAidEdges(rng, regions);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'countries.json'),
    JSON.stringify(COUNTRIES, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'regions.json'),
    JSON.stringify(regions, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'orgs.json'),
    JSON.stringify(ORGS, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'aid_edges.json'),
    JSON.stringify(edges, null, 2)
  );

  const afCount = regions.filter((r) => r.countryId === 'afghanistan').length;
  console.log('Generated:');
  console.log('  Countries:', COUNTRIES.length);
  console.log('  Regions:', regions.length, `(Afghanistan: ${afCount} provinces)`);
  console.log('  Organizations:', ORGS.length);
  console.log('  Aid edges:', edges.length);
  console.log('Written to', OUTPUT_DIR);
}

main().catch(console.error);
