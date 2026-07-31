/**
 * Computes upcoming panchang events (Ekadashi, Amavasya, Purnima, Sankranti,
 * Pradosham, Chaturthi) and major Telugu festivals for the next N days.
 */

import {
  gregorianToJD,
  sunLongitude,
  moonLongitude,
  getTithiIndex,
  SOLAR_SIGN_NAMES,
  TELUGU_MASA_NAMES,
  findBoundaryCrossing,
} from "./panchang";
import { getZonedParts } from "./timezone";

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

function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

// ─── Event kinds ──────────────────────────────────────────────────────────────

export type EventKind =
  | "ekadashi"
  | "amavasya"
  | "purnima"
  | "sankranti"
  | "pradosham"
  | "chaturthi"
  | "festival";

export interface UpcomingEvent {
  kind: EventKind;
  label: string;
  note: string;
  date: Date;
  dateStr: string;
  isFasting?: boolean;
}

// ─── Telugu festival rules (solar sign index + tithi index) ───────────────────
// signIdx approximates masa from the sidereal solar longitude at that JD.
// Map: signIdx 0=Chaitra, 1=Vaisakha … 11=Phalguna (same as TELUGU_MASA_NAMES order).

interface FestivalScanRule {
  name: string;
  note: string;
  signIdx: number;   // Solar sign index (0–11) matching the masa
  tithiIdx: number;  // Tithi index (0–29)
  isFasting: boolean;
}

const FESTIVAL_SCAN_RULES: FestivalScanRule[] = [
  {
    name: "Ugadi",
    note: "Telugu New Year — Chaitra Shukla Prathama. Auspicious for new beginnings.",
    signIdx: 0, tithiIdx: 0, isFasting: false,
  },
  {
    name: "Sri Rama Navami",
    note: "Birthday of Sri Rama — Chaitra Shukla Navami. Fasting and bhajan observed.",
    signIdx: 0, tithiIdx: 8, isFasting: true,
  },
  {
    name: "Hanuman Jayanti",
    note: "Birthday of Hanuman — Chaitra Purnima. Auspicious for prayer.",
    signIdx: 0, tithiIdx: 14, isFasting: false,
  },
  {
    name: "Vinayaka Chavithi",
    note: "Ganesh Chaturthi — Bhadrapada Shukla Chaturthi. Avoid moongazing today.",
    signIdx: 5, tithiIdx: 3, isFasting: false,
  },
  {
    name: "Navratri",
    note: "Nine nights of Devi worship begin — Ashwayuja Shukla Prathama.",
    signIdx: 6, tithiIdx: 0, isFasting: false,
  },
  {
    name: "Dasara (Vijayadasami)",
    note: "Ashwayuja Shukla Dashami — victory of good over evil. Very auspicious for new starts.",
    signIdx: 6, tithiIdx: 9, isFasting: false,
  },
  {
    name: "Deepavali (Naraka Chaturdashi)",
    note: "Festival of lights — Kartika Krishna Chaturdashi. Lamps lit before sunrise.",
    signIdx: 7, tithiIdx: 28, isFasting: false,
  },
  {
    name: "Karthika Purnima",
    note: "Highly auspicious full moon — lamps lit at Shiva temples all night.",
    signIdx: 7, tithiIdx: 14, isFasting: false,
  },
  {
    name: "Vaikunta Ekadashi",
    note: "Most sacred Ekadashi of the year for Vaishnavas — Margashira Shukla.",
    signIdx: 8, tithiIdx: 10, isFasting: true,
  },
  {
    name: "Maha Shivaratri",
    note: "Phalguna Krishna Chaturdashi — great night of Shiva. All-night vigil and fasting.",
    signIdx: 11, tithiIdx: 28, isFasting: true,
  },
];

// ─── Generic tithi notes ──────────────────────────────────────────────────────

const EVENT_NOTES: Record<EventKind, string> = {
  ekadashi: "Fasting day observed by many Telugu families. Auspicious for prayer and restraint.",
  amavasya: "New moon — traditionally offered to ancestors (Pitru Tarpanam). Avoid auspicious starts.",
  purnima: "Full moon — auspicious for worship, charity, and family gatherings.",
  sankranti: "Sun enters a new zodiac sign. Marks a seasonal shift; good for new beginnings.",
  pradosham: "Evening of the 13th tithi — especially auspicious for Shiva worship.",
  chaturthi: "Ganesh Chaturthi tithi — auspicious for new beginnings and removing obstacles.",
  festival: "",
};

// ─── Main computation ─────────────────────────────────────────────────────────

