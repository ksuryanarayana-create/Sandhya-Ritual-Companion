/**
 * Panchang calculations for Telugu (Andhra/Telangana) calendar.
 * Based on Meeus "Astronomical Algorithms" — approximate but suitable for daily practice.
 * Follows Amanta system (lunar month ends on Amavasya) used in Andhra Pradesh / Telangana.
 */

// ─── Low-level astronomy ────────────────────────────────────────────────────

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

/**
 * Lahiri ayanamsa (degrees) — the official Indian government standard for
 * converting tropical (Western) to sidereal (nirayana, Hindu) longitudes.
 * Formula: 23.85° at J2000.0, precessing at ~50.29"/year.
 */
function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.8531 + 1.39694 * T;
}

/** Convert a tropical (ecliptic) longitude to sidereal (nirayana). */
function toSidereal(tropicalLon: number, jd: number): number {
  return ((tropicalLon - lahiriAyanamsa(jd)) % 360 + 360) % 360;
}

/** Julian Day Number from Gregorian calendar (noon UT on that date). */
export function gregorianToJD(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/** Julian centuries from J2000.0 */
function T(jd: number) {
  return (jd - 2451545.0) / 36525.0;
}

/** Sun's apparent ecliptic longitude, degrees. Meeus Ch.25 (low-precision). */
export function sunLongitude(jd: number): number {
  const t = T(jd);
  const L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const Mr = deg2rad(M);
  const C =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(Mr) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const sunLon = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const apparent = sunLon - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));
  return ((apparent % 360) + 360) % 360;
}

/**
 * Moon's apparent ecliptic longitude (degrees). Meeus Ch.47 (truncated series).
 * Accuracy ~0.3°, sufficient for tithi/nakshatra.
 */
export function moonLongitude(jd: number): number {
  const t = T(jd);
  const Lp = ((218.3165 + 481267.8813 * t) % 360 + 360) % 360;
  const D = ((297.8502 + 445267.1115 * t) % 360 + 360) % 360;
  const M = ((357.5291 + 35999.0503 * t) % 360 + 360) % 360;
  const Mp = ((134.9634 + 477198.8676 * t) % 360 + 360) % 360;
  const F = ((93.2721 + 483202.0175 * t) % 360 + 360) % 360;

  const lon =
    Lp +
    6.2886 * Math.sin(deg2rad(Mp)) +
    1.2740 * Math.sin(deg2rad(2 * D - Mp)) +
    0.6583 * Math.sin(deg2rad(2 * D)) +
    0.2136 * Math.sin(deg2rad(2 * Mp)) -
    0.1851 * Math.sin(deg2rad(M)) -
    0.1143 * Math.sin(deg2rad(2 * F)) +
    0.0588 * Math.sin(deg2rad(2 * D - 2 * Mp)) +
    0.0572 * Math.sin(deg2rad(2 * D - M - Mp)) +
    0.0533 * Math.sin(deg2rad(2 * D + Mp)) +
    0.0458 * Math.sin(deg2rad(2 * D - M)) +
    0.0409 * Math.sin(deg2rad(2 * Mp - M)) -
    0.0347 * Math.sin(deg2rad(2 * F + 2 * D)) -
    0.0336 * Math.sin(deg2rad(2 * D - 2 * Mp + M));

  return ((lon % 360) + 360) % 360;
}

// ─── Panchang elements ──────────────────────────────────────────────────────

/** Tithi index 0–29 (0 = Shukla Pratipada … 14 = Purnima … 29 = Amavasya) */
export function getTithiIndex(sunLon: number, moonLon: number): number {
  const diff = ((moonLon - sunLon) % 360 + 360) % 360;
  return Math.floor(diff / 12) % 30;
}

/** Nakshatra index 0–26 */
export function getNakshatraIndex(moonLon: number): number {
  return Math.floor((moonLon * 27) / 360) % 27;
}

/** Yoga index 0–26 */
export function getYogaIndex(sunLon: number, moonLon: number): number {
  const sum = (sunLon + moonLon) % 360;
  return Math.floor((sum * 27) / 360) % 27;
}

/**
 * Karana index 0–59 in the lunar month cycle.
 */
export function getKaranaIndex(sunLon: number, moonLon: number): number {
  const diff = ((moonLon - sunLon) % 360 + 360) % 360;
  return Math.floor(diff / 6) % 60;
}

/** Solar zodiac sign index 0 = Mesha, …, 11 = Meena */
export function getSolarSignIndex(sunLon: number): number {
  return Math.floor(sunLon / 30) % 12;
}

// ─── Names ──────────────────────────────────────────────────────────────────

