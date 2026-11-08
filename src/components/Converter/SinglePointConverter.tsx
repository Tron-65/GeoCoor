/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ALGERIA_CRS_REGISTRY,
  CRSDefinition,
  convertCoordinates,
  formatDD,
  formatDMS,
  formatDDM,
  formatGrads,
  formatMeters,
  calculateMeridianConvergence,
  calculateUTMScaleFactor,
  calculateDistanceMeters,
  calculateAzimuth,
  parseCoordinateInput,
} from '../../services/projections';
import { ALGERIA_FIELD_PRESETS } from '../../services/algeriaGeoData';
import { BatchPoint, exportBatchToKML, downloadFile } from '../../services/batchProcessor';
import {
  calculateMagneticDeclination,
  MagneticDeclinationResult,
} from '../../services/magneticDeclination';
import { MagneticDeclinationTool } from './MagneticDeclinationTool';
import {
  ArrowRightLeft,
  Copy,
  Check,
  MapPin,
  Plus,
  Compass,
  FileCode,
  Info,
  Sliders,
  ChevronDown,
  Navigation,
} from 'lucide-react';

interface SinglePointConverterProps {
  currentCoord: [number, number]; // [lat, lon]
  onSelectCoord: (lat: number, lon: number) => void;
  onAddPointToWorkspace: (point: BatchPoint) => void;
  onOpenCustomLCC: () => void;
  activeSourceCrsId: string;
  activeTargetCrsId: string;
  onSourceCrsChange: (id: string) => void;
  onTargetCrsChange: (id: string) => void;
}

type InputFormat = 'DD' | 'DMS' | 'DDM' | 'PROJECTED';

