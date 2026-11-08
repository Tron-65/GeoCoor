/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  calculateMagneticDeclination,
  trueToMagnetic,
  magneticToTrue,
  gridToMagnetic,
  magneticToGrid,
  MagneticDeclinationResult,
} from '../../services/magneticDeclination';
import {
  Compass,
  Navigation,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MagneticDeclinationToolProps {
  latitude: number;
  longitude: number;
  elevationMeters?: number;
}

export const MagneticDeclinationTool: React.FC<MagneticDeclinationToolProps> = ({
  latitude,
  longitude,
  elevationMeters = 150,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [inputBearing, setInputBearing] = useState<string>('45');
  const [conversionDirection, setConversionDirection] = useState<
    'true_to_mag' | 'mag_to_true' | 'grid_to_mag' | 'mag_to_grid'
  >('true_to_mag');
  const [copiedNote, setCopiedNote] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Compute magnetic declination
  const magResult: MagneticDeclinationResult = useMemo(() => {
    return calculateMagneticDeclination(latitude, longitude, elevationMeters, selectedYear);
  }, [latitude, longitude, elevationMeters, selectedYear]);

  // Compute interactive compass bearing resolution
  const resolvedBearing = useMemo(() => {
    const rawVal = parseFloat(inputBearing);
    if (isNaN(rawVal)) return { value: 0, text: '0.00°', explanation: '' };

    const normVal = ((rawVal % 360) + 360) % 360;
    let out = 0;
    let explanation = '';

    if (conversionDirection === 'true_to_mag') {
      out = trueToMagnetic(normVal, magResult.declinationDeg);
      explanation = `Magnetic = True (${normVal.toFixed(1)}°) - Declination (${magResult.declinationDeg.toFixed(2)}°) = ${out.toFixed(2)}°`;
    } else if (conversionDirection === 'mag_to_true') {
      out = magneticToTrue(normVal, magResult.declinationDeg);
      explanation = `True = Magnetic (${normVal.toFixed(1)}°) + Declination (${magResult.declinationDeg.toFixed(2)}°) = ${out.toFixed(2)}°`;
    } else if (conversionDirection === 'grid_to_mag') {
      out = gridToMagnetic(normVal, magResult.gridMagneticAngleDeg);
      explanation = `Magnetic = Grid (${normVal.toFixed(1)}°) - G-M Angle (${magResult.gridMagneticAngleDeg.toFixed(2)}°) = ${out.toFixed(2)}°`;
    } else {
      out = magneticToGrid(normVal, magResult.gridMagneticAngleDeg);
      explanation = `Grid = Magnetic (${normVal.toFixed(1)}°) + G-M Angle (${magResult.gridMagneticAngleDeg.toFixed(2)}°) = ${out.toFixed(2)}°`;
    }

    return {
      value: out,
      text: `${out.toFixed(2)}°`,
      explanation,
    };
  }, [inputBearing, conversionDirection, magResult]);

  // Copy navigation field note
  const handleCopyFieldNote = () => {
    const note = [
      `=== SAHARA MAGNETIC NAVIGATION LOG ===`,
      `Location: ${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E (Elev: ${elevationMeters}m)`,
      `Model: ${magResult.modelName} (Epoch ${selectedYear})`,
      `Magnetic Declination (Variation): ${magResult.declinationDMS} (${magResult.declinationDeg.toFixed(2)}° ${magResult.direction})`,
      `Annual Drift Rate: ${magResult.annualChangeMin > 0 ? '+' : ''}${magResult.annualChangeMin.toFixed(1)}' / year (${magResult.annualChangeDeg.toFixed(2)}°/yr)`,
      `Meridian Convergence (Grid North): ${magResult.gridConvergenceDeg.toFixed(2)}°`,
      `G-M Angle (Grid to Magnetic): ${magResult.gridMagneticAngleDeg.toFixed(2)}°`,
      `Horizontal Field Strength: ${magResult.horizontalIntensityNT.toLocaleString()} nT`,
      `Manual Compass Rule: East is least (Subtract declination from True to set Magnetic Compass)`,
      `======================================`,
    ].join('\n');

    navigator.clipboard.writeText(note);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Compass Rose Angle Calculations
  const declinationAngle = magResult.declinationDeg;
  const gridAngle = magResult.gridConvergenceDeg;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                Magnetic Declination & Field Compass Navigation
              </h3>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                WMM2025 Offline Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates current magnetic variation ($D$) and G-M angles for manual compass orienteering across the Sahara.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyFieldNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            title="Copy magnetic navigation log for field logbook"
          >
            {copiedNote ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied Log</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Nav Log</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Declination */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/40 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-400 mb-1">
                <span>Magnetic Declination (D)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {magResult.direction === 'E' ? 'EAST' : 'WEST'}
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-300">
                {magResult.declinationDMS}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {magResult.declinationDeg >= 0 ? '+' : ''}
                {magResult.declinationDeg.toFixed(3)}°
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Magnetic North is {magResult.declinationDeg.toFixed(2)}° East of True North
              </span>
            </div>

            {/* Card 2: Annual Change */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Annual Drift Rate
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {magResult.annualChangeMin > 0 ? '+' : ''}
                {magResult.annualChangeMin.toFixed(1)}&apos; <span className="text-xs font-sans text-slate-400">/ yr</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {magResult.annualChangeDeg > 0 ? '+' : ''}
                {magResult.annualChangeDeg.toFixed(2)}°/year
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Secular eastward geomagnetic drift
              </span>
            </div>

            {/* Card 3: Grid Convergence / G-M Angle */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Grid-Magnetic Angle (G-M)
              </span>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {magResult.gridMagneticAngleDeg.toFixed(2)}°
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Convergence $\gamma$: {magResult.gridConvergenceDeg.toFixed(2)}°
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Offset between Map Grid & Lensatic Compass
              </span>
            </div>

            {/* Card 4: Horizontal Field Strength */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Field Intensity (H)
              </span>
              <div className="text-xl font-bold font-mono text-purple-300">
                {magResult.horizontalIntensityNT.toLocaleString()}{' '}
                <span className="text-xs font-sans text-slate-400">nT</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                X: {magResult.northComponentX.toLocaleString()} | Y: {magResult.eastComponentY.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Horizontal compass pulling force
              </span>
            </div>
          </div>

          {/* Compass Diagram & Interactive Bearing Converter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Visual Compass Rose Dial (SVG) */}
            <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Field Compass Rose (True vs Magnetic vs Grid)
              </span>

              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                  {/* Outer Dial Circle */}
                  <circle cx="100" cy="100" r="90" fill="#090d16" stroke="#334155" strokeWidth="2" />
                  <circle cx="100" cy="100" r="76" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 3" />

                  {/* Degree Ticks every 30 deg */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                    const r1 = 82;
                    const r2 = 88;
                    const rad = ((deg - 90) * Math.PI) / 180;
                    const x1 = 100 + r1 * Math.cos(rad);
                    const y1 = 100 + r1 * Math.sin(rad);
                    const x2 = 100 + r2 * Math.cos(rad);
                    const y2 = 100 + r2 * Math.sin(rad);
                    return (
                      <line
                        key={deg}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#64748b"
                        strokeWidth={deg % 90 === 0 ? '2' : '1'}
                      />
                    );
                  })}

                  {/* Cardinal Direction Letters */}
                  <text x="100" y="24" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
                    N (0°)
                  </text>
                  <text x="180" y="104" fill="#cbd5e1" fontSize="10" textAnchor="middle">
                    E
                  </text>
                  <text x="100" y="184" fill="#cbd5e1" fontSize="10" textAnchor="middle">
                    S
                  </text>
                  <text x="20" y="104" fill="#cbd5e1" fontSize="10" textAnchor="middle">
                    W
                  </text>

                  {/* True North Reference Line (Green) */}
                  <line x1="100" y1="100" x2="100" y2="28" stroke="#10b981" strokeWidth="2.5" />
                  <polygon points="100,20 95,30 105,30" fill="#10b981" />

                  {/* Magnetic North Pointer (Amber) - Rotated by Declination */}
                  <g transform={`rotate(${declinationAngle}, 100, 100)`}>
                    <line x1="100" y1="100" x2="100" y2="28" stroke="#f59e0b" strokeWidth="2.5" />
                    <polygon points="100,18 95,30 105,30" fill="#f59e0b" />
                    {/* South magnetic needle tail */}
                    <line x1="100" y1="100" x2="100" y2="155" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                  </g>

                  {/* Grid North Pointer (Cyan) - Rotated by Convergence */}
                  <g transform={`rotate(${gridAngle}, 100, 100)`}>
                    <line x1="100" y1="100" x2="100" y2="35" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
                    <circle cx="100" cy="33" r="3" fill="#38bdf8" />
                  </g>

                  {/* Center Pivot Pin */}
                  <circle cx="100" cy="100" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-300">True North (TN 0.0°)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-amber-300">
                    Magnetic (MN {declinationAngle >= 0 ? '+' : ''}{declinationAngle.toFixed(2)}°)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span className="text-cyan-300">
                    Grid (GN {gridAngle >= 0 ? '+' : ''}{gridAngle.toFixed(2)}°)
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Compass Bearing Converter Tool */}
            <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-500" />
                    Manual Compass Bearing Resolver
                  </span>
                  <span className="text-[10px] text-slate-400">Field Azimuth Correction</span>
                </div>

                {/* Conversion Direction Selector */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => setConversionDirection('true_to_mag')}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${
                      conversionDirection === 'true_to_mag'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">Map &rarr; Compass</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      True Azimuth to Magnetic Sighting
                    </div>
                  </button>

                  <button
                    onClick={() => setConversionDirection('mag_to_true')}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${
                      conversionDirection === 'mag_to_true'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">Compass &rarr; Map</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      Magnetic Sighting to True Map Angle
                    </div>
                  </button>

                  <button
                    onClick={() => setConversionDirection('grid_to_mag')}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${
                      conversionDirection === 'grid_to_mag'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">UTM Grid &rarr; Compass</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      Grid Bearing to Compass via G-M
                    </div>
                  </button>

                  <button
                    onClick={() => setConversionDirection('mag_to_grid')}
                    className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${
                      conversionDirection === 'mag_to_grid'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">Compass &rarr; UTM Grid</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      Compass Sighting to Topo Map Grid
                    </div>
                  </button>
                </div>

                {/* Input and Output Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {conversionDirection === 'true_to_mag'
                        ? 'True Map Bearing (°):'
                        : conversionDirection === 'mag_to_true'
                        ? 'Magnetic Compass Sighting (°):'
                        : conversionDirection === 'grid_to_mag'
                        ? 'UTM Grid Bearing (°):'
                        : 'Magnetic Compass Sighting (°):'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="360"
                        value={inputBearing}
                        onChange={(e) => setInputBearing(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        placeholder="e.g. 45.0"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">deg</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex gap-1.5 mt-2">
                      {[0, 45, 90, 180, 270].map((b) => (
                        <button
                          key={b}
                          onClick={() => setInputBearing(String(b))}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition"
                        >
                          {b}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Output Bearing Result */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      {conversionDirection === 'true_to_mag'
                        ? 'Set Compass Bezel To:'
                        : conversionDirection === 'mag_to_true'
                        ? 'Plot on Map (True Bearing):'
                        : conversionDirection === 'grid_to_mag'
                        ? 'Set Compass Bezel To:'
                        : 'Plot on UTM Grid Map:'}
                    </span>
                    <div className="text-2xl font-black font-mono text-amber-300">
                      {resolvedBearing.text}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                      {resolvedBearing.explanation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigator's Golden Rule Box */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/90 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Navigator&apos;s Field Rule:</span>{' '}
                  <span>
                    &quot;East is Least, West is Best&quot; — When converting True heading to Magnetic compass heading, <strong>subtract</strong> Easterly declination ({magResult.declinationDeg.toFixed(2)}°).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