export const TITHI_NAMES: string[] = [
  "Shukla Pratipada", "Shukla Dvitiya", "Shukla Tritiya", "Shukla Chaturthi",
  "Shukla Panchami", "Shukla Shashti", "Shukla Saptami", "Shukla Ashtami",
  "Shukla Navami", "Shukla Dashami", "Shukla Ekadashi", "Shukla Dwadashi",
  "Shukla Trayodashi", "Shukla Chaturdashi", "Purnima",
  "Krishna Pratipada", "Krishna Dvitiya", "Krishna Tritiya", "Krishna Chaturthi",
  "Krishna Panchami", "Krishna Shashti", "Krishna Saptami", "Krishna Ashtami",
  "Krishna Navami", "Krishna Dashami", "Krishna Ekadashi", "Krishna Dwadashi",
  "Krishna Trayodashi", "Krishna Chaturdashi", "Amavasya",
];

export const NAKSHATRA_NAMES: string[] = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

export const YOGA_NAMES: string[] = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
  "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Aindra", "Vaidhriti",
];

const MOVABLE_KARANA = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];
const FIXED_KARANA = ["Shakuni", "Chatushpada", "Nagava", "Kimstughna"];

export function getKaranaName(index: number): string {
  if (index === 0) return FIXED_KARANA[3];
  if (index >= 57 && index <= 59) return FIXED_KARANA[index - 57];
  return MOVABLE_KARANA[(index - 1) % 7];
}

export const VARA_NAMES: { full: string; short: string }[] = [
  { full: "Ravivasara", short: "Sunday" },
  { full: "Somavasara", short: "Monday" },
  { full: "Mangalavasara", short: "Tuesday" },
  { full: "Budhavasara", short: "Wednesday" },
  { full: "Guruvasara", short: "Thursday" },
  { full: "Shukravaasara", short: "Friday" },
  { full: "Shanivasara", short: "Saturday" },
];

/**
 * Telugu (Amanta) lunar month names, keyed by solar sign index.
 * DO NOT index this by today's solar sign — use getMasaFromSankranti().
 */
export const TELUGU_MASA_NAMES: string[] = [
  "Chaitra", "Vaisakha", "Jyeshtha", "Ashadha",
  "Shravana", "Bhadrapada", "Ashwayuja", "Kartika",
  "Margashira", "Pushya", "Magha", "Phalguna",
];

export const RITU_NAMES: string[] = [
  "Vasanta", "Grishma", "Varsha", "Sharad", "Hemanta", "Shishira",
];

export function getAyana(sunLon: number): string {
  if (sunLon >= 270 || sunLon < 90) return "Uttarayana";
  return "Dakshinayana";
}

export const SAMVATSARA_NAMES: string[] = [
  "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati",
  "Angiras", "Shrimukha", "Bhava", "Yuva", "Dhata",
  "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
  "Chitrabhanu", "Subhanu", "Tarana", "Parthiva", "Vyaya",
  "Sarvajit", "Sarvadhari", "Virodhi", "Vikruti", "Khara",
  "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
  "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava",
  "Shubhakrit", "Shobhana", "Krodhi", "Vishvavasu", "Parabhava",
  "Plavanga", "Kilaka", "Saumya", "Sadharana", "Virodhikrit",
  "Paridhavi", "Pramadi", "Ananda", "Rakshasa", "Anala",
  "Pingala", "Kalayukti", "Siddharthi", "Raudri", "Durmati",
  "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
];

export function getSamvatsara(sakaYear: number): string {
  const idx = ((sakaYear % 60) + 11) % 60;
  return SAMVATSARA_NAMES[idx];
}

export function getShalivahanaYear(year: number, solarSignIndex: number): number {
  if (solarSignIndex === 11) return year - 78 - 1;
  return year - 78;
}

export const SOLAR_SIGN_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka",
  "Simha", "Kanya", "Tula", "Vrischika",
  "Dhanu", "Makara", "Kumbha", "Meena",
];

import { getZonedParts, getZonedWeekday, zonedTimeToUtc } from "./timezone";

// ─── Intra-day transitions ───────────────────────────────────────────────────

export interface PanchangSegment {
  name: string;
  upto: string;
}

function elongationSidereal(jd: number): number {
  const s = toSidereal(sunLongitude(jd), jd);
  const m = toSidereal(moonLongitude(jd), jd);
  return ((m - s) % 360 + 360) % 360;
}

function sumSidereal(jd: number): number {
  const s = toSidereal(sunLongitude(jd), jd);
  const m = toSidereal(moonLongitude(jd), jd);
  return ((s + m) % 360 + 360) % 360;
}

