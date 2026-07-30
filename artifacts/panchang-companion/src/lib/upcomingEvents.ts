/**
 * Computes upcoming panchang events (Ekadashi, Amavasya, Purnima, Sankranti)
 * for the next N days, starting from today.
 */

import {
  gregorianToJD,
  getNextAmavasya,
  sunLongitude,
  moonLongitude,
  getTithiIndex,
  SOLAR_SIGN_NAMES,
  TELUGU_MASA_NAMES,
  findBoundaryCrossing,
} from "./panchang";
import { getZonedParts, zonedTimeToUtc } from "./timezone";

function toSidereal(tropicalLon: number, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = 23.8531 + 1.39694 * T;
  return ((tropicalLon - ayanamsa) % 360 + 360) % 360;
}

function elongationSidereal(jd: number): number {
  const s = toSidereal(sunLongitude(jd), jd);
  const m = toSidereal(moonLongitude(jd), jd);
  return ((m - s) % 360 + 360) % 360;
}

/** Convert a JD to a Date object (UTC midnight approximation) */
function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

export type EventKind =
  | "ekadashi"
  | "amavasya"
  | "purnima"
  | "sankranti"
  | "pradosham"
  | "chaturthi";

export interface UpcomingEvent {
  kind: EventKind;
  /** Display label, e.g. "Shukla Ekadashi", "Karka Sankranti" */
  label: string;
  /** Guidance note in plain English */
  note: string;
  /** The date this event occurs */
  date: Date;
  /** Formatted date string for display */
  dateStr: string;
}

const EVENT_NOTES: Record<EventKind, string> = {
  ekadashi: "Fasting day observed by many Telugu families. Auspicious for prayer and restraint.",
  amavasya: "New moon — traditionally offered to ancestors (Pitru Tarpanam). Avoid auspicious starts.",
  purnima: "Full moon — auspicious for worship, charity, and family gatherings.",
  sankranti: "Sun enters a new zodiac sign. Marks a seasonal shift and is considered important for new beginnings.",
  pradosham: "Evening of the 13th tithi — especially auspicious for Shiva worship.",
  chaturthi: "Ganesh Chaturthi tithi — auspicious for new beginnings and removing obstacles.",
};

/**
 * Compute upcoming panchang events within the next `daysAhead` days.
 * `timeZone` is the IANA timezone of the user's saved location.
 */
