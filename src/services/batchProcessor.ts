/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  convertCoordinates,
  getCRSById,
  formatDD,
  formatDMS,
  formatDDM,
  formatMeters,
  calculateMeridianConvergence,
  calculateUTMScaleFactor,
} from './projections';
import { BoundaryVertex } from './boundaryCalculator';

export interface BatchPoint {
  id: string;
  index: number;
  label: string;
  sourceX: number;
  sourceY: number;
  sourceZ?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  wgs84Lat?: number;
  wgs84Lon?: number;
  dmsLat?: string;
  dmsLon?: string;
  ddmLat?: string;
  ddmLon?: string;
  convergenceDeg?: number;
  scaleFactor?: number;
  isValid: boolean;
  errorMessage?: string;
  rawLine?: string;
}

export interface ColumnMapping {
  labelCol: number;
  xCol: number;
  yCol: number;
  zCol?: number;
}

export interface BatchProcessingResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  points: BatchPoint[];
  elapsedMs: number;
}

// Auto detect delimiter
export function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const commas = (firstLines.match(/,/g) || []).length;
  const semicolons = (firstLines.match(/;/g) || []).length;
  const tabs = (firstLines.match(/\t/g) || []).length;
  const pipes = (firstLines.match(/\|/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  if (pipes > commas) return '|';
  return ',';
}

// Guess column index from headers
export function guessColumnMapping(headers: string[]): ColumnMapping {
  let labelCol = -1;
  let xCol = -1;
  let yCol = -1;
  let zCol: number | undefined = undefined;

  headers.forEach((h, idx) => {
    const clean = h.trim().toLowerCase();
    if (labelCol === -1 && (clean.includes('id') || clean.includes('name') || clean.includes('label') || clean.includes('pt') || clean.includes('point') || clean.includes('well'))) {
      labelCol = idx;
    }
    // Easting / Lon / X
    if (xCol === -1 && (clean === 'x' || clean.includes('east') || clean.includes('lon') || clean.includes('lng') || clean.includes('easting') || clean.includes('coord_x'))) {
      xCol = idx;
    }
    // Northing / Lat / Y
    if (yCol === -1 && (clean === 'y' || clean.includes('north') || clean.includes('lat') || clean.includes('northing') || clean.includes('coord_y'))) {
      yCol = idx;
    }
    // Z / Elevation
    if (zCol === undefined && (clean === 'z' || clean.includes('alt') || clean.includes('elev') || clean.includes('height') || clean.includes('altitude'))) {
      zCol = idx;
    }
  });

  // Fallback defaults
  if (xCol === -1) xCol = labelCol === 0 ? 1 : 0;
  if (yCol === -1) yCol = xCol === 1 ? 2 : 1;
  if (labelCol === -1) labelCol = 0;

  return { labelCol, xCol, yCol, zCol };
}

// Parse CSV/TSV table text
export function parseTableText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines.slice(0, 5).join('\n'));

  // Split line respecting quotes if possible
  const parseLine = (line: string) => {
    // Basic CSV splitting
    return line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
  };

  const firstLineTokens = parseLine(lines[0]);
  // Check if first line is a header
  const isHeader = firstLineTokens.some((t) => isNaN(Number(t)) && /[a-zA-Z]/.test(t));

  if (isHeader) {
    const headers = firstLineTokens;
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
  } else {
    const headers = firstLineTokens.map((_, i) => `Col_${i + 1}`);
    const rows = lines.map(parseLine);
    return { headers, rows };
  }
}

// Parse KML text
export function parseKML(kmlText: string): BatchPoint[] {
  const points: BatchPoint[] = [];
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xml.querySelectorAll('Placemark');

    placemarks.forEach((pm, idx) => {
      const name = pm.querySelector('name')?.textContent?.trim() || `KML_Point_${idx + 1}`;
      const coordsText = pm.querySelector('coordinates')?.textContent?.trim();
      if (coordsText) {
        const parts = coordsText.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          points.push({
            id: `kml_${idx}_${Date.now()}`,
            index: idx + 1,
            label: name,
            sourceX: parts[0], // Lon
            sourceY: parts[1], // Lat
            sourceZ: parts[2] || undefined,
            isValid: true,
          });
        }
      }
    });
  } catch (err) {
    console.error('Error parsing KML:', err);
  }
  return points;
}

