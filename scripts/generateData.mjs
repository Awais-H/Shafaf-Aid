/**
 * Shafaf Aid 2.0 - Synthetic Data Generator
 * Run: node scripts/generateData.mjs
 * 
 * Features:
 * - 7-country coverage: Afghanistan, Somalia, Bangladesh, Yemen, South Sudan, Ukraine, Palestine
 * - Ukraine (oblast-level), Palestine (Gaza + West Bank governorates)
 * - Volatility, IPC, conflict events; Gaza = very high need/volatility, low coverage
 */
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('./src/data');

class Rng {
  constructor(seed) { this.s = seed; }
  next() {
    this.s = (this.s * 1103515245 + 12345) & 0x7fffffff;
    return this.s / 0x7fffffff;
  }
  int(a, b) { return Math.floor(this.next() * (b - a + 1)) + a; }
  float(a, b) { return a + this.next() * (b - a); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}

// Volatility score calculation based on need level and conflict
function calcVolatility(needLevel, rng) {
  const base = needLevel === 'high' ? 0.7 : needLevel === 'medium' ? 0.4 : 0.2;
  return Math.min(1, Math.max(0, base + rng.float(-0.15, 0.15)));
}

// Dynamic need factor based on volatility
function dynamicNeedFactor(needLevel, volatility) {
  const baseFactor = needLevel === 'high' ? 1.3 : needLevel === 'medium' ? 1.0 : 0.8;
  return baseFactor * (1 + volatility * 0.3);
}

// IPC Phase based on need level and volatility
function calcIPCPhase(needLevel, volatility) {
  if (needLevel === 'high' && volatility > 0.6) return 'Phase 5';
  if (needLevel === 'high') return 'Phase 4';
  if (needLevel === 'medium' && volatility > 0.5) return 'Phase 4';
  if (needLevel === 'medium') return 'Phase 3';
  return 'Phase 2';
}

// Conflict events based on volatility
function calcConflictEvents(volatility, population, rng) {
  const baseEvents = Math.floor(volatility * 300);
  const popFactor = Math.log10(population / 100000) * 20;
  return Math.max(0, Math.floor(baseEvents + popFactor + rng.int(-30, 30)));
}

const COUNTRIES = [
  { id: 'somalia', name: 'Somalia', iso2: 'SO', curated: true, centroid: [45.0, 6.0] },
  { id: 'bangladesh', name: 'Bangladesh', iso2: 'BD', curated: true, centroid: [90.0, 24.0] },
  { id: 'yemen', name: 'Yemen', iso2: 'YE', curated: true, centroid: [48.0, 15.5] },
  { id: 'south_sudan', name: 'South Sudan', iso2: 'SS', curated: true, centroid: [30.0, 7.0] },
  { id: 'afghanistan', name: 'Afghanistan', iso2: 'AF', curated: true, centroid: [66.0, 33.0] },
  { id: 'ukraine', name: 'Ukraine', iso2: 'UA', curated: true, centroid: [31.5, 49.0] },
  { id: 'palestine', name: 'Palestine', iso2: 'PS', curated: true, centroid: [35.2, 31.9] },
];

const AF = [
  { id: 'afghanistan_badakhshan', name: 'Badakhshan Province', centroid: [70.8, 36.7], population: 920000, needLevel: 'high' },
  { id: 'afghanistan_badghis', name: 'Badghis Province', centroid: [63.8, 35.0], population: 520000, needLevel: 'high' },
  { id: 'afghanistan_baghlan', name: 'Baghlan Province', centroid: [68.8, 36.1], population: 950000, needLevel: 'medium' },
  { id: 'afghanistan_balkh', name: 'Balkh Province', centroid: [66.9, 36.8], population: 1400000, needLevel: 'medium' },
  { id: 'afghanistan_bamyan', name: 'Bamyan Province', centroid: [67.8, 34.8], population: 490000, needLevel: 'medium' },
  { id: 'afghanistan_daykundi', name: 'Daykundi Province', centroid: [66.0, 33.5], population: 450000, needLevel: 'high' },
  { id: 'afghanistan_farah', name: 'Farah Province', centroid: [62.1, 32.4], population: 510000, needLevel: 'high' },
  { id: 'afghanistan_faryab', name: 'Faryab Province', centroid: [64.9, 36.1], population: 1030000, needLevel: 'medium' },
  { id: 'afghanistan_ghazni', name: 'Ghazni Province', centroid: [68.4, 33.5], population: 1350000, needLevel: 'high' },
  { id: 'afghanistan_ghor', name: 'Ghor Province', centroid: [64.9, 34.5], population: 740000, needLevel: 'high' },
  { id: 'afghanistan_helmand', name: 'Helmand Province', centroid: [64.4, 31.6], population: 960000, needLevel: 'high' },
  { id: 'afghanistan_herat', name: 'Herat Province', centroid: [62.2, 34.3], population: 2000000, needLevel: 'medium' },
  { id: 'afghanistan_jowzjan', name: 'Jowzjan Province', centroid: [65.7, 36.8], population: 580000, needLevel: 'medium' },
  { id: 'afghanistan_kabul', name: 'Kabul Province', centroid: [69.2, 34.5], population: 4600000, needLevel: 'high' },
  { id: 'afghanistan_kandahar', name: 'Kandahar Province', centroid: [65.7, 31.6], population: 1300000, needLevel: 'high' },
  { id: 'afghanistan_kapisa', name: 'Kapisa Province', centroid: [69.6, 35.0], population: 450000, needLevel: 'medium' },
  { id: 'afghanistan_khost', name: 'Khost Province', centroid: [69.9, 33.3], population: 590000, needLevel: 'high' },
  { id: 'afghanistan_kunar', name: 'Kunar Province', centroid: [71.1, 35.0], population: 450000, needLevel: 'high' },
  { id: 'afghanistan_kunduz', name: 'Kunduz Province', centroid: [68.9, 36.7], population: 1050000, needLevel: 'high' },
  { id: 'afghanistan_laghman', name: 'Laghman Province', centroid: [70.2, 34.7], population: 445000, needLevel: 'medium' },
  { id: 'afghanistan_logar', name: 'Logar Province', centroid: [69.2, 34.0], population: 390000, needLevel: 'high' },
  { id: 'afghanistan_nangarhar', name: 'Nangarhar Province', centroid: [70.6, 34.2], population: 1600000, needLevel: 'high' },
  { id: 'afghanistan_nimroz', name: 'Nimroz Province', centroid: [62.2, 31.0], population: 165000, needLevel: 'medium' },
  { id: 'afghanistan_nuristan', name: 'Nuristan Province', centroid: [70.9, 35.3], population: 150000, needLevel: 'high' },
  { id: 'afghanistan_paktika', name: 'Paktika Province', centroid: [68.8, 32.5], population: 430000, needLevel: 'high' },
  { id: 'afghanistan_paktia', name: 'Paktia Province', centroid: [69.5, 33.6], population: 590000, needLevel: 'high' },
  { id: 'afghanistan_panjshir', name: 'Panjshir Province', centroid: [69.7, 35.4], population: 155000, needLevel: 'medium' },
  { id: 'afghanistan_parwan', name: 'Parwan Province', centroid: [69.2, 35.0], population: 700000, needLevel: 'medium' },
  { id: 'afghanistan_samangan', name: 'Samangan Province', centroid: [67.9, 36.3], population: 380000, needLevel: 'medium' },
  { id: 'afghanistan_sar_e_pol', name: 'Sar-e Pol Province', centroid: [66.0, 36.0], population: 550000, needLevel: 'high' },
  { id: 'afghanistan_takhar', name: 'Takhar Province', centroid: [69.8, 36.7], population: 1000000, needLevel: 'high' },
  { id: 'afghanistan_uruzgan', name: 'Uruzgan Province', centroid: [66.0, 32.9], population: 390000, needLevel: 'high' },
  { id: 'afghanistan_wardak', name: 'Wardak Province', centroid: [68.4, 34.2], population: 600000, needLevel: 'high' },
  { id: 'afghanistan_zabul', name: 'Zabul Province', centroid: [67.2, 32.1], population: 300000, needLevel: 'high' },
].map((r) => ({ ...r, countryId: 'afghanistan' }));

const SO = [
  { id: 'somalia_banadir', name: 'Banadir (Mogadishu)', centroid: [45.3, 2.0], population: 2500000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_bay', name: 'Bay', centroid: [43.6, 2.8], population: 800000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_gedo', name: 'Gedo', centroid: [42.0, 3.5], population: 550000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_hiraan', name: 'Hiraan', centroid: [45.5, 4.3], population: 520000, needLevel: 'medium', countryId: 'somalia' },
  { id: 'somalia_lower_juba', name: 'Lower Juba', centroid: [42.1, 0.5], population: 490000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_middle_juba', name: 'Middle Juba', centroid: [42.5, 2.0], population: 370000, needLevel: 'medium', countryId: 'somalia' },
  { id: 'somalia_lower_shabelle', name: 'Lower Shabelle', centroid: [44.5, 1.8], population: 1200000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_middle_shabelle', name: 'Middle Shabelle', centroid: [45.9, 2.8], population: 520000, needLevel: 'medium', countryId: 'somalia' },
  { id: 'somalia_bakool', name: 'Bakool', centroid: [44.1, 4.4], population: 310000, needLevel: 'high', countryId: 'somalia' },
  { id: 'somalia_mudug', name: 'Mudug', centroid: [47.8, 6.6], population: 720000, needLevel: 'medium', countryId: 'somalia' },
  { id: 'somalia_galgaduud', name: 'Galgaduud', centroid: [46.8, 5.2], population: 570000, needLevel: 'medium', countryId: 'somalia' },
  { id: 'somalia_nugaal', name: 'Nugaal', centroid: [49.8, 8.0], population: 390000, needLevel: 'low', countryId: 'somalia' },
];

const BD = [
  { id: 'bangladesh_dhaka', name: 'Dhaka Division', centroid: [90.4, 23.8], population: 36500000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_chittagong', name: 'Chittagong Division', centroid: [91.8, 22.3], population: 28400000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_coxs_bazar', name: "Cox's Bazar District", centroid: [92.0, 21.4], population: 2300000, needLevel: 'high', countryId: 'bangladesh' },
  { id: 'bangladesh_sylhet', name: 'Sylhet Division', centroid: [91.9, 24.9], population: 9900000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_rajshahi', name: 'Rajshahi Division', centroid: [88.6, 24.4], population: 18500000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_khulna', name: 'Khulna Division', centroid: [89.5, 22.8], population: 15700000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_barishal', name: 'Barishal Division', centroid: [90.4, 22.7], population: 8200000, needLevel: 'high', countryId: 'bangladesh' },
  { id: 'bangladesh_rangpur', name: 'Rangpur Division', centroid: [89.3, 25.7], population: 15800000, needLevel: 'medium', countryId: 'bangladesh' },
  { id: 'bangladesh_mymensingh', name: 'Mymensingh Division', centroid: [90.4, 24.8], population: 11400000, needLevel: 'low', countryId: 'bangladesh' },
  { id: 'bangladesh_teknaf', name: 'Teknaf Upazila', centroid: [92.3, 20.9], population: 265000, needLevel: 'high', countryId: 'bangladesh' },
];

const YE = [
  { id: 'yemen_sanaa', name: "Sana'a Governorate", centroid: [44.2, 15.4], population: 3900000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_aden', name: 'Aden Governorate', centroid: [45.0, 12.8], population: 870000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_taiz', name: 'Taiz Governorate', centroid: [44.0, 13.6], population: 2900000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_hodeidah', name: 'Hodeidah Governorate', centroid: [43.0, 14.8], population: 2200000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_hajjah', name: 'Hajjah Governorate', centroid: [43.6, 16.1], population: 1900000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_ibb', name: 'Ibb Governorate', centroid: [44.2, 14.0], population: 2600000, needLevel: 'medium', countryId: 'yemen' },
  { id: 'yemen_marib', name: 'Marib Governorate', centroid: [45.3, 15.5], population: 320000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_lahij', name: 'Lahij Governorate', centroid: [44.9, 13.1], population: 990000, needLevel: 'medium', countryId: 'yemen' },
  { id: 'yemen_abyan', name: 'Abyan Governorate', centroid: [46.0, 13.6], population: 530000, needLevel: 'high', countryId: 'yemen' },
  { id: 'yemen_dhamar', name: 'Dhamar Governorate', centroid: [44.4, 14.5], population: 1700000, needLevel: 'medium', countryId: 'yemen' },
];

const SS = [
  { id: 'south_sudan_juba', name: 'Central Equatoria', centroid: [31.6, 4.9], population: 1200000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_unity', name: 'Unity State', centroid: [29.7, 8.5], population: 760000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_upper_nile', name: 'Upper Nile', centroid: [32.5, 9.9], population: 860000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_jonglei', name: 'Jonglei', centroid: [32.0, 7.0], population: 1400000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_lakes', name: 'Lakes', centroid: [30.2, 6.8], population: 690000, needLevel: 'medium', countryId: 'south_sudan' },
  { id: 'south_sudan_warrap', name: 'Warrap', centroid: [28.6, 8.0], population: 970000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_nbg', name: 'Northern Bahr el Ghazal', centroid: [27.0, 8.5], population: 820000, needLevel: 'high', countryId: 'south_sudan' },
  { id: 'south_sudan_wbg', name: 'Western Bahr el Ghazal', centroid: [25.3, 8.8], population: 350000, needLevel: 'medium', countryId: 'south_sudan' },
  { id: 'south_sudan_we', name: 'Western Equatoria', centroid: [28.2, 5.3], population: 620000, needLevel: 'medium', countryId: 'south_sudan' },
  { id: 'south_sudan_ee', name: 'Eastern Equatoria', centroid: [33.4, 4.6], population: 910000, needLevel: 'medium', countryId: 'south_sudan' },
];

// Ukraine – oblast-level (eastern = high volatility, conflict)
const UA = [
  { id: 'ukraine_kyiv', name: 'Kyiv Oblast', centroid: [30.5, 50.4], population: 1800000, needLevel: 'medium', countryId: 'ukraine' },
  { id: 'ukraine_kharkiv', name: 'Kharkiv Oblast', centroid: [36.2, 49.9], population: 2700000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_donetsk', name: 'Donetsk Oblast', centroid: [37.8, 48.0], population: 4200000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_luhansk', name: 'Luhansk Oblast', centroid: [39.3, 48.5], population: 2100000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_zaporizhzhia', name: 'Zaporizhzhia Oblast', centroid: [35.1, 47.8], population: 1700000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_kherson', name: 'Kherson Oblast', centroid: [32.6, 46.6], population: 1000000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_odesa', name: 'Odesa Oblast', centroid: [30.7, 46.5], population: 2400000, needLevel: 'medium', countryId: 'ukraine' },
  { id: 'ukraine_dnipro', name: 'Dnipropetrovsk Oblast', centroid: [35.0, 48.5], population: 3200000, needLevel: 'medium', countryId: 'ukraine' },
  { id: 'ukraine_lviv', name: 'Lviv Oblast', centroid: [23.9, 49.8], population: 2500000, needLevel: 'low', countryId: 'ukraine' },
  { id: 'ukraine_mykolaiv', name: 'Mykolaiv Oblast', centroid: [31.9, 46.9], population: 1100000, needLevel: 'high', countryId: 'ukraine' },
  { id: 'ukraine_chernihiv', name: 'Chernihiv Oblast', centroid: [31.3, 51.5], population: 1000000, needLevel: 'medium', countryId: 'ukraine' },
  { id: 'ukraine_sumy', name: 'Sumy Oblast', centroid: [33.5, 50.9], population: 1100000, needLevel: 'medium', countryId: 'ukraine' },
];

// Palestine – Gaza (very high need, volatility, low coverage) + West Bank governorates
const PS_GAZA = [
  { id: 'palestine_north_gaza', name: 'North Gaza', centroid: [34.5, 31.55], population: 360000, needLevel: 'high', countryId: 'palestine', volatilityOverride: 0.95, conflictOverride: 420 },
  { id: 'palestine_gaza_city', name: 'Gaza City', centroid: [34.47, 31.5], population: 590000, needLevel: 'high', countryId: 'palestine', volatilityOverride: 0.97, conflictOverride: 520 },
  { id: 'palestine_deir_balah', name: 'Deir al-Balah', centroid: [34.35, 31.42], population: 280000, needLevel: 'high', countryId: 'palestine', volatilityOverride: 0.94, conflictOverride: 380 },
  { id: 'palestine_khan_younis', name: 'Khan Younis', centroid: [34.3, 31.35], population: 380000, needLevel: 'high', countryId: 'palestine', volatilityOverride: 0.96, conflictOverride: 450 },
  { id: 'palestine_rafah', name: 'Rafah', centroid: [34.25, 31.3], population: 240000, needLevel: 'high', countryId: 'palestine', volatilityOverride: 0.98, conflictOverride: 410 },
];
const PS_WB = [
  { id: 'palestine_ramallah', name: 'Ramallah & al-Bireh', centroid: [35.2, 31.9], population: 350000, needLevel: 'medium', countryId: 'palestine' },
  { id: 'palestine_nablus', name: 'Nablus', centroid: [35.26, 32.22], population: 380000, needLevel: 'high', countryId: 'palestine' },
  { id: 'palestine_hebron', name: 'Hebron', centroid: [35.1, 31.53], population: 700000, needLevel: 'high', countryId: 'palestine' },
  { id: 'palestine_jenin', name: 'Jenin', centroid: [35.3, 32.46], population: 320000, needLevel: 'high', countryId: 'palestine' },
  { id: 'palestine_bethlehem', name: 'Bethlehem', centroid: [35.2, 31.7], population: 220000, needLevel: 'medium', countryId: 'palestine' },
  { id: 'palestine_jericho', name: 'Jericho', centroid: [35.45, 31.86], population: 52000, needLevel: 'low', countryId: 'palestine' },
  { id: 'palestine_tulkarm', name: 'Tulkarm', centroid: [35.03, 32.31], population: 190000, needLevel: 'medium', countryId: 'palestine' },
  { id: 'palestine_qalqilya', name: 'Qalqilya', centroid: [34.97, 32.19], population: 110000, needLevel: 'medium', countryId: 'palestine' },
];
const PS = [...PS_GAZA, ...PS_WB];

const REGIONS = [...SO, ...BD, ...YE, ...SS, ...AF, ...UA, ...PS];

// Country-specific deep links for organizations
const COUNTRY_DEEPLINKS = {
  afghanistan: {
    org_wfp: 'https://www.wfp.org/countries/afghanistan',
    org_unhcr: 'https://www.unhcr.org/afghanistan.html',
    org_unicef: 'https://www.unicef.org/afghanistan',
    org_who: 'https://www.emro.who.int/afg/afghanistan-news/',
    org_icrc: 'https://www.icrc.org/en/where-we-work/asia-pacific/afghanistan',
    org_msf: 'https://www.msf.org/afghanistan',
    org_irc: 'https://www.rescue.org/country/afghanistan',
  },
  somalia: {
    org_wfp: 'https://www.wfp.org/countries/somalia',
    org_unhcr: 'https://www.unhcr.org/somalia.html',
    org_unicef: 'https://www.unicef.org/somalia',
    org_icrc: 'https://www.icrc.org/en/where-we-work/africa/somalia',
    org_msf: 'https://www.msf.org/somalia',
    org_irc: 'https://www.rescue.org/country/somalia',
  },
  yemen: {
    org_wfp: 'https://www.wfp.org/countries/yemen',
    org_unhcr: 'https://www.unhcr.org/yemen.html',
    org_unicef: 'https://www.unicef.org/yemen',
    org_icrc: 'https://www.icrc.org/en/where-we-work/middle-east/yemen',
    org_msf: 'https://www.msf.org/yemen',
    org_irc: 'https://www.rescue.org/country/yemen',
  },
  bangladesh: {
    org_wfp: 'https://www.wfp.org/countries/bangladesh',
    org_unhcr: 'https://www.unhcr.org/bangladesh.html',
    org_unicef: 'https://www.unicef.org/bangladesh',
    org_irc: 'https://www.rescue.org/country/bangladesh',
  },
  south_sudan: {
    org_wfp: 'https://www.wfp.org/countries/south-sudan',
    org_unhcr: 'https://www.unhcr.org/south-sudan.html',
    org_unicef: 'https://www.unicef.org/southsudan',
    org_icrc: 'https://www.icrc.org/en/where-we-work/africa/south-sudan',
    org_msf: 'https://www.msf.org/south-sudan',
    org_irc: 'https://www.rescue.org/country/south-sudan',
  },
  ukraine: {
    org_wfp: 'https://www.wfp.org/countries/ukraine',
    org_unhcr: 'https://www.unhcr.org/ukraine.html',
    org_unicef: 'https://www.unicef.org/ukraine',
    org_icrc: 'https://www.icrc.org/en/where-we-work/europe-central-asia/ukraine',
    org_msf: 'https://www.msf.org/ukraine',
    org_irc: 'https://www.rescue.org/country/ukraine',
  },
  palestine: {
    org_wfp: 'https://www.wfp.org/countries/palestine',
    org_unhcr: 'https://www.unhcr.org/palestine.html',
    org_unicef: 'https://www.unicef.org/oPt',
    org_icrc: 'https://www.icrc.org/en/where-we-work/middle-east/israel-and-occupied-territories',
    org_msf: 'https://www.msf.org/palestine',
    org_irc: 'https://www.rescue.org/country/palestine',
  },
};

const ORGS = [
  { 
    id: 'org_wfp', 
    name: 'World Food Programme', 
    type: 'UN', 
    website_url: 'https://www.wfp.org',
    logo_url: 'https://cdn.wfp.org/logos/wfp-logo-standard-blue-en.png',
  },
  { 
    id: 'org_unhcr', 
    name: 'UNHCR', 
    type: 'UN', 
    website_url: 'https://www.unhcr.org',
    logo_url: 'https://www.unhcr.org/sites/all/themes/developer_starter_kit/logo.png',
  },
  { 
    id: 'org_unicef', 
    name: 'UNICEF', 
    type: 'UN', 
    website_url: 'https://www.unicef.org',
    logo_url: 'https://www.unicef.org/sites/default/files/unicef-logo-og.png',
  },
  { 
    id: 'org_who', 
    name: 'World Health Organization', 
    type: 'UN', 
    website_url: 'https://www.who.int',
    logo_url: 'https://www.who.int/images/default-source/fallback/who-logo.png',
  },
  { 
    id: 'org_icrc', 
    name: 'ICRC', 
    type: 'International', 
    website_url: 'https://www.icrc.org',
    logo_url: 'https://www.icrc.org/sites/default/files/icrc_logo.png',
  },
  { 
    id: 'org_msf', 
    name: 'Médecins Sans Frontières', 
    type: 'International', 
    website_url: 'https://www.msf.org',
    logo_url: 'https://www.msf.org/themes/custom/msf/logo.svg',
  },
  { 
    id: 'org_irc', 
    name: 'International Rescue Committee', 
    type: 'International', 
    website_url: 'https://www.rescue.org',
    logo_url: 'https://www.rescue.org/sites/default/files/irc_logo.png',
  },
  { 
    id: 'org_oxfam', 
    name: 'Oxfam International', 
    type: 'International', 
    website_url: 'https://www.oxfam.org',
    logo_url: 'https://www.oxfam.org/sites/default/files/oxfam_logo.png',
  },
  { 
    id: 'org_care', 
    name: 'CARE International', 
    type: 'International', 
    website_url: 'https://www.care.org',
    logo_url: 'https://www.care.org/wp-content/uploads/2020/05/CARE-logo.png',
  },
  { 
    id: 'org_save', 
    name: 'Save the Children', 
    type: 'International', 
    website_url: 'https://www.savethechildren.org',
    logo_url: 'https://www.savethechildren.org/content/dam/global/images/logos/stc-logo.png',
  },
  { 
    id: 'org_mercy', 
    name: 'Mercy Corps', 
    type: 'International', 
    website_url: 'https://www.mercycorps.org',
    logo_url: 'https://www.mercycorps.org/sites/default/files/mercy_corps_logo.png',
  },
  { 
    id: 'org_nrc', 
    name: 'Norwegian Refugee Council', 
    type: 'International', 
    website_url: 'https://www.nrc.no',
    logo_url: 'https://www.nrc.no/globalassets/nrc-logo.png',
  },
  { 
    id: 'org_acted', 
    name: 'ACTED', 
    type: 'International', 
    website_url: 'https://www.acted.org',
    logo_url: 'https://www.acted.org/wp-content/uploads/2020/01/acted-logo.png',
  },
  { 
    id: 'org_iom', 
    name: 'IOM', 
    type: 'UN', 
    website_url: 'https://www.iom.int',
    logo_url: 'https://www.iom.int/sites/default/files/iom_logo.png',
  },
  { 
    id: 'org_fao', 
    name: 'FAO', 
    type: 'UN', 
    website_url: 'https://www.fao.org',
    logo_url: 'https://www.fao.org/images/corporatelibraries/fao-logo/fao-logo-en.png',
  },
  { 
    id: 'org_undp', 
    name: 'UNDP', 
    type: 'UN', 
    website_url: 'https://www.undp.org',
    logo_url: 'https://www.undp.org/sites/g/files/zskgke326/files/undp-logo.png',
  },
  { 
    id: 'org_wvi', 
    name: 'World Vision International', 
    type: 'International', 
    website_url: 'https://www.wvi.org',
    logo_url: 'https://www.wvi.org/sites/default/files/wv-logo.png',
  },
  { 
    id: 'org_crs', 
    name: 'Catholic Relief Services', 
    type: 'International', 
    website_url: 'https://www.crs.org',
    logo_url: 'https://www.crs.org/sites/default/files/crs-logo.png',
  },
  { 
    id: 'org_drc', 
    name: 'Danish Refugee Council', 
    type: 'International', 
    website_url: 'https://drc.ngo',
    logo_url: 'https://drc.ngo/media/jvvn5zqz/drc-logo.png',
  },
  { 
    id: 'org_hi', 
    name: 'Humanity & Inclusion', 
    type: 'International', 
    website_url: 'https://www.hi.org',
    logo_url: 'https://www.hi.org/sn_uploads/federation/hi-logo.png',
  },
];

const AID = ['food', 'medical', 'infrastructure'];

// Gaza region IDs (very high need, low coverage)
const GAZA_IDS = new Set(['palestine_north_gaza', 'palestine_gaza_city', 'palestine_deir_balah', 'palestine_khan_younis', 'palestine_rafah']);

// Enhance regions with volatility, IPC phase, and conflict events
function enhanceRegions(regions) {
  const rng = new Rng(123);
  return regions.map(r => {
    const volatility = r.volatilityOverride ?? calcVolatility(r.needLevel, rng);
    const ipcPhase = GAZA_IDS.has(r.id) ? 'Phase 5' : calcIPCPhase(r.needLevel, volatility);
    const conflictEvents = r.conflictOverride ?? calcConflictEvents(volatility, r.population, rng);
    const dynamicNeed = dynamicNeedFactor(r.needLevel, volatility);
    const out = {
      ...r,
      volatility: Math.round(volatility * 100) / 100,
      ipcPhase,
      conflictEvents,
      dynamicNeedFactor: Math.round(dynamicNeed * 100) / 100,
    };
    delete out.volatilityOverride;
    delete out.conflictOverride;
    return out;
  });
}

function genEdges(enhancedRegions) {
  const rng = new Rng(42);
  const edges = [];
  let eid = 0;

  for (const r of enhancedRegions) {
    const isGaza = GAZA_IDS.has(r.id);
    // Gaza: very low coverage (humanitarian crisis) – few orgs, few projects
    let numOrgs;
    let projectBase;
    if (isGaza) {
      numOrgs = Math.min(ORGS.length, rng.int(1, 3));
      projectBase = rng.int(2, 6);
    } else {
      const volatilityFactor = 1 + r.volatility * 0.5;
      const baseOrgs = r.needLevel === 'high' ? 6 : r.needLevel === 'medium' ? 4 : 2;
      numOrgs = Math.min(ORGS.length, Math.floor(baseOrgs * volatilityFactor) + rng.int(-1, 2));
      projectBase = r.needLevel === 'high' ? 15 : r.needLevel === 'medium' ? 10 : 6;
    }

    const picked = new Set();
    while (picked.size < numOrgs) {
      picked.add(rng.pick(ORGS).id);
    }

    for (const oid of picked) {
      const projects = isGaza
        ? Math.max(1, projectBase + rng.int(-1, 2))
        : Math.max(1, Math.floor(projectBase * (1 - r.volatility * 0.3) + rng.int(-3, 5)));

      edges.push({
        id: 'e' + String(++eid).padStart(4, '0'),
        orgId: oid,
        regionId: r.id,
        aidType: rng.pick(AID),
        projectCount: projects,
        isSynthetic: true,
        source: 'shafaf-aid-2.0',
      });
    }
  }
  return edges;
}

// Generate enhanced data
const enhancedRegions = enhanceRegions(REGIONS);
const edges = genEdges(enhancedRegions);

// Create output directory
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Write files
fs.writeFileSync(path.join(OUT, 'countries.json'), JSON.stringify(COUNTRIES, null, 2));
fs.writeFileSync(path.join(OUT, 'regions.json'), JSON.stringify(enhancedRegions, null, 2));
fs.writeFileSync(path.join(OUT, 'orgs.json'), JSON.stringify(ORGS, null, 2));
fs.writeFileSync(path.join(OUT, 'aid_edges.json'), JSON.stringify(edges, null, 2));

// Also write a manifest for lazy loading
const manifest = {
  version: '2.0',
  generated: new Date().toISOString(),
  stats: {
    countries: COUNTRIES.length,
    regions: enhancedRegions.length,
    organizations: ORGS.length,
    aidEdges: edges.length,
  },
  files: {
    countries: 'countries.json',
    regions: 'regions.json',
    organizations: 'orgs.json',
    aidEdges: 'aid_edges.json',
  },
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('Shafaf Aid 2.0 Data Generation Complete:');
console.log(`  Countries: ${COUNTRIES.length}`);
console.log(`  Regions: ${enhancedRegions.length}`);
console.log(`  Organizations: ${ORGS.length}`);
console.log(`  Aid Edges: ${edges.length}`);
console.log(`  Manifest: manifest.json`);
