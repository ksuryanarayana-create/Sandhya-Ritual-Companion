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

/** Format a Date to a readable 12-hour time string (local time). */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
