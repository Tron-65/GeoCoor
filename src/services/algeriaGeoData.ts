/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AlgeriaLocationPreset {
  id: string;
  name: string;
  nameAr?: string;
  type: 'oil_field' | 'gas_field' | 'mining' | 'wilaya' | 'datum_origin' | 'survey_station';
  region: 'Sahara Central' | 'Sahara Est' | 'Sahara Ouest' | 'Hauts Plateaux' | 'Nord';
  lat: number;
  lon: number;
  elevationMeters: number;
  primaryUtmZone: 29 | 30 | 31 | 32;
  primaryLambert: 'Nord' | 'Sud' | 'Sahara';
  description: string;
}

export const ALGERIA_FIELD_PRESETS: AlgeriaLocationPreset[] = [
  {
    id: 'hassi_messaoud',
    name: 'Hassi Messaoud (MD-1 Discovery Well)',
    nameAr: 'حاسي مسعود',
    type: 'oil_field',
    region: 'Sahara Central',
    lat: 31.9314,
    lon: 5.0682,
    elevationMeters: 152,
    primaryUtmZone: 31,
    primaryLambert: 'Sud',
    description: "Algeria's largest oil field and epicenter of petroleum geodesy in the Sahara.",
  },
  {
    id: 'in_amenas',
    name: 'In Amenas (Tiguentourine Gas Complex)',
    nameAr: 'إن أمناس',
    type: 'gas_field',
    region: 'Sahara Est',
    lat: 27.9167,
    lon: 9.1500,
    elevationMeters: 558,
    primaryUtmZone: 32,
    primaryLambert: 'Sahara',
    description: 'Major wet gas development hub in the Illizi Basin near the Libyan border.',
  },
  {
    id: 'hassi_rmel',
    name: "Hassi R'Mel Super-Giant Gas Hub",
    nameAr: 'حاسي الرمل',
    type: 'gas_field',
    region: 'Hauts Plateaux',
    lat: 32.9300,
    lon: 3.2750,
    elevationMeters: 760,
    primaryUtmZone: 31,
    primaryLambert: 'Sud',
    description: 'One of the world’s largest natural gas fields, pipeline dispatch center.',
  },
  {
    id: 'ourhoud',
    name: 'Ourhoud Field (Block 404 / Berkine)',
    nameAr: 'حقل أورهود',
    type: 'oil_field',
    region: 'Sahara Est',
    lat: 31.4333,
    lon: 6.7833,
    elevationMeters: 240,
    primaryUtmZone: 32,
    primaryLambert: 'Sud',
    description: 'Second largest crude oil field in Algeria situated in the Berkine Basin.',
  },
  {
    id: 'el_merk',
    name: 'El Merk Oil Field (Block 208)',
    nameAr: 'حقل المرء',
    type: 'oil_field',
    region: 'Sahara Est',
    lat: 30.9850,
    lon: 8.8500,
    elevationMeters: 295,
    primaryUtmZone: 32,
    primaryLambert: 'Sahara',
    description: 'Ultra-modern central processing facility for deep desert reservoirs.',
  },
  {
    id: 'rhourde_el_baguel',
    name: 'Rhourde El Baguel (REB)',
    nameAr: 'رورد البغل',
    type: 'oil_field',
    region: 'Sahara Central',
    lat: 31.7850,
    lon: 5.5180,
    elevationMeters: 135,
    primaryUtmZone: 31,
    primaryLambert: 'Sud',
    description: 'Major reservoir east of Hassi Messaoud under miscible gas injection.',
  },
  {
    id: 'rhourde_nouss',
    name: 'Rhourde Nouss Gas & Condensate',
    nameAr: 'رورد النوس',
    type: 'gas_field',
    region: 'Sahara Est',
    lat: 30.6800,
    lon: 6.6400,
    elevationMeters: 260,
    primaryUtmZone: 32,
    primaryLambert: 'Sahara',
    description: 'Large triassic gas field in the desert dunes southeast of Ouargla.',
  },
  {
    id: 'in_salah',
    name: 'In Salah Gas (Krechba / Ahnet)',
    nameAr: 'عين صالح',
    type: 'gas_field',
    region: 'Sahara Central',
    lat: 27.2000,
    lon: 2.4600,
    elevationMeters: 273,
    primaryUtmZone: 31,
    primaryLambert: 'Sahara',
    description: 'Pioneering carbon capture and storage (CCS) gas production complex.',
  },
  {
    id: 'reggane',
    name: 'Reggane Nord Gas Perimeter',
    nameAr: 'رقان الشمالي',
    type: 'gas_field',
    region: 'Sahara Ouest',
    lat: 26.7167,
    lon: 0.1667,
    elevationMeters: 217,
    primaryUtmZone: 30,
    primaryLambert: 'Sahara',
    description: 'Deep southwestern desert gas field in the Reggane basin.',
  },
  {
    id: 'timimoun',
    name: 'Timimoun Gas Concession (Gourara)',
    nameAr: 'تيميمون',
    type: 'gas_field',
    region: 'Sahara Ouest',
    lat: 29.2600,
    lon: 0.2300,
    elevationMeters: 288,
    primaryUtmZone: 30,
    primaryLambert: 'Sahara',
    description: 'Tight gas reservoir development in the Red Oasis Gourara region.',
  },
  {
    id: 'gara_djebilet',
    name: 'Gara Djebilet Mega Iron Ore',
    nameAr: 'غار جبيلات',
    type: 'mining',
    region: 'Sahara Ouest',
    lat: 26.8833,
    lon: -7.1667,
    elevationMeters: 410,
    primaryUtmZone: 29,
    primaryLambert: 'Sahara',
    description: 'Strategic open-pit iron ore mine 130 km southeast of Tindouf.',
  },
  {
    id: 'colonne_voirol',
    name: 'Colonne Voirol (Historical Geodetic Datum Origin)',
    nameAr: 'عمود فيرول - الجزائر',
    type: 'datum_origin',
    region: 'Nord',
    lat: 36.7417,
    lon: 3.0483,
    elevationMeters: 175,
    primaryUtmZone: 31,
    primaryLambert: 'Nord',
    description: 'The geodetic origin of the Voirol 1875 & 1960 Algerian Triangulation.',
  },
  {
    id: 'ouargla',
    name: 'Ouargla (Wilaya 30 Capital)',
    nameAr: 'ورقلة',
    type: 'wilaya',
    region: 'Sahara Central',
    lat: 31.9500,
    lon: 5.3167,
    elevationMeters: 128,
    primaryUtmZone: 31,
    primaryLambert: 'Sud',
    description: 'Administrative capital of the central petroleum region.',
  },
  {
    id: 'illizi',
    name: 'Illizi (Wilaya 33 Capital)',
    nameAr: 'إيليزي',
    type: 'wilaya',
    region: 'Sahara Est',
    lat: 26.4833,
    lon: 8.4667,
    elevationMeters: 556,
    primaryUtmZone: 32,
    primaryLambert: 'Sahara',
    description: 'Gate to Tassili n’Ajjer and the eastern petroleum concessions.',
  },
  {
    id: 'tamanrasset',
    name: 'Tamanrasset (Hoggar Capital)',
    nameAr: 'تمنراست',
    type: 'wilaya',
    region: 'Sahara Central',
    lat: 22.7850,
    lon: 5.5228,
    elevationMeters: 1320,
    primaryUtmZone: 31,
    primaryLambert: 'Sahara',
    description: 'Southern high-altitude Sahara hub at the foot of Mount Tahat.',
  },
  {
    id: 'djanet',
    name: 'Djanet (Wilaya 56 Oasis)',
    nameAr: 'جانت',
    type: 'wilaya',
    region: 'Sahara Est',
    lat: 24.5500,
    lon: 9.4833,
    elevationMeters: 1035,
    primaryUtmZone: 32,
    primaryLambert: 'Sahara',
    description: 'Southeastern desert oasis close to Tassili national park.',
  },
  {
    id: 'adrar',
    name: 'Adrar (Touat Region)',
    nameAr: 'أدرار',
    type: 'wilaya',
    region: 'Sahara Ouest',
    lat: 27.8742,
    lon: -0.2939,
    elevationMeters: 258,
    primaryUtmZone: 30,
    primaryLambert: 'Sahara',
    description: 'Western Sahara desert hub and refinery station.',
  },
  {
    id: 'bechar',
    name: 'Béchar (Saoura Valley)',
    nameAr: 'بشار',
    type: 'wilaya',
    region: 'Sahara Ouest',
    lat: 31.6167,
    lon: -2.2167,
    elevationMeters: 747,
    primaryUtmZone: 30,
    primaryLambert: 'Sud',
    description: 'Strategic northwestern Sahara crossroads.',
  },
  {
    id: 'algiers',
    name: 'Algiers (Port & National Survey IGN)',
    nameAr: 'الجزائر العاصمة',
    type: 'wilaya',
    region: 'Nord',
    lat: 36.7538,
    lon: 3.0588,
    elevationMeters: 42,
    primaryUtmZone: 31,
    primaryLambert: 'Nord',
    description: 'National capital, port terminal, and central cartographic authority.',
  },
  {
    id: 'oran',
    name: 'Oran (Bethioua LNG Terminal)',
    nameAr: 'وهران',
    type: 'wilaya',
    region: 'Nord',
    lat: 35.6987,
    lon: -0.6349,
    elevationMeters: 60,
    primaryUtmZone: 30,
    primaryLambert: 'Nord',
    description: 'Major Mediterranean port and export terminal for Sahara gas pipelines.',
  },
];

