/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateDistanceMeters, calculateAzimuth, convertCoordinates, getCRSById } from './projections';

export interface BoundaryVertex {
  id: string;
  label: string;
  lat: number;
  lon: number;
  elevation?: number;
  projectedX?: number;
  projectedY?: number;
}

export interface BoundarySegment {
  fromIndex: number;
  toIndex: number;
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  azimuthDeg: number;
  azimuthCompass: string;
}

export interface ShoelaceStep {
  fromIndex: number;
  toIndex: number;
  fromLabel: string;
  toLabel: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  crossProduct1: number; // x1 * y2
  crossProduct2: number; // x2 * y1
  crossDiff: number; // (x1 * y2) - (x2 * y1)
}

export interface ShoelaceCalculationDetails {
  formula: string;
  projectionId: string;
  projectionName: string;
  steps: ShoelaceStep[];
  sumCrossDiff: number;
  rawAreaSqMeters: number;
  areaSqMeters: number;
  areaHectares: number;
  areaSqKm: number;
  areaAcres: number;
}

export interface BoundaryStats {
  vertexCount: number;
  perimeterMeters: number;
  perimeterKm: number;
  areaSqMeters: number;
  areaHectares: number;
  areaSqKm: number;
  areaAcres: number;
  centroid: { lat: number; lon: number; projectedX?: number; projectedY?: number };
  boundingBox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  segments: BoundarySegment[];
  shoelaceDetails?: ShoelaceCalculationDetails;
}

export function getCompassDirection(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'
  ];
  const idx = Math.round((deg % 360) / 22.5);
  return directions[idx];
}

// Calculate spherical polygon area on WGS84 ellipsoid (in square meters)
export function calculateSphericalPolygonArea(coords: Array<{ lat: number; lon: number }>): number {
  if (coords.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  let totalAngle = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];
    const p3 = coords[(i + 2) % n];

    // Bearing from p2 to p1 and p2 to p3
    const b1 = calculateAzimuth(p2.lat, p2.lon, p1.lat, p1.lon);
    const b2 = calculateAzimuth(p2.lat, p2.lon, p3.lat, p3.lon);
    let diff = b1 - b2;
    if (diff < 0) diff += 360;
    totalAngle += diff;
  }

  // Spherical excess E = sum of interior angles - (n-2)*180
  const excess = Math.abs(totalAngle - (n - 2) * 180);
  const area = (excess * Math.PI / 180) * (R * R);
  return area;
}

// Planar shoelace area for projected coordinates (UTM / Lambert meters)
// A = ½ | ∑ (x_i * y_{i+1} - x_{i+1} * y_i) |
export function calculatePlanarShoelaceArea(points: Array<[number, number]>): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return Math.abs(area) / 2.0;
}

// Select appropriate projected coordinate system for Cartesian Shoelace calculation
export function getProjectedCrsForVertices(vertices: BoundaryVertex[], preferredCrsId = 'EPSG:30731'): string {
  const preferred = getCRSById(preferredCrsId);
  if (preferred && preferred.isProjected) {
    return preferredCrsId;
  }
  if (vertices.length === 0) return 'EPSG:30731';
  const avgLon = vertices.reduce((sum, v) => sum + v.lon, 0) / vertices.length;
  if (avgLon < -3) return 'EPSG:30729'; // UTM 29N
  if (avgLon < 0) return 'EPSG:30730';  // Nord Sahara UTM 30N
  if (avgLon <= 6) return 'EPSG:30731'; // Nord Sahara UTM 31N (Central Sahara)
  return 'EPSG:30732';                  // Nord Sahara UTM 32N (Eastern Sahara)
}