// Process Batch coordinates
export function processBatchPoints(
  rawPoints: Array<{ label?: string; x: number; y: number; z?: number; rawLine?: string }>,
  sourceCrsId: string,
  targetCrsId: string
): BatchProcessingResult {
  const startTime = performance.now();
  const sourceCrs = getCRSById(sourceCrsId);
  const targetCrs = getCRSById(targetCrsId);

  let validRows = 0;
  let errorRows = 0;

  const points: BatchPoint[] = rawPoints.map((item, idx) => {
    const ptId = `batch_pt_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`;
    const label = item.label || `Point_${idx + 1}`;

    // Validate numbers
    if (isNaN(item.x) || isNaN(item.y) || !Number.isFinite(item.x) || !Number.isFinite(item.y)) {
      errorRows++;
      return {
        id: ptId,
        index: idx + 1,
        label,
        sourceX: item.x,
        sourceY: item.y,
        sourceZ: item.z,
        isValid: false,
        errorMessage: 'Invalid numeric coordinate value',
        rawLine: item.rawLine,
      };
    }

    try {
      // 1. Convert to Target CRS
      const targetCoords = convertCoordinates(sourceCrsId, targetCrsId, [item.x, item.y]);

      // 2. Convert to WGS84 for mapping & DMS representation
      const wgs84Coords =
        sourceCrsId === 'EPSG:4326'
          ? [item.x, item.y]
          : convertCoordinates(sourceCrsId, 'EPSG:4326', [item.x, item.y]);

      const lon = wgs84Coords[0];
      const lat = wgs84Coords[1];

      // Geodetic convergence & scale factor
      let convergenceDeg: number | undefined;
      let scaleFactor: number | undefined;

      if (targetCrs?.id.includes('32631') || targetCrs?.id.includes('30731')) {
        convergenceDeg = calculateMeridianConvergence(lat, lon, 31);
        scaleFactor = calculateUTMScaleFactor(targetCoords[0]);
      } else if (targetCrs?.id.includes('32632') || targetCrs?.id.includes('30732')) {
        convergenceDeg = calculateMeridianConvergence(lat, lon, 32);
        scaleFactor = calculateUTMScaleFactor(targetCoords[0]);
      } else if (targetCrs?.id.includes('32630') || targetCrs?.id.includes('30730')) {
        convergenceDeg = calculateMeridianConvergence(lat, lon, 30);
        scaleFactor = calculateUTMScaleFactor(targetCoords[0]);
      }

      // Check bounds warning for Algeria
      let errorMessage: string | undefined;
      if (lat < 18 || lat > 38 || lon < -10 || lon > 13) {
        errorMessage = 'Warning: Coordinates fall outside Algeria territorial extent';
      }

      validRows++;
      return {
        id: ptId,
        index: idx + 1,
        label,
        sourceX: item.x,
        sourceY: item.y,
        sourceZ: item.z,
        targetX: targetCoords[0],
        targetY: targetCoords[1],
        targetZ: item.z,
        wgs84Lat: lat,
        wgs84Lon: lon,
        dmsLat: formatDMS(lat, true),
        dmsLon: formatDMS(lon, false),
        ddmLat: formatDDM(lat, true),
        ddmLon: formatDDM(lon, false),
        convergenceDeg,
        scaleFactor,
        isValid: true,
        errorMessage,
        rawLine: item.rawLine,
      };
    } catch (err: unknown) {
      errorRows++;
      return {
        id: ptId,
        index: idx + 1,
        label,
        sourceX: item.x,
        sourceY: item.y,
        sourceZ: item.z,
        isValid: false,
        errorMessage: err instanceof Error ? err.message : 'Transformation failed',
        rawLine: item.rawLine,
      };
    }
  });

  const elapsedMs = performance.now() - startTime;
  return {
    totalRows: rawPoints.length,
    validRows,
    errorRows,
    points,
    elapsedMs,
  };
}

