/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ALGERIA_CRS_REGISTRY,
  convertCoordinates,
  formatDD,
  formatDMS,
  formatMeters,
} from '../../services/projections';
import {
  BatchPoint,
  parseTableText,
  guessColumnMapping,
  processBatchPoints,
  exportBatchToCSV,
  exportBatchToKML,
  exportBatchToGeoJSON,
  parseKML,
  downloadFile,
} from '../../services/batchProcessor';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Play,
  Share2,
  Trash2,
  Clock,
  ArrowRight,
  Database,
} from 'lucide-react';

interface BatchProcessingViewProps {
  onAddBatchToWorkspace: (points: BatchPoint[]) => void;
  onSendPointToMap: (lat: number, lon: number) => void;
  defaultSourceCrsId: string;
  defaultTargetCrsId: string;
}

const SAMPLE_CSV_DATA = `# Algerian Sahara Wellhead Survey GPS Data
Well_ID,Easting_X_Lon,Northing_Y_Lat,Elevation_Z,Field_Name
MD-101,5.0745,31.9388,154,Hassi Messaoud
MD-102,5.0892,31.9450,150,Hassi Messaoud
MD-103,5.0620,31.9210,155,Hassi Messaoud
MD-104,5.0990,31.9150,149,Hassi Messaoud
TIG-01,9.1550,27.9210,555,In Amenas
TIG-02,9.1820,27.9340,560,In Amenas
TIG-03,9.1410,27.8980,550,In Amenas
OUH-01,6.7890,31.4390,242,Ourhoud
OUH-02,6.8050,31.4480,240,Ourhoud
REB-01,5.5240,31.7910,136,Rhourde El Baguel
REB-02,5.5390,31.7820,138,Rhourde El Baguel
GDJ-01,-7.1550,26.8900,412,Gara Djebilet
GDJ-02,-7.1820,26.8750,415,Gara Djebilet
HRM-01,3.2810,32.9380,765,Hassi R'Mel
HRM-02,3.2950,32.9450,762,Hassi R'Mel`;

