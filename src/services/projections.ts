/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import proj4 from 'proj4';

export interface CRSDefinition {
  id: string;
  name: string;
  epsg?: number;
  category: 'algeria_utm' | 'algeria_lambert' | 'global_utm' | 'global_geo' | 'custom';
  description: string;
  proj4String: string;
  isProjected: boolean;
  ellipsoid: string;
  datum: string;
  units: 'degrees' | 'meters';
  bounds?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  popularZone?: string;
  recommendedFor?: string;
}

// Proj4 custom definitions for Algerian Geodesy
export const ALGERIA_CRS_REGISTRY: CRSDefinition[] = [
  // --- Nord Sahara 1959 (Petroleum & Field Standard for Algerian Sahara) ---
  {
    id: 'EPSG:30731',
    name: 'Nord Sahara 1959 / UTM Zone 31N',
    epsg: 30731,
    category: 'algeria_utm',
    description: 'Standard oil & gas grid for Central Sahara (Hassi Messaoud, Ouargla, Ghardaia, In Salah)',
    proj4String: '+proj=utm +zone=31 +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'meters',
    popularZone: 'Central Sahara / Hassi Messaoud (0°E to 6°E)',
    recommendedFor: 'Sonatrach oilfield concessions, seismic surveys & Hassi Messaoud',
    bounds: [0, 19, 6, 37],
  },
  {
    id: 'EPSG:30732',
    name: 'Nord Sahara 1959 / UTM Zone 32N',
    epsg: 30732,
    category: 'algeria_utm',
    description: 'Standard oil & gas grid for Eastern Sahara (Illizi Basin, In Amenas, Berkine, Djanet)',
    proj4String: '+proj=utm +zone=32 +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'meters',
    popularZone: 'Eastern Sahara / Illizi Basin (6°E to 12°E)',
    recommendedFor: 'In Amenas, Tiguentourine, Rhourde Nouss, Berkine Basin',
    bounds: [6, 19, 12, 37],
  },
  {
    id: 'EPSG:30730',
    name: 'Nord Sahara 1959 / UTM Zone 30N',
    epsg: 30730,
    category: 'algeria_utm',
    description: 'Western Sahara grid (Oran, Bechar, Adrar, Reggane, Timimoun)',
    proj4String: '+proj=utm +zone=30 +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'meters',
    popularZone: 'Western Sahara / Adrar / Reggane (6°W to 0°E)',
    recommendedFor: 'Adrar, Reggane gas fields, Timimoun, Touat basin',
    bounds: [-6, 19, 0, 37],
  },
  {
    id: 'EPSG:30729',
    name: 'Nord Sahara 1959 / UTM Zone 29N',
    epsg: 30729,
    category: 'algeria_utm',
    description: 'Far Western Algeria grid (Tindouf, Gara Djebilet, Western Sahara borders)',
    proj4String: '+proj=utm +zone=29 +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'meters',
    popularZone: 'Far West / Tindouf (12°W to 6°W)',
    recommendedFor: 'Tindouf iron mining perimeter, Gara Djebilet',
    bounds: [-9, 19, -6, 30],
  },

  // --- Voirol 1875 & Voirol 1960 / Lambert Conformal Conic (NTA) ---
  {
    id: 'EPSG:22301',
    name: 'Voirol 1875 / Lambert Algérie Nord',
    epsg: 22301,
    category: 'algeria_lambert',
    description: 'Lambert Conformal Conic for Northern Algeria (North of 34°N, Coastal, Tell Atlas)',
    proj4String: '+proj=lcc +lat_1=36 +lat_0=36 +lon_0=2.666666666666667 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=-73,-247,-227,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Voirol 1875 (NTA Paris)',
    units: 'meters',
    popularZone: 'North Algeria (Algiers, Oran, Constantine, Setif, Annaba)',
    recommendedFor: 'Cadastral surveying, historical French maps, civil engineering north of 34°N',
    bounds: [-2.5, 34, 8.5, 37.5],
  },
  {
    id: 'EPSG:22302',
    name: 'Voirol 1875 / Lambert Algérie Sud',
    epsg: 22302,
    category: 'algeria_lambert',
    description: 'Lambert Conformal Conic for Southern Algeria / Hauts Plateaux (South of 34°N)',
    proj4String: '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=2.666666666666667 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=-73,-247,-227,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Voirol 1875 (NTA Paris)',
    units: 'meters',
    popularZone: 'South Algeria & High Plateaus (Djelfa, Laghouat, Biskra, Touggourt)',
    recommendedFor: 'Atlas Saharien & Northern Sahara transition zone',
    bounds: [-3, 31, 9, 34.5],
  },
  {
    id: 'EPSG:3058',
    name: 'Voirol 1960 / Lambert Algérie Nord',
    epsg: 3058,
    category: 'algeria_lambert',
    description: 'Lambert Conformal Conic Voirol 1960 update for Northern Algeria',
    proj4String: '+proj=lcc +lat_1=36 +lat_0=36 +lon_0=2.666666666666667 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=-123,-206,219,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Voirol 1960',
    units: 'meters',
    popularZone: 'North Algeria (Updated Datum)',
    recommendedFor: 'Modern Algerian cadastral surveys & topography north',
    bounds: [-2.5, 34, 8.5, 37.5],
  },
  {
    id: 'EPSG:3059',
    name: 'Voirol 1960 / Lambert Algérie Sud',
    epsg: 3059,
    category: 'algeria_lambert',
    description: 'Lambert Conformal Conic Voirol 1960 update for Southern Algeria',
    proj4String: '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=2.666666666666667 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=-123,-206,219,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Voirol 1960',
    units: 'meters',
    popularZone: 'South Algeria (Updated Datum)',
    recommendedFor: 'Modern Algerian cadastral surveys & topography south',
    bounds: [-3, 31, 9, 34.5],
  },
  {
    id: 'LAMBERT_SAHARA',
    name: 'Lambert Conformal Conic Sahara (Deep Desert)',
    epsg: undefined,
    category: 'algeria_lambert',
    description: 'Lambert Conformal Conic centered on Central Sahara (30°N, 3°E)',
    proj4String: '+proj=lcc +lat_1=30 +lat_0=30 +lon_0=3 +k_0=0.9996 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'meters',
    popularZone: 'Deep Sahara Desert exploration',
    recommendedFor: 'Regional geological synthesis across the Grand Erg and Ahnet',
    bounds: [-2, 22, 10, 32],
  },

  // --- WGS84 Geographic & UTM (Standard GPS & Satellite) ---
  {
    id: 'EPSG:4326',
    name: 'WGS84 (GPS Geographic Lat/Lon)',
    epsg: 4326,
    category: 'global_geo',
    description: 'World Geodetic System 1984 - Standard GPS Latitude & Longitude',
    proj4String: '+proj=longlat +datum=WGS84 +no_defs',
    isProjected: false,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'degrees',
    popularZone: 'Global / All Algeria',
    recommendedFor: 'Handheld GPS receivers, drone navigation, Google Earth, KML export',
    bounds: [-9, 19, 12, 38],
  },
  {
    id: 'EPSG:32631',
    name: 'WGS84 / UTM Zone 31N',
    epsg: 32631,
    category: 'global_utm',
    description: 'UTM Zone 31 North on WGS84 ellipsoid (0°E to 6°E)',
    proj4String: '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'meters',
    popularZone: 'Central Algeria GPS Grid',
    recommendedFor: 'Modern GPS surveying, UAV lidar mapping, Algiers to Tamanrasset',
    bounds: [0, 19, 6, 38],
  },
  {
    id: 'EPSG:32632',
    name: 'WGS84 / UTM Zone 32N',
    epsg: 32632,
    category: 'global_utm',
    description: 'UTM Zone 32 North on WGS84 ellipsoid (6°E to 12°E)',
    proj4String: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'meters',
    popularZone: 'Eastern Algeria GPS Grid',
    recommendedFor: 'Eastern wilayas, In Amenas GPS surveys, Djanet',
    bounds: [6, 19, 12, 38],
  },
  {
    id: 'EPSG:32630',
    name: 'WGS84 / UTM Zone 30N',
    epsg: 32630,
    category: 'global_utm',
    description: 'UTM Zone 30 North on WGS84 ellipsoid (6°W to 0°E)',
    proj4String: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'meters',
    popularZone: 'Western Algeria GPS Grid',
    recommendedFor: 'Oran, Bechar, Adrar, Tindouf boundary GPS surveys',
    bounds: [-6, 19, 0, 38],
  },
  {
    id: 'EPSG:32629',
    name: 'WGS84 / UTM Zone 29N',
    epsg: 32629,
    category: 'global_utm',
    description: 'UTM Zone 29 North on WGS84 ellipsoid (12°W to 6°W)',
    proj4String: '+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs',
    isProjected: true,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'meters',
    popularZone: 'Far West / Tindouf border',
    recommendedFor: 'Tindouf & Gara Djebilet GPS surveys',
    bounds: [-9, 19, -6, 30],
  },
  {
    id: 'EPSG:4307',
    name: 'Nord Sahara 1959 Geographic (Lat/Lon on Clarke 1880)',
    epsg: 4307,
    category: 'algeria_utm',
    description: 'Geographic coordinates on Clarke 1880 (IGN) with Nord Sahara 1959 datum shift',
    proj4String: '+proj=longlat +ellps=clrk80ign +towgs84=-186,-89,184,0,0,0,0 +no_defs',
    isProjected: false,
    ellipsoid: 'Clarke 1880 (IGN)',
    datum: 'Nord Sahara 1959',
    units: 'degrees',
    popularZone: 'Algerian Sahara Geographic',
    recommendedFor: 'Legacy seismic navigation files & Sonatrach exploration reports',
    bounds: [-9, 19, 12, 38],
  },
  {
    id: 'EPSG:3857',
    name: 'Web Mercator / Pseudo-Mercator',
    epsg: 3857,
    category: 'global_geo',
    description: 'Standard Web GIS / Slippy Map projection (OpenStreetMap, Google Maps)',
    proj4String: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
    isProjected: true,
    ellipsoid: 'WGS 84',
    datum: 'WGS84',
    units: 'meters',
    popularZone: 'Global Web Maps',
    recommendedFor: 'Leaflet, Mapbox, and web tile alignment',
    bounds: [-9, 19, 12, 38],
  },
];

