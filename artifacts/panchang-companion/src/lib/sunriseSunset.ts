/**
 * Sunrise / sunset fetching via the free sunrise-sunset.org API.
 * No API key required.
 */

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

export async function fetchSunTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
): Promise<SunTimes> {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sunrise API error: ${res.status}`);
  const json = (await res.json()) as {
    status: string;
    results: {
      sunrise: string;
      sunset: string;
      solar_noon: string;
    };
  };
  if (json.status !== "OK") throw new Error("Sunrise API returned non-OK status");
  return {
    sunrise: new Date(json.results.sunrise),
    sunset: new Date(json.results.sunset),
    solarNoon: new Date(json.results.solar_noon),
  };
}

export interface GeoResult {
  city: string;
  lat: number;
  lng: number;
  displayName: string;
  state?: string;
  countryCode?: string;
}

export async function geocodeCity(cityName: string): Promise<GeoResult> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1&accept-language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      city?: string; town?: string; village?: string; county?: string;
      state?: string; country_code?: string;
    };
  }>;
  if (!json.length) throw new Error(`No results found for "${cityName}"`);
  const result = json[0];
  const addr = result.address;
  const resolvedCity =
    addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? cityName;
  return {
    city: resolvedCity,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    state: addr?.state,
    countryCode: addr?.country_code?.toLowerCase(),
  };
}

export function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

/** 1-based index (1–8) of the daylight-eighth used for each inauspicious period, by weekday. */
const RAHU_KALAM_PART = [8, 2, 7, 5, 6, 4, 3];
const GULIKA_KALAM_PART = [7, 6, 5, 4, 3, 2, 1];
const YAMAGANDAM_PART = [5, 4, 3, 2, 1, 7, 6];

const DUR_MUHURTAM_MUHURTA: number[][] = [
  [14], [9], [4], [8], [6, 12], [4], [1],
];

const ABHIJIT_MUHURTA_INDEX = 8;

function daylightEighth(sunTimes: SunTimes, part: number): TimeWindow {
  const dayMs = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
  const partMs = dayMs / 8;
  return {
    start: new Date(sunTimes.sunrise.getTime() + (part - 1) * partMs),
    end: new Date(sunTimes.sunrise.getTime() + part * partMs),
  };
}

function daylightFifteenth(sunTimes: SunTimes, muhurta: number): TimeWindow {
  const dayMs = sunTimes.sunset.getTime() - sunTimes.sunrise.getTime();
  const muhurtaMs = dayMs / 15;
  return {
    start: new Date(sunTimes.sunrise.getTime() + (muhurta - 1) * muhurtaMs),
    end: new Date(sunTimes.sunrise.getTime() + muhurta * muhurtaMs),
  };
}

export function getRahuKalam(sunTimes: SunTimes, weekday: number): TimeWindow {
  return daylightEighth(sunTimes, RAHU_KALAM_PART[weekday]);
}

export function getGulikaKalam(sunTimes: SunTimes, weekday: number): TimeWindow {
  return daylightEighth(sunTimes, GULIKA_KALAM_PART[weekday]);
}

export function getYamagandam(sunTimes: SunTimes, weekday: number): TimeWindow {
  return daylightEighth(sunTimes, YAMAGANDAM_PART[weekday]);
}

export function getAbhijitMuhurta(sunTimes: SunTimes): TimeWindow {
  return daylightFifteenth(sunTimes, ABHIJIT_MUHURTA_INDEX);
}

export function getDurMuhurtam(sunTimes: SunTimes, weekday: number): TimeWindow[] {
  return DUR_MUHURTAM_MUHURTA[weekday].map(idx => daylightFifteenth(sunTimes, idx));
}
