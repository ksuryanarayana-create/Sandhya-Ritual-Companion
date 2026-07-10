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
  // 23.8531° at J2000 + 1.39694° per Julian century precession
  return 23.8531 + 1.39694 * T;
}

/** Convert a tropical (ecliptic) longitude to sidereal (nirayana). */
function toSidereal(tropicalLon: number, jd: number): number {
  return ((tropicalLon - lahiriAyanamsa(jd)) % 360 + 360) % 360;
}

/** Julian Day Number from Gregorian calendar (noon UT on that date). */
export function gregorianToJD(year: number, month: number, day: number): number {
  // Meeus Ch.7
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
  // Apparent longitude: subtract aberration + add nutation (simplified)
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
  // Fundamental arguments
  const Lp = ((218.3165 + 481267.8813 * t) % 360 + 360) % 360; // mean longitude
  const D = ((297.8502 + 445267.1115 * t) % 360 + 360) % 360;  // elongation
  const M = ((357.5291 + 35999.0503 * t) % 360 + 360) % 360;   // sun mean anomaly
  const Mp = ((134.9634 + 477198.8676 * t) % 360 + 360) % 360; // moon mean anomaly
  const F = ((93.2721 + 483202.0175 * t) % 360 + 360) % 360;   // argument of latitude

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
 * The 60-karana cycle: index 0 = Kimstughna (fixed), 1–56 = 7 movable × 8, 57–59 = 3 fixed.
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
  // Shukla paksha 1–15
  "Shukla Pratipada",
  "Shukla Dvitiya",
  "Shukla Tritiya",
  "Shukla Chaturthi",
  "Shukla Panchami",
  "Shukla Shashti",
  "Shukla Saptami",
  "Shukla Ashtami",
  "Shukla Navami",
  "Shukla Dashami",
  "Shukla Ekadashi",
  "Shukla Dwadashi",
  "Shukla Trayodashi",
  "Shukla Chaturdashi",
  "Purnima",
  // Krishna paksha 1–15
  "Krishna Pratipada",
  "Krishna Dvitiya",
  "Krishna Tritiya",
  "Krishna Chaturthi",
  "Krishna Panchami",
  "Krishna Shashti",
  "Krishna Saptami",
  "Krishna Ashtami",
  "Krishna Navami",
  "Krishna Dashami",
  "Krishna Ekadashi",
  "Krishna Dwadashi",
  "Krishna Trayodashi",
  "Krishna Chaturdashi",
  "Amavasya",
];

export const NAKSHATRA_NAMES: string[] = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

export const YOGA_NAMES: string[] = [
  "Vishkambha",
  "Priti",
  "Ayushman",
  "Saubhagya",
  "Shobhana",
  "Atiganda",
  "Sukarma",
  "Dhriti",
  "Shoola",
  "Ganda",
  "Vriddhi",
  "Dhruva",
  "Vyaghata",
  "Harshana",
  "Vajra",
  "Siddhi",
  "Vyatipata",
  "Variyan",
  "Parigha",
  "Shiva",
  "Siddha",
  "Sadhya",
  "Shubha",
  "Shukla",
  "Brahma",
  "Aindra",
  "Vaidhriti",
];

// 11 movable/fixed karana names; the 60-cycle repeats the 7 movable ones
const MOVABLE_KARANA = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"];
const FIXED_KARANA = ["Shakuni", "Chatushpada", "Nagava", "Kimstughna"]; // last 3 + first (special)