// Initialize all definitions in Proj4
ALGERIA_CRS_REGISTRY.forEach((crs) => {
  try {
    proj4.defs(crs.id, crs.proj4String);
  } catch (err) {
    console.error(`Failed to register CRS ${crs.id}:`, err);
  }
});

// Register Custom Lambert Conformal Conic dynamically
export function registerCustomLCC(params: {
  lat0: number;
  lon0: number;
  lat1?: number;
  lat2?: number;
  k0?: number;
  x0: number;
  y0: number;
  ellipsoid: 'clrk80ign' | 'WGS84' | 'intl';
  dx?: number;
  dy?: number;
  dz?: number;
}): string {
  const customId = 'CUSTOM:LCC';
  const is2SP = params.lat1 !== undefined && params.lat2 !== undefined && params.lat1 !== params.lat2;
  
  let projStr = `+proj=lcc +lat_0=${params.lat0} +lon_0=${params.lon0}`;
  if (is2SP) {
    projStr += ` +lat_1=${params.lat1} +lat_2=${params.lat2}`;
  } else {
    projStr += ` +lat_1=${params.lat1 ?? params.lat0} +k_0=${params.k0 ?? 0.9996}`;
  }
  projStr += ` +x_0=${params.x0} +y_0=${params.y0} +ellps=${params.ellipsoid}`;
  
  if (params.dx !== undefined || params.dy !== undefined || params.dz !== undefined) {
    projStr += ` +towgs84=${params.dx ?? 0},${params.dy ?? 0},${params.dz ?? 0},0,0,0,0`;
  }
  projStr += ' +units=m +no_defs';

  proj4.defs(customId, projStr);
  return customId;
}