export interface SiteBoundaryPreset {
  id: string;
  name: string;
  description: string;
  operator: string;
  crsPreferred: string;
  color: string;
  vertices: Array<{ label: string; lat: number; lon: number }>;
}

export const SAMPLE_SITE_BOUNDARIES: SiteBoundaryPreset[] = [
  {
    id: 'hassi_messaoud_perimeter',
    name: 'Hassi Messaoud Production Concession (Sample Block)',
    description: 'Core industrial exploitation perimeter surrounding the MD-1 reservoir and Base du 24 Février.',
    operator: 'Sonatrach DP',
    crsPreferred: 'EPSG:30731',
    color: '#f59e0b',
    vertices: [
      { label: 'HMD-NW', lat: 32.1200, lon: 4.8800 },
      { label: 'HMD-NE', lat: 32.1500, lon: 5.3500 },
      { label: 'HMD-E',  lat: 31.8500, lon: 5.4200 },
      { label: 'HMD-SE', lat: 31.6800, lon: 5.2500 },
      { label: 'HMD-SW', lat: 31.7200, lon: 4.8000 },
      { label: 'HMD-W',  lat: 31.9200, lon: 4.7500 },
    ],
  },
  {
    id: 'in_amenas_block',
    name: 'In Amenas Wet Gas Development Block (Tiguentourine)',
    description: 'Exploitation boundary encompassing the wet gas fields and pipeline collection lines.',
    operator: 'Sonatrach / Association',
    crsPreferred: 'EPSG:30732',
    color: '#06b6d4',
    vertices: [
      { label: 'TIG-1', lat: 28.0500, lon: 8.9500 },
      { label: 'TIG-2', lat: 28.0200, lon: 9.3500 },
      { label: 'TIG-3', lat: 27.8000, lon: 9.4000 },
      { label: 'TIG-4', lat: 27.7500, lon: 9.0200 },
    ],
  },
  {
    id: 'gara_djebilet_mine',
    name: 'Gara Djebilet Mining Perimeter (Iron Ore West)',
    description: 'Demarcated open-cast concession for the Gara Djebilet iron ore deposit.',
    operator: 'Feraal',
    crsPreferred: 'EPSG:30729',
    color: '#ef4444',
    vertices: [
      { label: 'GDJ-1', lat: 26.9600, lon: -7.3000 },
      { label: 'GDJ-2', lat: 26.9500, lon: -7.0500 },
      { label: 'GDJ-3', lat: 26.8000, lon: -7.0200 },
      { label: 'GDJ-4', lat: 26.8100, lon: -7.2800 },
    ],
  },
];