// Export to CSV
export function exportBatchToCSV(
  points: BatchPoint[],
  sourceCrsId: string,
  targetCrsId: string
): string {
  const sourceCrs = getCRSById(sourceCrsId);
  const targetCrs = getCRSById(targetCrsId);

  const header = [
    'Point_ID',
    'Label',
    `Source_X (${sourceCrs?.name || sourceCrsId})`,
    `Source_Y (${sourceCrs?.name || sourceCrsId})`,
    `Target_X (${targetCrs?.name || targetCrsId})`,
    `Target_Y (${targetCrs?.name || targetCrsId})`,
    'WGS84_Latitude_DD',
    'WGS84_Longitude_DD',
    'WGS84_Lat_DMS',
    'WGS84_Lon_DMS',
    'Elevation_Z_m',
    'Meridian_Convergence_deg',
    'Point_Scale_Factor',
    'Status',
  ].join(',');

  const rows = points.map((p) => {
    return [
      p.index,
      `"${p.label.replace(/"/g, '""')}"`,
      p.sourceX.toFixed(sourceCrs?.isProjected ? 3 : 6),
      p.sourceY.toFixed(sourceCrs?.isProjected ? 3 : 6),
      p.targetX !== undefined ? p.targetX.toFixed(targetCrs?.isProjected ? 3 : 6) : '',
      p.targetY !== undefined ? p.targetY.toFixed(targetCrs?.isProjected ? 3 : 6) : '',
      p.wgs84Lat !== undefined ? p.wgs84Lat.toFixed(7) : '',
      p.wgs84Lon !== undefined ? p.wgs84Lon.toFixed(7) : '',
      p.dmsLat ? `"${p.dmsLat}"` : '',
      p.dmsLon ? `"${p.dmsLon}"` : '',
      p.sourceZ !== undefined ? p.sourceZ.toFixed(2) : '',
      p.convergenceDeg !== undefined ? p.convergenceDeg.toFixed(5) : '',
      p.scaleFactor !== undefined ? p.scaleFactor.toFixed(6) : '',
      p.isValid ? (p.errorMessage ? `Warning: ${p.errorMessage}` : 'Valid') : `Error: ${p.errorMessage}`,
    ].join(',');
  });

  return [header, ...rows].join('\r\n');
}