export function getUpcomingEvents(
  startDate: Date,
  timeZone: string,
  daysAhead = 90,
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const seen = new Set<string>();

  const { year, month, day } = getZonedParts(startDate, timeZone);
  const startJD = gregorianToJD(year, month, day);
  const endJD = startJD + daysAhead;

  for (let jd = startJD; jd <= endJD; jd += 0.5) {
    const sLon = toSidereal(sunLongitude(jd), jd);
    const mLon = toSidereal(moonLongitude(jd), jd);
    const tithiIdx = getTithiIndex(sLon, mLon);
    // Solar sign index (0–11) used as a masa proxy for festival detection
    const signIdx = Math.floor(sLon / 30) % 12;

    const approxDate = jdToDate(jd);
    const dateStr = approxDate.toLocaleDateString("en-IN", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const dateKey = approxDate.toISOString().slice(0, 10);

    // ── Festivals (highest priority — skip generic tithi events on same day) ──
    for (const rule of FESTIVAL_SCAN_RULES) {
      const key = `festival-${rule.name}-${dateKey}`;
      if (rule.signIdx === signIdx && rule.tithiIdx === tithiIdx && !seen.has(key)) {
        seen.add(key);
        // Mark the date so we suppress the redundant generic event (e.g. Hanuman Jayanti already shows Purnima context)
        seen.add(`purnima-${dateKey}`);
        seen.add(`chaturthi-shukla-${dateKey}`);
        seen.add(`ekadashi-shukla-${dateKey}`);
        events.push({
          kind: "festival",
          label: rule.name,
          note: rule.note,
          date: approxDate,
          dateStr,
          isFasting: rule.isFasting,
        });
      }
    }

    // ── Ekadashi ──────────────────────────────────────────────────────────────
    if (tithiIdx === 10 && !seen.has(`ekadashi-shukla-${dateKey}`)) {
      seen.add(`ekadashi-shukla-${dateKey}`);
      events.push({ kind: "ekadashi", label: "Shukla Ekadashi", note: EVENT_NOTES.ekadashi, date: approxDate, dateStr, isFasting: true });
    }
    if (tithiIdx === 25 && !seen.has(`ekadashi-krishna-${dateKey}`)) {
      seen.add(`ekadashi-krishna-${dateKey}`);
      events.push({ kind: "ekadashi", label: "Krishna Ekadashi", note: EVENT_NOTES.ekadashi, date: approxDate, dateStr, isFasting: true });
    }

    // ── Purnima ───────────────────────────────────────────────────────────────
    if (tithiIdx === 14 && !seen.has(`purnima-${dateKey}`)) {
      seen.add(`purnima-${dateKey}`);
      events.push({ kind: "purnima", label: "Purnima", note: EVENT_NOTES.purnima, date: approxDate, dateStr });
    }

    // ── Amavasya ──────────────────────────────────────────────────────────────
    if (tithiIdx === 29 && !seen.has(`amavasya-${dateKey}`)) {
      seen.add(`amavasya-${dateKey}`);
      events.push({ kind: "amavasya", label: "Amavasya", note: EVENT_NOTES.amavasya, date: approxDate, dateStr });
    }

    // ── Pradosham ────────────────────────────────────────────────────────────
    if ((tithiIdx === 12 || tithiIdx === 27) && !seen.has(`pradosham-${dateKey}`)) {
      seen.add(`pradosham-${dateKey}`);
      const paksha = tithiIdx === 12 ? "Shukla" : "Krishna";
      events.push({ kind: "pradosham", label: `${paksha} Pradosham`, note: EVENT_NOTES.pradosham, date: approxDate, dateStr });
    }

    // ── Chaturthi ────────────────────────────────────────────────────────────
    if (tithiIdx === 3 && !seen.has(`chaturthi-shukla-${dateKey}`)) {
      seen.add(`chaturthi-shukla-${dateKey}`);
      events.push({ kind: "chaturthi", label: "Shukla Chaturthi", note: EVENT_NOTES.chaturthi, date: approxDate, dateStr });
    }
    if (tithiIdx === 18 && !seen.has(`chaturthi-krishna-${dateKey}`)) {
      seen.add(`chaturthi-krishna-${dateKey}`);
      events.push({ kind: "chaturthi", label: "Sankashti Chaturthi", note: EVENT_NOTES.chaturthi, date: approxDate, dateStr });
    }
  }

  // ── Sankranti: solar sign crossings ─────────────────────────────────────────
  let sankrantiSearch = startJD;
  while (sankrantiSearch < endJD) {
    const crossingJD = findBoundaryCrossing(sankrantiSearch, (j) => toSidereal(sunLongitude(j), j), 30, 35);
    if (crossingJD > endJD) break;
    const sunAfter = toSidereal(sunLongitude(crossingJD + 0.01), crossingJD + 0.01);
    const signIdx = Math.floor(sunAfter / 30) % 12;
    const crossingDate = jdToDate(crossingJD);
    const dateStr = crossingDate.toLocaleDateString("en-IN", { timeZone, weekday: "short", month: "short", day: "numeric" });
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

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

// ─── Grouping (for Upcoming page) ────────────────────────────────────────────

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