export function getKaranaName(index: number): string {
  if (index === 0) return FIXED_KARANA[3]; // Kimstughna (only at start of month)
  if (index >= 57 && index <= 59) return FIXED_KARANA[index - 57]; // last 3 fixed
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

/** Telugu (Amanta) lunar month names, keyed by solar sign index */
export const TELUGU_MASA_NAMES: string[] = [
  "Chaitra",    // Mesha
  "Vaisakha",   // Vrishabha
  "Jyeshtha",   // Mithuna
  "Ashadha",    // Karka
  "Shravana",   // Simha
  "Bhadrapada", // Kanya
  "Ashwayuja",  // Tula
  "Kartika",    // Vrischika
  "Margashira", // Dhanu
  "Pushya",     // Makara
  "Magha",      // Kumbha
  "Phalguna",   // Meena
];

/** Ritu (season) based on Telugu solar month index (pairs of months) */
export const RITU_NAMES: string[] = [
  "Vasanta",  // Chaitra–Vaisakha (spring)
  "Grishma",  // Jyeshtha–Ashadha (summer)
  "Varsha",   // Shravana–Bhadrapada (monsoon)
  "Sharad",   // Ashwayuja–Kartika (autumn)
  "Hemanta",  // Margashira–Pushya (pre-winter)
  "Shishira", // Magha–Phalguna (winter)
];

/** Ayana based on solar longitude */
export function getAyana(sunLon: number): string {
  // Uttarayana: Makara (270°) through Mithuna (90°) — traditional: starts ~Makar Sankranti
  // Dakshinayana: Karka (90°) through Dhanu (270°)
  if (sunLon >= 270 || sunLon < 90) return "Uttarayana";
  return "Dakshinayana";
}

// ─── 60-year Samvatsara cycle ────────────────────────────────────────────────

/**
 * The 60-year Brihaspati (Jupiter) samvatsara cycle used in Telugu panchang.
 * Each Shalivahana Saka year carries one of these names.
 */
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

/**
 * Samvatsara name for a given Shalivahana Saka year.
 * Verified anchor: Saka 1948 (Ugadi March 2026) = Parabhava (index 39).
 * Formula: index = (saka_year mod 60 + 11) mod 60
 */
export function getSamvatsara(sakaYear: number): string {
  const idx = ((sakaYear % 60) + 11) % 60;
  return SAMVATSARA_NAMES[idx];
}

// ─── Shalivahana Saka year ──────────────────────────────────────────────────

/**
 * Approximate Shalivahana Saka year.
 * The Saka era started 78 CE. The year changes on Ugadi (Chaitra Shukla Pratipada).
 * We use solar month: if Sun is in Mesha (sign 0) or later in the year, new year has started.
 */
export function getShalivahanaYear(year: number, solarSignIndex: number): number {
  // Before Mesha (i.e., still in Meena), we're in the previous Saka year
  if (solarSignIndex === 11) {
    return year - 78 - 1;
  }
  return year - 78;
}

// ─── Intra-day transitions (tithi/karana/yoga change mid-day) ───────────────

/** One named period of a panchang element within (or overlapping) the calendar day. */
export interface PanchangSegment {
  name: string;
  /** Formatted local end time, e.g. "08:16 AM" or "05:22 AM, Jul 11" if it ends the next day. */
  upto: string;
}

/** Sidereal elongation (Moon − Sun), 0–360°. Drives tithi and karana. */
function elongationSidereal(jd: number): number {
  const s = toSidereal(sunLongitude(jd), jd);
  const m = toSidereal(moonLongitude(jd), jd);
  return ((m - s) % 360 + 360) % 360;
}

/** Sidereal Sun+Moon sum, 0–360°. Drives yoga. */
function sumSidereal(jd: number): number {
  const s = toSidereal(sunLongitude(jd), jd);
  const m = toSidereal(moonLongitude(jd), jd);
  return ((s + m) % 360 + 360) % 360;
}

/**
 * Find the next time (JD) after `jd0` at which a monotonically-increasing,
 * wrapping angle `thetaFn` crosses the next multiple of `stepDeg`.
 * Uses bisection on a signed, wrap-aware distance function.
 */
function findBoundaryCrossing(jd0: number, thetaFn: (jd: number) => number, stepDeg: number, maxDays = 3): number {
  const theta0 = thetaFn(jd0 + 1e-7); // nudge past an exact boundary
  const target = (Math.floor(theta0 / stepDeg) + 1) * stepDeg;
  const dist = (jd: number) => {
    const th = thetaFn(jd);
    return (((th - target + 180) % 360 + 360) % 360) - 180;
  };
  let lo = jd0, hi = jd0 + maxDays;
  // Safety: if not bracketed within maxDays (should not happen for real
  // sun/moon rates), extend the window once before giving up.
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) {
    hi = jd0 + maxDays * 2;
  }
  if (!(dist(lo) <= 0 && dist(hi) >= 0)) {
    // Still not bracketed — astronomically shouldn't occur. Fail loudly in
    // dev rather than silently returning a bogus crossing time.
    console.warn("findBoundaryCrossing: could not bracket a root; returning best-effort estimate.");
    return hi;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (dist(mid) <= 0) lo = mid; else hi = mid;
  }
  return hi;
}

