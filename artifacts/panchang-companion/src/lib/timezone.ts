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
  const localISOString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
  const options: Intl.DateTimeFormatOptions = { timeZone, timeZoneName: "short" };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const refDate = new Date(`${localISOString}Z`);
  const tzParts = formatter.formatToParts(refDate);
  const tzOffset = tzParts.find(p => p.type === "timeZoneName")?.value || "+00:00";
  return new Date(`${localISOString}${tzOffset}`);
}