export function getCRSById(id: string): CRSDefinition | undefined {
  return ALGERIA_CRS_REGISTRY.find((c) => c.id === id);
}

// Convert point from any CRS to another
export function convertCoordinates(
  sourceCrsId: string,
  targetCrsId: string,
  coords: [number, number] // [X, Y] or [Lon, Lat]
): [number, number] {
  if (sourceCrsId === targetCrsId) return coords;
  try {
    const result = proj4(sourceCrsId, targetCrsId, coords);
    if (!Number.isFinite(result[0]) || !Number.isFinite(result[1])) {
      throw new Error('Conversion yielded non-finite numbers');
    }
    return [result[0], result[1]];
  } catch (error) {
    console.error(`Error converting from ${sourceCrsId} to ${targetCrsId}:`, error);
    throw error;
  }
}

// Coordinate formatting utilities
export function formatDD(val: number, isLat: boolean, precision = 6): string {
  const hemi = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${Math.abs(val).toFixed(precision)}° ${hemi}`;
}

export function formatDMS(val: number, isLat: boolean): string {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minRemainder = (abs - deg) * 60;
  const min = Math.floor(minRemainder);
  const sec = (minRemainder - min) * 60;
  const hemi = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${deg}° ${String(min).padStart(2, '0')}' ${sec.toFixed(3).padStart(6, '0')}" ${hemi}`;
}