// Offline Vector Polygon of Algeria's Borders & Sahara Basins
// For high-reliability offline Sahara vector canvas rendering
export const ALGERIA_BORDER_GEOJSON_COORDS: [number, number][] = [
  // Coastline (West to East)
  [-2.21, 35.08], [-1.86, 35.15], [-0.80, 35.82], [0.08, 36.05],
  [1.05, 36.27], [2.12, 36.55], [3.06, 36.80], [3.85, 36.92],
  [4.92, 36.75], [5.60, 36.98], [6.50, 37.05], [7.77, 36.90],
  [8.65, 36.95],
  // Eastern Border with Tunisia & Libya
  [8.50, 36.00], [8.30, 34.50], [9.40, 33.15], [9.85, 32.20],
  [9.80, 30.25], [9.90, 28.00], [10.15, 26.50], [11.95, 23.50],
  // Southern Border with Niger & Mali
  [9.50, 21.00], [5.50, 19.50], [4.25, 19.00], [3.00, 19.70],
  [1.00, 20.80], [-1.00, 21.30], [-3.50, 22.70], [-4.80, 25.00],
  // Western Border with Mauritania & Western Sahara
  [-8.67, 26.00], [-8.67, 27.67], [-8.67, 28.70],
  // Border with Morocco
  [-5.00, 29.50], [-3.00, 30.50], [-2.00, 32.00], [-1.80, 34.00],
  [-2.21, 35.08],
];

// Major Sahara Basins outlines for desert spatial orientation
export const SAHARA_BASINS = [
  {
    name: 'Berkine Basin (Grand Erg Oriental)',
    center: [31.2, 7.5],
    color: '#eab308',
    coords: [[5.8, 32.5], [8.5, 32.2], [9.5, 29.8], [6.5, 30.0]],
  },
  {
    name: 'Illizi Basin',
    center: [27.5, 8.8],
    color: '#06b6d4',
    coords: [[7.8, 28.8], [9.8, 28.5], [9.5, 25.8], [7.5, 26.2]],
  },
  {
    name: 'Ahnet & Gourara Basins',
    center: [28.2, 1.8],
    color: '#a855f7',
    coords: [[0.5, 29.8], [3.2, 29.5], [3.5, 26.5], [0.8, 27.0]],
  },
  {
    name: 'Reggane & Tindouf Basins',
    center: [27.0, -3.5],
    color: '#f97316',
    coords: [[-1.0, 28.5], [-6.5, 28.0], [-7.5, 26.0], [-1.5, 26.2]],
  },
  {
    name: 'Hoggar Massif (Precambrian Shield)',
    center: [23.3, 5.8],
    color: '#64748b',
    coords: [[4.0, 24.5], [7.2, 24.2], [6.8, 21.5], [3.8, 22.0]],
  },
];