export const BatchProcessingView: React.FC<BatchProcessingViewProps> = ({
  onAddBatchToWorkspace,
  onSendPointToMap,
  defaultSourceCrsId,
  defaultTargetCrsId,
}) => {
  const [sourceCrsId, setSourceCrsId] = useState<string>(defaultSourceCrsId);
  const [targetCrsId, setTargetCrsId] = useState<string>(defaultTargetCrsId);

  const [rawText, setRawText] = useState<string>(SAMPLE_CSV_DATA);
  const [headers, setHeaders] = useState<string[]>(['Well_ID', 'Easting_X_Lon', 'Northing_Y_Lat', 'Elevation_Z', 'Field_Name']);
  const [rows, setRows] = useState<string[][]>([]);

  // Column Mapping
  const [labelCol, setLabelCol] = useState<number>(0);
  const [xCol, setXCol] = useState<number>(1);
  const [yCol, setYCol] = useState<number>(2);
  const [zCol, setZCol] = useState<number | undefined>(3);

  // Result state
  const [processedPoints, setProcessedPoints] = useState<BatchPoint[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'errors'>('all');
  const [executionMs, setExecutionMs] = useState<number>(0);

  // Parse table when rawText changes
  const handleParseInput = (text: string) => {
    setRawText(text);
    const parsed = parseTableText(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);

    const guessed = guessColumnMapping(parsed.headers);
    setLabelCol(guessed.labelCol);
    setXCol(guessed.xCol);
    setYCol(guessed.yCol);
    setZCol(guessed.zCol);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.toLowerCase().endsWith('.kml')) {
        const kmlPoints = parseKML(content);
        if (kmlPoints.length > 0) {
          // Convert KML points array to CSV format
          const csvLines = ['Point_ID,Longitude,Latitude,Elevation'];
          kmlPoints.forEach((p) => {
            csvLines.push(`${p.label},${p.sourceX},${p.sourceY},${p.sourceZ || 0}`);
          });
          handleParseInput(csvLines.join('\n'));
          setSourceCrsId('EPSG:4326');
          return;
        }
      }

      handleParseInput(content);
    };
    reader.readAsText(file);
  };

  // Run Batch Conversion
  const handleRunBatch = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const currentRows = rows.length > 0 ? rows : parseTableText(rawText).rows;

      const rawItems = currentRows.map((row, i) => {
        const label = row[labelCol] || `Point_${i + 1}`;
        const x = parseFloat(row[xCol] || '0');
        const y = parseFloat(row[yCol] || '0');
        const z = zCol !== undefined ? parseFloat(row[zCol] || '0') : undefined;
        return {
          label,
          x,
          y,
          z,
          rawLine: row.join(','),
        };
      });

      const res = processBatchPoints(rawItems, sourceCrsId, targetCrsId);
      setProcessedPoints(res.points);
      setExecutionMs(res.elapsedMs);
      setIsProcessing(false);
    }, 50);
  };

  // Filtered Points for table display
  const filteredPoints = useMemo(() => {
    return processedPoints.filter((p) => {
      if (filterMode === 'valid' && !p.isValid) return false;
      if (filterMode === 'errors' && p.isValid) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          String(p.sourceX).includes(q) ||
          String(p.sourceY).includes(q) ||
          (p.errorMessage && p.errorMessage.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [processedPoints, filterMode, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = processedPoints.length;
    const valid = processedPoints.filter((p) => p.isValid).length;
    const errors = total - valid;
    return { total, valid, errors };
  }, [processedPoints]);

  // Downloads
  const downloadConvertedCSV = () => {
    if (processedPoints.length === 0) return;
    const csv = exportBatchToCSV(processedPoints, sourceCrsId, targetCrsId);
    downloadFile(csv, `geofree_converted_${targetCrsId.replace(/:/g, '_')}.csv`, 'text/csv');
  };

  const downloadConvertedKML = () => {
    if (processedPoints.length === 0) return;
    const kml = exportBatchToKML(processedPoints, 'Sahara Batch Survey', targetCrsId);
    downloadFile(kml, `geofree_survey_${targetCrsId.replace(/:/g, '_')}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const downloadConvertedGeoJSON = () => {
    if (processedPoints.length === 0) return;
    const geojson = exportBatchToGeoJSON(processedPoints, targetCrsId);
    downloadFile(geojson, `geofree_points_${targetCrsId.replace(/:/g, '_')}.geojson`, 'application/geo+json');
  };

  const handleSyncToWorkspace = () => {
    if (processedPoints.length === 0) return;
    onAddBatchToWorkspace(processedPoints.filter((p) => p.isValid));
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              Batch GPS & Geodetic Data Processor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bulk coordinate transformation between Algerian UTM, Nord Sahara 1959, Lambert Conformal Conic, and WGS84 GPS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleParseInput(SAMPLE_CSV_DATA)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
            >
              Load Sahara Sample Data
            </button>
            <button
              onClick={() => {
                setRawText('');
                setRows([]);
                setProcessedPoints([]);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
              title="Clear table"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Projections Selection for Batch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Input Dataset Projection (Source CRS):
            </label>
            <select
              value={sourceCrsId}
              onChange={(e) => setSourceCrsId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              {ALGERIA_CRS_REGISTRY.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Output Dataset Projection (Target CRS):
            </label>
            <select
              value={targetCrsId}
              onChange={(e) => setTargetCrsId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              {ALGERIA_CRS_REGISTRY.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.epsg ? `(EPSG:${c.epsg})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload or Paste Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Data Input (CSV, TSV, or Plain Text Coordinates):
              </label>
              <span className="text-[11px] text-slate-500">{rows.length} rows loaded</span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => handleParseInput(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none leading-relaxed"
              placeholder="Paste comma/tab separated coordinates or load sample..."
            />
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Upload File (CSV, TSV, KML):
              </label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-lg cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition">
                <Upload className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-xs font-semibold text-slate-200">Click or drag file here</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Supports CSV, TSV, TXT, KML</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.kml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={handleRunBatch}
              disabled={isProcessing || !rawText.trim()}
              className="mt-3 w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isProcessing ? 'Converting Coordinates...' : 'Execute Batch Transformation'}</span>
            </button>
          </div>
        </div>

        {/* Column Mapping Selector */}
        {headers.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-400 font-semibold">Column Field Mapping:</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Label:</span>
              <select
                value={labelCol}
                onChange={(e) => setLabelCol(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">X / Easting / Lon:</span>
              <select
                value={xCol}
                onChange={(e) => setXCol(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-amber-400">Y / Northing / Lat:</span>
              <select
                value={yCol}
                onChange={(e) => setYCol(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Elevation Z:</span>
              <select
                value={zCol !== undefined ? zCol : -1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setZCol(v === -1 ? undefined : v);
                }}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value={-1}>None</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h} (Col {i + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {processedPoints.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          {/* Stats Bar & Export Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-semibold">{stats.valid} Valid Points</span>
              </div>
              {stats.errors > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400 font-semibold">{stats.errors} Errors</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{executionMs.toFixed(1)} ms</span>
              </div>
            </div>

            {/* Export Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadConvertedCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="Export results table to CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={downloadConvertedKML}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="Export points as Google Earth KML"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export KML</span>
              </button>

              <button
                onClick={downloadConvertedGeoJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="Export RFC 7946 GeoJSON"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>GeoJSON</span>
              </button>

              <button
                onClick={handleSyncToWorkspace}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                title="Push these converted points into the active Team Survey Workspace"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Push to Team Project</span>
              </button>
            </div>
          </div>

          {/* Table Search & Filter Bar */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search well/point name..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  filterMode === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterMode('valid')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  filterMode === 'valid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Valid ({stats.valid})
              </button>
              {stats.errors > 0 && (
                <button
                  onClick={() => setFilterMode('errors')}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    filterMode === 'errors' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Errors ({stats.errors})
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Point Name</th>
                  <th className="py-2.5 px-3">Source X / Lon</th>
                  <th className="py-2.5 px-3">Source Y / Lat</th>
                  <th className="py-2.5 px-3 text-amber-400">Target X / Easting</th>
                  <th className="py-2.5 px-3 text-amber-400">Target Y / Northing</th>
                  <th className="py-2.5 px-3">DMS (WGS84)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {filteredPoints.slice(0, 50).map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-slate-500">{pt.index}</td>
                    <td className="py-2 px-3 font-semibold text-slate-100">{pt.label}</td>
                    <td className="py-2 px-3 text-slate-400">{pt.sourceX.toFixed(4)}</td>
                    <td className="py-2 px-3 text-slate-400">{pt.sourceY.toFixed(4)}</td>
                    <td className="py-2 px-3 font-semibold text-amber-300">
                      {pt.targetX !== undefined ? pt.targetX.toFixed(3) : '-'}
                    </td>
                    <td className="py-2 px-3 font-semibold text-amber-300">
                      {pt.targetY !== undefined ? pt.targetY.toFixed(3) : '-'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-400">
                      {pt.dmsLat && pt.dmsLon ? `${pt.dmsLat} | ${pt.dmsLon}` : '-'}
                    </td>
                    <td className="py-2 px-3">
                      {pt.isValid ? (
                        pt.errorMessage ? (
                          <span className="text-amber-400 text-[10px] font-sans font-semibold">Warning: Bounds</span>
                        ) : (
                          <span className="text-emerald-400 text-[10px] font-sans font-semibold">Valid</span>
                        )
                      ) : (
                        <span className="text-rose-400 text-[10px] font-sans font-semibold">Error: {pt.errorMessage}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {pt.isValid && pt.wgs84Lat !== undefined && pt.wgs84Lon !== undefined && (
                        <button
                          onClick={() => onSendPointToMap(pt.wgs84Lat!, pt.wgs84Lon!)}
                          className="text-amber-400 hover:text-amber-300 p-1"
                          title="View on Sahara Map"
                        >
                          <ArrowRight className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPoints.length > 50 && (
              <div className="py-2 text-center text-xs text-slate-500 bg-slate-950">
                Showing first 50 of {filteredPoints.length} points. Export to CSV/KML to view all.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
