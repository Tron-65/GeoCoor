/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  WorkspaceProject,
  TeamMember,
  INITIAL_TEAM_MEMBERS,
  generateShareToken,
  parseShareToken,
} from '../../services/teamSync';
import {
  X,
  Share2,
  Copy,
  Check,
  Cloud,
  CloudOff,
  Users,
  Clock,
  BookOpen,
  Plus,
  RefreshCw,
  FolderOpen,
  MapPin,
} from 'lucide-react';

interface TeamSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: WorkspaceProject;
  allWorkspaces: WorkspaceProject[];
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, description: string) => void;
  onImportWorkspace: (ws: Partial<WorkspaceProject>) => void;
  isOnline: boolean;
}

export const TeamSyncModal: React.FC<TeamSyncModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  allWorkspaces,
  onSelectWorkspace,
  onCreateWorkspace,
  onImportWorkspace,
  isOnline,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'team' | 'guide'>('sync');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [importTokenInput, setImportTokenInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // New workspace form
  const [showNewWsForm, setShowNewWsForm] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  if (!isOpen) return null;

  const shareToken = generateShareToken(activeWorkspace);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(shareToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?syncToken=${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    if (!importTokenInput.trim()) return;

    const parsed = parseShareToken(importTokenInput);
    if (!parsed) {
      setImportError('Invalid or corrupted sync token');
      return;
    }

    onImportWorkspace(parsed);
    setImportTokenInput('');
    onClose();
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName, newWsDesc);
    setShowNewWsForm(false);
    setNewWsName('');
    setNewWsDesc('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Team Cloud Synchronization & Field Collaboration
              </h3>
              <p className="text-xs text-slate-400">
                Synchronize GPS field points & boundaries between Sahara field camps and headquarters.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
              activeTab === 'sync' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Workspace Cloud Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
              activeTab === 'team' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Field Team & Activity</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
              activeTab === 'guide' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Algeria Geodesy Cheat-Sheet</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Workspace Selector Bar */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    Active Survey Project:
                  </label>
                  <button
                    onClick={() => setShowNewWsForm(!showNewWsForm)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Project
                  </button>
                </div>

                <select
                  value={activeWorkspace.id}
                  onChange={(e) => onSelectWorkspace(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 mb-2"
                >
                  {allWorkspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.points.length} points, {ws.boundaryVertices.length} vertices)
                    </option>
                  ))}
                </select>

                <p className="text-[11px] text-slate-400 italic">{activeWorkspace.description}</p>
              </div>

              {/* New Workspace Creation Form */}
              {showNewWsForm && (
                <form onSubmit={handleCreateNew} className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/40 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400">Create New Survey Workspace</h4>
                  <input
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. Rhourde El Baguel 3D Seismic Perimeter"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    placeholder="Short description for teammates..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewWsForm(false)}
                      className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Sync Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Cloud Sync Server Connected (Online)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>Sahara Field Offline Mode — Changes stored in local IndexedDB</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  Version: v{activeWorkspace.version}
                </span>
              </div>

              {/* Share Project Token */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Share Project with Field Crew / Algiers Office:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareToken}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate"
                  />
                  <button
                    onClick={handleCopyToken}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-slate-700 flex items-center gap-1.5"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
                  </button>
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                  </button>
                </div>
              </div>

              {/* Import Shared Project */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Import Shared Workspace Token:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={importTokenInput}
                    onChange={(e) => setImportTokenInput(e.target.value)}
                    placeholder="Paste Base64 Sync Token here..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                  <button
                    onClick={handleImportSubmit}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 border border-slate-700"
                  >
                    Import
                  </button>
                </div>
                {importError && (
                  <p className="text-xs text-rose-400 font-medium">{importError}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              {/* Team Members List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Active Survey Crew & Presence
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INITIAL_TEAM_MEMBERS.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shrink-0"
                        style={{ backgroundColor: m.avatarColor }}
                      >
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{m.name}</div>
                        <div className="text-[11px] text-amber-400 font-medium">{m.role}</div>
                        <div className="text-[10px] text-slate-500 truncate">{m.location} &bull; {m.lastActive}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recent Project Synchronization Log
                </h4>
                <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                  {activeWorkspace.activityLog.map((act) => (
                    <div key={act.id} className="p-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-200">{act.authorName} ({act.authorRole})</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{act.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">1. Nord Sahara 1959 vs WGS84 Datum Shift</h4>
                <p className="text-slate-400 mb-2">
                  Nord Sahara 1959 is based on the <strong>Clarke 1880 (IGN)</strong> ellipsoid. In Hassi Messaoud and the Sahara oil concessions, converting to WGS84 causes an approximate shift of ~<strong>78m in Easting</strong> and ~<strong>213m in Northing</strong>. Always confirm with Sonatrach or DP whether well coordinates are referenced to Nord Sahara or GPS WGS84!
                </p>
                <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  Standard Bursa-Wolf Shift: dx = -186m, dy = -89m, dz = +184m
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <h4 className="font-bold text-cyan-400 mb-1">2. Algerian UTM Zones Distribution</h4>
                <ul className="space-y-1 text-slate-400 list-disc list-inside">
                  <li><strong>UTM Zone 29N (6°W to 12°W):</strong> Tindouf, Gara Djebilet mine, borders with Mauritania & Western Sahara.</li>
                  <li><strong>UTM Zone 30N (0° to 6°W):</strong> Oran, Saoura, Béchar, Adrar, Reggane gas fields, Timimoun.</li>
                  <li><strong>UTM Zone 31N (0° to 6°E):</strong> Algiers, Blida, Djelfa, Ghardaïa, Ouargla, Hassi Messaoud, In Salah, Tamanrasset.</li>
                  <li><strong>UTM Zone 32N (6°E to 12°E):</strong> Constantine, Annaba, Illizi Basin, In Amenas, Tiguentourine, Djanet, Berkine Basin.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <h4 className="font-bold text-purple-400 mb-1">3. Lambert Conformal Conic (Voirol 1875 & 1960)</h4>
                <p className="text-slate-400">
                  Originates from the <strong>Colonne Voirol</strong> monument in Algiers. Divided into <strong>Lambert Nord</strong> (parallel 36°N / 40 grades) for northern coastal wilayas, and <strong>Lambert Sud</strong> (parallel 33.3°N / 37 grades) for the Hauts Plateaux and pre-Sahara transition. False Easting is 500,000m, False Northing is 300,000m.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
