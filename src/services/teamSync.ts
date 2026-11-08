/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoundaryVertex } from './boundaryCalculator';
import { BatchPoint } from './batchProcessor';

export interface TeamMember {
  id: string;
  name: string;
  role: 'Party Chief' | 'Lead Surveyor' | 'Geodesist' | 'GIS Specialist' | 'Field Tech';
  location: string;
  avatarColor: string;
  lastActive: string;
}

export interface SyncActivityEvent {
  id: string;
  timestamp: number;
  authorName: string;
  authorRole: string;
  action: 'added_point' | 'modified_boundary' | 'batch_converted' | 'exported_kml' | 'synced_cloud';
  details: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt?: number;
  sourceCrsId: string;
  targetCrsId: string;
  points: BatchPoint[];
  boundaryVertices: BoundaryVertex[];
  boundaryName: string;
  version: number;
  syncStatus: 'synced' | 'pending_sync' | 'offline';
  activityLog: SyncActivityEvent[];
}

const STORAGE_KEY = 'geofree_dz_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'geofree_dz_active_workspace_id';

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'mem_1',
    name: 'You (Field Surveyor)',
    role: 'Lead Surveyor',
    location: 'Hassi Messaoud Base',
    avatarColor: '#f59e0b',
    lastActive: 'Now (Active)',
  },
  {
    id: 'mem_2',
    name: 'Karim B. (Sonatrach DP)',
    role: 'Party Chief',
    location: 'Algiers Headquarters',
    avatarColor: '#10b981',
    lastActive: '5 min ago',
  },
  {
    id: 'mem_3',
    name: 'Yacine M. (Petroleum GIS)',
    role: 'Geodesist',
    location: 'In Amenas Base Camp',
    avatarColor: '#06b6d4',
    lastActive: '23 min ago',
  },
  {
    id: 'mem_4',
    name: 'Amina T. (Field Crew 4)',
    role: 'GIS Specialist',
    location: 'Berkine Basin Rig #14',
    avatarColor: '#8b5cf6',
    lastActive: '1 hr ago',
  },
];

export const DEFAULT_WORKSPACE: WorkspaceProject = {
  id: 'ws_hmd_survey',
  name: 'Hassi Messaoud Concession - Field Survey 2026',
  description: 'Sonatrach DP geodetic point alignment and boundary perimeter verification for Block 438/MD.',
  createdAt: Date.now() - 86400000 * 3,
  updatedAt: Date.now() - 3600000,
  lastSyncedAt: Date.now() - 3600000,
  sourceCrsId: 'EPSG:4326',
  targetCrsId: 'EPSG:30731',
  boundaryName: 'Hassi Messaoud Production Concession',
  syncStatus: 'synced',
  points: [
    {
      id: 'pt_hmd_1',
      index: 1,
      label: 'MD-1 Discovery Wellhead',
      sourceX: 5.0682,
      sourceY: 31.9314,
      sourceZ: 152,
      targetX: 695594.293,
      targetY: 3534485.69,
      targetZ: 152,
      wgs84Lat: 31.9314,
      wgs84Lon: 5.0682,
      dmsLat: '31° 55\' 53.040" N',
      dmsLon: '5° 04\' 05.520" E',
      ddmLat: '31° 55.8840\' N',
      ddmLon: '5° 04.0920\' E',
      convergenceDeg: 0.03608,
      scaleFactor: 1.00007,
      isValid: true,
    },
    {
      id: 'pt_hmd_2',
      index: 2,
      label: 'CPF Base 24 Février Control Point',
      sourceX: 5.0845,
      sourceY: 31.9421,
      sourceZ: 148,
      targetX: 697126.84,
      targetY: 3535702.12,
      targetZ: 148,
      wgs84Lat: 31.9421,
      wgs84Lon: 5.0845,
      dmsLat: '31° 56\' 31.560" N',
      dmsLon: '5° 05\' 04.200" E',
      ddmLat: '31° 56.5260\' N',
      ddmLon: '5° 05.0700\' E',
      convergenceDeg: 0.0448,
      scaleFactor: 1.00008,
      isValid: true,
    },
    {
      id: 'pt_hmd_3',
      index: 3,
      label: 'Haoud El Hamra Oil Terminal Dispatch',
      sourceX: 5.2912,
      sourceY: 31.8974,
      sourceZ: 160,
      targetX: 716712.45,
      targetY: 3531124.90,
      targetZ: 160,
      wgs84Lat: 31.8974,
      wgs84Lon: 5.2912,
      dmsLat: '31° 53\' 50.640" N',
      dmsLon: '5° 17\' 28.320" E',
      ddmLat: '31° 53.8440\' N',
      ddmLon: '5° 17.4720\' E',
      convergenceDeg: 0.1542,
      scaleFactor: 1.00018,
      isValid: true,
    },
  ],
  boundaryVertices: [
    { id: 'v1', label: 'HMD-NW', lat: 32.1200, lon: 4.8800 },
    { id: 'v2', label: 'HMD-NE', lat: 32.1500, lon: 5.3500 },
    { id: 'v3', label: 'HMD-E',  lat: 31.8500, lon: 5.4200 },
    { id: 'v4', label: 'HMD-SE', lat: 31.6800, lon: 5.2500 },
    { id: 'v5', label: 'HMD-SW', lat: 31.7200, lon: 4.8000 },
    { id: 'v6', label: 'HMD-W',  lat: 31.9200, lon: 4.7500 },
  ],
  version: 1,
  activityLog: [
    {
      id: 'act_1',
      timestamp: Date.now() - 3600000 * 48,
      authorName: 'Karim B.',
      authorRole: 'Party Chief',
      action: 'synced_cloud',
      details: 'Created workspace and defined HMD Concession perimeter vertices',
    },
    {
      id: 'act_2',
      timestamp: Date.now() - 3600000 * 2,
      authorName: 'You',
      authorRole: 'Lead Surveyor',
      action: 'added_point',
      details: 'Added MD-1 and Haoud El Hamra reference survey points in UTM 31N',
    },
  ],
};

