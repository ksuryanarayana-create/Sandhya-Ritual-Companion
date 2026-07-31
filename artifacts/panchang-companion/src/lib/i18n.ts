/**
 * Internationalisation helpers for Telugu Panchang Companion.
 *
 * Supported languages:
 *   'en'    – English only
 *   'te'    – Telugu script only
 *   'te-en' – Telugu primary, English in parentheses
 */

import type { Lang } from "./storage";
export type { Lang };

// ─── Section headings ─────────────────────────────────────────────────────────

interface Heading { primary: string; secondary: string }

const HEADINGS: Record<string, Heading> = {
  sunTimes:   { primary: "సూర్యోదయాస్తమయం",    secondary: "Sun Times" },
  sandhya:    { primary: "సంధ్యా వేళలు",        secondary: "Sandhyā Windows" },
  desha:      { primary: "దేశ · సంకల్పం",        secondary: "Deśa · Sankalpam" },
  cycles:     { primary: "కాల విభాగం",           secondary: "Kāla Vibhāgam · Cycles of Time" },
  panchanga:  { primary: "పంచాంగం",              secondary: "Pañcāṅgam · Five Elements" },
  muhurta:    { primary: "ముహూర్త వేళలు",        secondary: "Muhūrta Timings" },
};

/**
 * Returns { primary, secondary } for a section heading.
 * – 'en'   → primary = English, secondary = Telugu
 * – 'te'   → primary = Telugu,  secondary = English (small)
 * – 'te-en'→ primary = Telugu,  secondary = English (small)
 */
