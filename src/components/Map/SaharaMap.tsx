/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  ALGERIA_FIELD_PRESETS,
  AlgeriaLocationPreset,
  ALGERIA_BORDER_GEOJSON_COORDS,
  SAHARA_BASINS,
} from '../../services/algeriaGeoData';
import { BoundaryVertex, getCompassDirection } from '../../services/boundaryCalculator';
import {
  convertCoordinates,
  getCRSById,
  formatMeters,
  calculateDistanceMeters,
  calculateAzimuth,
} from '../../services/projections';
import {
  searchAlgerianLocations,
  GeocodingResult,
} from '../../services/geocodingService';
import {
  MapPin,
  Layers,
  Crosshair,
  Maximize2,
  Compass,
  Radio,
  WifiOff,
  Navigation,
  Eye,
  PlusCircle,
  Search,
  X,
  Loader2,
  Fuel,
  Building2,
  Globe,
  Sparkles,
  Ruler,
  Undo2,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface SaharaMapProps {
  selectedCoord: [number, number]; // [lat, lon]
  onSelectCoord: (lat: number, lon: number) => void;
  boundaryVertices: BoundaryVertex[];
  onUpdateBoundaryVertices?: (vertices: BoundaryVertex[]) => void;
  activeCrsId: string;
  drawMode: 'select_point' | 'add_vertex' | 'measure';
  onChangeDrawMode?: (mode: 'select_point' | 'add_vertex' | 'measure') => void;
  isOfflineMode: boolean;
  onToggleOfflineMode: (offline: boolean) => void;
}

export const SaharaMap: React.FC<SaharaMapProps> = ({
  selectedCoord,
  onSelectCoord,
  boundaryVertices,
  onUpdateBoundaryVertices,
  activeCrsId,
  drawMode,
  onChangeDrawMode,
  isOfflineMode,
  onToggleOfflineMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const vertexMarkersRef = useRef<L.CircleMarker[]>([]);
  const measurePolylineRef = useRef<L.Polyline | null>(null);
  const measureMarkersRef = useRef<L.CircleMarker[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Synchronize dynamic callback & mode references to avoid stale closures in Leaflet events
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const onSelectCoordRef = useRef(onSelectCoord);
  onSelectCoordRef.current = onSelectCoord;
  const onUpdateBoundaryVerticesRef = useRef(onUpdateBoundaryVertices);
  onUpdateBoundaryVerticesRef.current = onUpdateBoundaryVertices;
  const boundaryVerticesRef = useRef(boundaryVertices);
  boundaryVerticesRef.current = boundaryVertices;

  const [mapLayer, setMapLayer] = useState<'satellite' | 'street' | 'topo'>('satellite');
  const [crosshairCoord, setCrosshairCoord] = useState<[number, number]>(selectedCoord);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('hassi_messaoud');

  // Compute total path distance and segment breakdown
  const measurementData = useMemo(() => {
    if (measurePoints.length < 2) {
      return {
        totalMeters: 0,
        totalKm: 0,
        segments: [] as {
          fromIndex: number;
          toIndex: number;
          distMeters: number;
          distKm: number;
          azimuth: number;
          compass: string;
        }[],
      };
    }

    let totalMeters = 0;
    const segments = [];

    for (let i = 0; i < measurePoints.length - 1; i++) {
      const p1 = measurePoints[i];
      const p2 = measurePoints[i + 1];
      const distMeters = calculateDistanceMeters(p1[0], p1[1], p2[0], p2[1]);
      const az = calculateAzimuth(p1[0], p1[1], p2[0], p2[1]);
      const compass = getCompassDirection(az);
      totalMeters += distMeters;
      segments.push({
        fromIndex: i + 1,
        toIndex: i + 2,
        distMeters,
        distKm: distMeters / 1000,
        azimuth: az,
        compass,
      });
    }

    return {
      totalMeters,
      totalKm: totalMeters / 1000,
      segments,
    };
  }, [measurePoints]);

  // Geocoding Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Custom SVG DivIcon for Leaflet pinpoint
  const createCustomIcon = (color = '#f59e0b', label = '') => {
    return L.divIcon({
      className: 'custom-field-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.6); border: 2px solid #ffffff;">
            <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
          </div>
          ${label ? `<span style="background: rgba(15,23,42,0.85); color: #f8fafc; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); margin-top: 4px; white-space: nowrap;">${label}</span>` : ''}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  };

  // Convert coordinate to active CRS for tooltip display
  const getFormattedActiveCoords = useCallback((lat: number, lon: number) => {
    const crs = getCRSById(activeCrsId);
    if (!crs) return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
    if (crs.isProjected) {
      try {
        const proj = convertCoordinates('EPSG:4326', activeCrsId, [lon, lat]);
        return `X: ${formatMeters(proj[0])} | Y: ${formatMeters(proj[1])}`;
      } catch {
        return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
      }
    }
    return `${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`;
  }, [activeCrsId]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || isOfflineMode) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: selectedCoord,
        zoom: 7,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Base tile layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      });

      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri World Imagery',
          maxZoom: 18,
        }
      );

      const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap contributors',
        maxZoom: 17,
      });

      if (mapLayer === 'satellite') satelliteLayer.addTo(map);
      else if (mapLayer === 'street') osmLayer.addTo(map);
      else topoLayer.addTo(map);

      // Main Pinpoint Marker
      const marker = L.marker(selectedCoord, {
        draggable: true,
        icon: createCustomIcon('#f59e0b', 'Field Target'),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onSelectCoordRef.current(pos.lat, pos.lng);
      });

      markerRef.current = marker;

      // Click event on map
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCrosshairCoord([lat, lng]);

        const currentMode = drawModeRef.current;
        if (currentMode === 'select_point') {
          onSelectCoordRef.current(lat, lng);
          marker.setLatLng([lat, lng]);
        } else if (currentMode === 'add_vertex' && onUpdateBoundaryVerticesRef.current) {
          const currentVertices = boundaryVerticesRef.current;
          const nextIndex = currentVertices.length + 1;
          const newVertex: BoundaryVertex = {
            id: `v_${Date.now()}_${nextIndex}`,
            label: `P-${nextIndex}`,
            lat,
            lon: lng,
          };
          onUpdateBoundaryVerticesRef.current([...currentVertices, newVertex]);
        } else if (currentMode === 'measure') {
          setMeasurePoints((prev) => [...prev, [lat, lng]]);
        }
      });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCrosshairCoord([e.latlng.lat, e.latlng.lng]);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOfflineMode]);

  // Update Tile Layer dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || isOfflineMode) return;
    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let newTileLayer: L.TileLayer;
    if (mapLayer === 'satellite') {
      newTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Esri Satellite',
      });
    } else if (mapLayer === 'street') {
      newTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'OpenStreetMap',
      });
    } else {
      newTileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'OpenTopoMap',
      });
    }

    newTileLayer.addTo(map);
  }, [mapLayer, isOfflineMode]);

  // Update Marker position when selectedCoord prop changes
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng(selectedCoord);
      const coordLabel = getFormattedActiveCoords(selectedCoord[0], selectedCoord[1]);
      markerRef.current.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
          <strong style="color: #d97706;">Selected Target</strong><br/>
          <b>CRS:</b> ${activeCrsId}<br/>
          <b>Coords:</b> ${coordLabel}<br/>
          <b>WGS84:</b> ${selectedCoord[0].toFixed(5)}°, ${selectedCoord[1].toFixed(5)}°
        </div>
      `);
    }
  }, [selectedCoord, activeCrsId, getFormattedActiveCoords]);

  // Render Site Boundary Polygon on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || isOfflineMode) return;
    const map = mapInstanceRef.current;

    // Clear old polygon and vertex markers
    if (polygonRef.current) {
      map.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    vertexMarkersRef.current.forEach((m) => map.removeLayer(m));
    vertexMarkersRef.current = [];

    if (boundaryVertices.length >= 3) {
      const latlngs: [number, number][] = boundaryVertices.map((v) => [v.lat, v.lon]);

      const poly = L.polygon(latlngs, {
        color: '#f59e0b',
        weight: 3,
        fillColor: '#fbbf24',
        fillOpacity: 0.25,
        dashArray: '6, 6',
      }).addTo(map);

      polygonRef.current = poly;

      // Add draggable circle markers for each vertex
      boundaryVertices.forEach((v, idx) => {
        const cMarker = L.circleMarker([v.lat, v.lon], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#d97706',
          fillOpacity: 1,
        }).addTo(map);

        cMarker.bindTooltip(`<b>${v.label}</b><br/>${v.lat.toFixed(4)}°, ${v.lon.toFixed(4)}°`, {
          permanent: false,
          direction: 'top',
        });

        vertexMarkersRef.current.push(cMarker);
      });
    }
  }, [boundaryVertices, isOfflineMode]);

  // Render Distance Measurement Polyline and Markers on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || isOfflineMode) return;
    const map = mapInstanceRef.current;

    // Clean up old measurement layers
    if (measurePolylineRef.current) {
      map.removeLayer(measurePolylineRef.current);
      measurePolylineRef.current = null;
    }
    measureMarkersRef.current.forEach((m) => map.removeLayer(m));
    measureMarkersRef.current = [];

    if (measurePoints.length === 0) return;

    // If 2 or more points, draw line
    if (measurePoints.length >= 2) {
      const poly = L.polyline(measurePoints, {
        color: '#06b6d4',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '6, 6',
      }).addTo(map);
      measurePolylineRef.current = poly;
    }

    // Place circle markers at each measure point
    measurePoints.forEach((pt, idx) => {
      const circle = L.circleMarker(pt, {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 1,
      }).addTo(map);

      let tooltipText = `<b>Point ${idx + 1}</b> (Start)`;
      if (idx > 0) {
        // Calculate cumulative distance up to this point
        let cumMeters = 0;
        for (let i = 0; i < idx; i++) {
          cumMeters += calculateDistanceMeters(
            measurePoints[i][0],
            measurePoints[i][1],
            measurePoints[i + 1][0],
            measurePoints[i + 1][1]
          );
        }
        const legMeters = calculateDistanceMeters(
          measurePoints[idx - 1][0],
          measurePoints[idx - 1][1],
          pt[0],
          pt[1]
        );
        tooltipText = `<b>Point ${idx + 1}</b><br/>Leg: ${(legMeters / 1000).toFixed(3)} km (${Math.round(legMeters).toLocaleString()} m)<br/>Total: ${(cumMeters / 1000).toFixed(3)} km (${Math.round(cumMeters).toLocaleString()} m)`;
      }

      circle.bindTooltip(tooltipText, {
        permanent: false,
        direction: 'top',
        className: 'measure-tooltip',
      });

      measureMarkersRef.current.push(circle);
    });
  }, [measurePoints, isOfflineMode]);

  // OFFLINE VECTOR CANVAS ENGINE
  // Renders complete Algeria geography, wilayas, desert basins, coordinate grid lines,
  // target crosshairs and boundary polygons onto HTML5 Canvas without network access!
  useEffect(() => {
    if (!isOfflineMode || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size
    const width = canvas.width;
    const height = canvas.height;

    // Algeria Geographic Bounds: Lon [-9, 12], Lat [19, 38]
    const minLon = -9.2;
    const maxLon = 12.5;
    const minLat = 18.5;
    const maxLat = 37.8;

    const lonToX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
    const latToY = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * height;

    // 1. Fill Deep Desert Radar / Dark Terrain Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#090d16');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Graticule Grid (Geodetic lines every 2 degrees)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let lat = 20; lat <= 36; lat += 2) {
      const y = latToY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`${lat}°N`, 8, y - 3);
    }

    for (let lon = -8; lon <= 12; lon += 2) {
      const x = lonToX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      const label = lon < 0 ? `${Math.abs(lon)}°W` : `${lon}°E`;
      ctx.fillText(label, x + 3, height - 10);
    }
    ctx.setLineDash([]);

    // 3. Sahara Basins Shading
    SAHARA_BASINS.forEach((basin) => {
      ctx.beginPath();
      basin.coords.forEach(([lon, lat], i) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = basin.color + '15'; // low opacity fill
      ctx.fill();
      ctx.strokeStyle = basin.color + '40';
      ctx.lineWidth = 1;
      ctx.stroke();

      const cx = lonToX(basin.center[1]);
      const cy = latToY(basin.center[0]);
      ctx.fillStyle = basin.color + 'aa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(basin.name, cx, cy);
      ctx.textAlign = 'start';
    });

    // 4. Algeria National Border Outline
    ctx.beginPath();
    ALGERIA_BORDER_GEOJSON_COORDS.forEach(([lon, lat], i) => {
      const x = lonToX(lon);
      const y = latToY(lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
    ctx.fill();

    // 5. Preset Fields & Survey Stations
    ALGERIA_FIELD_PRESETS.forEach((preset) => {
      const px = lonToX(preset.lon);
      const py = latToY(preset.lat);

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = preset.type === 'oil_field' || preset.type === 'gas_field' ? '#f59e0b' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px sans-serif';
      ctx.fillText(preset.name.split(' ')[0], px + 5, py + 3);
    });

    // 6. Draw Site Boundary Polygon (if any)
    if (boundaryVertices.length >= 3) {
      ctx.beginPath();
      boundaryVertices.forEach((v, idx) => {
        const x = lonToX(v.lon);
        const y = latToY(v.lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Vertices dots
      boundaryVertices.forEach((v) => {
        const vx = lonToX(v.lon);
        const vy = latToY(v.lat);
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // 7. Selected Coordinate Pin & Reticle
    const sx = lonToX(selectedCoord[1]);
    const sy = latToY(selectedCoord[0]);

    // Reticle
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx - 18, sy);
    ctx.lineTo(sx + 18, sy);
    ctx.moveTo(sx, sy - 18);
    ctx.lineTo(sx, sy + 18);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.fillRect(sx + 12, sy - 24, 180, 22);
    ctx.strokeRect(sx + 12, sy - 24, 180, 22);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${selectedCoord[0].toFixed(4)}°N, ${selectedCoord[1].toFixed(4)}°E`, sx + 18, sy - 10);

    // 8. Distance Measurement Polyline & Points (Offline Canvas)
    if (measurePoints.length > 0) {
      if (measurePoints.length >= 2) {
        ctx.beginPath();
        measurePoints.forEach(([lat, lon], idx) => {
          const x = lonToX(lon);
          const y = latToY(lat);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      measurePoints.forEach(([lat, lon], idx) => {
        const x = lonToX(lon);
        const y = latToY(lat);

        // Halo
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fill();

        // Marker dot
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label badge: P1, P2...
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(x + 7, y - 14, 24, 13);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 7, y - 14, 24, 13);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`P${idx + 1}`, x + 10, y - 4);
      });
    }
  }, [isOfflineMode, selectedCoord, boundaryVertices, measurePoints]);

  // Handle Canvas Click in Offline Mode
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const minLon = -9.2;
    const maxLon = 12.5;
    const minLat = 18.5;
    const maxLat = 37.8;

    const lon = minLon + (x / width) * (maxLon - minLon);
    const lat = minLat + (1 - y / height) * (maxLat - minLat);

    if (drawMode === 'select_point') {
      onSelectCoord(lat, lon);
    } else if (drawMode === 'add_vertex' && onUpdateBoundaryVertices) {
      const nextIndex = boundaryVertices.length + 1;
      const newVertex: BoundaryVertex = {
        id: `v_${Date.now()}_${nextIndex}`,
        label: `P-${nextIndex}`,
        lat,
        lon,
      };
      onUpdateBoundaryVertices([...boundaryVertices, newVertex]);
    } else if (drawMode === 'measure') {
      setMeasurePoints((prev) => [...prev, [lat, lon]]);
    }
  };

  // Jump to Preset Location
  const handleJumpToPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = ALGERIA_FIELD_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    onSelectCoord(preset.lat, preset.lon);

    if (mapInstanceRef.current && !isOfflineMode) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lon], 11, {
        duration: 1.2,
      });
    }
  };

  // Debounced Geocoding Search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAlgerianLocations(trimmed, controller.signal);
        setSearchResults(results);
        setIsSearchOpen(true);
        setActiveResultIndex(results.length > 0 ? 0 : -1);
      } catch {
        // Handled in geocoding service
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fly Camera to Selected Geocoded Location
  const handleSelectLocation = (location: GeocodingResult) => {
    onSelectCoord(location.lat, location.lon);
    setCrosshairCoord([location.lat, location.lon]);
    setIsSearchOpen(false);
    setSearchQuery(location.shortName);

    // Provide camera fly confirmation notice
    setCameraNotice(`Camera flown to ${location.shortName} (${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E)`);
    setTimeout(() => setCameraNotice(null), 3800);

    if (mapInstanceRef.current && !isOfflineMode) {
      const map = mapInstanceRef.current;

      // Smart zoom based on category
      let targetZoom = 11;
      if (location.category === 'wilaya') targetZoom = 9;
      else if (location.category === 'oilfield' || location.category === 'landmark') targetZoom = 12;
      else if (location.category === 'oasis') targetZoom = 11;

      if (location.boundingBox && location.boundingBox.length === 4) {
        const [minLat, maxLat, minLon, maxLon] = location.boundingBox;
        map.flyToBounds(
          [
            [minLat, minLon],
            [maxLat, maxLon],
          ],
          {
            maxZoom: targetZoom,
            duration: 1.6,
            easeLinearity: 0.25,
          }
        );
      } else {
        map.flyTo([location.lat, location.lon], targetZoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lon]);
        const formatted = getFormattedActiveCoords(location.lat, location.lon);
        markerRef.current
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; min-width: 190px;">
              <strong style="color: #d97706; font-size: 13px;">${location.shortName}</strong><br/>
              <span style="color: #64748b; font-size: 10px;">${location.region || 'Algeria'} &bull; ${location.category.toUpperCase()}</span><br/>
              <div style="margin-top: 4px; padding: 4px 6px; background: #f1f5f9; border-radius: 4px; font-family: monospace; font-size: 11px;">
                <b>WGS84:</b> ${location.lat.toFixed(5)}°N, ${location.lon.toFixed(5)}°E<br/>
                <b>${activeCrsId}:</b> ${formatted}
              </div>
            </div>
          `)
          .openPopup();
      }
    }
  };

  // Keyboard navigation in search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) {
      if (e.key === 'ArrowDown' && searchResults.length > 0) {
        setIsSearchOpen(true);
        setActiveResultIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeResultIndex >= 0 && activeResultIndex < searchResults.length) {
        handleSelectLocation(searchResults[activeResultIndex]);
      } else if (searchResults.length > 0) {
        handleSelectLocation(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  // Recenter on target
  const handleRecenter = () => {
    if (mapInstanceRef.current && !isOfflineMode) {
      mapInstanceRef.current.setView(selectedCoord, 9);
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Side: Geocoding Location Search Bar & Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* GEOLOCATION SEARCH BAR */}
          <div className="relative">
            <div className="flex items-center bg-slate-900/95 backdrop-blur-md rounded-lg border border-slate-700 shadow-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/70 focus-within:border-amber-500 transition w-60 sm:w-76">
              <div className="pl-2.5 pr-1.5 text-amber-500 flex items-center justify-center">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2 || searchResults.length > 0) {
                    setIsSearchOpen(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search Algerian location, oasis, oilfield..."
                className="w-full bg-transparent py-1.5 pr-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="pr-2.5 pl-1 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* SEARCH DROPDOWN RESULTS */}
            {isSearchOpen && (
              <div
                ref={searchDropdownRef}
                className="absolute top-full left-0 mt-1.5 w-76 sm:w-96 max-h-80 overflow-y-auto rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl z-[1500] divide-y divide-slate-800/80"
              >
                {/* Header */}
                <div className="p-2 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-500" />
                    Algerian Locations ({searchResults.length})
                  </span>
                  <span className="text-[9px] text-slate-500">Click to fly camera</span>
                </div>

                {/* Results List */}
                {searchResults.map((item, idx) => {
                  const isSelected = idx === activeResultIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectLocation(item)}
                      onMouseEnter={() => setActiveResultIndex(idx)}
                      className={`w-full text-left p-2.5 flex items-start gap-2.5 transition ${
                        isSelected
                          ? 'bg-amber-500/15 border-l-2 border-amber-500 text-slate-100'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      {/* Category Icon */}
                      <div className="mt-0.5 p-1 rounded bg-slate-800 border border-slate-700 shrink-0">
                        {item.category === 'oilfield' ? (
                          <Fuel className="w-3.5 h-3.5 text-amber-400" />
                        ) : item.category === 'wilaya' ? (
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : item.category === 'oasis' ? (
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold truncate text-slate-100">
                            {item.shortName}
                          </span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                            item.category === 'oilfield'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : item.category === 'wilaya'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.region || item.displayName}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                          <span>{item.lat.toFixed(4)}°N, {item.lon.toFixed(4)}°E</span>
                          <span className="font-sans text-[9px] text-slate-400">
                            {item.source === 'nominatim' ? 'OSM Geocoder' : 'Sahara Gazetteer'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Empty State */}
                {searchResults.length === 0 && !isSearching && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <p className="font-medium text-slate-300">No Algerian locations found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Try searching &quot;Hassi Messaoud&quot;, &quot;Ghardaia&quot;, &quot;Timimoun&quot;, &quot;Djanet&quot;, or &quot;Oran&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preset Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-lg">
            <Navigation className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <select
              value={selectedPresetId}
              onChange={(e) => handleJumpToPreset(e.target.value)}
              className="bg-transparent text-xs text-amber-400 font-medium focus:outline-none max-w-[130px] sm:max-w-[160px] truncate"
            >
              {ALGERIA_FIELD_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name.split('(')[0].trim()} ({p.region})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Offline Toggle & Layer Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Offline Mode Switch */}
          <button
            onClick={() => onToggleOfflineMode(!isOfflineMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-md border ${
              isOfflineMode
                ? 'bg-amber-600 text-white border-amber-500 shadow-amber-900/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle between Online Satellite Tiles and Sahara Desert Offline Vector Basemap"
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-200" />
                <span>Sahara Offline Vector Mode</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Online Field Tiles</span>
              </>
            )}
          </button>

          {!isOfflineMode && (
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700 p-0.5">
              <button
                onClick={() => setMapLayer('satellite')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  mapLayer === 'satellite' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setMapLayer('street')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  mapLayer === 'street' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Street
              </button>
              <button
                onClick={() => setMapLayer('topo')}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  mapLayer === 'topo' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Topo
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (drawMode === 'measure') {
                onChangeDrawMode?.('select_point');
              } else {
                onChangeDrawMode?.('measure');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-md border ${
              drawMode === 'measure'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-cyan-900/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle Distance Measurement mode"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Measure</span>
          </button>

          <button
            onClick={handleRecenter}
            className="p-2 bg-slate-900/90 text-slate-300 hover:text-white rounded-lg border border-slate-700 shadow-md"
            title="Recenter on current target coordinates"
          >
            <Crosshair className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Map Viewports: Leaflet or Offline Vector Canvas */}
      <div className="relative flex-1 w-full h-full">
        {isOfflineMode ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950">
            <canvas
              ref={canvasRef}
              width={900}
              height={520}
              onClick={handleCanvasClick}
              className="w-full h-full object-cover cursor-crosshair"
            />
            {/* Offline Vector Badge */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs text-amber-300 flex items-center gap-2 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>100% Offline Sahara Vector Basemap Active — Click to pinpoint anywhere in Algeria</span>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Live Coordinate Crosshair Readout Bar */}
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 shadow-xl text-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-slate-200">
              {crosshairCoord[0].toFixed(5)}°N, {crosshairCoord[1].toFixed(5)}°E
            </span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="text-amber-400 font-mono font-medium hidden sm:inline">
            {getFormattedActiveCoords(crosshairCoord[0], crosshairCoord[1])}
          </div>
        </div>

        {/* Mode Indicator Floating Pill */}
        <div className="absolute top-16 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs flex items-center gap-2">
          {drawMode === 'select_point' && (
            <>
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Click or drag pin to set Target Point</span>
            </>
          )}
          {drawMode === 'add_vertex' && (
            <>
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">Click on map to add boundary vertex</span>
            </>
          )}
          {drawMode === 'measure' && (
            <>
              <Ruler className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-semibold">Measure Mode: Click 2+ points to calculate distance</span>
            </>
          )}
        </div>

        {/* MEASURE DISTANCE RESULT OVERLAY */}
        {(drawMode === 'measure' || measurePoints.length > 0) && (
          <div className="absolute top-14 sm:top-16 right-3 z-[1100] w-76 sm:w-88 bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 overflow-hidden text-xs">
            {/* Header */}
            <div className="p-3 bg-slate-950/85 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                    Path Distance Measurement
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Geodesic Haversine calculation (WGS84)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onChangeDrawMode) onChangeDrawMode('select_point');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
                title="Exit Measure Mode"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Total Distance Metrics Display (Kilometers & Meters) */}
            <div className="p-3.5 bg-cyan-950/20 border-b border-slate-800/80">
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400/90 mb-1 flex items-center justify-between">
                <span>Total Path Distance</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {measurePoints.length} {measurePoints.length === 1 ? 'point' : 'points'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight">
                  {measurementData.totalKm.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
                <span className="text-sm font-bold text-cyan-400">km</span>
                <span className="text-xs text-slate-400 font-mono">
                  ({Math.round(measurementData.totalMeters).toLocaleString('en-US')} m)
                </span>
              </div>

              {/* Status / Instructions hint */}
              <div className="mt-2 text-[11px] text-slate-300 flex items-center gap-1.5">
                {measurePoints.length === 0 && (
                  <span className="text-amber-300/90 italic">Click anywhere on the map to set starting point (Point 1).</span>
                )}
                {measurePoints.length === 1 && (
                  <span className="text-cyan-300 italic">Point 1 placed. Click a second point on the map to measure path distance.</span>
                )}
                {measurePoints.length >= 2 && (
                  <span className="text-emerald-300 font-medium">
                    &bull; Path verified across {measurementData.segments.length} {measurementData.segments.length === 1 ? 'segment' : 'segments'}. Click to add more waypoints.
                  </span>
                )}
              </div>
            </div>

            {/* Path Segments Breakdown */}
            {measurementData.segments.length > 0 && (
              <div className="p-2.5 max-h-36 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40 text-[11px]">
                <div className="pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Segment Breakdown</span>
                  <span>Dist (km / m) &bull; Bearing</span>
                </div>
                {measurementData.segments.map((seg) => (
                  <div key={seg.fromIndex} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-slate-300 font-semibold">
                      P{seg.fromIndex} &rarr; P{seg.toIndex}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-right">
                      <span className="text-cyan-300 font-bold">
                        {seg.distKm.toFixed(3)} km
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        ({Math.round(seg.distMeters).toLocaleString()} m)
                      </span>
                      <span className="text-amber-400/90 text-[10px] font-sans">
                        {Math.round(seg.azimuth)}° {seg.compass}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons Bar */}
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setMeasurePoints((prev) => prev.slice(0, -1));
                  }}
                  disabled={measurePoints.length === 0}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 transition"
                  title="Undo last point"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={() => {
                    setMeasurePoints([]);
                  }}
                  disabled={measurePoints.length === 0}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/60 disabled:opacity-40 disabled:hover:bg-slate-800 text-[11px] font-medium text-slate-300 hover:text-rose-300 flex items-center gap-1 transition"
                  title="Clear all measurement points"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              {drawMode === 'measure' ? (
                <button
                  onClick={() => {
                    if (onChangeDrawMode) onChangeDrawMode('select_point');
                  }}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Check className="w-3 h-3" />
                  <span>Done</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onChangeDrawMode) onChangeDrawMode('measure');
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white text-[11px] font-medium flex items-center gap-1 transition"
                >
                  <Ruler className="w-3 h-3" />
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Camera Fly Confirmation Toast */}
        {cameraNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1200] bg-emerald-950/95 backdrop-blur-md border border-emerald-500/70 text-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            <span>{cameraNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
};
