/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ALGERIA_CRS_REGISTRY,
  convertCoordinates,
  formatDD,
  formatDMS,
  getCRSById,
} from './services/projections';
import {
  ALGERIA_FIELD_PRESETS,
  AlgeriaLocationPreset,
  SAMPLE_SITE_BOUNDARIES,
} from './services/algeriaGeoData';
import {
  WorkspaceProject,
  DEFAULT_WORKSPACE,
  loadWorkspacesFromStorage,
  saveWorkspacesToStorage,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  parseShareToken,
  TeamMember,
} from './services/teamSync';
import { BatchPoint } from './services/batchProcessor';
import { BoundaryVertex } from './services/boundaryCalculator';
import { SaharaMap } from './components/Map/SaharaMap';
import { SinglePointConverter } from './components/Converter/SinglePointConverter';
import { BatchProcessingView } from './components/Batch/BatchProcessingView';
import { SiteBoundaryView } from './components/Boundary/SiteBoundaryView';
import { CustomLambertModal } from './components/CustomLCC/CustomLambertModal';
import { TeamSyncModal } from './components/Sync/TeamSyncModal';
import { PWAInstallButton } from './components/PWA/PWAInstallButton';
import { useOnlineStatus } from './components/PWA/usePWAInstall';
import {
  Compass,
  MapPin,
  FileSpreadsheet,
  Layers,
  Cloud,
  Wifi,
  WifiOff,
  Navigation,
  Sliders,
  Check,
  ChevronRight,
  ShieldAlert,
  Info,
  Ruler,
} from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceProject[]>(() => loadWorkspacesFromStorage());
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => getActiveWorkspaceId());

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACE;
  }, [workspaces, activeWorkspaceId]);

  // Active View Tab: 'converter' | 'batch' | 'boundary' | 'map'
  const [activeTab, setActiveTab] = useState<'converter' | 'batch' | 'boundary' | 'map'>('converter');

  // Selected Coordinates for Map and Converter: [Lat, Lon] (Defaults to Hassi Messaoud)
  const [currentCoord, setCurrentCoord] = useState<[number, number]>([31.9314, 5.0682]);

  // Projections
  const [sourceCrsId, setSourceCrsId] = useState<string>(activeWorkspace.sourceCrsId || 'EPSG:4326');
  const [targetCrsId, setTargetCrsId] = useState<string>(activeWorkspace.targetCrsId || 'EPSG:30731');

  // Boundary vertices
  const [boundaryVertices, setBoundaryVertices] = useState<BoundaryVertex[]>(
    activeWorkspace.boundaryVertices || SAMPLE_SITE_BOUNDARIES[0].vertices.map((v, i) => ({
      id: `v_${i}`,
      label: v.label,
      lat: v.lat,
      lon: v.lon,
    }))
  );
  const [boundaryName, setBoundaryName] = useState<string>(
    activeWorkspace.boundaryName || 'Hassi Messaoud Production Concession'
  );

  // Map state
  const [mapDrawMode, setMapDrawMode] = useState<'select_point' | 'add_vertex' | 'measure'>('select_point');
  const [isOfflineMapMode, setIsOfflineMapMode] = useState<boolean>(!isOnline);

  // Modals
  const [isCustomLCCModalOpen, setIsCustomLCCModalOpen] = useState(false);
  const [isTeamSyncModalOpen, setIsTeamSyncModalOpen] = useState(false);

  // Auto-sync workspaces to storage
  useEffect(() => {
    saveWorkspacesToStorage(workspaces);
  }, [workspaces]);

  // Check URL query for shared syncToken
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('syncToken');
    if (token) {
      const parsed = parseShareToken(token);
      if (parsed) {
        handleImportWorkspace(parsed);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Update active workspace state
  const updateActiveWorkspace = (updater: (prev: WorkspaceProject) => WorkspaceProject) => {
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id === activeWorkspace.id) {
          return updater(w);
        }
        return w;
      })
    );
  };

  // Add single point to workspace
  const handleAddPointToWorkspace = (point: BatchPoint) => {
    updateActiveWorkspace((prev) => ({
      ...prev,
      points: [point, ...prev.points],
      updatedAt: Date.now(),
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: Date.now(),
          authorName: 'You',
          authorRole: 'Field Surveyor',
          action: 'added_point',
          details: `Added survey point "${point.label}" in ${targetCrsId}`,
        },
        ...prev.activityLog,
      ],
    }));
  };

  // Add batch points to workspace
  const handleAddBatchToWorkspace = (batchPoints: BatchPoint[]) => {
    updateActiveWorkspace((prev) => ({
      ...prev,
      points: [...batchPoints, ...prev.points],
      updatedAt: Date.now(),
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: Date.now(),
          authorName: 'You',
          authorRole: 'Field Surveyor',
          action: 'batch_converted',
          details: `Imported ${batchPoints.length} converted survey points into project`,
        },
        ...prev.activityLog,
      ],
    }));
    setActiveTab('converter');
  };

  // Update boundary vertices
  const handleUpdateBoundaryVertices = (newVertices: BoundaryVertex[]) => {
    setBoundaryVertices(newVertices);
    updateActiveWorkspace((prev) => ({
      ...prev,
      boundaryVertices: newVertices,
      updatedAt: Date.now(),
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: Date.now(),
          authorName: 'You',
          authorRole: 'Field Surveyor',
          action: 'modified_boundary',
          details: `Updated perimeter boundary (${newVertices.length} vertices)`,
        },
        ...prev.activityLog,
      ],
    }));
  };

  // Create new workspace
  const handleCreateWorkspace = (name: string, description: string) => {
    const newWs: WorkspaceProject = {
      id: `ws_${Date.now()}`,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncedAt: Date.now(),
      sourceCrsId,
      targetCrsId,
      boundaryName: `${name} Boundary`,
      boundaryVertices: [],
      points: [],
      version: 1,
      syncStatus: 'synced',
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: Date.now(),
          authorName: 'You',
          authorRole: 'Field Surveyor',
          action: 'synced_cloud',
          details: `Created new project workspace: ${name}`,
        },
      ],
    };
    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceIdState(newWs.id);
    setActiveWorkspaceId(newWs.id);
  };

  // Import workspace
  const handleImportWorkspace = (imported: Partial<WorkspaceProject>) => {
    const newWs: WorkspaceProject = {
      id: `ws_imp_${Date.now()}`,
      name: imported.name || 'Imported Workspace',
      description: imported.description || 'Imported from cloud team sync',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSyncedAt: Date.now(),
      sourceCrsId: imported.sourceCrsId || 'EPSG:4326',
      targetCrsId: imported.targetCrsId || 'EPSG:30731',
      boundaryName: imported.boundaryName || 'Concession Perimeter',
      boundaryVertices: imported.boundaryVertices || [],
      points: imported.points || [],
      version: 1,
      syncStatus: 'synced',
      activityLog: [
        {
          id: `act_${Date.now()}`,
          timestamp: Date.now(),
          authorName: 'Cloud Team',
          authorRole: 'Collaborator',
          action: 'synced_cloud',
          details: `Imported shared workspace token with ${imported.points?.length || 0} points`,
        },
      ],
    };

    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceIdState(newWs.id);
    setActiveWorkspaceId(newWs.id);
    if (newWs.boundaryVertices.length > 0) {
      setBoundaryVertices(newWs.boundaryVertices);
    }
  };

  // Handle Map Point Selection
  const handleSelectCoordFromMap = (lat: number, lon: number) => {
    setCurrentCoord([lat, lon]);
  };

  // Trigger draw on map mode from Boundary view
  const handleActivateDrawMode = () => {
    setMapDrawMode('add_vertex');
    setActiveTab('map');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Field Operations Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40 border border-amber-400/30">
              <Compass className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-100">
                  GeoFree <span className="text-amber-500">Algeria</span>
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase">
                  Sahara Field GIS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                UTM &bull; Nord Sahara 1959 &bull; Lambert Conformal Conic (NTA) &bull; WGS84
              </p>
            </div>
          </div>

          {/* Right Status & Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Online / Sahara Offline Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                isOnline
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700/60 animate-pulse'
              }`}
              title={isOnline ? 'Online with cloud synchronization active' : 'Offline in Sahara — 100% local operation'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sahara Offline</span>
                </>
              )}
            </div>

            {/* Team Sync & Workspace Button */}
            <button
              onClick={() => setIsTeamSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
              title="Cloud team synchronization and workspaces"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline truncate max-w-[140px]">{activeWorkspace.name.split('-')[0]}</span>
              <span className="sm:hidden">Team</span>
            </button>

            {/* In-App PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2 border-t border-slate-800/60 no-scrollbar">
          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'converter'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Point Converter (geofree)</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'batch'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Batch GPS Processing</span>
          </button>

          <button
            onClick={() => setActiveTab('boundary')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'boundary'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Site Boundaries & Concessions</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('map');
              setMapDrawMode('select_point');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Interactive Sahara Map</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Offline Notice Banner if Disconnected */}
        {!isOnline && (
          <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>
                <strong>Sahara Field Offline Mode Active:</strong> All geodetic calculations, Proj4 conversions, boundary area calculations, and vector map navigation are running 100% locally on your device without internet.
              </span>
            </div>
            <button
              onClick={() => setIsOfflineMapMode(true)}
              className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400 transition"
            >
              Use Vector Basemap
            </button>
          </div>
        )}

        {/* Split View for Converter / Map: Interactive Map Always Available */}
        {activeTab === 'converter' && (
          <div className="space-y-6">
            <SinglePointConverter
              currentCoord={currentCoord}
              onSelectCoord={handleSelectCoordFromMap}
              onAddPointToWorkspace={handleAddPointToWorkspace}
              onOpenCustomLCC={() => setIsCustomLCCModalOpen(true)}
              activeSourceCrsId={sourceCrsId}
              activeTargetCrsId={targetCrsId}
              onSourceCrsChange={setSourceCrsId}
              onTargetCrsChange={setTargetCrsId}
            />

            {/* Embedded Sahara Map for Point Visual Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Sahara Visual Target Verification & Pinpoint
                </h3>
                <span className="text-[11px] text-slate-400">
                  Target: <strong>{currentCoord[0].toFixed(5)}°N, {currentCoord[1].toFixed(5)}°E</strong>
                </span>
              </div>
              <SaharaMap
                selectedCoord={currentCoord}
                onSelectCoord={handleSelectCoordFromMap}
                boundaryVertices={boundaryVertices}
                onUpdateBoundaryVertices={handleUpdateBoundaryVertices}
                activeCrsId={targetCrsId}
                drawMode="select_point"
                isOfflineMode={isOfflineMapMode}
                onToggleOfflineMode={setIsOfflineMapMode}
              />
            </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <BatchProcessingView
            onAddBatchToWorkspace={handleAddBatchToWorkspace}
            onSendPointToMap={(lat, lon) => {
              setCurrentCoord([lat, lon]);
              setActiveTab('map');
            }}
            defaultSourceCrsId={sourceCrsId}
            defaultTargetCrsId={targetCrsId}
          />
        )}

        {activeTab === 'boundary' && (
          <div className="space-y-6">
            <SiteBoundaryView
              vertices={boundaryVertices}
              onUpdateVertices={handleUpdateBoundaryVertices}
              boundaryName={boundaryName}
              onUpdateBoundaryName={setBoundaryName}
              activeCrsId={targetCrsId}
              onActivateDrawMode={handleActivateDrawMode}
              workspacePoints={activeWorkspace.points}
              workspaceName={activeWorkspace.name}
            />

            {/* Map Preview of Boundary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Real-Time Concession Perimeter Overlay
                </h3>
                <span className="text-[11px] text-slate-400">
                  {boundaryVertices.length} perimeter vertices drawn
                </span>
              </div>
              <SaharaMap
                selectedCoord={currentCoord}
                onSelectCoord={handleSelectCoordFromMap}
                boundaryVertices={boundaryVertices}
                onUpdateBoundaryVertices={handleUpdateBoundaryVertices}
                activeCrsId={targetCrsId}
                drawMode={mapDrawMode}
                onChangeDrawMode={setMapDrawMode}
                isOfflineMode={isOfflineMapMode}
                onToggleOfflineMode={setIsOfflineMapMode}
              />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Full-Screen Sahara Field GIS Map
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pinpoint wells, draw boundary concessions, and measure distances across Algerian oil basins.
                </p>
              </div>

              {/* Mode Selector for Map */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold flex-wrap">
                <button
                  onClick={() => setMapDrawMode('select_point')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    mapDrawMode === 'select_point'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Pinpoint Target
                </button>
                <button
                  onClick={() => setMapDrawMode('add_vertex')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    mapDrawMode === 'add_vertex'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Add Boundary Vertex
                </button>
                <button
                  onClick={() => setMapDrawMode('measure')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                    mapDrawMode === 'measure'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Measure Distance
                </button>
              </div>
            </div>

            <SaharaMap
              selectedCoord={currentCoord}
              onSelectCoord={handleSelectCoordFromMap}
              boundaryVertices={boundaryVertices}
              onUpdateBoundaryVertices={handleUpdateBoundaryVertices}
              activeCrsId={targetCrsId}
              drawMode={mapDrawMode}
              onChangeDrawMode={setMapDrawMode}
              isOfflineMode={isOfflineMapMode}
              onToggleOfflineMode={setIsOfflineMapMode}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">GeoFree Algeria</span>
            <span>&bull;</span>
            <span>Geodesy & Field Surveying Suite for the Sahara</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Nord Sahara 1959</span>
            <span>&bull;</span>
            <span>Voirol 1875 & 1960 NTA</span>
            <span>&bull;</span>
            <span>UTM Zones 29N - 32N</span>
          </div>
        </div>
      </footer>

      {/* Custom Lambert Modal */}
      <CustomLambertModal
        isOpen={isCustomLCCModalOpen}
        onClose={() => setIsCustomLCCModalOpen(false)}
        onRegistered={(customId) => {
          setTargetCrsId(customId);
        }}
      />

      {/* Team Sync Modal */}
      <TeamSyncModal
        isOpen={isTeamSyncModalOpen}
        onClose={() => setIsTeamSyncModalOpen(false)}
        activeWorkspace={activeWorkspace}
        allWorkspaces={workspaces}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceIdState(id);
          setActiveWorkspaceId(id);
          const ws = workspaces.find((w) => w.id === id);
          if (ws) {
            setSourceCrsId(ws.sourceCrsId);
            setTargetCrsId(ws.targetCrsId);
            setBoundaryVertices(ws.boundaryVertices);
            setBoundaryName(ws.boundaryName);
          }
        }}
        onCreateWorkspace={handleCreateWorkspace}
        onImportWorkspace={handleImportWorkspace}
        isOnline={isOnline}
      />
    </div>
  );
}