export function getUpcomingEvents(
  startDate: Date,
  timeZone: string,
  daysAhead = 45,
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const seen = new Set<string>();

  const { year, month, day } = getZonedParts(startDate, timeZone);
  const startJD = gregorianToJD(year, month, day);
  const endJD = startJD + daysAhead;

  // ── Walk each day, check tithi ──────────────────────────────────────────
  for (let jd = startJD; jd <= endJD; jd += 0.5) {
    const sLon = toSidereal(sunLongitude(jd), jd);
    const mLon = toSidereal(moonLongitude(jd), jd);
    const tithiIdx = getTithiIndex(sLon, mLon);

    const approxDate = jdToDate(jd);
    const dateStr = approxDate.toLocaleDateString("en-IN", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const dateKey = approxDate.toISOString().slice(0, 10);

    // Ekadashi: tithi index 10 (Shukla) or 25 (Krishna)
    if (tithiIdx === 10 && !seen.has(`ekadashi-shukla-${dateKey}`)) {
      seen.add(`ekadashi-shukla-${dateKey}`);
      events.push({ kind: "ekadashi", label: "Shukla Ekadashi", note: EVENT_NOTES.ekadashi, date: approxDate, dateStr });
    }
    if (tithiIdx === 25 && !seen.has(`ekadashi-krishna-${dateKey}`)) {
      seen.add(`ekadashi-krishna-${dateKey}`);
      events.push({ kind: "ekadashi", label: "Krishna Ekadashi", note: EVENT_NOTES.ekadashi, date: approxDate, dateStr });
    }

    // Purnima: tithi index 14
    if (tithiIdx === 14 && !seen.has(`purnima-${dateKey}`)) {
      seen.add(`purnima-${dateKey}`);
      events.push({ kind: "purnima", label: "Purnima", note: EVENT_NOTES.purnima, date: approxDate, dateStr });
    }

    // Amavasya: tithi index 29
    if (tithiIdx === 29 && !seen.has(`amavasya-${dateKey}`)) {
      seen.add(`amavasya-${dateKey}`);
      events.push({ kind: "amavasya", label: "Amavasya", note: EVENT_NOTES.amavasya, date: approxDate, dateStr });
    }

    // Pradosham: tithi index 12 (Shukla Trayodashi) or 27 (Krishna Trayodashi)
    if ((tithiIdx === 12 || tithiIdx === 27) && !seen.has(`pradosham-${dateKey}`)) {
      seen.add(`pradosham-${dateKey}`);
      const paksha = tithiIdx === 12 ? "Shukla" : "Krishna";
      events.push({ kind: "pradosham", label: `${paksha} Pradosham`, note: EVENT_NOTES.pradosham, date: approxDate, dateStr });
    }

    // Chaturthi: tithi index 3 (Shukla) or 18 (Krishna Sankashti)
    if (tithiIdx === 3 && !seen.has(`chaturthi-shukla-${dateKey}`)) {
      seen.add(`chaturthi-shukla-${dateKey}`);
      events.push({ kind: "chaturthi", label: "Shukla Chaturthi", note: EVENT_NOTES.chaturthi, date: approxDate, dateStr });
    }
    if (tithiIdx === 18 && !seen.has(`chaturthi-krishna-${dateKey}`)) {
      seen.add(`chaturthi-krishna-${dateKey}`);
      events.push({ kind: "chaturthi", label: "Sankashti Chaturthi", note: EVENT_NOTES.chaturthi, date: approxDate, dateStr });
    }
  }

  // ── Sankranti: find solar sign crossings within the window ──────────────
  let sankrantiSearch = startJD;
  while (sankrantiSearch < endJD) {
    const crossingJD = findBoundaryCrossing(
      sankrantiSearch,
      (j) => toSidereal(sunLongitude(j), j),
      30,
      35,
    );
    if (crossingJD > endJD) break;

    const sunAfter = toSidereal(sunLongitude(crossingJD + 0.01), crossingJD + 0.01);
    const signIdx = Math.floor(sunAfter / 30) % 12;
    const crossingDate = jdToDate(crossingJD);
    const dateStr = crossingDate.toLocaleDateString("en-IN", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const masaName = TELUGU_MASA_NAMES[signIdx];
    const signName = SOLAR_SIGN_NAMES[signIdx];
    const key = `sankranti-${signIdx}-${crossingDate.toISOString().slice(0, 10)}`;
    if (!seen.has(key)) {
      seen.add(key);
      events.push({
        kind: "sankranti",
        label: `${signName} Sankranti (${masaName} starts)`,
        note: EVENT_NOTES.sankranti,
        date: crossingDate,
        dateStr,
      });
    }
    sankrantiSearch = crossingJD + 1;
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

/** Group upcoming events by week label ("This week", "Next week", "Later") */
export function groupEventsByWeek(
  events: UpcomingEvent[],
  today: Date,
): { label: string; events: UpcomingEvent[] }[] {
  const todayMs = today.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const thisWeek = events.filter(e => e.date.getTime() - todayMs < weekMs);
  const nextWeek = events.filter(e => {
    const diff = e.date.getTime() - todayMs;
    return diff >= weekMs && diff < 2 * weekMs;
  });
  const later = events.filter(e => e.date.getTime() - todayMs >= 2 * weekMs);

  const groups: { label: string; events: UpcomingEvent[] }[] = [];
  if (thisWeek.length) groups.push({ label: "This week", events: thisWeek });
  if (nextWeek.length) groups.push({ label: "Next week", events: nextWeek });
  if (later.length) groups.push({ label: "Coming up", events: later });
  return groups;
}
