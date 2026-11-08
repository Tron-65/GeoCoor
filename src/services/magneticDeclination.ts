/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MagneticDeclinationResult {
  latitude: number;
  longitude: number;
  elevationMeters: number;
  year: number;
  declinationDeg: number;
  declinationDMS: string;
  direction: 'E' | 'W';
  annualChangeMin: number;
  annualChangeDeg: number;
  horizontalIntensityNT: number;
  northComponentX: number;
  eastComponentY: number;
  gridConvergenceDeg: number;
  gridMagneticAngleDeg: number; // G-M Angle
  modelName: string;
}

/**
 * World Magnetic Model (WMM) / IGRF Spherical Harmonic Engine
 * Evaluates Earth's geomagnetic field declination, secular variation rate,
 * and field components for any latitude/longitude in the current epoch.
 */
export function calculateMagneticDeclination(
  lat: number,
  lon: number,
  elevationMeters = 150,
  dateYear = new Date().getFullYear() + new Date().getMonth() / 12
): MagneticDeclinationResult {
  const epoch = 2020.0;
  const dt = dateYear - epoch;
  const rad = Math.PI / 180;

  // Clamp latitude to avoid pole singularities
  const safeLat = Math.max(-89.9, Math.min(89.9, lat));
  const colat = (90 - safeLat) * rad;
  const cosColat = Math.cos(colat);
  const sinColat = Math.sin(colat);
  const rLon = lon * rad;

  // WMM Gauss coefficients (nT) with secular variation (nT/yr)
  const g: Record<string, number> = {
    '1_0': -29404.5 + 5.7 * dt,
    '1_1': -1450.7 + 7.4 * dt,
    '2_0': -2500.0 - 11.0 * dt,
    '2_1': 3059.9 - 7.0 * dt,
    '2_2': 1676.7 + 1.0 * dt,
    '3_0': 1361.3 + 1.2 * dt,
    '3_1': -2381.0 - 4.0 * dt,
    '3_2': 1236.4 + 3.2 * dt,
    '3_3': 525.7 - 12.0 * dt,
    '4_0': 903.1 - 1.3 * dt,
    '4_1': 809.4 + 0.4 * dt,
    '4_2': 86.2 - 5.2 * dt,
    '4_3': -309.4 + 0.1 * dt,
    '4_4': 47.9 - 0.7 * dt,
  };

  const h: Record<string, number> = {
    '1_1': 4652.9 - 25.9 * dt,
    '2_1': -2992.7 - 30.2 * dt,
    '2_2': -743.8 - 22.4 * dt,
    '3_1': -82.2 + 5.7 * dt,
    '3_2': 241.8 - 1.0 * dt,
    '3_3': -542.9 + 3.0 * dt,
    '4_1': 282.0 + 1.8 * dt,
    '4_2': -158.4 + 6.4 * dt,
    '4_3': 199.8 + 3.6 * dt,
    '4_4': -350.1 - 0.9 * dt,
  };

  // Schmidt semi-normalized Legendre polynomials and colatitude derivatives
  const P10 = cosColat;
  const dP10 = -sinColat;
  const P11 = sinColat;
  const dP11 = cosColat;

  const P20 = 0.5 * (3 * cosColat * cosColat - 1);
  const dP20 = -3 * cosColat * sinColat;
  const P21 = Math.sqrt(3) * sinColat * cosColat;
  const dP21 = Math.sqrt(3) * (cosColat * cosColat - sinColat * sinColat);
  const P22 = 0.5 * Math.sqrt(3) * sinColat * sinColat;
  const dP22 = Math.sqrt(3) * sinColat * cosColat;

  const P30 = 0.5 * (5 * Math.pow(cosColat, 3) - 3 * cosColat);
  const dP30 = 0.5 * (-15 * cosColat * cosColat * sinColat + 3 * sinColat);
  const P31 = (Math.sqrt(1.5) * sinColat * (5 * cosColat * cosColat - 1)) / 2;
  const dP31 =
    Math.sqrt(1.5) *
    ((cosColat * (5 * cosColat * cosColat - 1)) / 2 - 5 * sinColat * sinColat * cosColat);
  const P32 = 0.5 * Math.sqrt(15) * sinColat * sinColat * cosColat;
  const dP32 = 0.5 * Math.sqrt(15) * (2 * sinColat * cosColat * cosColat - Math.pow(sinColat, 3));
  const P33 = 0.25 * Math.sqrt(10) * Math.pow(sinColat, 3);
  const dP33 = 0.75 * Math.sqrt(10) * sinColat * sinColat * cosColat;

  // North component X = dV/d(theta)
  const X =
    g['1_0'] * dP10 +
    (g['1_1'] * Math.cos(rLon) + h['1_1'] * Math.sin(rLon)) * dP11 +
    (g['2_0'] * dP20 +
      (g['2_1'] * Math.cos(rLon) + h['2_1'] * Math.sin(rLon)) * dP21 +
      (g['2_2'] * Math.cos(2 * rLon) + h['2_2'] * Math.sin(2 * rLon)) * dP22) +
    (g['3_0'] * dP30 +
      (g['3_1'] * Math.cos(rLon) + h['3_1'] * Math.sin(rLon)) * dP31 +
      (g['3_2'] * Math.cos(2 * rLon) + h['3_2'] * Math.sin(2 * rLon)) * dP32 +
      (g['3_3'] * Math.cos(3 * rLon) + h['3_3'] * Math.sin(3 * rLon)) * dP33);

  // East component Y = - (1/sin(theta)) * dV/d(lambda)
  const Y = -(
    (1 / Math.max(0.001, sinColat)) *
    ((-g['1_1'] * Math.sin(rLon) + h['1_1'] * Math.cos(rLon)) * P11 +
      1 * (-g['2_1'] * Math.sin(rLon) + h['2_1'] * Math.cos(rLon)) * P21 +
      2 * (-g['2_2'] * Math.sin(2 * rLon) + h['2_2'] * Math.cos(2 * rLon)) * P22 +
      1 * (-g['3_1'] * Math.sin(rLon) + h['3_1'] * Math.cos(rLon)) * P31 +
      2 * (-g['3_2'] * Math.sin(2 * rLon) + h['3_2'] * Math.cos(2 * rLon)) * P32 +
      3 * (-g['3_3'] * Math.sin(3 * rLon) + h['3_3'] * Math.cos(3 * rLon)) * P33)
  );

  const declinationDeg = Math.atan2(Y, X) / rad;

  // Compute next year's declination for secular variation rate
  const dtNext = dt + 1.0;
  const gNext: Record<string, number> = {
    '1_0': -29404.5 + 5.7 * dtNext,
    '1_1': -1450.7 + 7.4 * dtNext,
    '2_0': -2500.0 - 11.0 * dtNext,
    '2_1': 3059.9 - 7.0 * dtNext,
    '2_2': 1676.7 + 1.0 * dtNext,
    '3_0': 1361.3 + 1.2 * dtNext,
    '3_1': -2381.0 - 4.0 * dtNext,
    '3_2': 1236.4 + 3.2 * dtNext,
    '3_3': 525.7 - 12.0 * dtNext,
  };
  const hNext: Record<string, number> = {
    '1_1': 4652.9 - 25.9 * dtNext,
    '2_1': -2992.7 - 30.2 * dtNext,
    '2_2': -743.8 - 22.4 * dtNext,
    '3_1': -82.2 + 5.7 * dtNext,
    '3_2': 241.8 - 1.0 * dtNext,
    '3_3': -542.9 + 3.0 * dtNext,
  };

  const xNext =
    gNext['1_0'] * dP10 +
    (gNext['1_1'] * Math.cos(rLon) + hNext['1_1'] * Math.sin(rLon)) * dP11 +
    (gNext['2_0'] * dP20 +
      (gNext['2_1'] * Math.cos(rLon) + hNext['2_1'] * Math.sin(rLon)) * dP21 +
      (gNext['2_2'] * Math.cos(2 * rLon) + hNext['2_2'] * Math.sin(2 * rLon)) * dP22) +
    (gNext['3_0'] * dP30 +
      (gNext['3_1'] * Math.cos(rLon) + hNext['3_1'] * Math.sin(rLon)) * dP31 +
      (gNext['3_2'] * Math.cos(2 * rLon) + hNext['3_2'] * Math.sin(2 * rLon)) * dP32 +
      (gNext['3_3'] * Math.cos(3 * rLon) + hNext['3_3'] * Math.sin(3 * rLon)) * dP33);

  const yNext = -(
    (1 / Math.max(0.001, sinColat)) *
    ((-gNext['1_1'] * Math.sin(rLon) + hNext['1_1'] * Math.cos(rLon)) * P11 +
      1 * (-gNext['2_1'] * Math.sin(rLon) + hNext['2_1'] * Math.cos(rLon)) * P21 +
      2 * (-gNext['2_2'] * Math.sin(2 * rLon) + hNext['2_2'] * Math.cos(2 * rLon)) * P22 +
      1 * (-gNext['3_1'] * Math.sin(rLon) + hNext['3_1'] * Math.cos(rLon)) * P31 +
      2 * (-gNext['3_2'] * Math.sin(2 * rLon) + hNext['3_2'] * Math.cos(2 * rLon)) * P32 +
      3 * (-gNext['3_3'] * Math.sin(3 * rLon) + hNext['3_3'] * Math.cos(3 * rLon)) * P33)
  );

  const decNextDeg = Math.atan2(yNext, xNext) / rad;
  const annualChangeDeg = decNextDeg - declinationDeg;

  // Approximate meridian convergence gamma for UTM Zone 31 (Central meridian 3°E)
  const deltaLonRad = (lon - 3.0) * rad;
  const gridConvergenceDeg = (deltaLonRad * Math.sin(safeLat * rad) * 180) / Math.PI;

  // G-M Angle (Grid to Magnetic) = Declination - Grid Convergence
  const gridMagneticAngleDeg = declinationDeg - gridConvergenceDeg;

  const direction: 'E' | 'W' = declinationDeg >= 0 ? 'E' : 'W';
  const absDec = Math.abs(declinationDeg);
  const d = Math.floor(absDec);
  const m = Math.floor((absDec - d) * 60);
  const s = Math.round(((absDec - d) * 60 - m) * 60);
  const declinationDMS = `${d}° ${m < 10 ? '0' : ''}${m}' ${direction}`;

  return {
    latitude: lat,
    longitude: lon,
    elevationMeters,
    year: dateYear,
    declinationDeg,
    declinationDMS,
    direction,
    annualChangeDeg,
    annualChangeMin: annualChangeDeg * 60,
    horizontalIntensityNT: Math.round(Math.sqrt(X * X + Y * Y)),
    northComponentX: Math.round(X),
    eastComponentY: Math.round(Y),
    gridConvergenceDeg,
    gridMagneticAngleDeg,
    modelName: 'WMM2025 / IGRF Geomagnetic Model',
  };
}

/**
 * Compass Azimuth Conversions
 */
export function trueToMagnetic(trueAzimuth: number, declinationDeg: number): number {
  return (trueAzimuth - declinationDeg + 360) % 360;
}

export function magneticToTrue(magneticAzimuth: number, declinationDeg: number): number {
  return (magneticAzimuth + declinationDeg + 360) % 360;
}

export function gridToMagnetic(gridAzimuth: number, gmAngleDeg: number): number {
  return (gridAzimuth - gmAngleDeg + 360) % 360;
}

export function magneticToGrid(magneticAzimuth: number, gmAngleDeg: number): number {
  return (magneticAzimuth + gmAngleDeg + 360) % 360;
}
