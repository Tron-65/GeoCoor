/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { registerCustomLCC, convertCoordinates } from '../../services/projections';
import { X, Sliders, Check, Play, Info } from 'lucide-react';

interface CustomLambertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (customCrsId: string) => void;
}

export const CustomLambertModal: React.FC<CustomLambertModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [is2SP, setIs2SP] = useState(false);
  const [lat0, setLat0] = useState<string>('30.0');
  const [lon0, setLon0] = useState<string>('3.0');
  const [lat1, setLat1] = useState<string>('29.0');
  const [lat2, setLat2] = useState<string>('31.0');
  const [k0, setK0] = useState<string>('0.9996');
  const [x0, setX0] = useState<string>('500000');
  const [y0, setY0] = useState<string>('300000');
  const [ellipsoid, setEllipsoid] = useState<'clrk80ign' | 'WGS84' | 'intl'>('clrk80ign');
  const [dx, setDx] = useState<string>('-186');
  const [dy, setDy] = useState<string>('-89');
  const [dz, setDz] = useState<string>('184');

  // Test point
  const [testLon, setTestLon] = useState<string>('5.0682');
  const [testLat, setTestLat] = useState<string>('31.9314');
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConvert = () => {
    try {
      const crsId = registerCustomLCC({
        lat0: parseFloat(lat0),
        lon0: parseFloat(lon0),
        lat1: is2SP ? parseFloat(lat1) : parseFloat(lat0),
        lat2: is2SP ? parseFloat(lat2) : undefined,
        k0: is2SP ? undefined : parseFloat(k0),
        x0: parseFloat(x0),
        y0: parseFloat(y0),
        ellipsoid,
        dx: parseFloat(dx),
        dy: parseFloat(dy),
        dz: parseFloat(dz),
      });

      const res = convertCoordinates('EPSG:4326', crsId, [parseFloat(testLon), parseFloat(testLat)]);
      setTestResult(`X: ${res[0].toFixed(3)} m | Y: ${res[1].toFixed(3)} m`);
    } catch (err: unknown) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Invalid projection parameters'}`);
    }
  };

  const handleApply = () => {
    try {
      const crsId = registerCustomLCC({
        lat0: parseFloat(lat0),
        lon0: parseFloat(lon0),
        lat1: is2SP ? parseFloat(lat1) : parseFloat(lat0),
        lat2: is2SP ? parseFloat(lat2) : undefined,
        k0: is2SP ? undefined : parseFloat(k0),
        x0: parseFloat(x0),
        y0: parseFloat(y0),
        ellipsoid,
        dx: parseFloat(dx),
        dy: parseFloat(dy),
        dz: parseFloat(dz),
      });

      onRegistered(crsId);
      onClose();
    } catch (err: unknown) {
      alert(`Error applying projection: ${err instanceof Error ? err.message : 'Check parameters'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-100">
              Custom Lambert Conformal Conic (LCC) Builder
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4">
          Define specialized Lambert Conformal Conic parameters for local Algerian seismic grids, historical mining surveys, or regional Sahara exploration.
        </p>

        {/* 1SP vs 2SP Mode */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-4">
          <button
            onClick={() => setIs2SP(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              !is2SP ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Standard Parallel (1SP) with Scale Factor (k₀)
          </button>
          <button
            onClick={() => setIs2SP(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              is2SP ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2 Standard Parallels (2SP - Secant)
          </button>
        </div>

        {/* Parameters Form */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Central Meridian (lon_0, °E)
            </label>
            <input
              type="text"
              value={lon0}
              onChange={(e) => setLon0(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-400 font-mono"
              placeholder="e.g. 2.66667 or 3.0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Latitude of Origin (lat_0, °N)
            </label>
            <input
              type="text"
              value={lat0}
              onChange={(e) => setLat0(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-400 font-mono"
              placeholder="e.g. 36.0 or 33.3"
            />
          </div>

          {is2SP ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1st Standard Parallel (lat_1)
                </label>
                <input
                  type="text"
                  value={lat1}
                  onChange={(e) => setLat1(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2nd Standard Parallel (lat_2)
                </label>
                <input
                  type="text"
                  value={lat2}
                  onChange={(e) => setLat2(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Central Scale Factor (k_0)
              </label>
              <input
                type="text"
                value={k0}
                onChange={(e) => setK0(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                placeholder="0.999625769"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              False Easting (x_0, meters)
            </label>
            <input
              type="text"
              value={x0}
              onChange={(e) => setX0(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              placeholder="500000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              False Northing (y_0, meters)
            </label>
            <input
              type="text"
              value={y0}
              onChange={(e) => setY0(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              placeholder="300000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reference Ellipsoid</label>
            <select
              value={ellipsoid}
              onChange={(e) => setEllipsoid(e.target.value as 'clrk80ign' | 'WGS84' | 'intl')}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="clrk80ign">Clarke 1880 IGN (Algeria Standard)</option>
              <option value="WGS84">WGS 84 (GPS)</option>
              <option value="intl">International 1924 / Hayford</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Datum Shift to WGS84 (dx, dy, dz)
            </label>
            <div className="grid grid-cols-3 gap-1">
              <input
                type="text"
                value={dx}
                onChange={(e) => setDx(e.target.value)}
                placeholder="dx"
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-center font-mono text-slate-200"
              />
              <input
                type="text"
                value={dy}
                onChange={(e) => setDy(e.target.value)}
                placeholder="dy"
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-center font-mono text-slate-200"
              />
              <input
                type="text"
                value={dz}
                onChange={(e) => setDz(e.target.value)}
                placeholder="dz"
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-center font-mono text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Live Test Coordinate */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Live Coordinate Verification:</span>
            <button
              onClick={handleTestConvert}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              <Play className="w-3 h-3" />
              Test Transform
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <input
              type="text"
              value={testLon}
              onChange={(e) => setTestLon(e.target.value)}
              placeholder="Test Lon (5.0682)"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
            <input
              type="text"
              value={testLat}
              onChange={(e) => setTestLat(e.target.value)}
              placeholder="Test Lat (31.9314)"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
          {testResult && (
            <div className="text-xs font-mono font-bold text-emerald-400 bg-slate-900/80 p-1.5 rounded border border-emerald-500/30">
              {testResult}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Register & Apply Projection
          </button>
        </div>
      </div>
    </div>
  );
};