export function findBoundaryCrossing(jd0: number, thetaFn: (jd: number) => number, stepDeg: number, maxDays = 3): number {
  const theta0 = thetaFn(jd0 + 1e-7);
  const target = (Math.floor(theta0 / stepDeg) + 1) * stepDeg;
  const dist = (jd: number) => {
    const th = thetaFn(jd);
    return (((th - target + 180) % 360 + 360) % 360) - 180;
  };
  let lo = jd0, hi = jd0 + maxDays;
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) hi = jd0 + maxDays * 2;
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) {
    console.warn("findBoundaryCrossing: could not bracket a root; returning best-effort estimate.");
    return hi;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (dist(mid) <= 0) lo = mid; else hi = mid;
  }
  return hi;
}

function findPreviousBoundaryCrossing(jd0: number, thetaFn: (jd: number) => number, stepDeg: number, maxDays = 3): number {
  const theta0 = thetaFn(jd0 - 1e-7);
  const target = Math.floor(theta0 / stepDeg) * stepDeg;
  const dist = (jd: number) => {
    const th = thetaFn(jd);
    return (((th - target + 180) % 360 + 360) % 360) - 180;
  };
  let lo = jd0 - maxDays, hi = jd0;
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) lo = jd0 - maxDays * 2;
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) {
    console.warn("findPreviousBoundaryCrossing: could not bracket a root; returning best-effort estimate.");
    return lo;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (dist(mid) <= 0) lo = mid; else hi = mid;
  }
  return lo;
}

function nakshatraSidereal(jd: number): number {
  return toSidereal(moonLongitude(jd), jd);
}

const NAKSHATRA_TYAJYA_GHATIS: [number, number][] = [
  [51, 54], [25, 28], [31, 34], [41, 44], [15, 18], [22, 25], [31, 34],
  [21, 24], [33, 36], [31, 34], [21, 24], [19, 22], [22, 25], [21, 24],
  [15, 18], [15, 18], [11, 14], [15, 18], [57, 60], [25, 28], [21, 24],
  [11, 14], [11, 14], [19, 22], [17, 20], [25, 28], [31, 34],
];

export interface AbsoluteWindow {
  start: Date;
  end: Date;
}

export function getVarjyam(jd: number, baseDate: Date, jdBase: number): AbsoluteWindow | null {
  const mLon = nakshatraSidereal(jd);
  const nakshatraIdx = getNakshatraIndex(mLon);
  const step = 360 / 27;
  const startJD = findPreviousBoundaryCrossing(jd, nakshatraSidereal, step);
  const endJD = findBoundaryCrossing(jd, nakshatraSidereal, step);
  const duration = endJD - startJD;
  const range = NAKSHATRA_TYAJYA_GHATIS[nakshatraIdx];
  if (!range || duration <= 0) return null;
  const [g1, g2] = range;
  const winStartJD = startJD + (duration * (g1 - 1)) / 60;
  const winEndJD = startJD + (duration * g2) / 60;
  const toDate = (t: number) => new Date(baseDate.getTime() + (t - jdBase) * 86400000);
  return { start: toDate(winStartJD), end: toDate(winEndJD) };
}

function formatSegmentTime(baseDate: Date, jdBase: number, jdTarget: number, timeZone: string): string {
  const ms = baseDate.getTime() + (jdTarget - jdBase) * 86400000;
  const d = new Date(ms);
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone });
  const dParts = getZonedParts(d, timeZone);
  const baseParts = getZonedParts(baseDate, timeZone);
  const rolledOver = dParts.year !== baseParts.year || dParts.month !== baseParts.month || dParts.day !== baseParts.day;
  if (rolledOver) {
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
    return `${timeStr}, ${dateStr}`;
  }
  return timeStr;
}

function computeDaySegments(
  dayStartJD: number,
  baseDate: Date,
  jdBase: number,
  thetaFn: (jd: number) => number,
  stepDeg: number,
  nameFn: (idx: number) => string,
  cycleLen: number,
  timeZone: string,
  maxSegments = 4,
): PanchangSegment[] {
  const dayEndJD = dayStartJD + 1;
  const segments: PanchangSegment[] = [];
  let cursor = dayStartJD;
  for (let i = 0; i < maxSegments && cursor < dayEndJD; i++) {
    const theta = ((thetaFn(cursor) % 360) + 360) % 360;
    const idx = Math.floor(theta / stepDeg) % cycleLen;
    const endJD = findBoundaryCrossing(cursor, thetaFn, stepDeg);
    segments.push({ name: nameFn(idx), upto: formatSegmentTime(baseDate, jdBase, endJD, timeZone) });
    if (endJD <= cursor + 1e-6) break;
    cursor = endJD + 1e-6;
  }
  return segments;
}

