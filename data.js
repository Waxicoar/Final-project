/* data.js — synthetic stand-in for CMIP6 gridded data.
   Everything here is generated, deterministic, and fake.
   Replace with real CMIP6-derived JSON for the real build. */

export const SCENARIOS = [
  { id: 'ssp126', label: 'SSP1-2.6', name: 'Rapid decarbonization', delta: 1.8 },
  { id: 'ssp245', label: 'SSP2-4.5', name: 'Middle of the road',     delta: 2.7 },
  { id: 'ssp585', label: 'SSP5-8.5', name: 'High emissions',         delta: 4.4 },
];

export const GRID_STEP = 10;
export const MODEL_FACTORS = [0.80, 0.86, 0.92, 0.97, 1.03, 1.09, 1.16, 1.24];

export const CITIES = [
  { name: 'Phoenix',      country: 'USA',        lat: 33.45,  lon: -112.07 },
  { name: 'Los Angeles',  country: 'USA',        lat: 34.05,  lon: -118.24 },
  { name: 'New York',     country: 'USA',        lat: 40.71,  lon: -74.01 },
  { name: 'Miami',        country: 'USA',        lat: 25.76,  lon: -80.19 },
  { name: 'Denver',       country: 'USA',        lat: 39.74,  lon: -104.99 },
  { name: 'Anchorage',    country: 'USA',        lat: 61.22,  lon: -149.90 },
  { name: 'Toronto',      country: 'Canada',     lat: 43.65,  lon: -79.38 },
  { name: 'Vancouver',    country: 'Canada',     lat: 49.28,  lon: -123.12 },
  { name: 'Mexico City',  country: 'Mexico',     lat: 19.43,  lon: -99.13 },
  { name: 'Bogotá',       country: 'Colombia',   lat: 4.71,   lon: -74.07 },
  { name: 'Lima',         country: 'Peru',       lat: -12.05, lon: -77.04 },
  { name: 'São Paulo',    country: 'Brazil',     lat: -23.55, lon: -46.63 },
  { name: 'Buenos Aires', country: 'Argentina',  lat: -34.60, lon: -58.38 },
  { name: 'Santiago',     country: 'Chile',      lat: -33.45, lon: -70.67 },
  { name: 'Lagos',        country: 'Nigeria',    lat: 6.52,   lon: 3.38 },
  { name: 'Kinshasa',     country: 'DR Congo',   lat: -4.44,  lon: 15.27 },
  { name: 'Addis Ababa',  country: 'Ethiopia',   lat: 9.03,   lon: 38.74 },
  { name: 'Nairobi',      country: 'Kenya',      lat: -1.29,  lon: 36.82 },
  { name: 'Cape Town',    country: 'South Africa', lat: -33.92, lon: 18.42 },
  { name: 'Cairo',        country: 'Egypt',      lat: 30.04,  lon: 31.24 },
  { name: 'Istanbul',     country: 'Turkey',     lat: 41.01,  lon: 28.98 },
  { name: 'Moscow',       country: 'Russia',     lat: 55.76,  lon: 37.62 },
  { name: 'London',       country: 'UK',         lat: 51.51,  lon: -0.13 },
  { name: 'Paris',        country: 'France',     lat: 48.86,  lon: 2.35 },
  { name: 'Berlin',       country: 'Germany',    lat: 52.52,  lon: 13.40 },
  { name: 'Madrid',       country: 'Spain',      lat: 40.42,  lon: -3.70 },
  { name: 'Reykjavik',    country: 'Iceland',    lat: 64.15,  lon: -21.94 },
  { name: 'Tehran',       country: 'Iran',       lat: 35.69,  lon: 51.39 },
  { name: 'Baghdad',      country: 'Iraq',       lat: 33.31,  lon: 44.36 },
  { name: 'Riyadh',       country: 'Saudi Arabia', lat: 24.71, lon: 46.68 },
  { name: 'Karachi',      country: 'Pakistan',   lat: 24.86,  lon: 67.01 },
  { name: 'Delhi',        country: 'India',      lat: 28.61,  lon: 77.21 },
  { name: 'Mumbai',       country: 'India',      lat: 19.08,  lon: 72.88 },
  { name: 'Dhaka',        country: 'Bangladesh', lat: 23.81,  lon: 90.41 },
  { name: 'Bangkok',      country: 'Thailand',   lat: 13.76,  lon: 100.50 },
  { name: 'Singapore',    country: 'Singapore',  lat: 1.35,   lon: 103.82 },
  { name: 'Jakarta',      country: 'Indonesia',  lat: -6.21,  lon: 106.85 },
  { name: 'Manila',       country: 'Philippines', lat: 14.60, lon: 120.98 },
  { name: 'Hong Kong',    country: 'China',      lat: 22.32,  lon: 114.17 },
  { name: 'Shanghai',     country: 'China',      lat: 31.23,  lon: 121.47 },
  { name: 'Beijing',      country: 'China',      lat: 39.90,  lon: 116.41 },
  { name: 'Seoul',        country: 'South Korea', lat: 37.57, lon: 126.98 },
  { name: 'Tokyo',        country: 'Japan',      lat: 35.68,  lon: 139.69 },
  { name: 'Sydney',       country: 'Australia',  lat: -33.87, lon: 151.21 },
  { name: 'Melbourne',    country: 'Australia',  lat: -37.81, lon: 144.96 },
  { name: 'Perth',        country: 'Australia',  lat: -31.95, lon: 115.86 },
  { name: 'Auckland',     country: 'New Zealand', lat: -36.85, lon: 174.76 },
];