// Export to KML (Google Earth)
export function exportBatchToKML(
  points: BatchPoint[],
  layerName = 'GeoFree Algeria Coordinates',
  targetCrsId = 'EPSG:32631'
): string {
  const targetCrs = getCRSById(targetCrsId);
  const validPts = points.filter((p) => p.isValid && p.wgs84Lat !== undefined && p.wgs84Lon !== undefined);

  const placemarks = validPts
    .map((p) => {
      const xFormatted = p.targetX !== undefined ? (targetCrs?.isProjected ? formatMeters(p.targetX) : p.targetX.toFixed(6)) : '';
      const yFormatted = p.targetY !== undefined ? (targetCrs?.isProjected ? formatMeters(p.targetY) : p.targetY.toFixed(6)) : '';

      return `
    <Placemark>
      <name>${escapeXml(p.label)}</name>
      <description><![CDATA[
        <div style="font-family: sans-serif; font-size: 13px;">
          <h3 style="color: #d97706; margin-bottom: 4px;">${escapeXml(p.label)}</h3>
          <p><b>Target Projection:</b> ${escapeXml(targetCrs?.name || targetCrsId)}</p>
          <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr><td><b>Target X / Easting:</b></td><td>${xFormatted}</td></tr>
            <tr><td><b>Target Y / Northing:</b></td><td>${yFormatted}</td></tr>
            <tr><td><b>WGS84 Lat/Lon (DD):</b></td><td>${p.wgs84Lat?.toFixed(6)}°, ${p.wgs84Lon?.toFixed(6)}°</td></tr>
            <tr><td><b>DMS:</b></td><td>${p.dmsLat} | ${p.dmsLon}</td></tr>
            ${p.sourceZ !== undefined ? `<tr><td><b>Elevation Z:</b></td><td>${p.sourceZ} m</td></tr>` : ''}
            ${p.convergenceDeg !== undefined ? `<tr><td><b>Meridian Convergence:</b></td><td>${p.convergenceDeg.toFixed(4)}°</td></tr>` : ''}
          </table>
          <p style="margin-top: 8px; font-size: 11px; color: #64748b;">Converted via GeoFree Algeria Field Geodesy</p>
        </div>
      ]]></description>
      <styleUrl>#saharaPointStyle</styleUrl>
      <Point>
        <coordinates>${p.wgs84Lon},${p.wgs84Lat},${p.sourceZ || 0}</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(layerName)}</name>
    <description>Exported from GeoFree Algeria Geodetic Converter - Sahara Field Suite</description>
    <Style id="saharaPointStyle">
      <IconStyle>
        <color>ff00aaff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.85</scale>
      </LabelStyle>
    </Style>
    <Folder>
      <name>Survey Points (${validPts.length})</name>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;
}

// Export Site Boundary Polygon to KML
export function exportBoundaryToKML(
  boundaryName: string,
  vertices: Array<{ label: string; lat: number; lon: number }>,
  stats: { areaHectares: number; areaSqKm: number; perimeterKm: number },
  crsName = 'Nord Sahara 1959'
): string {
  if (vertices.length < 3) return '';

  const coordsStr = vertices
    .map((v) => `${v.lon},${v.lat},0`)
    .concat([`${vertices[0].lon},${vertices[0].lat},0`])
    .join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(boundaryName)}</name>
    <description>Site Boundary perimeter generated by GeoFree Algeria</description>
    <Style id="boundaryStyle">
      <LineStyle>
        <color>ff0080ff</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>4d00a5ff</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${escapeXml(boundaryName)}</name>
      <description><![CDATA[
        <h3>${escapeXml(boundaryName)}</h3>
        <p><b>Area:</b> ${stats.areaHectares.toFixed(2)} ha (${stats.areaSqKm.toFixed(3)} km²)</p>
        <p><b>Perimeter:</b> ${stats.perimeterKm.toFixed(3)} km</p>
        <p><b>Vertices:</b> ${vertices.length}</p>
        <p><b>Reference CRS:</b> ${escapeXml(crsName)}</p>
      ]]></description>
      <styleUrl>#boundaryStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

// Export to GeoJSON FeatureCollection
export function exportBatchToGeoJSON(points: BatchPoint[], targetCrsId: string): string {
  const targetCrs = getCRSById(targetCrsId);
  const validPts = points.filter((p) => p.isValid && p.wgs84Lat !== undefined && p.wgs84Lon !== undefined);

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      generator: 'GeoFree Algeria Geodetic Converter',
      generatedAt: new Date().toISOString(),
      targetCRS: targetCrs?.name || targetCrsId,
      pointCount: validPts.length,
    },
    features: validPts.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.wgs84Lon, p.wgs84Lat, p.sourceZ || 0],
      },
      properties: {
        id: p.id,
        index: p.index,
        label: p.label,
        targetX: p.targetX,
        targetY: p.targetY,
        elevation: p.sourceZ,
        dmsLat: p.dmsLat,
        dmsLon: p.dmsLon,
        ddmLat: p.ddmLat,
        ddmLon: p.ddmLon,
        convergence: p.convergenceDeg,
        scaleFactor: p.scaleFactor,
      },
    })),
  };

  return JSON.stringify(geojson, null, 2);
}

// Export both Boundary Vertices and Workspace Points list to KML
export function exportBoundaryAndWorkspaceToKML(
  boundaryName: string,
  vertices: BoundaryVertex[],
  stats: { areaHectares: number; areaSqKm: number; perimeterKm: number },
  points: BatchPoint[],
  crsId: string,
  workspaceName = 'Active Workspace'
): string {
  const crs = getCRSById(crsId);
  const crsName = crs?.name || crsId;

  // 1. Boundary Polygon Placemark
  let polygonPlacemark = '';
  if (vertices.length >= 3) {
    const coordsStr = vertices
      .map((v) => `${v.lon},${v.lat},0`)
      .concat([`${vertices[0].lon},${vertices[0].lat},0`])
      .join(' ');

    polygonPlacemark = `
    <Placemark>
      <name>${escapeXml(boundaryName)} (Site Perimeter)</name>
      <description><![CDATA[
        <div style="font-family: sans-serif; font-size: 13px;">
          <h3 style="color: #d97706; margin-bottom: 4px;">${escapeXml(boundaryName)}</h3>
          <p><b>Workspace:</b> ${escapeXml(workspaceName)}</p>
          <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr><td><b>Surface Area:</b></td><td><b>${stats.areaHectares.toFixed(2)} ha</b> (${stats.areaSqKm.toFixed(3)} km²)</td></tr>
            <tr><td><b>Perimeter Length:</b></td><td><b>${stats.perimeterKm.toFixed(3)} km</b> (${Math.round(stats.perimeterKm * 1000)} m)</td></tr>
            <tr><td><b>Boundary Vertices:</b></td><td>${vertices.length} vertices</td></tr>
            <tr><td><b>Reference Projection:</b></td><td>${escapeXml(crsName)}</td></tr>
          </table>
          <p style="margin-top: 8px; font-size: 11px; color: #64748b;">Generated via GeoFree Algeria Field Geodesy</p>
        </div>
      ]]></description>
      <styleUrl>#boundaryPolygonStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  }

  // 2. Boundary Vertices Placemarks
  const vertexPlacemarks = vertices
    .map((v, i) => {
      let projX = '';
      let projY = '';
      if (crs?.isProjected) {
        try {
          const p = convertCoordinates('EPSG:4326', crsId, [v.lon, v.lat]);
          projX = formatMeters(p[0]);
          projY = formatMeters(p[1]);
        } catch {}
      }
      return `
      <Placemark>
        <name>Vertex ${i + 1}: ${escapeXml(v.label)}</name>
        <description><![CDATA[
          <b>Boundary Vertex #${i + 1}</b><br/>
          <b>Label:</b> ${escapeXml(v.label)}<br/>
          <b>WGS84 Lat/Lon:</b> ${v.lat.toFixed(6)}°, ${v.lon.toFixed(6)}°<br/>
          <b>DMS:</b> ${formatDMS(v.lat, true)} | ${formatDMS(v.lon, false)}<br/>
          ${projX ? `<b>Projected Easting:</b> ${projX}<br/><b>Projected Northing:</b> ${projY}<br/>` : ''}
        ]]></description>
        <styleUrl>#vertexStyle</styleUrl>
        <Point>
          <coordinates>${v.lon},${v.lat},0</coordinates>
        </Point>
      </Placemark>`;
    })
    .join('\n');

  // 3. Workspace Survey Points Placemarks
  const validPoints = points.filter((p) => p.isValid && p.wgs84Lat !== undefined && p.wgs84Lon !== undefined);
  const pointPlacemarks = validPoints
    .map((p) => {
      const xFormatted = p.targetX !== undefined ? (crs?.isProjected ? formatMeters(p.targetX) : p.targetX.toFixed(6)) : '';
      const yFormatted = p.targetY !== undefined ? (crs?.isProjected ? formatMeters(p.targetY) : p.targetY.toFixed(6)) : '';

      return `
      <Placemark>
        <name>${escapeXml(p.label)}</name>
        <description><![CDATA[
          <div style="font-family: sans-serif; font-size: 13px;">
            <h3 style="color: #0284c7; margin-bottom: 4px;">${escapeXml(p.label)}</h3>
            <p><b>Target Projection:</b> ${escapeXml(crsName)}</p>
            <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">
              <tr><td><b>Target X / Easting:</b></td><td>${xFormatted}</td></tr>
              <tr><td><b>Target Y / Northing:</b></td><td>${yFormatted}</td></tr>
              <tr><td><b>WGS84 Lat/Lon (DD):</b></td><td>${p.wgs84Lat?.toFixed(6)}°, ${p.wgs84Lon?.toFixed(6)}°</td></tr>
              <tr><td><b>DMS:</b></td><td>${p.dmsLat || formatDMS(p.wgs84Lat || 0, true)} | ${p.dmsLon || formatDMS(p.wgs84Lon || 0, false)}</td></tr>
              ${p.sourceZ !== undefined ? `<tr><td><b>Elevation Z:</b></td><td>${p.sourceZ} m</td></tr>` : ''}
              ${p.convergenceDeg !== undefined ? `<tr><td><b>Meridian Convergence:</b></td><td>${p.convergenceDeg.toFixed(4)}°</td></tr>` : ''}
            </table>
          </div>
        ]]></description>
        <styleUrl>#workspacePointStyle</styleUrl>
        <Point>
          <coordinates>${p.wgs84Lon},${p.wgs84Lat},${p.sourceZ || 0}</coordinates>
        </Point>
      </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(boundaryName)} - Concession &amp; Workspace Points</name>
    <description>Exported from GeoFree Algeria - Boundary Vertices &amp; Workspace Points</description>
    
    <Style id="boundaryPolygonStyle">
      <LineStyle>
        <color>ff00a5ff</color>
        <width>3.5</width>
      </LineStyle>
      <PolyStyle>
        <color>4000b0ff</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    
    <Style id="vertexStyle">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>

    <Style id="workspacePointStyle">
      <IconStyle>
        <color>ffffaa00</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.85</scale>
      </LabelStyle>
    </Style>

    ${polygonPlacemark}

    <Folder>
      <name>Boundary Vertices (${vertices.length})</name>
      ${vertexPlacemarks}
    </Folder>

    <Folder>
      <name>Workspace Survey Points (${validPoints.length})</name>
      ${pointPlacemarks}
    </Folder>
  </Document>
</kml>`;
}

// Export both Boundary Vertices and Workspace Points list to CSV
export function exportBoundaryAndWorkspaceToCSV(
  boundaryName: string,
  vertices: BoundaryVertex[],
  stats: { areaHectares: number; areaSqKm: number; perimeterKm: number },
  points: BatchPoint[],
  crsId: string,
  workspaceName = 'Active Workspace'
): string {
  const crs = getCRSById(crsId);
  const crsName = crs?.name || crsId;

  const lines: string[] = [
    `# ==============================================================================`,
    `# GEOFREE ALGERIA - SITE BOUNDARY & WORKSPACE POINTS EXPORT`,
    `# Project Workspace: ${workspaceName}`,
    `# Boundary Name: ${boundaryName}`,
    `# Reference CRS: ${crsName} (${crsId})`,
    `# Surface Area: ${stats.areaHectares.toFixed(2)} ha (${stats.areaSqKm.toFixed(3)} km²)`,
    `# Total Perimeter: ${stats.perimeterKm.toFixed(3)} km (${Math.round(stats.perimeterKm * 1000)} m)`,
    `# Boundary Vertices Count: ${vertices.length}`,
    `# Workspace Points Count: ${points.length}`,
    `# Export Date: ${new Date().toISOString()}`,
    `# ==============================================================================`,
    ``,
    `[SECTION: BOUNDARY PERIMETER VERTICES]`,
    `Record_Type,Vertex_Index,Label,Latitude_DD,Longitude_DD,Projected_Easting_X_m,Projected_Northing_Y_m,DMS_Latitude,DMS_Longitude`,
  ];

  vertices.forEach((v, i) => {
    let projX = '';
    let projY = '';
    if (crs?.isProjected) {
      try {
        const p = convertCoordinates('EPSG:4326', crsId, [v.lon, v.lat]);
        projX = p[0].toFixed(3);
        projY = p[1].toFixed(3);
      } catch {}
    }
    lines.push(
      `"BOUNDARY_VERTEX",${i + 1},"${v.label.replace(/"/g, '""')}",${v.lat.toFixed(6)},${v.lon.toFixed(6)},${projX},${projY},"${formatDMS(v.lat, true)}","${formatDMS(v.lon, false)}"`
    );
  });

  lines.push('');
  lines.push(`[SECTION: WORKSPACE SURVEY POINTS LIST]`);
  lines.push(`Record_Type,Point_ID,Label,Latitude_DD,Longitude_DD,Target_Easting_X_m,Target_Northing_Y_m,Elevation_Z_m,DMS_Latitude,DMS_Longitude,Meridian_Convergence_deg,Scale_Factor,Status`);

  if (points.length === 0) {
    lines.push(`# No additional survey points in active workspace yet`);
  } else {
    points.forEach((p, i) => {
      const latDD = p.wgs84Lat !== undefined ? p.wgs84Lat.toFixed(6) : (p.sourceY ? p.sourceY.toFixed(6) : '');
      const lonDD = p.wgs84Lon !== undefined ? p.wgs84Lon.toFixed(6) : (p.sourceX ? p.sourceX.toFixed(6) : '');
      const targetX = p.targetX !== undefined ? p.targetX.toFixed(3) : '';
      const targetY = p.targetY !== undefined ? p.targetY.toFixed(3) : '';
      const elev = p.sourceZ !== undefined ? p.sourceZ.toFixed(2) : (p.targetZ !== undefined ? p.targetZ.toFixed(2) : '');
      const conv = p.convergenceDeg !== undefined ? p.convergenceDeg.toFixed(4) : '';
      const scale = p.scaleFactor !== undefined ? p.scaleFactor.toFixed(6) : '';
      const status = p.isValid ? 'Valid' : `Error: ${p.errorMessage || 'Invalid'}`;
      const dmsLat = p.dmsLat || (p.wgs84Lat !== undefined ? formatDMS(p.wgs84Lat, true) : '');
      const dmsLon = p.dmsLon || (p.wgs84Lon !== undefined ? formatDMS(p.wgs84Lon, false) : '');

      lines.push(
        `"WORKSPACE_POINT",${p.index || (i + 1)},"${p.label.replace(/"/g, '""')}",${latDD},${lonDD},${targetX},${targetY},${elev},"${dmsLat}","${dmsLon}",${conv},${scale},"${status}"`
      );
    });
  }

  return lines.join('\r\n');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Download file utility
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
