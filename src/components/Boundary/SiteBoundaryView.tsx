/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BoundaryVertex,
  computeBoundaryStats,
} from '../../services/boundaryCalculator';
import {
  SAMPLE_SITE_BOUNDARIES,
  SiteBoundaryPreset,
} from '../../services/algeriaGeoData';
import {
  exportBoundaryToKML,
  exportBoundaryAndWorkspaceToKML,
  exportBoundaryAndWorkspaceToCSV,
  downloadFile,
  BatchPoint,
} from '../../services/batchProcessor';
import { formatDMS, formatMeters, convertCoordinates, getCRSById } from '../../services/projections';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Download,
  Share2,
  Compass,
  Layers,
  MapPin,
  Check,
  Maximize,
  Navigation,
  FileSpreadsheet,
  FileCode,
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface SiteBoundaryViewProps {
  vertices: BoundaryVertex[];
  onUpdateVertices: (vertices: BoundaryVertex[]) => void;
  boundaryName: string;
  onUpdateBoundaryName: (name: string) => void;
  activeCrsId: string;
  onActivateDrawMode: () => void;
  workspacePoints?: BatchPoint[];
  workspaceName?: string;
}

export const SiteBoundaryView: React.FC<SiteBoundaryViewProps> = ({
  vertices,
  onUpdateVertices,
  boundaryName,
  onUpdateBoundaryName,
  activeCrsId,
  onActivateDrawMode,
  workspacePoints = [],
  workspaceName = 'Active Workspace',
}) => {
  const [newLabel, setNewLabel] = useState<string>('P-New');
  const [newLat, setNewLat] = useState<string>('31.9500');
  const [newLon, setNewLon] = useState<string>('5.1000');
  const [showShoelaceSteps, setShowShoelaceSteps] = useState<boolean>(true);

  // Compute live statistics
  const stats = useMemo(() => {
    return computeBoundaryStats(vertices, activeCrsId);
  }, [vertices, activeCrsId]);

  const activeCrs = getCRSById(activeCrsId);

  // Load a preset concession
  const handleLoadPreset = (preset: SiteBoundaryPreset) => {
    onUpdateBoundaryName(preset.name);
    const convertedVertices: BoundaryVertex[] = preset.vertices.map((v, i) => ({
      id: `v_preset_${preset.id}_${i}`,
      label: v.label,
      lat: v.lat,
      lon: v.lon,
    }));
    onUpdateVertices(convertedVertices);
  };

  // Add vertex manually
  const handleAddVertex = () => {
    const lat = parseFloat(newLat);
    const lon = parseFloat(newLon);
    if (isNaN(lat) || isNaN(lon)) return;

    const nextIdx = vertices.length + 1;
    const newV: BoundaryVertex = {
      id: `v_${Date.now()}_${nextIdx}`,
      label: newLabel || `P-${nextIdx}`,
      lat,
      lon,
    };
    onUpdateVertices([...vertices, newV]);
    setNewLabel(`P-${nextIdx + 1}`);
  };

  // Delete vertex
  const handleDeleteVertex = (id: string) => {
    onUpdateVertices(vertices.filter((v) => v.id !== id));
  };

  // Clear all
  const handleClear = () => {
    onUpdateVertices([]);
  };

  // Export as KML (current boundary vertices & workspace points)
  const handleExportKML = () => {
    if (vertices.length < 3 && workspacePoints.length === 0) return;
    const kml = exportBoundaryAndWorkspaceToKML(
      boundaryName,
      vertices,
      stats,
      workspacePoints,
      activeCrsId,
      workspaceName
    );
    downloadFile(kml, `${boundaryName.replace(/\s+/g, '_')}_workspace_survey.kml`, 'application/vnd.google-earth.kml+xml');
  };

  // Export as CSV (current boundary vertices & workspace points list)
  const handleExportCSV = () => {
    if (vertices.length === 0 && workspacePoints.length === 0) return;
    const csv = exportBoundaryAndWorkspaceToCSV(
      boundaryName,
      vertices,
      stats,
      workspacePoints,
      activeCrsId,
      workspaceName
    );
    downloadFile(csv, `${boundaryName.replace(/\s+/g, '_')}_workspace_survey.csv`, 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Concession Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Site Boundaries & Concession Perimeters
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time polygon surveying, geodesic area computation, segment bearing & distance analysis for Sahara concessions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={vertices.length === 0 && workspacePoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 hover:text-amber-300 text-xs font-semibold border border-slate-700 transition"
              title="Download current boundary vertices and point list in active workspace as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export as CSV</span>
            </button>

            <button
              onClick={handleExportKML}
              disabled={vertices.length < 3 && workspacePoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-400 hover:text-cyan-300 text-xs font-semibold border border-slate-700 transition"
              title="Download current boundary vertices and point list in active workspace as KML"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export as KML</span>
            </button>

            <button
              onClick={onActivateDrawMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
              title="Click on the Sahara map to add or manipulate boundary vertices"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draw on Map</span>
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
              title="Clear all vertices"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Boundary Name & Presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Boundary Perimeter Name:
            </label>
            <input
              type="text"
              value={boundaryName}
              onChange={(e) => onUpdateBoundaryName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-amber-400 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Load Algerian Field Concession Preset:
            </label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SITE_BOUNDARIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLoadPreset(p)}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                >
                  {p.name.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Calculation Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-amber-500/30 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-400">
                Surface Area (km²)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                Shoelace
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-amber-400">
              {stats.areaSqKm > 0 ? stats.areaSqKm.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 }) : '0'} <span className="text-xs text-slate-400 font-sans font-normal">km²</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {Math.round(stats.areaSqMeters).toLocaleString('en-US')} m² total
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-emerald-500/30 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400">
                Surface Area (ha)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                Shoelace
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {stats.areaHectares > 0 ? stats.areaHectares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'} <span className="text-xs text-slate-400 font-sans font-normal">ha</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {stats.areaAcres.toLocaleString('en-US', { maximumFractionDigits: 1 })} acres
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Perimeter Length
            </span>
            <div className="text-xl font-mono font-bold text-cyan-400">
              {stats.perimeterKm.toFixed(3)} <span className="text-xs text-slate-400 font-sans font-normal">km</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {Math.round(stats.perimeterMeters).toLocaleString()} meters total
            </span>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Polygon Geometry
            </span>
            <div className="text-xl font-mono font-bold text-slate-100">
              {stats.vertexCount} <span className="text-xs text-slate-400 font-sans font-normal">vertices</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              {stats.vertexCount < 3 ? 'Min 3 points for area' : 'Closed perimeter polygon'}
            </span>
          </div>
        </div>

        {/* Dedicated Shoelace Formula Surface Area Engine Card */}
        <div className="mt-4 bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  Shoelace Formula Surface Area Engine
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Cartesian Gauss Area Theorem on Projected Coordinates: <code className="text-amber-300 font-mono">A = ½ | ∑ (Xᵢ·Yᵢ₊₁ − Xᵢ₊₁·Yᵢ) |</code>
                </p>
              </div>
            </div>

            {stats.vertexCount >= 3 && stats.shoelaceDetails && (
              <button
                onClick={() => setShowShoelaceSteps(!showShoelaceSteps)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-400 border border-slate-700 transition self-start sm:self-auto"
              >
                <span>{showShoelaceSteps ? 'Hide Cross-Products' : 'Show Cross-Products Table'}</span>
                {showShoelaceSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Shoelace Primary Results Readout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">
                Total Area in Square Kilometers
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-amber-300">
                  {stats.areaSqKm > 0 ? stats.areaSqKm.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '0.0000'}
                </span>
                <span className="text-sm font-bold text-amber-400">km²</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Calculated as Area (m²) ÷ 1,000,000
              </span>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                Total Area in Hectares
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {stats.areaHectares > 0 ? stats.areaHectares.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </span>
                <span className="text-sm font-bold text-emerald-400">ha</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Calculated as Area (m²) ÷ 10,000
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Area in Square Meters
              </span>
              <div className="text-lg font-bold font-mono text-slate-100">
                {Math.round(stats.areaSqMeters).toLocaleString('en-US')} <span className="text-xs text-slate-400 font-sans">m²</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {stats.areaAcres.toLocaleString('en-US', { maximumFractionDigits: 2 })} standard acres
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Projected Grid Coordinates
              </span>
              <div className="text-xs font-bold text-cyan-300 truncate font-mono">
                {stats.shoelaceDetails?.projectionName || activeCrs?.name || activeCrsId}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block truncate">
                Cartesian metric coordinates (X Easting, Y Northing)
              </span>
            </div>
          </div>

          {/* Step-by-Step Shoelace Cross-Multiplication Table */}
          {stats.vertexCount >= 3 && stats.shoelaceDetails && showShoelaceSteps && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span>Shoelace Cross-Product Step-by-Step Verification</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {stats.shoelaceDetails.steps.length} closed perimeter edges
                </span>
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-[11px] font-mono text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2.5">Edge</th>
                      <th className="py-1.5 px-2.5">Xᵢ (Easting m)</th>
                      <th className="py-1.5 px-2.5">Yᵢ (Northing m)</th>
                      <th className="py-1.5 px-2.5">Xᵢ₊₁ (m)</th>
                      <th className="py-1.5 px-2.5">Yᵢ₊₁ (m)</th>
                      <th className="py-1.5 px-2.5 text-right">Xᵢ · Yᵢ₊₁</th>
                      <th className="py-1.5 px-2.5 text-right">Xᵢ₊₁ · Yᵢ</th>
                      <th className="py-1.5 px-2.5 text-right font-bold text-amber-400">Term (Xᵢ·Yᵢ₊₁ − Xᵢ₊₁·Yᵢ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                    {stats.shoelaceDetails.steps.map((st) => (
                      <tr key={st.fromIndex} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-2.5 font-bold text-slate-200">
                          {st.fromLabel} &rarr; {st.toLabel}
                        </td>
                        <td className="py-1.5 px-2.5">{Math.round(st.x1).toLocaleString()}</td>
                        <td className="py-1.5 px-2.5">{Math.round(st.y1).toLocaleString()}</td>
                        <td className="py-1.5 px-2.5">{Math.round(st.x2).toLocaleString()}</td>
                        <td className="py-1.5 px-2.5">{Math.round(st.y2).toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-right text-slate-400">
                          {(st.crossProduct1 / 1e6).toFixed(2)}M
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-slate-400">
                          {(st.crossProduct2 / 1e6).toFixed(2)}M
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-semibold text-amber-300">
                          {Math.round(st.crossDiff).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/90 text-[10px] font-bold border-t border-slate-700">
                    <tr>
                      <td colSpan={7} className="py-2 px-2.5 text-right uppercase text-slate-300">
                        Net Sum of Cross-Products (∑):
                      </td>
                      <td className="py-2 px-2.5 text-right text-amber-400 font-mono text-xs">
                        {Math.round(stats.shoelaceDetails.sumCrossDiff).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="py-1.5 px-2.5 text-right uppercase text-slate-300">
                        Calculated Planar Area [ A = ½ | ∑ | ]:
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-emerald-400 font-mono text-xs">
                        {Math.round(stats.areaSqMeters).toLocaleString()} m²
                      </td>
                    </tr>
                    <tr className="bg-slate-950">
                      <td colSpan={7} className="py-2 px-2.5 text-right uppercase text-amber-300 font-bold">
                        Final Surface Area Output (km² & ha):
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-xs">
                        <span className="text-amber-400 font-black">{stats.areaSqKm.toFixed(4)} km²</span>
                        <span className="text-slate-400 mx-1">|</span>
                        <span className="text-emerald-400 font-bold">{stats.areaHectares.toFixed(2)} ha</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {stats.vertexCount < 3 && (
            <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Boundary currently has <strong>{stats.vertexCount}</strong> {stats.vertexCount === 1 ? 'vertex' : 'vertices'}. At least 3 non-collinear vertices are required to form a closed polygon for Shoelace area calculation.
              </span>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span>Reference Grid: <strong className="text-slate-200">{activeCrs?.name || activeCrsId}</strong></span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="text-amber-400/90 font-medium">
              Active Workspace: <strong>{workspaceName}</strong> ({vertices.length} vertices, {workspacePoints.length} points)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={vertices.length === 0 && workspacePoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 text-xs font-bold border border-slate-700 shadow transition"
              title="Download CSV containing current boundary vertices and active workspace survey point list"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={handleExportKML}
              disabled={vertices.length < 3 && workspacePoints.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-400 text-xs font-bold border border-slate-700 shadow transition"
              title="Download KML containing current boundary perimeter polygon and active workspace survey point list"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export as KML</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vertices Editor & Segment Bearings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vertices List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Boundary Vertices List ({vertices.length})
            </h3>
            <span className="text-[11px] text-slate-500">Ordered perimeter sequence</span>
          </div>

          {/* Add Vertex Input */}
          <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            />
            <input
              type="text"
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              placeholder="Latitude"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
            />
            <input
              type="text"
              value={newLon}
              onChange={(e) => setNewLon(e.target.value)}
              placeholder="Longitude"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
            />
            <button
              onClick={handleAddVertex}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded px-2 py-1 transition flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {/* Vertices Table */}
          <div className="overflow-y-auto max-h-72 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Label</th>
                  <th className="py-2 px-3">Latitude</th>
                  <th className="py-2 px-3">Longitude</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {vertices.map((v, idx) => (
                  <tr key={v.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-amber-400">{v.label}</td>
                    <td className="py-2 px-3">{v.lat.toFixed(5)}°</td>
                    <td className="py-2 px-3">{v.lon.toFixed(5)}°</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleDeleteVertex(v.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {vertices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans text-xs">
                      No vertices yet. Click &quot;Draw on Map&quot; or load a Sahara preset above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Boundary Segments Breakdown (Bearing & Distance) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Segment Geodesy & Bearings ({stats.segments.length})
            </h3>
            <span className="text-[11px] text-slate-500">True azimuth & segment lengths</span>
          </div>

          <div className="overflow-y-auto max-h-80 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-slate-950 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Segment</th>
                  <th className="py-2 px-3">Distance (m)</th>
                  <th className="py-2 px-3">Distance (km)</th>
                  <th className="py-2 px-3">Azimuth / Bearing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                {stats.segments.map((seg, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-semibold text-slate-100">
                      {seg.fromLabel} &rarr; {seg.toLabel}
                    </td>
                    <td className="py-2 px-3 text-cyan-300 font-medium">
                      {Math.round(seg.distanceMeters).toLocaleString()} m
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      {(seg.distanceMeters / 1000).toFixed(2)} km
                    </td>
                    <td className="py-2 px-3 text-amber-300">
                      {seg.azimuthDeg.toFixed(1)}° ({seg.azimuthCompass})
                    </td>
                  </tr>
                ))}
                {stats.segments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                      At least 2 vertices needed to compute boundary segments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