export function heading(lang: Lang, key: string): Heading {
  const h = HEADINGS[key] ?? { primary: key, secondary: key };
  if (lang === "en") return { primary: h.secondary, secondary: h.primary };
  return h;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const LABELS: Record<string, { en: string; te: string }> = {
  samvatsara:   { en: "Samvatsara",       te: "సంవత్సరం" },
  ayana:        { en: "Ayana",            te: "అయనం" },
  ritu:         { en: "Ritu",             te: "ఋతువు" },
  masa:         { en: "Masa",             te: "మాసం" },
  solarSign:    { en: "Solar Sign",       te: "రాశి" },
  tithi:        { en: "Tithi",            te: "తిథి" },
  paksha:       { en: "Paksha",           te: "పక్షం" },
  nakshatra:    { en: "Nakshatra",        te: "నక్షత్రం" },
  yoga:         { en: "Yoga",             te: "యోగం" },
  karana:       { en: "Karana",           te: "కరణం" },
  vara:         { en: "Vara",             te: "వారం" },
  abhijit:      { en: "Abhijit Muhurta",  te: "అభిజిత్ ముహూర్తం" },
  rahuKalam:    { en: "Rahu Kalam",       te: "రాహు కాలం" },
  gulikaKalam:  { en: "Gulika Kalam",     te: "గుళిక కాలం" },
  yamagandam:   { en: "Yamagandam",       te: "యమగండం" },
  durMuhurtam:  { en: "Dur Muhurtam",     te: "దుర్ముహూర్తం" },
  durMuhurtam1: { en: "Dur Muhurtam 1",   te: "దుర్ముహూర్తం ౧" },
  durMuhurtam2: { en: "Dur Muhurtam 2",   te: "దుర్ముహూర్తం ౨" },
  varjyam:      { en: "Varjyam",          te: "వర్జ్యం" },
  sunrise:      { en: "Sunrise",          te: "సూర్యోదయం" },
  sunset:       { en: "Sunset",           te: "సూర్యాస్తమయం" },
  pratah:       { en: "Pratah",           te: "ప్రాతః" },
  madhyahna:    { en: "Madhyahna",        te: "మాధ్యాహ్న" },
  sayam:        { en: "Sayam",            te: "సాయం" },
};

/** Returns the label in the chosen language. */
export function label(lang: Lang, key: string): string {
  const l = LABELS[key];
  if (!l) return key;
  if (lang === "en") return l.en;
  if (lang === "te") return l.te;
  return l.te; // te-en: labels stay Telugu
}

// ─── Value translation maps ───────────────────────────────────────────────────

const MASA_TE: Record<string, string> = {
  Chaitra: "చైత్రం", Vaisakha: "వైశాఖం", Jyeshtha: "జ్యేష్ఠం",
  Ashadha: "ఆషాఢం", Shravana: "శ్రావణం", Bhadrapada: "భాద్రపదం",
  Ashwayuja: "ఆశ్వయుజం", Kartika: "కార్తీకం", Margashira: "మార్గశిరం",
  Pushya: "పుష్యం", Magha: "మాఘం", Phalguna: "ఫాల్గుణం",
};

const NAKSHATRA_TE: Record<string, string> = {
  Ashwini: "అశ్వని", Bharani: "భరణి", Krittika: "కృత్తిక",
  Rohini: "రోహిణి", Mrigashira: "మృగశిర", Ardra: "ఆర్ద్ర",
  Punarvasu: "పునర్వసు", Pushya: "పుష్యమి", Ashlesha: "ఆశ్లేష",
  Magha: "మఖ", "Purva Phalguni": "పూర్వ ఫల్గుణి",
  "Uttara Phalguni": "ఉత్తర ఫల్గుణి", Hasta: "హస్త", Chitra: "చిత్ర",
  Swati: "స్వాతి", Vishakha: "విశాఖ", Anuradha: "అనూరాధ",
  Jyeshtha: "జ్యేష్ఠ", Mula: "మూల", "Purva Ashadha": "పూర్వాషాఢ",
  "Uttara Ashadha": "ఉత్తరాషాఢ", Shravana: "శ్రవణ",
  Dhanishtha: "ధనిష్ఠ", Shatabhisha: "శతభిష",
  "Purva Bhadrapada": "పూర్వభాద్ర", "Uttara Bhadrapada": "ఉత్తరభాద్ర",
  Revati: "రేవతి",
};

const YOGA_TE: Record<string, string> = {
  Vishkambha: "విష్కంభ", Priti: "ప్రీతి", Ayushman: "ఆయుష్మాన్",
  Saubhagya: "సౌభాగ్య", Shobhana: "శోభన", Atiganda: "అతిగండ",
  Sukarma: "సుకర్మ", Dhriti: "ధృతి", Shoola: "శూల",
  Ganda: "గండ", Vriddhi: "వృద్ధి", Dhruva: "ధ్రువ",
  Vyaghata: "వ్యాఘాత", Harshana: "హర్షణ", Vajra: "వజ్ర",
  Siddhi: "సిద్ధి", Vyatipata: "వ్యతీపాత", Variyan: "వరీయాన్",
  Parigha: "పరిఘ", Shiva: "శివ", Siddha: "సిద్ధ",
  Sadhya: "సాధ్య", Shubha: "శుభ", Shukla: "శుక్ల",
  Brahma: "బ్రహ్మ", Aindra: "ఐంద్ర", Vaidhriti: "వైధృతి",
};

const KARANA_TE: Record<string, string> = {
  Bava: "బవ", Balava: "బాలవ", Kaulava: "కౌలవ",
  Taitila: "తైతిల", Garaja: "గరజ", Vanija: "వణిజ",
  Vishti: "విష్టి", Shakuni: "శకుని", Chatushpada: "చతుష్పాద",
  Nagava: "నాగవ", Kimstughna: "కింస్తుఘ్న",
};

const VARA_TE: Record<string, string> = {
  Ravivasara: "ఆదివారం", Somavasara: "సోమవారం",
  Mangalavasara: "మంగళవారం", Budhavasara: "బుధవారం",
  Guruvasara: "గురువారం", Shukravaasara: "శుక్రవారం", Shanivasara: "శనివారం",
};

const PAKSHA_TE: Record<string, string> = {
  Shukla: "శుక్ల", Krishna: "కృష్ణ",
};

const RITU_TE: Record<string, string> = {
  Vasanta: "వసంత", Grishma: "గ్రీష్మ", Varsha: "వర్ష",
  Sharad: "శరద్", Hemanta: "హేమంత", Shishira: "శిశిర",
};

const AYANA_TE: Record<string, string> = {
  Uttarayana: "ఉత్తరాయణం", Dakshinayana: "దక్షిణాయనం",
};

const SOLAR_SIGN_TE: Record<string, string> = {
  Mesha: "మేషం", Vrishabha: "వృషభం", Mithuna: "మిథునం",
  Karka: "కర్కాటకం", Simha: "సింహం", Kanya: "కన్య",
  Tula: "తులా", Vrischika: "వృశ్చికం", Dhanu: "ధనుస్సు",
  Makara: "మకరం", Kumbha: "కుంభం", Meena: "మీనం",
};

// ─── Generic value translator ─────────────────────────────────────────────────

type ValueKind =
  | "masa" | "nakshatra" | "yoga" | "karana" | "vara"
  | "paksha" | "ritu" | "ayana" | "solarSign" | "tithi" | "samvatsara";

const VALUE_MAPS: Record<ValueKind, Record<string, string>> = {
  masa: MASA_TE,
  nakshatra: NAKSHATRA_TE,
  yoga: YOGA_TE,
  karana: KARANA_TE,
  vara: VARA_TE,
  paksha: PAKSHA_TE,
  ritu: RITU_TE,
  ayana: AYANA_TE,
  solarSign: SOLAR_SIGN_TE,
  tithi: {},         // Telugu tithi names are complex regional variants; fall through to English
  samvatsara: {},    // 60-year cycle names stay in Sanskrit regardless
};

/** Translate a panchang value to the target language. */
export function val(lang: Lang, kind: ValueKind, value: string): string {
  if (lang === "en") return value;

  const map = VALUE_MAPS[kind];

  // Special handling for Adhika (intercalary) month prefix
  if (kind === "masa") {
    const isAdhika = value.startsWith("Adhika ");
    const base = isAdhika ? value.slice(7) : value;
    const te = map[base] ?? base;
    const translated = isAdhika ? `అధిక ${te}` : te;
    if (lang === "te") return translated;
    return `${translated} (${value})`;
  }

  const te = map[value];
  if (!te) return value; // No translation — return original
  if (lang === "te") return te;
  return `${te} (${value})`; // te-en: bilingual
}

/** Translate a paksha + "Paksha" label. */
export function pakshaLabel(lang: Lang, paksha: "Shukla" | "Krishna"): string {
  if (lang === "en") return `${paksha} Paksha`;
  const te = PAKSHA_TE[paksha] ?? paksha;
  if (lang === "te") return `${te} పక్షం`;
  return `${te} పక్షం (${paksha} Paksha)`;
}

/** Translate Vara with its English day in parens. */
export function varaDisplay(lang: Lang, vara: string, varaShort: string): string {
  if (lang === "en") return `${vara} (${varaShort})`;
  const te = VARA_TE[vara];
  if (!te) return `${vara} (${varaShort})`;
  if (lang === "te") return te;
  return `${te} · ${varaShort}`;
}

// ─── UI strings (page copy) ───────────────────────────────────────────────────

const UI_STRINGS: Record<string, { en: string; te: string }> = {
  upcomingEvents:        { en: "Upcoming Events",      te: "రాబోయే పండుగలు" },
  setLocationToSeeEvents:{ en: "Set your location to see the next 90 days of important panchang events.", te: "మీ స్థానాన్ని సెట్ చేయండి — రాబోయే 90 రోజుల ముఖ్యమైన పంచాంగ వివరాలు చూడండి." },
  setYourLocation:       { en: "Set Your Location",    te: "స్థానం సెట్ చేయండి" },
  loadingEvents:         { en: "Loading events…",      te: "వివరాలు లోడవుతున్నాయి…" },
  upcoming:              { en: "Upcoming",             te: "రాబోయే" },
  next90Days:            { en: "The next 90 days of important events", te: "రాబోయే 90 రోజుల ముఖ్యమైన వివరాలు" },
  noEventsFound:         { en: "No upcoming events found.", te: "రాబోయే వివరాలేవీ కనిపించడం లేదు." },
  setLocationSankalpam:  { en: "Set location to see Sankalpam deśa.", te: "సంకల్పం చూడటానికి స్థానం సెట్ చేయండి." },
};

/** Returns a UI copy string in the chosen language. */
export function ui(lang: Lang, key: string): string {
  const s = UI_STRINGS[key];
  if (!s) return key;
  if (lang === "en") return s.en;
  return s.te; // both 'te' and 'te-en' show Telugu UI copy
}