export function formatDDM(val: number, isLat: boolean): string {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const hemi = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${deg}° ${min.toFixed(4).padStart(7, '0')}' ${hemi}`;
}

export function formatGrads(val: number, isLat: boolean): string {
  // 1 degree = 100/90 grads = 1.111111 grads (gon)
  const grads = val * (100 / 90);
  const hemi = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
  return `${grads.toFixed(5)} gon (${hemi})`;
}

export function formatMeters(val: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(val) + ' m';
}

// Parse various coordinate representations
export function parseCoordinateInput(input: string, isLat = true): number | null {
  const raw = input.trim().toUpperCase();
  if (!raw) return null;

  // Direct Decimal Degrees (e.g. "31.9314", "-5.0682", "31.9314 N")
  const ddRegex = /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?$/;
  const ddMatch = raw.match(ddRegex);
  if (ddMatch) {
    let val = parseFloat(ddMatch[1]);
    const dir = ddMatch[2];
    if (dir === 'S' || dir === 'W') val = -Math.abs(val);
    if (dir === 'N' || dir === 'E') val = Math.abs(val);
    return val;
  }

  // DMS format (e.g. 31° 55' 53.04" N or 31 55 53.04 N or 31°55'53"N)
  const dmsRegex = /^(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*\s*([NSEW])?$/;
  const dmsMatch = raw.match(dmsRegex);
  if (dmsMatch) {
    const d = parseFloat(dmsMatch[1]);
    const m = parseFloat(dmsMatch[2]);
    const s = parseFloat(dmsMatch[3]);
    const dir = dmsMatch[4] || (isLat ? 'N' : 'E');
    let val = d + m / 60 + s / 3600;
    if (dir === 'S' || dir === 'W') val = -val;
    return val;
  }

  // DDM format (e.g. 31° 55.884' N or 31 55.884 N)
  const ddmRegex = /^(\d+)[°\s]+(\d+(?:\.\d+)?)['\s]*\s*([NSEW])?$/;
  const ddmMatch = raw.match(ddmRegex);
  if (ddmMatch) {
    const d = parseFloat(ddmMatch[1]);
    const m = parseFloat(ddmMatch[2]);
    const dir = ddmMatch[3] || (isLat ? 'N' : 'E');
    let val = d + m / 60;
    if (dir === 'S' || dir === 'W') val = -val;
    return val;
  }

  // Direct float fallback
  const directFloat = parseFloat(raw);
  if (!isNaN(directFloat)) {
    return directFloat;
  }

  return null;
}

// Calculate geodetic distance (Haversine formula in meters)
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6378137; // WGS84 earth mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate initial forward azimuth / bearing (degrees 0-360)
export function calculateAzimuth(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

// Meridian convergence approximation for UTM (in degrees)
export function calculateMeridianConvergence(lat: number, lon: number, utmZone: number): number {
  const centralMeridian = (utmZone - 1) * 6 - 180 + 3;
  const deltaLonRad = ((lon - centralMeridian) * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  // gamma approx = deltaLon * sin(lat)
  const gammaRad = deltaLonRad * Math.sin(latRad);
  return (gammaRad * 180) / Math.PI;
}

// Point scale factor approximation for UTM
export function calculateUTMScaleFactor(easting: number, k0 = 0.9996): number {
  const x = easting - 500000;
  const R = 6378137;
  // k ≈ k0 * (1 + x² / (2 * R²))
  return k0 * (1 + (x * x) / (2 * R * R));
}