// ---------- synthetic climate math ----------

export function latAmplification(lat) {
  const a = Math.abs(lat) / 90;
  return 1 + 0.8 * a * a;
}

export function annualMeanTemp(lat) {
  const a = Math.abs(lat) / 90;
  return 27 - 40 * Math.pow(a, 1.6);
}

export function seasonalAmplitude(lat) {
  return 2 + 12 * Math.abs(lat) / 90;
}

export function hash01(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

export function dailyTemp(lat, lon, dayOfYear, deltaC = 0, noiseSeed = 0) {
  const mean = annualMeanTemp(lat) + deltaC * latAmplification(lat);
  const amp  = seasonalAmplitude(lat);
  const peak = lat >= 0 ? 200 : 20;
  const seasonal = amp * Math.cos(2 * Math.PI * (dayOfYear - peak) / 365);
  const noise = (hash01(Math.round(lat * 10), Math.round(lon * 10),
                        dayOfYear + noiseSeed * 1000) - 0.5) * 6;
  return mean + seasonal + noise;
}

// ---------- very rough world land mask ----------

const LAND_BOXES = [
  { lat: [15, 72],   lon: [-168, -52] },   // North America
  { lat: [60, 84],   lon: [-73, -12] },    // Greenland
  { lat: [-56, 12],  lon: [-82, -34] },    // South America
  { lat: [36, 71],   lon: [-10, 40] },     // Europe
  { lat: [-35, 37],  lon: [-18, 52] },     // Africa
  { lat: [5, 77],    lon: [40, 180] },     // Asia
  { lat: [-10, 25],  lon: [95, 142] },     // SE Asia / Indonesia
  { lat: [-45, -10], lon: [113, 155] },    // Australia
  { lat: [-47, -34], lon: [166, 179] },    // New Zealand
  { lat: [-25, -12], lon: [43, 51] },      // Madagascar
  { lat: [-90, -60], lon: [-180, 180] },   // Antarctica
];

export function isLand(lat, lon) {
  return LAND_BOXES.some(b =>
    lat >= b.lat[0] && lat <= b.lat[1] &&
    lon >= b.lon[0] && lon <= b.lon[1]
  );
}