export const SinglePointConverter: React.FC<SinglePointConverterProps> = ({
  currentCoord,
  onSelectCoord,
  onAddPointToWorkspace,
  onOpenCustomLCC,
  activeSourceCrsId,
  activeTargetCrsId,
  onSourceCrsChange,
  onTargetCrsChange,
}) => {
  const [inputFormat, setInputFormat] = useState<InputFormat>('DD');

  // Input states
  const [latInput, setLatInput] = useState<string>(currentCoord[0].toFixed(6));
  const [lonInput, setLonInput] = useState<string>(currentCoord[1].toFixed(6));
  const [elevInput, setElevInput] = useState<string>('152');
  const [pointNameInput, setPointNameInput] = useState<string>('Sahara Field Point');

  // DMS individual inputs
  const [dmsLatDeg, setDmsLatDeg] = useState<string>('31');
  const [dmsLatMin, setDmsLatMin] = useState<string>('55');
  const [dmsLatSec, setDmsLatSec] = useState<string>('53.04');
  const [dmsLatHemi, setDmsLatHemi] = useState<'N' | 'S'>('N');

  const [dmsLonDeg, setDmsLonDeg] = useState<string>('5');
  const [dmsLonMin, setDmsLonMin] = useState<string>('04');
  const [dmsLonSec, setDmsLonSec] = useState<string>('05.52');
  const [dmsLonHemi, setDmsLonHemi] = useState<'E' | 'W'>('E');

  // Projected inputs
  const [projXInput, setProjXInput] = useState<string>('695594.293');
  const [projYInput, setProjYInput] = useState<string>('3534485.690');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sourceCrs = useMemo(
    () => ALGERIA_CRS_REGISTRY.find((c) => c.id === activeSourceCrsId) || ALGERIA_CRS_REGISTRY[0],
    [activeSourceCrsId]
  );

  const targetCrs = useMemo(
    () => ALGERIA_CRS_REGISTRY.find((c) => c.id === activeTargetCrsId) || ALGERIA_CRS_REGISTRY[1],
    [activeTargetCrsId]
  );

  // Sync inputs when currentCoord prop changes from Map click or preset
  useEffect(() => {
    const [lat, lon] = currentCoord;
    setLatInput(lat.toFixed(6));
    setLonInput(lon.toFixed(6));

    // Update DMS parts
    const absLat = Math.abs(lat);
    const latD = Math.floor(absLat);
    const latMRemainder = (absLat - latD) * 60;
    const latM = Math.floor(latMRemainder);
    const latS = (latMRemainder - latM) * 60;
    setDmsLatDeg(String(latD));
    setDmsLatMin(String(latM));
    setDmsLatSec(latS.toFixed(3));
    setDmsLatHemi(lat >= 0 ? 'N' : 'S');

    const absLon = Math.abs(lon);
    const lonD = Math.floor(absLon);
    const lonMRemainder = (absLon - lonD) * 60;
    const lonM = Math.floor(lonMRemainder);
    const lonS = (lonMRemainder - lonM) * 60;
    setDmsLonDeg(String(lonD));
    setDmsLonMin(String(lonM));
    setDmsLonSec(lonS.toFixed(3));
    setDmsLonHemi(lon >= 0 ? 'E' : 'W');

    // If source CRS is projected, convert WGS84 to Source CRS coords for input boxes
    if (sourceCrs.isProjected) {
      try {
        const proj = convertCoordinates('EPSG:4326', sourceCrs.id, [lon, lat]);
        setProjXInput(proj[0].toFixed(3));
        setProjYInput(proj[1].toFixed(3));
      } catch {
        // Keep previous
      }
    }
  }, [currentCoord, sourceCrs]);

  // Compute Active Lat/Lon and Projected Target
  const conversionData = useMemo(() => {
    try {
      let wgsLat = 0;
      let wgsLon = 0;

      if (sourceCrs.isProjected) {
        const x = parseFloat(projXInput);
        const y = parseFloat(projYInput);
        if (isNaN(x) || isNaN(y)) throw new Error('Invalid projected coordinates');
        const wgs = convertCoordinates(sourceCrs.id, 'EPSG:4326', [x, y]);
        wgsLon = wgs[0];
        wgsLat = wgs[1];
      } else {
        if (inputFormat === 'DMS') {
          const dLat = parseFloat(dmsLatDeg) || 0;
          const mLat = parseFloat(dmsLatMin) || 0;
          const sLat = parseFloat(dmsLatSec) || 0;
          let latVal = dLat + mLat / 60 + sLat / 3600;
          if (dmsLatHemi === 'S') latVal = -latVal;

          const dLon = parseFloat(dmsLonDeg) || 0;
          const mLon = parseFloat(dmsLonMin) || 0;
          const sLon = parseFloat(dmsLonSec) || 0;
          let lonVal = dLon + mLon / 60 + sLon / 3600;
          if (dmsLonHemi === 'W') lonVal = -lonVal;

          wgsLat = latVal;
          wgsLon = lonVal;
        } else {
          const latVal = parseCoordinateInput(latInput, true);
          const lonVal = parseCoordinateInput(lonInput, false);
          if (latVal === null || lonVal === null) throw new Error('Invalid geographic coordinates');
          wgsLat = latVal;
          wgsLon = lonVal;
        }
      }

      // Convert from WGS84 to Target CRS
      let targetX = 0;
      let targetY = 0;
      if (targetCrs.id === 'EPSG:4326') {
        targetX = wgsLon;
        targetY = wgsLat;
      } else {
        const tgt = convertCoordinates('EPSG:4326', targetCrs.id, [wgsLon, wgsLat]);
        targetX = tgt[0];
        targetY = tgt[1];
      }

      // Compute Matrix across all Algerian systems
      const nsUtm31 = convertCoordinates('EPSG:4326', 'EPSG:30731', [wgsLon, wgsLat]);
      const nsUtm32 = convertCoordinates('EPSG:4326', 'EPSG:30732', [wgsLon, wgsLat]);
      const wgsUtm31 = convertCoordinates('EPSG:4326', 'EPSG:32631', [wgsLon, wgsLat]);
      const lambertNord = convertCoordinates('EPSG:4326', 'EPSG:22301', [wgsLon, wgsLat]);
      const lambertSud = convertCoordinates('EPSG:4326', 'EPSG:22302', [wgsLon, wgsLat]);
      const lambertSahara = convertCoordinates('EPSG:4326', 'LAMBERT_SAHARA', [wgsLon, wgsLat]);
      const voirol60Nord = convertCoordinates('EPSG:4326', 'EPSG:3058', [wgsLon, wgsLat]);

      // Geodesy calculations
      const conv31 = calculateMeridianConvergence(wgsLat, wgsLon, 31);
      const scale31 = calculateUTMScaleFactor(nsUtm31[0]);

      // Distance and bearing from Colonne Voirol (Algiers origin)
      const distFromVoirolM = calculateDistanceMeters(wgsLat, wgsLon, 36.7417, 3.0483);
      const azFromVoirol = calculateAzimuth(36.7417, 3.0483, wgsLat, wgsLon);

      // Distance from Hassi Messaoud MD-1
      const distFromHmdM = calculateDistanceMeters(wgsLat, wgsLon, 31.9314, 5.0682);

      // Geomagnetic Declination calculation (WMM2025)
      const magData = calculateMagneticDeclination(wgsLat, wgsLon, parseFloat(elevInput) || 150);

      return {
        wgsLat,
        wgsLon,
        targetX,
        targetY,
        nsUtm31,
        nsUtm32,
        wgsUtm31,
        lambertNord,
        lambertSud,
        lambertSahara,
        voirol60Nord,
        conv31,
        scale31,
        distFromVoirolKm: distFromVoirolM / 1000,
        azFromVoirol,
        distFromHmdKm: distFromHmdM / 1000,
        magData,
        isValid: true,
      };
    } catch (err: unknown) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Calculation error',
      };
    }
  }, [
    sourceCrs,
    targetCrs,
    inputFormat,
    latInput,
    lonInput,
    dmsLatDeg,
    dmsLatMin,
    dmsLatSec,
    dmsLatHemi,
    dmsLonDeg,
    dmsLonMin,
    dmsLonSec,
    dmsLonHemi,
    projXInput,
    projYInput,
  ]);

  // Swap Source and Target CRS
  const handleSwapCRS = () => {
    const oldSource = activeSourceCrsId;
    onSourceCrsChange(activeTargetCrsId);
    onTargetCrsChange(oldSource);
  };

  // Sync to Map
  const handleSyncToMap = () => {
    if (conversionData.isValid && conversionData.wgsLat !== undefined && conversionData.wgsLon !== undefined) {
      onSelectCoord(conversionData.wgsLat, conversionData.wgsLon);
    }
  };

  // Add Point to Active Workspace
  const handleAddPoint = () => {
    if (!conversionData.isValid || conversionData.wgsLat === undefined || conversionData.wgsLon === undefined) return;
    const elev = parseFloat(elevInput) || 0;

    const newPoint: BatchPoint = {
      id: `pt_${Date.now()}`,
      index: 1,
      label: pointNameInput || 'Sahara Point',
      sourceX: sourceCrs.isProjected ? parseFloat(projXInput) : conversionData.wgsLon,
      sourceY: sourceCrs.isProjected ? parseFloat(projYInput) : conversionData.wgsLat,
      sourceZ: elev,
      targetX: conversionData.targetX,
      targetY: conversionData.targetY,
      targetZ: elev,
      wgs84Lat: conversionData.wgsLat,
      wgs84Lon: conversionData.wgsLon,
      dmsLat: formatDMS(conversionData.wgsLat, true),
      dmsLon: formatDMS(conversionData.wgsLon, false),
      ddmLat: formatDDM(conversionData.wgsLat, true),
      ddmLon: formatDDM(conversionData.wgsLon, false),
      convergenceDeg: conversionData.conv31,
      scaleFactor: conversionData.scale31,
      isValid: true,
    };

    onAddPointToWorkspace(newPoint);
    setCopiedKey('added_to_workspace');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Copy full geodetic summary report
  const copyFullReport = () => {
    if (!conversionData.isValid) return;
    const rep = [
      `=== GEOFREE ALGERIA GEODETIC REPORT ===`,
      `Point: ${pointNameInput}`,
      `Elevation: ${elevInput} m`,
      ``,
      `[WGS84 GPS Geographic]`,
      `  Decimal Degrees: ${conversionData.wgsLat?.toFixed(6)}° N, ${conversionData.wgsLon?.toFixed(6)}° E`,
      `  DMS: ${formatDMS(conversionData.wgsLat || 0, true)} | ${formatDMS(conversionData.wgsLon || 0, false)}`,
      `  DDM: ${formatDDM(conversionData.wgsLat || 0, true)} | ${formatDDM(conversionData.wgsLon || 0, false)}`,
      `  Grads / Gon: ${formatGrads(conversionData.wgsLat || 0, true)} | ${formatGrads(conversionData.wgsLon || 0, false)}`,
      ``,
      `[Algerian Projected Systems]`,
      `  Nord Sahara 1959 / UTM 31N: X=${conversionData.nsUtm31?.[0].toFixed(3)} m, Y=${conversionData.nsUtm31?.[1].toFixed(3)} m`,
      `  Nord Sahara 1959 / UTM 32N: X=${conversionData.nsUtm32?.[0].toFixed(3)} m, Y=${conversionData.nsUtm32?.[1].toFixed(3)} m`,
      `  WGS84 / UTM 31N:            X=${conversionData.wgsUtm31?.[0].toFixed(3)} m, Y=${conversionData.wgsUtm31?.[1].toFixed(3)} m`,
      `  Lambert Algérie Nord (1875): X=${conversionData.lambertNord?.[0].toFixed(3)} m, Y=${conversionData.lambertNord?.[1].toFixed(3)} m`,
      `  Lambert Algérie Sud (1875):  X=${conversionData.lambertSud?.[0].toFixed(3)} m, Y=${conversionData.lambertSud?.[1].toFixed(3)} m`,
      `  Lambert Sahara (LCC):       X=${conversionData.lambertSahara?.[0].toFixed(3)} m, Y=${conversionData.lambertSahara?.[1].toFixed(3)} m`,
      ``,
      `[Surveying Geodesy & Geomagnetics]`,
      `  Meridian Convergence (Zone 31): ${conversionData.conv31?.toFixed(4)}°`,
      `  Magnetic Declination (D): ${conversionData.magData?.declinationDMS || 'N/A'} (${conversionData.magData ? conversionData.magData.declinationDeg.toFixed(2) + '° ' + conversionData.magData.direction : 'N/A'})`,
      `  Annual Magnetic Drift: ${(conversionData.magData?.annualChangeMin ?? 0) > 0 ? '+' : ''}${conversionData.magData?.annualChangeMin?.toFixed(1) ?? '0.0'}'/yr`,
      `  Grid-Magnetic (G-M Angle): ${conversionData.magData?.gridMagneticAngleDeg !== undefined ? conversionData.magData.gridMagneticAngleDeg.toFixed(2) + '°' : 'N/A'}`,
      `  Distance from Colonne Voirol: ${conversionData.distFromVoirolKm?.toFixed(2)} km (Azimuth: ${conversionData.azFromVoirol?.toFixed(1)}°)`,
      `  Distance from Hassi Messaoud: ${conversionData.distFromHmdKm?.toFixed(2)} km`,
      `=======================================`,
    ].join('\n');

    copyToClipboard(rep, 'full_report');
  };

  // Export Single KML
  const handleExportSingleKML = () => {
    if (!conversionData.isValid || conversionData.wgsLat === undefined || conversionData.wgsLon === undefined) return;
    const point: BatchPoint = {
      id: 'pt_single',
      index: 1,
      label: pointNameInput,
      sourceX: conversionData.wgsLon,
      sourceY: conversionData.wgsLat,
      targetX: conversionData.targetX,
      targetY: conversionData.targetY,
      wgs84Lat: conversionData.wgsLat,
      wgs84Lon: conversionData.wgsLon,
      dmsLat: formatDMS(conversionData.wgsLat, true),
      dmsLon: formatDMS(conversionData.wgsLon, false),
      isValid: true,
    };
    const kml = exportBatchToKML([point], pointNameInput, targetCrs.id);
    downloadFile(kml, `${pointNameInput.replace(/\s+/g, '_')}_wgs84.kml`, 'application/vnd.google-earth.kml+xml');
  };

  return (
    <div className="space-y-6">
      {/* Top Conversion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOURCE COORDINATE SYSTEM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Source System (From)
              </h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
              {sourceCrs.datum}
            </span>
          </div>

          {/* CRS Selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Select Projection / Coordinate Reference System:
            </label>
            <select
              value={activeSourceCrsId}
              onChange={(e) => onSourceCrsChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <optgroup label="Algeria Petroleum & Sahara Grids">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'algeria_utm').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Algerian Lambert Conformal Conic (NTA)">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'algeria_lambert').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Global UTM (WGS84)">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'global_utm').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Global Geographic">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'global_geo').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-400 mt-1 italic">{sourceCrs.description}</p>
          </div>

          {/* Format Tabs (If Geographic) */}
          {!sourceCrs.isProjected && (
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-4">
              <button
                onClick={() => setInputFormat('DD')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition ${
                  inputFormat === 'DD' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Decimal Degrees (DD)
              </button>
              <button
                onClick={() => setInputFormat('DMS')}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition ${
                  inputFormat === 'DMS' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Deg Min Sec (DMS)
              </button>
            </div>
          )}

          {/* Coordinate Inputs */}
          {sourceCrs.isProjected ? (
            /* Projected X / Y Meters */
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Easting X (Meters)
                </label>
                <input
                  type="text"
                  value={projXInput}
                  onChange={(e) => setProjXInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. 695594.293"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Northing Y (Meters)
                </label>
                <input
                  type="text"
                  value={projYInput}
                  onChange={(e) => setProjYInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. 3534485.690"
                />
              </div>
            </div>
          ) : inputFormat === 'DMS' ? (
            /* DMS Detailed Form */
            <div className="space-y-3 mb-4">
              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1">
                  Latitude (Degrees ° / Minutes &apos; / Seconds &quot; / Hemisphere)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={dmsLatDeg}
                    onChange={(e) => setDmsLatDeg(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder="31°"
                  />
                  <input
                    type="number"
                    value={dmsLatMin}
                    onChange={(e) => setDmsLatMin(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder="55'"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={dmsLatSec}
                    onChange={(e) => setDmsLatSec(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder={'53.04"'}
                  />
                  <select
                    value={dmsLatHemi}
                    onChange={(e) => setDmsLatHemi(e.target.value as 'N' | 'S')}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-amber-400 text-center"
                  >
                    <option value="N">N (North)</option>
                    <option value="S">S (South)</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-300 mb-1">
                  Longitude (Degrees ° / Minutes &apos; / Seconds &quot; / Hemisphere)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={dmsLonDeg}
                    onChange={(e) => setDmsLonDeg(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder="05°"
                  />
                  <input
                    type="number"
                    value={dmsLonMin}
                    onChange={(e) => setDmsLonMin(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder="04'"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={dmsLonSec}
                    onChange={(e) => setDmsLonSec(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-center text-slate-100"
                    placeholder={'05.52"'}
                  />
                  <select
                    value={dmsLonHemi}
                    onChange={(e) => setDmsLonHemi(e.target.value as 'E' | 'W')}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs font-bold text-amber-400 text-center"
                  >
                    <option value="E">E (East)</option>
                    <option value="W">W (West)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* DD Standard Decimal */
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Latitude (° N/S)
                </label>
                <input
                  type="text"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="31.931400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Longitude (° E/W)
                </label>
                <input
                  type="text"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  placeholder="5.068200"
                />
              </div>
            </div>
          )}

          {/* Elevation & Point Name */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Point Identifier / Well
              </label>
              <input
                type="text"
                value={pointNameInput}
                onChange={(e) => setPointNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Elevation Z (Meters)
              </label>
              <input
                type="text"
                value={elevInput}
                onChange={(e) => setElevInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-auto pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Ellipsoid: <strong className="text-slate-300">{sourceCrs.ellipsoid}</strong></span>
            <button
              onClick={handleSyncToMap}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
            >
              <MapPin className="w-3.5 h-3.5" />
              Pin on Sahara Map
            </button>
          </div>
        </div>

        {/* TARGET COORDINATE SYSTEM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Target Projection (To)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSwapCRS}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
                title="Swap Source and Target Projections"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Swap</span>
              </button>
              <button
                onClick={onOpenCustomLCC}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-slate-700 transition"
                title="Configure custom Lambert Conformal Conic parameters"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Custom LCC</span>
              </button>
            </div>
          </div>

          {/* Target CRS Selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Select Output Projection:
            </label>
            <select
              value={activeTargetCrsId}
              onChange={(e) => onTargetCrsChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              <optgroup label="Algeria Petroleum & Sahara Grids">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'algeria_utm').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Algerian Lambert Conformal Conic (NTA)">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'algeria_lambert').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Global UTM (WGS84)">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'global_utm').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Global Geographic">
                {ALGERIA_CRS_REGISTRY.filter((c) => c.category === 'global_geo').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-400 mt-1 italic">{targetCrs.description}</p>
          </div>

          {/* Primary Converted Result Card */}
          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {conversionData.isValid ? (
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 block mb-2">
                  Target Projection Output Coordinates
                </span>

                {targetCrs.isProjected ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">Easting X:</span>
                        <span className="text-lg font-mono font-bold text-slate-100">
                          {formatMeters(conversionData.targetX || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(String(conversionData.targetX?.toFixed(3)), 'tgtX')}
                        className="text-slate-400 hover:text-white p-1.5"
                      >
                        {copiedKey === 'tgtX' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">Northing Y:</span>
                        <span className="text-lg font-mono font-bold text-slate-100">
                          {formatMeters(conversionData.targetY || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(String(conversionData.targetY?.toFixed(3)), 'tgtY')}
                        className="text-slate-400 hover:text-white p-1.5"
                      >
                        {copiedKey === 'tgtY' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">Latitude:</span>
                        <span className="text-base font-mono font-bold text-slate-100">
                          {formatDD(conversionData.wgsLat || 0, true)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(conversionData.wgsLat?.toFixed(6) || '', 'latDD')}
                        className="text-slate-400 hover:text-white p-1.5"
                      >
                        {copiedKey === 'latDD' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">Longitude:</span>
                        <span className="text-base font-mono font-bold text-slate-100">
                          {formatDD(conversionData.wgsLon || 0, false)}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(conversionData.wgsLon?.toFixed(6) || '', 'lonDD')}
                        className="text-slate-400 hover:text-white p-1.5"
                      >
                        {copiedKey === 'lonDD' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-rose-400 font-medium py-3 text-center">
                Coordinate Conversion Error: {conversionData.error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-auto grid grid-cols-3 gap-2">
            <button
              onClick={handleAddPoint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
              title="Add this coordinate point into the active team survey project"
            >
              {copiedKey === 'added_to_workspace' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save to Team</span>
                </>
              )}
            </button>

            <button
              onClick={copyFullReport}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              title="Copy complete geodetic comparison across all Algerian CRS"
            >
              {copiedKey === 'full_report' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportSingleKML}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              title="Download KML Placemark for Google Earth"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export KML</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAGNETIC DECLINATION & FIELD COMPASS NAVIGATION TOOL */}
      <MagneticDeclinationTool
        latitude={conversionData.wgsLat ?? currentCoord[0]}
        longitude={conversionData.wgsLon ?? currentCoord[1]}
        elevationMeters={parseFloat(elevInput) || 150}
      />

      {/* COMPREHENSIVE ALGERIAN GEODETIC SYSTEMS MATRIX (geofree.fr inspired) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Algeria Multi-CRS Cross-Conversion Matrix
            </h3>
          </div>
          <span className="text-xs text-slate-400">Calculated in real-time on Clarke 1880 & WGS84</span>
        </div>

        {conversionData.isValid && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Nord Sahara 1959 / UTM 31N */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                <span>Nord Sahara 1959 / UTM 31N</span>
                <span className="text-[10px] text-slate-500">EPSG:30731</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Hassi Messaoud & Central Sahara standard</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-amber-300">{conversionData.nsUtm31?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-amber-300">{conversionData.nsUtm31?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>

            {/* Nord Sahara 1959 / UTM 32N */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
                <span>Nord Sahara 1959 / UTM 32N</span>
                <span className="text-[10px] text-slate-500">EPSG:30732</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Illizi Basin & In Amenas gas fields</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-cyan-300">{conversionData.nsUtm32?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-cyan-300">{conversionData.nsUtm32?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>

            {/* WGS84 / UTM 31N */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
                <span>WGS84 / UTM Zone 31N</span>
                <span className="text-[10px] text-slate-500">EPSG:32631</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Standard GPS Grid on WGS84 Ellipsoid</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-emerald-300">{conversionData.wgsUtm31?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-emerald-300">{conversionData.wgsUtm31?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>

            {/* Voirol 1875 / Lambert Algérie Nord */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
                <span>Lambert Algérie Nord</span>
                <span className="text-[10px] text-slate-500">Voirol 1875 (NTA)</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">North of 34°N (Algiers, Oran, Constantine)</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-purple-300">{conversionData.lambertNord?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-purple-300">{conversionData.lambertNord?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>

            {/* Voirol 1875 / Lambert Algérie Sud */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-1">
                <span>Lambert Algérie Sud</span>
                <span className="text-[10px] text-slate-500">Voirol 1875 (NTA)</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">South of 34°N (Atlas Saharien / High Plateaus)</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-indigo-300">{conversionData.lambertSud?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-indigo-300">{conversionData.lambertSud?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>

            {/* Lambert Conformal Conic Sahara */}
            <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-rose-400 font-semibold mb-1">
                <span>Lambert Sahara (Deep Desert)</span>
                <span className="text-[10px] text-slate-500">Clarke 1880</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">Central meridian 3°E, lat_0 30°N</p>
              <div className="font-mono text-xs text-slate-200 space-y-0.5">
                <div>X: <strong className="text-rose-300">{conversionData.lambertSahara?.[0].toFixed(3)} m</strong></div>
                <div>Y: <strong className="text-rose-300">{conversionData.lambertSahara?.[1].toFixed(3)} m</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Surveying Physics & Geodesy Info Bar */}
        {conversionData.isValid && (
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs text-slate-300">
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Magnetic Declination (D)</span>
              <span className="font-mono font-bold text-amber-300">
                {conversionData.magData ? conversionData.magData.declinationDMS : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Meridian Convergence (Zone 31)</span>
              <span className="font-mono font-bold text-amber-400">
                {conversionData.conv31 !== undefined ? `${conversionData.conv31.toFixed(4)}°` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Point Scale Factor (k)</span>
              <span className="font-mono font-bold text-emerald-400">
                {conversionData.scale31 !== undefined ? conversionData.scale31.toFixed(6) : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Distance to Colonne Voirol</span>
              <span className="font-mono font-bold text-slate-200">
                {conversionData.distFromVoirolKm?.toFixed(1)} km ({conversionData.azFromVoirol?.toFixed(0)}°)
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Distance to Hassi Messaoud</span>
              <span className="font-mono font-bold text-slate-200">
                {conversionData.distFromHmdKm?.toFixed(1)} km
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