// ─── Amavasya / Purnima finders ──────────────────────────────────────────────

export function getNextAmavasya(jd: number): number {
  let est = jd + (360 - elongationSidereal(jd)) / 12.2;
  for (let i = 0; i < 6; i++) {
    const e = elongationSidereal(est);
    est -= (e > 180 ? e - 360 : e) / 12.2;
  }
  return est;
}

export function getPrevAmavasya(jd: number): number {
  let est = jd - elongationSidereal(jd) / 12.2;
  for (let i = 0; i < 6; i++) {
    const e = elongationSidereal(est);
    est -= (e > 180 ? e - 360 : e) / 12.2;
  }
  return est;
}

// ─── Masa ─────────────────────────────────────────────────────────────────────

export function getMasaFromSankranti(jd: number): string {
  const prevAmavasya = getPrevAmavasya(jd);
  const nextAmavasya = getNextAmavasya(jd);

  const sankrantiJD = findBoundaryCrossing(
    prevAmavasya,
    (j: number) => toSidereal(sunLongitude(j), j),
    30,
    35,
  );

  const sunAfter = toSidereal(sunLongitude(sankrantiJD + 0.01), sankrantiJD + 0.01);
  const signIdx = Math.floor(sunAfter / 30) % 12;

  if (sankrantiJD < nextAmavasya) {
    return TELUGU_MASA_NAMES[signIdx];
  } else {
    return `Adhika ${TELUGU_MASA_NAMES[signIdx]}`;
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface PanchangData {
  tithi: string;
  tithiIndex: number;
  paksha: "Shukla" | "Krishna";
  nakshatra: string;
  yoga: string;
  karana: string;
  tithiSegments: PanchangSegment[];
  karanaSegments: PanchangSegment[];
  yogaSegments: PanchangSegment[];
  vara: string;
  varaShort: string;
  masa: string;
  ritu: string;
  ayana: string;
  samvat: number;
  samvatsara: string;
  solarSign: string;
  varjyam: AbsoluteWindow | null;
}

export function calculatePanchang(date: Date, timeZone: string): PanchangData {
  const { year, month, day } = getZonedParts(date, timeZone);

  const localNoonDateForJD = zonedTimeToUtc(year, month, day, 12, 0, 0, timeZone);
  const jd = localNoonDateForJD.getTime() / 86400000 + 2440587.5;

  const tropicalSun = sunLongitude(jd);
  const tropicalMoon = moonLongitude(jd);

  const sLon = toSidereal(tropicalSun, jd);
  const mLon = toSidereal(tropicalMoon, jd);

  const tithiIdx = getTithiIndex(sLon, mLon);
  const nakshatraIdx = getNakshatraIndex(mLon);
  const yogaIdx = getYogaIndex(sLon, mLon);
  const karanaIdx = getKaranaIndex(sLon, mLon);
  const solarSignIdx = getSolarSignIndex(sLon);

  const weekday = getZonedWeekday(date, timeZone);
  const paksha: "Shukla" | "Krishna" = tithiIdx < 15 ? "Shukla" : "Krishna";

  const dayStartJD = jd - 0.5;
  const localNoonDate = localNoonDateForJD;

  const yogaStep = 360 / 27;
  const tithiSegments = computeDaySegments(dayStartJD, localNoonDate, jd, elongationSidereal, 12, (i) => TITHI_NAMES[i], 30, timeZone);
  const karanaSegments = computeDaySegments(dayStartJD, localNoonDate, jd, elongationSidereal, 6, getKaranaName, 60, timeZone);
  const yogaSegments = computeDaySegments(dayStartJD, localNoonDate, jd, sumSidereal, yogaStep, (i) => YOGA_NAMES[i], 27, timeZone);
  const varjyam = getVarjyam(jd, localNoonDate, jd);

  return {
    tithi: TITHI_NAMES[tithiIdx],
    tithiIndex: tithiIdx,
    paksha,
    nakshatra: NAKSHATRA_NAMES[nakshatraIdx],
    yoga: YOGA_NAMES[yogaIdx],
    karana: getKaranaName(karanaIdx),
    tithiSegments,
    karanaSegments,
    yogaSegments,
    vara: VARA_NAMES[weekday].full,
    varaShort: VARA_NAMES[weekday].short,
    masa: getMasaFromSankranti(jd),
    ritu: RITU_NAMES[Math.floor(solarSignIdx / 2)],
    ayana: getAyana(sLon),
    samvat: getShalivahanaYear(year, solarSignIdx),
    samvatsara: getSamvatsara(getShalivahanaYear(year, solarSignIdx)),
    solarSign: SOLAR_SIGN_NAMES[solarSignIdx],
    varjyam,
  };
}
