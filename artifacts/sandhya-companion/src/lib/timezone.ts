/**
 * Timezone helpers so displayed times reflect the *saved location's* clock,
 * not the device's own timezone. Without this, e.g. setting the location to
 * Singapore while browsing from India would still print IST times, because
 * `Date#toLocaleTimeString` defaults to the browser's local timezone.
 *
 * `tz-lookup` resolves an IANA timezone name from lat/lng entirely offline
 * (no network call), which keeps this reliable alongside the sunrise-sunset
 * and geocoding APIs already in use.
 */
import tzLookup from "tz-lookup";

/** IANA timezone name for a location, e.g. "Asia/Singapore". */
export function getTimeZone(lat: number, lng: number): string {
  try {
    return tzLookup(lat, lng);
  } catch {
    // Extremely unlikely (tz-lookup covers the whole globe including oceans),
    // but fall back to the device's own zone rather than throwing.
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/** Y/M/D/H/M/S wall-clock components of an instant, as seen in `timeZone`. */
export interface ZonedDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;  // 0-23
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl renders midnight as "24" with hour12:false in some engines — normalize to 0.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Convert a wall-clock date/time *as read in `timeZone`* to the absolute
 * instant (UTC) it represents. Handles DST by resolving the zone offset
 * iteratively (two passes is enough in practice).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let guessMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 2; i++) {
    const parts = getZonedParts(new Date(guessMs), timeZone);
    const asUTCIfZoned = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const offsetMs = asUTCIfZoned - guessMs; // how far zoned-wall-clock is ahead of the UTC instant
    const targetUTC = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
    if (targetUTC === guessMs) break;
    guessMs = targetUTC;
  }
  return new Date(guessMs);
}

/** Weekday index (0 = Sunday) of an instant, as seen in `timeZone`. */
export function getZonedWeekday(date: Date, timeZone: string): number {
  const str = date.toLocaleDateString("en-US", { timeZone, weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[str] ?? 0;
}