/** Format a JD as a local wall-clock time relative to `baseDate`/`jdBase`, noting the date if it rolls to the next day. */
function formatSegmentTime(baseDate: Date, jdBase: number, jdTarget: number): string {
  const ms = baseDate.getTime() + (jdTarget - jdBase) * 86400000;
  const d = new Date(ms);
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const rolledOver = d.getFullYear() !== baseDate.getFullYear() || d.getMonth() !== baseDate.getMonth() || d.getDate() !== baseDate.getDate();
  if (rolledOver) {
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${timeStr}, ${dateStr}`;
  }
  return timeStr;
}

/**
 * Build the list of segments for an element (tithi/karana/yoga) that are
 * active at any point during the local calendar day starting at `dayStartJD`.
 * Mirrors traditional panchang references (e.g. Drik Panchang), which list
 * every value the element takes on that day along with its end time.
 */
function computeDaySegments(
  dayStartJD: number,
  baseDate: Date,
  jdBase: number,
  thetaFn: (jd: number) => number,
  stepDeg: number,
  nameFn: (idx: number) => string,
  cycleLen: number,
  maxSegments = 4,
): PanchangSegment[] {
  const dayEndJD = dayStartJD + 1;
  const segments: PanchangSegment[] = [];
  let cursor = dayStartJD;
  for (let i = 0; i < maxSegments && cursor < dayEndJD; i++) {
    const theta = ((thetaFn(cursor) % 360) + 360) % 360;
    const idx = Math.floor(theta / stepDeg) % cycleLen;
    const endJD = findBoundaryCrossing(cursor, thetaFn, stepDeg);
    segments.push({ name: nameFn(idx), upto: formatSegmentTime(baseDate, jdBase, endJD) });
    if (endJD <= cursor + 1e-6) break; // safety against zero-length loop
    cursor = endJD + 1e-6;
  }
  return segments;
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
  vara: string;        // Sanskrit weekday name
  masa: string;        // Telugu month
  ritu: string;        // Season
  ayana: string;       // Uttarayana / Dakshinayana
  samvat: number;      // Shalivahana Saka year number
  samvatsara: string;  // 60-year cycle name, e.g. "Parabhava"
  solarSign: string;   // Current solar sign (Rashi)
}

const SOLAR_SIGN_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka",
  "Simha", "Kanya", "Tula", "Vrischika",
  "Dhanu", "Makara", "Kumbha", "Meena",
];

/**
 * Calculate full panchang for a given date at local noon (approximation).
 * `date` should be a JavaScript Date object (local time).
 */
export function calculatePanchang(date: Date): PanchangData {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // JD for local noon of this calendar date, derived directly from the
  // instant's real UTC timestamp (Unix epoch = JD 2440587.5). This avoids
  // modulo-wrapping the UT hour, which previously shifted the JD by a full
  // day for large positive UTC offsets (e.g. UTC+13/+14) instead of rolling
  // the date over correctly.
  const localNoonDateForJD = new Date(year, month - 1, day, 12, 0, 0, 0);
  const jd = localNoonDateForJD.getTime() / 86400000 + 2440587.5;

  // Tropical (Western) longitudes
  const tropicalSun = sunLongitude(jd);
  const tropicalMoon = moonLongitude(jd);

  // Convert to sidereal (nirayana) using Lahiri ayanamsa — required for all Hindu calendar elements
  const sLon = toSidereal(tropicalSun, jd);
  const mLon = toSidereal(tropicalMoon, jd);

  const tithiIdx = getTithiIndex(sLon, mLon);
  const nakshatraIdx = getNakshatraIndex(mLon);
  const yogaIdx = getYogaIndex(sLon, mLon);
  const karanaIdx = getKaranaIndex(sLon, mLon);
  const solarSignIdx = getSolarSignIndex(sLon);

  const weekday = date.getDay(); // 0 = Sunday
  const paksha: "Shukla" | "Krishna" = tithiIdx < 15 ? "Shukla" : "Krishna";

  // Local midnight JD for this calendar date (jd above is local noon).
  const dayStartJD = jd - 0.5;
  const localNoonDate = localNoonDateForJD;

  const yogaStep = 360 / 27;
  const tithiSegments = computeDaySegments(dayStartJD, localNoonDate, jd, elongationSidereal, 12, (i) => TITHI_NAMES[i], 30);
  const karanaSegments = computeDaySegments(dayStartJD, localNoonDate, jd, elongationSidereal, 6, getKaranaName, 60);
  const yogaSegments = computeDaySegments(dayStartJD, localNoonDate, jd, sumSidereal, yogaStep, (i) => YOGA_NAMES[i], 27);

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
    masa: TELUGU_MASA_NAMES[solarSignIdx],
    ritu: RITU_NAMES[Math.floor(solarSignIdx / 2)],
    ayana: getAyana(sLon),
    samvat: getShalivahanaYear(year, solarSignIdx),
    samvatsara: getSamvatsara(getShalivahanaYear(year, solarSignIdx)),
    solarSign: SOLAR_SIGN_NAMES[solarSignIdx],
  };
}