export function loadWorkspacesFromStorage(): WorkspaceProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveWorkspacesToStorage([DEFAULT_WORKSPACE]);
      return [DEFAULT_WORKSPACE];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_WORKSPACE];
  } catch (err) {
    console.error('Failed to load workspaces from localStorage:', err);
    return [DEFAULT_WORKSPACE];
  }
}

export function saveWorkspacesToStorage(workspaces: WorkspaceProject[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  } catch (err) {
    console.error('Failed to save workspaces to localStorage:', err);
  }
}

export function getActiveWorkspaceId(): string {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || DEFAULT_WORKSPACE.id;
  } catch {
    return DEFAULT_WORKSPACE.id;
  }
}

export function setActiveWorkspaceId(id: string) {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch (err) {
    console.error('Failed to set active workspace:', err);
  }
}

// Generate base64 share token for cross-device / field cloud sync
export function generateShareToken(ws: WorkspaceProject): string {
  const payload = {
    v: 1,
    id: ws.id,
    n: ws.name,
    d: ws.description,
    sc: ws.sourceCrsId,
    tc: ws.targetCrsId,
    bn: ws.boundaryName,
    bv: ws.boundaryVertices.map((v) => [v.label, v.lat, v.lon]),
    pts: ws.points.slice(0, 100).map((p) => [p.label, p.sourceX, p.sourceY, p.sourceZ || 0]),
    ts: Date.now(),
  };

  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (e) {
    console.error('Token generation error:', e);
    return '';
  }
}

// Import workspace from share token
export function parseShareToken(token: string): Partial<WorkspaceProject> | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(token.trim())));
    const p = JSON.parse(jsonStr);
    if (!p || !p.n) return null;

    const vertices: BoundaryVertex[] = (p.bv || []).map((v: [string, number, number], i: number) => ({
      id: `imp_v_${i}`,
      label: v[0],
      lat: v[1],
      lon: v[2],
    }));

    const points: BatchPoint[] = (p.pts || []).map((pt: [string, number, number, number], i: number) => ({
      id: `imp_pt_${i}`,
      index: i + 1,
      label: pt[0],
      sourceX: pt[1],
      sourceY: pt[2],
      sourceZ: pt[3],
      isValid: true,
    }));

    return {
      name: p.n,
      description: p.d || 'Imported Team Workspace',
      sourceCrsId: p.sc || 'EPSG:4326',
      targetCrsId: p.tc || 'EPSG:30731',
      boundaryName: p.bn || 'Imported Boundary',
      boundaryVertices: vertices,
      points,
      updatedAt: Date.now(),
    };
  } catch (err) {
    console.error('Failed to parse share token:', err);
    return null;
  }
}
