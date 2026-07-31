/**
 * Timezone utilities using tz-lookup for offline lat/lng → IANA timezone.
 */

import tzlookup from "tz-lookup";

export function getTimeZone(lat: number, lng: number): string {
  try {
    return tzlookup(lat, lng);
  } catch {
    // Fallback to Asia/Kolkata for Indian subcontinent
    return "Asia/Kolkata";
  }
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    second: parseInt(get("second"), 10),
  };
}

export function getZonedWeekday(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  const dayName = formatter.format(date);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(dayName);
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  // Strategy: guess UTC = desired local time (ignoring offset), ask Intl what local
  // time that UTC maps to, compute the offset, then subtract it.
  // Avoids parsing locale-specific timezone abbreviations ("IST", "EDT") which are
  // not valid ISO 8601 offset strings and cause new Date() to return NaN.
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessLocal = getZonedParts(new Date(guessUtcMs), timeZone);
  const guessLocalMs = Date.UTC(
    guessLocal.year, guessLocal.month - 1, guessLocal.day,
    guessLocal.hour, guessLocal.minute, guessLocal.second,
  );
  // offsetMs = local - UTC (positive = east of GMT, e.g. IST = +5.5h)
  const offsetMs = guessLocalMs - guessUtcMs;
  return new Date(guessUtcMs - offsetMs);
}
