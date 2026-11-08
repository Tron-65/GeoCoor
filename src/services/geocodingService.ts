/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ALGERIA_FIELD_PRESETS } from './algeriaGeoData';

export interface GeocodingResult {
  id: string;
  displayName: string;
  shortName: string;
  category: 'oilfield' | 'wilaya' | 'city' | 'oasis' | 'landmark' | 'administrative';
  lat: number;
  lon: number;
  elevationMeters?: number;
  boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
  source: 'nominatim' | 'offline_gazetteer';
  region?: string;
  details?: string;
}

// Built-in comprehensive Algeria gazetteer for 100% offline search in the Sahara
export const ALGERIA_OFFLINE_GAZETTEER: Array<{
  name: string;
  nameAr?: string;
  nameFr?: string;
  category: GeocodingResult['category'];
  lat: number;
  lon: number;
  region: string;
  details: string;
}> = [
  // 10 New Wilayas (Delegations)
  { name: 'Timimoun', nameAr: 'تيميمون', category: 'oasis', lat: 29.2600, lon: 0.2300, region: 'Gourara (Wilaya 49)', details: 'Red Oasis & Gourara tight gas hub' },
  { name: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', category: 'wilaya', lat: 21.3289, lon: 0.9547, region: 'Sahara Sud (Wilaya 50)', details: 'Border gateway to Mali' },
  { name: 'Ouled Djellal', nameAr: 'أولاد جلال', category: 'wilaya', lat: 34.4333, lon: 5.0667, region: 'Ziban (Wilaya 51)', details: 'Agricultural hub south of Biskra' },
  { name: 'Béni Abbès', nameAr: 'بني عباس', category: 'oasis', lat: 30.1333, lon: -2.1667, region: 'Saoura (Wilaya 52)', details: 'Pearl of the Saoura river valley' },
  { name: 'In Salah', nameAr: 'عين صالح', category: 'wilaya', lat: 27.2000, lon: 2.4600, region: 'Tidikelt (Wilaya 53)', details: 'Tidikelt oasis & CCS gas hub' },
  { name: 'In Guezzam', nameAr: 'عين قزام', category: 'wilaya', lat: 19.5667, lon: 5.7667, region: 'Sahara Sud (Wilaya 54)', details: 'Southernmost frontier post at Niger border' },
  { name: 'Touggourt', nameAr: 'تقرت', category: 'wilaya', lat: 33.1000, lon: 6.0667, region: 'Oued Righ (Wilaya 55)', details: 'Oasis and petroleum logistics junction' },
  { name: 'Djanet', nameAr: 'جانت', category: 'oasis', lat: 24.5500, lon: 9.4833, region: 'Tassili (Wilaya 56)', details: 'Gateway to Tassili n’Ajjer UNESCO park' },
  { name: "El M'Ghair", nameAr: 'المغير', category: 'wilaya', lat: 33.9500, lon: 5.9167, region: 'Oued Righ (Wilaya 57)', details: 'Chott Melrhir basin' },
  { name: 'El Meniaa (El Goléa)', nameAr: 'المنيعة', category: 'oasis', lat: 30.5833, lon: 2.8833, region: 'Sahara Central (Wilaya 58)', details: 'Verdant oasis in the Grand Erg' },

  // Key Historic & Major Wilayas
  { name: 'Algiers (Alger)', nameAr: 'الجزائر العاصمة', category: 'city', lat: 36.7538, lon: 3.0588, region: 'Wilaya 16', details: 'National capital, port, and Colonne Voirol datum' },
  { name: 'Oran', nameAr: 'وهران', category: 'city', lat: 35.6987, lon: -0.6349, region: 'Wilaya 31', details: 'Major western metropolis & LNG terminal port' },
  { name: 'Constantine', nameAr: 'قسنطينة', category: 'city', lat: 36.3650, lon: 6.6147, region: 'Wilaya 25', details: 'City of Bridges & eastern cartographic center' },
  { name: 'Annaba', nameAr: 'عنابة', category: 'city', lat: 36.9000, lon: 7.7667, region: 'Wilaya 23', details: 'Industrial coast & El Hadjar steel complex' },
  { name: 'Ouargla', nameAr: 'ورقلة', category: 'wilaya', lat: 31.9500, lon: 5.3167, region: 'Wilaya 30', details: 'Capital of the Algerian petroleum industry' },
  { name: 'Ghardaïa', nameAr: 'غرداية', category: 'oasis', lat: 32.4833, lon: 3.6667, region: 'Wilaya 47', details: 'M’Zab Valley UNESCO pentapolis' },
  { name: 'Béchar', nameAr: 'بشار', category: 'wilaya', lat: 31.6167, lon: -2.2167, region: 'Wilaya 08', details: 'Northwestern Sahara railway terminus' },
  { name: 'Adrar', nameAr: 'أدرار', category: 'wilaya', lat: 27.8742, lon: -0.2939, region: 'Wilaya 01', details: 'Touat oasis & regional oil refinery' },
  { name: 'Tindouf', nameAr: 'تندوف', category: 'wilaya', lat: 27.6742, lon: -8.1478, region: 'Wilaya 37', details: 'Far west mining hub & Gara Djebilet connection' },
  { name: 'Tamanrasset', nameAr: 'تمنراست', category: 'wilaya', lat: 22.7850, lon: 5.5228, region: 'Wilaya 11', details: 'Hoggar mountain capital at Mount Tahat foot' },
  { name: 'Illizi', nameAr: 'إيليزي', category: 'wilaya', lat: 26.4833, lon: 8.4667, region: 'Wilaya 33', details: 'Illizi Basin petroleum concessions capital' },
  { name: 'Biskra', nameAr: 'بسكرة', category: 'city', lat: 34.8500, lon: 5.7333, region: 'Wilaya 07', details: 'Queen of the Zibans & date palm center' },
  { name: 'Djelfa', nameAr: 'الجلفة', category: 'city', lat: 34.6667, lon: 3.2500, region: 'Wilaya 17', details: 'Hauts Plateaux pastoral crossroads' },
  { name: 'Laghouat', nameAr: 'الأغواط', category: 'city', lat: 33.8000, lon: 2.8667, region: 'Wilaya 03', details: 'Atlas Saharien gateway' },
  { name: 'El Oued (Souf)', nameAr: 'الوادي', category: 'oasis', lat: 33.3667, lon: 6.8667, region: 'Wilaya 39', details: 'City of a Thousand Domes' },
  { name: 'Sétif', nameAr: 'سطيف', category: 'city', lat: 36.1900, lon: 5.4100, region: 'Wilaya 19', details: 'High Plateaus commercial capital' },
  { name: 'Batna', nameAr: 'باتنة', category: 'city', lat: 35.5559, lon: 6.1741, region: 'Wilaya 05', details: 'Aurès mountains heartland' },
  { name: 'Tlemcen', nameAr: 'تلمسان', category: 'city', lat: 34.8783, lon: -1.3150, region: 'Wilaya 13', details: 'City of Art & Islamic History' },
  { name: 'Skikda', nameAr: 'سكيكدة', category: 'city', lat: 36.8790, lon: 6.9070, region: 'Wilaya 21', details: 'Petrochemical refinery & pipeline sea terminal' },
  { name: 'Arzew / Bethioua', nameAr: 'أرزيو', category: 'landmark', lat: 35.8500, lon: -0.3167, region: 'Oran', details: 'World first LNG liquefaction port terminal' },
  { name: 'Taghit', nameAr: 'تاغيث', category: 'oasis', lat: 30.9167, lon: -2.0333, region: 'Béchar', details: 'Spectacular Grand Erg Occidental dunes' },
  { name: 'Hassi Messaoud', nameAr: 'حاسي مسعود', category: 'oilfield', lat: 31.9314, lon: 5.0682, region: 'Ouargla', details: 'Epicenter of Algerian crude oil production' },
  { name: "Hassi R'Mel", nameAr: 'حاسي الرمل', category: 'oilfield', lat: 32.9300, lon: 3.2750, region: 'Laghouat', details: 'Supergiant gas dispatch hub' },
  { name: 'In Amenas', nameAr: 'إن أمناس', category: 'oilfield', lat: 27.9167, lon: 9.1500, region: 'Illizi', details: 'Tiguentourine wet gas processing hub' },
  { name: 'Gara Djebilet', nameAr: 'غار جبيلات', category: 'landmark', lat: 26.8833, lon: -7.1667, region: 'Tindouf', details: 'Strategic iron ore open pit deposit' },
  { name: 'Haoud El Hamra', nameAr: 'حوض الحمراء', category: 'oilfield', lat: 31.8974, lon: 5.2912, region: 'Ouargla', details: 'Sonatrach central pipeline dispatch station' },
  { name: 'Ourhoud', nameAr: 'أورهود', category: 'oilfield', lat: 31.4333, lon: 6.7833, region: 'Berkine Basin', details: 'Second largest crude oil field' },
  { name: 'Rhourde El Baguel', nameAr: 'رورد البغل', category: 'oilfield', lat: 31.7850, lon: 5.5180, region: 'Ouargla', details: 'Major oil field under gas injection' },
  { name: 'Rhourde Nouss', nameAr: 'رورد النوس', category: 'oilfield', lat: 30.6800, lon: 6.6400, region: 'Illizi / Berkine', details: 'Triassic deep desert gas field' },
  { name: 'El Merk', nameAr: 'المرك', category: 'oilfield', lat: 30.9850, lon: 8.8500, region: 'Berkine Basin', details: 'Block 208 high pressure gas complex' },
  { name: 'Reggane Nord', nameAr: 'رقان', category: 'oilfield', lat: 26.7167, lon: 0.1667, region: 'Adrar', details: 'Southwestern Sahara gas development' },
  { name: 'Gassi Touil', nameAr: 'قاسي طويل', category: 'oilfield', lat: 30.5000, lon: 5.4667, region: 'Ouargla', details: 'Historic gas & condensate field' },
  { name: 'Tin Fouye Tabankort (TFT)', nameAr: 'تين فوي تبنكورت', category: 'oilfield', lat: 28.5833, lon: 7.9500, region: 'Illizi', details: 'Major wet gas field' },
  { name: 'Ohanet', nameAr: 'أوهانت', category: 'oilfield', lat: 28.8667, lon: 8.5833, region: 'Illizi', details: 'Northern Illizi gas processing facility' },
];

/**
 * Searches Algerian locations using online Nominatim geocoding service
 * with robust fallback to the local Sahara gazetteer when offline.
 */
export async function searchAlgerianLocations(
  query: string,
  signal?: AbortSignal
): Promise<GeocodingResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const results: GeocodingResult[] = [];
  const lowerQuery = clean.toLowerCase();

  // 1. Search Local Offline Gazetteer first (instant, guaranteed to work in Sahara)
  const localMatches = ALGERIA_OFFLINE_GAZETTEER.filter((item) => {
    return (
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.nameAr && item.nameAr.includes(clean)) ||
      item.region.toLowerCase().includes(lowerQuery) ||
      item.details.toLowerCase().includes(lowerQuery)
    );
  }).map((item, idx) => ({
    id: `local_${idx}_${item.name.toLowerCase().replace(/\s+/g, '_')}`,
    displayName: `${item.name}${item.nameAr ? ` (${item.nameAr})` : ''}, ${item.region}, Algeria`,
    shortName: item.name,
    category: item.category,
    lat: item.lat,
    lon: item.lon,
    source: 'offline_gazetteer' as const,
    region: item.region,
    details: item.details,
  }));

  // Also match field presets
  const presetMatches = ALGERIA_FIELD_PRESETS.filter((p) => {
    return (
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.nameAr && p.nameAr.includes(clean)) ||
      p.region.toLowerCase().includes(lowerQuery)
    );
  }).map((p) => ({
    id: `preset_${p.id}`,
    displayName: `${p.name}, ${p.region}, Algeria`,
    shortName: p.name.split('(')[0].trim(),
    category: (p.type === 'oil_field' || p.type === 'gas_field' ? 'oilfield' : 'landmark') as GeocodingResult['category'],
    lat: p.lat,
    lon: p.lon,
    elevationMeters: p.elevationMeters,
    source: 'offline_gazetteer' as const,
    region: p.region,
    details: p.description,
  }));

  // Combine and deduplicate local results
  const localCombined = [...localMatches, ...presetMatches];
  const seenCoords = new Set<string>();
  const deduplicatedLocal: GeocodingResult[] = [];

  for (const item of localCombined) {
    const key = `${item.lat.toFixed(3)}_${item.lon.toFixed(3)}`;
    if (!seenCoords.has(key)) {
      seenCoords.add(key);
      deduplicatedLocal.push(item);
    }
  }

  // 2. Try OpenStreetMap Nominatim Geocoding API if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      // Nominatim search with Algeria countrycode constraint & bounding box
      const encodedQuery = encodeURIComponent(clean);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=dz&limit=6&addressdetails=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for field resilience

      const response = await fetch(url, {
        signal: signal || controller.signal,
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'fr,en,ar',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach((item: {
            place_id: number;
            display_name: string;
            lat: string;
            lon: string;
            boundingbox?: string[];
            type?: string;
            class?: string;
            address?: Record<string, string>;
          }) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);

            // Verify coordinates fall within Algerian territorial extent [18.5°N - 37.8°N, -9°W - 12.5°E]
            if (lat >= 18.5 && lat <= 37.8 && lon >= -9.2 && lon <= 12.5) {
              const coordKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
              if (!seenCoords.has(coordKey)) {
                seenCoords.add(coordKey);

                // Build clean short name
                const addr = item.address || {};
                const shortName =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.hamlet ||
                  addr.suburb ||
                  addr.county ||
                  addr.state ||
                  item.display_name.split(',')[0];

                let category: GeocodingResult['category'] = 'city';
                if (item.class === 'boundary' || item.type === 'administrative') category = 'administrative';
                else if (item.class === 'place' && (item.type === 'village' || item.type === 'isolated_dwelling')) category = 'oasis';
                else if (item.class === 'natural' || item.class === 'place') category = 'landmark';

                let boundingBox: [number, number, number, number] | undefined = undefined;
                if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
                  boundingBox = [
                    parseFloat(item.boundingbox[0]),
                    parseFloat(item.boundingbox[1]),
                    parseFloat(item.boundingbox[2]),
                    parseFloat(item.boundingbox[3]),
                  ];
                }

                results.push({
                  id: `nom_${item.place_id}`,
                  displayName: item.display_name,
                  shortName,
                  category,
                  lat,
                  lon,
                  boundingBox,
                  source: 'nominatim',
                  region: addr.state || 'Algeria',
                  details: `${item.type || 'Location'} in ${addr.state || 'Algeria'}`,
                });
              }
            }
          });
        }
      }
    } catch {
      // Ignore network / CORS / timeout errors — local gazetteer fallback will supply results
    }
  }

  // Combine online and local results, prioritizing exact prefix matches
  const allResults = [...deduplicatedLocal, ...results];
  
  // Sort: prioritize items starting with the query string
  allResults.sort((a, b) => {
    const aStartsWith = a.shortName.toLowerCase().startsWith(lowerQuery) ? 1 : 0;
    const bStartsWith = b.shortName.toLowerCase().startsWith(lowerQuery) ? 1 : 0;
    if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
    return a.shortName.localeCompare(b.shortName);
  });

  return allResults.slice(0, 10);
}