// Compute step-by-step Shoelace formula calculations with cross products
export function computeShoelaceDetails(
  vertices: BoundaryVertex[],
  crsId = 'EPSG:30731'
): ShoelaceCalculationDetails | undefined {
  const n = vertices.length;
  if (n < 3) return undefined;

  const targetCrsId = getProjectedCrsForVertices(vertices, crsId);
  const targetCrs = getCRSById(targetCrsId);
  const projectionName = targetCrs ? targetCrs.name : targetCrsId;

  // Project vertices from WGS84 to planar coordinates (X Easting, Y Northing in meters)
  const projected = vertices.map((v) => {
    try {
      const p = convertCoordinates('EPSG:4326', targetCrsId, [v.lon, v.lat]);
      return {
        label: v.label,
        x: p[0],
        y: p[1],
      };
    } catch {
      // Fallback
      return {
        label: v.label,
        x: v.lon * 111320 * Math.cos((v.lat * Math.PI) / 180),
        y: v.lat * 110540,
      };
    }
  });

  const steps: ShoelaceStep[] = [];
  let sumCrossDiff = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = projected[i];
    const p2 = projected[j];
    const cp1 = p1.x * p2.y;
    const cp2 = p2.x * p1.y;
    const diff = cp1 - cp2;
    sumCrossDiff += diff;

    steps.push({
      fromIndex: i + 1,
      toIndex: j + 1,
      fromLabel: p1.label,
      toLabel: p2.label,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      crossProduct1: cp1,
      crossProduct2: cp2,
      crossDiff: diff,
    });
  }

  const rawAreaSqMeters = Math.abs(sumCrossDiff) / 2.0;
  const areaSqMeters = rawAreaSqMeters;
  const areaHectares = areaSqMeters / 10000;
  const areaSqKm = areaSqMeters / 1000000;
  const areaAcres = areaSqMeters * 0.000247105;

  return {
    formula: 'A = ½ | ∑ (Xᵢ · Yᵢ₊₁ − Xᵢ₊₁ · Yᵢ) |',
    projectionId: targetCrsId,
    projectionName,
    steps,
    sumCrossDiff,
    rawAreaSqMeters,
    areaSqMeters,
    areaHectares,
    areaSqKm,
    areaAcres,
  };
}

export function computeBoundaryStats(
  vertices: BoundaryVertex[],
  crsId = 'EPSG:4326'
): BoundaryStats {
  const n = vertices.length;
  if (n === 0) {
    return {
      vertexCount: 0,
      perimeterMeters: 0,
      perimeterKm: 0,
      areaSqMeters: 0,
      areaHectares: 0,
      areaSqKm: 0,
      areaAcres: 0,
      centroid: { lat: 0, lon: 0 },
      boundingBox: { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 },
      segments: [],
    };
  }

  let perimeterMeters = 0;
  const segments: BoundarySegment[] = [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let sumLat = 0;
  let sumLon = 0;

  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    sumLat += v.lat;
    sumLon += v.lon;
    if (v.lat < minLat) minLat = v.lat;
    if (v.lat > maxLat) maxLat = v.lat;
    if (v.lon < minLon) minLon = v.lon;
    if (v.lon > maxLon) maxLon = v.lon;

    if (n >= 2) {
      const nextIdx = (i + 1) % n;
      const vNext = vertices[nextIdx];
      // Only close if n >= 3, or if n == 2 calculate segment 0->1
      if (n > 2 || i === 0) {
        const dist = calculateDistanceMeters(v.lat, v.lon, vNext.lat, vNext.lon);
        const az = calculateAzimuth(v.lat, v.lon, vNext.lat, vNext.lon);
        perimeterMeters += dist;
        segments.push({
          fromIndex: i,
          toIndex: nextIdx,
          fromLabel: v.label,
          toLabel: vNext.label,
          distanceMeters: dist,
          azimuthDeg: az,
          azimuthCompass: getCompassDirection(az),
        });
      }
    }
  }

  const centroidLat = sumLat / n;
  const centroidLon = sumLon / n;

  // Compute area automatically using the Shoelace formula on projected coordinates
  let areaSqMeters = 0;
  let areaHectares = 0;
  let areaSqKm = 0;
  let areaAcres = 0;
  let shoelaceDetails: ShoelaceCalculationDetails | undefined;

  if (n >= 3) {
    shoelaceDetails = computeShoelaceDetails(vertices, crsId);
    if (shoelaceDetails) {
      areaSqMeters = shoelaceDetails.areaSqMeters;
      areaHectares = shoelaceDetails.areaHectares;
      areaSqKm = shoelaceDetails.areaSqKm;
      areaAcres = shoelaceDetails.areaAcres;
    } else {
      areaSqMeters = calculateSphericalPolygonArea(vertices);
      areaHectares = areaSqMeters / 10000;
      areaSqKm = areaSqMeters / 1000000;
      areaAcres = areaSqMeters * 0.000247105;
    }
  }

  // Convert centroid to projected coords
  const projCrsId = getProjectedCrsForVertices(vertices, crsId);
  let centroidProjectedX: number | undefined;
  let centroidProjectedY: number | undefined;
  try {
    const proj = convertCoordinates('EPSG:4326', projCrsId, [centroidLon, centroidLat]);
    centroidProjectedX = proj[0];
    centroidProjectedY = proj[1];
  } catch {
    // Fallback
  }

  return {
    vertexCount: n,
    perimeterMeters,
    perimeterKm: perimeterMeters / 1000,
    areaSqMeters,
    areaHectares,
    areaSqKm,
    areaAcres,
    centroid: {
      lat: centroidLat,
      lon: centroidLon,
      projectedX: centroidProjectedX,
      projectedY: centroidProjectedY,
    },
    boundingBox: { minLat, maxLat, minLon, maxLon },
    segments,
    shoelaceDetails,
  };
}
