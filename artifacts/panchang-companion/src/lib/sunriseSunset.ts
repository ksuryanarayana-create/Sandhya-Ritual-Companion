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

// ─── Sandhya session windows ──────────────────────────────────────────────────

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
    pratah:   `${fmt(new Date(sunTimes.sunrise.getTime()  - 30 * MIN))} – ${fmt(new Date(sunTimes.sunrise.getTime()  + 2  * HOUR))}`,
    madhyahna:`${fmt(new Date(sunTimes.solarNoon.getTime()- 30 * MIN))} – ${fmt(new Date(sunTimes.solarNoon.getTime()+ 30 * MIN))}`,
    sayam:    `${fmt(new Date(sunTimes.sunset.getTime()   - 2  * HOUR))} – ${fmt(new Date(sunTimes.sunset.getTime()   + 30 * MIN))}`,
  };
}

// ─── Amrit Kalam (Choghadiya system) ──────────────────────────────────────────
//
// Both daylight (sunrise→sunset) and nighttime (sunset→next sunrise) are divided
// into 8 equal parts; each part maps to a Choghadiya based on the weekday start.
//
// Day starting Choghadiya by weekday (0=Sun…6=Sat):
//   Sun=Udveg(1), Mon=Amrit(4), Tue=Rog(7), Wed=Labh(3), Thu=Shubh(6), Fri=Char(2), Sat=Kaal(5)
// Night starting Choghadiya by weekday:
//   Sun=Shubh(6), Mon=Char(2), Tue=Kaal(5), Wed=Udveg(1), Thu=Labh(3), Fri=Rog(7), Sat=Amrit(4)

const DAY_START_CHOGHADIYA   = [1, 4, 7, 3, 6, 2, 5]; // by weekday
const NIGHT_START_CHOGHADIYA = [6, 2, 5, 1, 3, 7, 4]; // by weekday

/** Returns the 1-based part (1–8) in which Amrit Choghadiya (index 4) falls. */
function amritPartIndex(startChoghadiya: number): number {
  for (let part = 1; part <= 8; part++) {
    const choghadiya = ((startChoghadiya - 1 + (part - 1)) % 7) + 1;
    if (choghadiya === 4) return part;
  }
  return 1; // fallback – should never be reached
}

export interface AmritKalam {
  day: TimeWindow;
  night: TimeWindow;
}

/**
 * Compute Amrit Kalam windows for the day.
 * @param sunTimes    Today's sunrise / sunset / solarNoon.
 * @param nextSunrise Tomorrow's sunrise (bounds the night window).
 * @param weekday     0 = Sunday … 6 = Saturday of the *current* day.
 */
export function getAmritKalam(
  sunTimes: SunTimes,
  nextSunrise: Date,
  weekday: number,
): AmritKalam {
  const dayMs   = sunTimes.sunset.getTime()  - sunTimes.sunrise.getTime();
  const nightMs = nextSunrise.getTime()       - sunTimes.sunset.getTime();
  const dayPartMs   = dayMs   / 8;
  const nightPartMs = nightMs / 8;

  const dayPart   = amritPartIndex(DAY_START_CHOGHADIYA[weekday]);
  const nightPart = amritPartIndex(NIGHT_START_CHOGHADIYA[weekday]);

  return {
    day: {
      start: new Date(sunTimes.sunrise.getTime() + (dayPart   - 1) * dayPartMs),
      end:   new Date(sunTimes.sunrise.getTime() +  dayPart        * dayPartMs),
    },
    night: {
      start: new Date(sunTimes.sunset.getTime()  + (nightPart - 1) * nightPartMs),
      end:   new Date(sunTimes.sunset.getTime()  +  nightPart       * nightPartMs),
    },
  };
}

export type ActiveSession = "pratah" | "madhyahna" | "sayam" | "none";

export function getActiveSession(now: Date, sunTimes: SunTimes): ActiveSession {
  const ms   = now.getTime();
  const rise = sunTimes.sunrise.getTime();
  const noon = sunTimes.solarNoon.getTime();
  const set  = sunTimes.sunset.getTime();
  const HOUR = 60 * 60 * 1000;

  if (ms >= rise - 30 * 60 * 1000 && ms <= rise + 2 * HOUR) return "pratah";
  if (ms >= noon - 30 * 60 * 1000 && ms <= noon + 30 * 60 * 1000) return "madhyahna";
  if (ms >= set  - 2  * HOUR      && ms <= set  + 30 * 60 * 1000) return "sayam";
  return "none";
}
