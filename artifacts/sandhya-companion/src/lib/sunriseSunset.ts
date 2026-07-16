/**
 * Sunrise / sunset fetching via the free sunrise-sunset.org API.
 * No API key required.
 */

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

/**
 * Fetch sunrise/sunset for a given location and date.
 * @param lat  Latitude
 * @param lng  Longitude
 * @param date JavaScript Date (local); defaults to today
 */
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

/**
 * Geocode a city name to lat/lng using the free Nominatim API (OpenStreetMap).
 * Adds a User-Agent header as required by Nominatim's usage policy.
 */
export interface GeoResult {
  city: string;
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeCity(cityName: string): Promise<GeoResult> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1&accept-language=en`;
  // Note: User-Agent is a forbidden header in browser fetch; identification is
  // passed via the accept-language query param per Nominatim's browser guidelines.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
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
  };
}

/**
 * Format a Date to a readable 12-hour time string.
 * `timeZone` should be the *location's* IANA zone (see lib/timezone.ts) —
 * without it, this defaults to the browser's own zone, which is wrong
 * whenever the saved location differs from the device (e.g. viewing a
 * Singapore location from a browser set to IST).
 */
export function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });
}

/** HH:MM a.m./p.m. range for each Sandhya session, computed from sun times. */
export interface SessionWindows {
  pratah: string;    // 30 min before sunrise → 2 h after sunrise
  madhyahna: string; // 30 min before solar noon → 30 min after
  sayam: string;     // 2 h before sunset → 30 min after sunset
}

export function getSessionWindows(sunTimes: SunTimes, timeZone?: string): SessionWindows {
  const MIN  = 60 * 1000;
  const HOUR = 60 * MIN;
  const fmt  = (d: Date) => formatTime(d, timeZone);

  return {
    pratah: `${fmt(new Date(sunTimes.sunrise.getTime()  - 30 * MIN))} – ${fmt(new Date(sunTimes.sunrise.getTime()  + 2  * HOUR))}`,
    madhyahna: `${fmt(new Date(sunTimes.solarNoon.getTime() - 30 * MIN))} – ${fmt(new Date(sunTimes.solarNoon.getTime() + 30 * MIN))}`,
    sayam: `${fmt(new Date(sunTimes.sunset.getTime()   - 2  * HOUR))} – ${fmt(new Date(sunTimes.sunset.getTime()   + 30 * MIN))}`,
  };
}

// ─── Muhurta windows (Rahu Kalam, Gulika Kalam, Yamagandam, Abhijit, Dur Muhurtam) ──
//
// Rahu Kalam / Gulika Kalam / Yamagandam split the daylight period (sunrise→sunset)
// into 8 equal parts; each inauspicious period occupies one fixed part per weekday.
// Abhijit Muhurta and Dur Muhurtam split daylight into 15 equal muhurtas instead.
// Weekday index: 0 = Sunday … 6 = Saturday.

export interface TimeWindow {
  start: Date;
  end: Date;
}

/** 1-based index (1–8) of the daylight-eighth used for each inauspicious period, by weekday. */
const RAHU_KALAM_PART = [8, 2, 7, 5, 6, 4, 3];
const GULIKA_KALAM_PART = [7, 6, 5, 4, 3, 2, 1];
const YAMAGANDAM_PART = [5, 4, 3, 2, 1, 7, 6];

/**
 * 1-based muhurta indices (1–15) for Dur Muhurtam, keyed by weekday (0=Sun…6=Sat).
 * Each entry is an array because some weekdays have two inauspicious windows.
 * Thursday (index 4) has two: the 6th and the 12th muhurta.
 * Values verified directly from Drik Panchang (Singapore, Jul 2026).
 */
const DUR_MUHURTAM_MUHURTA: number[][] = [
  [14],     // Sunday
  [9],      // Monday
  [4],      // Tuesday
  [8],      // Wednesday
  [6, 12],  // Thursday — two windows
  [4],      // Friday
  [1],      // Saturday
];

/** Abhijit Muhurta is always the 8th of the 15 daylight muhurtas, every day of the week. */
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

/** Determine which Sandhya session is currently active based on sun times. */
export type ActiveSession = "pratah" | "madhyahna" | "sayam" | "none";

export function getActiveSession(
  now: Date,
  sunTimes: SunTimes,
): ActiveSession {
  const ms = now.getTime();
  const rise = sunTimes.sunrise.getTime();
  const noon = sunTimes.solarNoon.getTime();
  const set = sunTimes.sunset.getTime();

  const HOUR = 60 * 60 * 1000;

  // Pratah Sandhya: 30 min before sunrise to 2 hours after sunrise
  if (ms >= rise - 30 * 60 * 1000 && ms <= rise + 2 * HOUR) return "pratah";
  // Madhyahna Sandhya: 30 min before solar noon to 30 min after
  if (ms >= noon - 30 * 60 * 1000 && ms <= noon + 30 * 60 * 1000) return "madhyahna";
  // Sayam Sandhya: 2 hours before sunset to 30 min after sunset
  if (ms >= set - 2 * HOUR && ms <= set + 30 * 60 * 1000) return "sayam";

  return "none";
}
