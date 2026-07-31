/**
 * Computes upcoming panchang events (Ekadashi, Amavasya, Purnima, Sankranti,
 * Pradosham, Chaturthi) and major Telugu festivals for the next N days.
 *
 * Festival matching uses getMasaFromSankranti() (accurate Amanta masa),
 * not the solar-sign proxy.
 * Date deduplication uses the local-timezone calendar date, not UTC.
 */

import {
  gregorianToJD,
  sunLongitude,
  moonLongitude,
  getTithiIndex,
  getMasaFromSankranti,
  SOLAR_SIGN_NAMES,
  TELUGU_MASA_NAMES,
  findBoundaryCrossing,
} from "./panchang";
import { getZonedParts } from "./timezone";
import type { Lang } from "./storage";

function toSidereal(tropicalLon: number, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = 23.8531 + 1.39694 * T;
  return ((tropicalLon - ayanamsa) % 360 + 360) % 360;
}

function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

/** Local calendar date as "YYYY-MM-DD" (for deduplication). */
function localDateKey(jd: number, timeZone: string): string {
  return jdToDate(jd).toLocaleDateString("en-CA", { timeZone });
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

// ─── Telugu festival rules ────────────────────────────────────────────────────
// masaName matches the string returned by getMasaFromSankranti() (strips "Adhika " prefix internally).
// tithiIdx: 0-29 (Shukla Prathama=0 … Amavasya=29).

interface FestivalRule {
  name: string;
  note: string;
  masaName: string;
  tithiIdx: number;
  isFasting: boolean;
}

export const FESTIVAL_RULES: FestivalRule[] = [
  {
    name: "Ugadi",
    note: "Telugu New Year — Chaitra Shukla Prathama. Auspicious for new beginnings.",
    masaName: "Chaitra", tithiIdx: 0, isFasting: false,
  },
  {
    name: "Sri Rama Navami",
    note: "Birthday of Sri Rama — Chaitra Shukla Navami. Fasting and bhajan observed.",
    masaName: "Chaitra", tithiIdx: 8, isFasting: true,
  },
  {
    name: "Hanuman Jayanti",
    note: "Birthday of Hanuman — Chaitra Purnima. Auspicious for prayer.",
    masaName: "Chaitra", tithiIdx: 14, isFasting: false,
  },
  {
    name: "Vinayaka Chavithi",
    note: "Ganesh Chaturthi — Bhadrapada Shukla Chaturthi. Avoid moongazing today.",
    masaName: "Bhadrapada", tithiIdx: 3, isFasting: false,
  },
  {
    name: "Navratri",
    note: "Nine nights of Devi worship begin — Ashwayuja Shukla Prathama.",
    masaName: "Ashwayuja", tithiIdx: 0, isFasting: false,
  },
  {
    name: "Dasara (Vijayadasami)",
    note: "Ashwayuja Shukla Dashami — victory of good over evil. Very auspicious for new starts.",
    masaName: "Ashwayuja", tithiIdx: 9, isFasting: false,
  },
  {
    // In Amanta (Telugu) system, Diwali falls in Ashwayuja month (= Purnimanta "Kartika").
    // Naraka Chaturdashi = Ashwayuja Krishna Chaturdashi (day before Amavasya).
    name: "Deepavali (Naraka Chaturdashi)",
    note: "Festival of lights — Naraka Chaturdashi. Lamps lit at dawn to celebrate victory over Narakasura.",
    masaName: "Ashwayuja", tithiIdx: 28, isFasting: false,
  },
  {
    // Main Diwali night — Lakshmi Puja falls on the Amavasya closing the Ashwayuja Amanta month.
    name: "Deepavali (Lakshmi Puja)",
    note: "Diwali main night — Lakshmi Puja on Ashwayuja Amavasya. Most auspicious time for wealth worship.",
    masaName: "Ashwayuja", tithiIdx: 29, isFasting: false,
  },
  {
    // Karthika Purnima is Purnima within Kartika Amanta month (starts after Ashwayuja Amavasya).
    name: "Karthika Purnima",
    note: "Highly auspicious full moon — lamps lit at Shiva temples all night.",
    masaName: "Kartika", tithiIdx: 14, isFasting: false,
  },
  {
    name: "Vaikunta Ekadashi",
    note: "Most sacred Ekadashi of the year for Vaishnavas — Margashira Shukla.",
    masaName: "Margashira", tithiIdx: 10, isFasting: true,
  },
  {
    // In Amanta (Telugu) system, Shivaratri falls in Magha month (sun in Kumbha/Aquarius).
    // Purnimanta calls this "Phalguna Krishna 14" but the Amanta masa is Magha.
    name: "Maha Shivaratri",
    note: "Great night of Shiva — all-night vigil and fasting. Magha Krishna Chaturdashi in Telugu calendar.",
    masaName: "Magha", tithiIdx: 28, isFasting: true,
  },
];

// ─── Generic tithi notes (English) ───────────────────────────────────────────

const EVENT_NOTES: Record<EventKind, string> = {
  ekadashi: "Fasting day observed by many Telugu families. Auspicious for prayer and restraint.",
  amavasya: "New moon — traditionally offered to ancestors (Pitru Tarpanam). Avoid auspicious starts.",
  purnima: "Full moon — auspicious for worship, charity, and family gatherings.",
  sankranti: "Sun enters a new zodiac sign. Marks a seasonal shift; good for new beginnings.",
  pradosham: "Evening of the 13th tithi — especially auspicious for Shiva worship.",
  chaturthi: "Ganesh Chaturthi tithi — auspicious for new beginnings and removing obstacles.",
  festival: "",
};

// ─── Telugu translations ──────────────────────────────────────────────────────

const FESTIVAL_NAME_TE: Record<string, string> = {
  "Ugadi":                          "ఉగాది",
  "Sri Rama Navami":                "శ్రీ రామ నవమి",
  "Hanuman Jayanti":                "హనుమాన్ జయంతి",
  "Vinayaka Chavithi":              "వినాయక చవితి",
  "Navratri":                       "నవరాత్రి",
  "Dasara (Vijayadasami)":          "దసరా (విజయదశమి)",
  "Deepavali (Naraka Chaturdashi)": "దీపావళి (నరక చతుర్దశి)",
  "Deepavali (Lakshmi Puja)":       "దీపావళి (లక్ష్మీ పూజ)",
  "Karthika Purnima":               "కార్తీక పూర్ణిమ",
  "Vaikunta Ekadashi":              "వైకుంఠ ఏకాదశి",
  "Maha Shivaratri":                "మహా శివరాత్రి",
};

const FESTIVAL_NOTE_TE: Record<string, string> = {
  "Ugadi":                          "తెలుగు నూతన సంవత్సరం — చైత్ర శుక్ల ప్రతిపద. కొత్త ప్రారంభాలకు శుభం.",
  "Sri Rama Navami":                "శ్రీ రాముని జన్మదినం — చైత్ర శుక్ల నవమి. ఉపవాసం మరియు భజన.",
  "Hanuman Jayanti":                "హనుమాన్ జన్మదినం — చైత్ర పూర్ణిమ. ప్రార్థనకు శుభం.",
  "Vinayaka Chavithi":              "గణేశ చతుర్థి — భాద్రపద శుక్ల చతుర్థి. చంద్రదర్శనం నిషేధం.",
  "Navratri":                       "నవ రాత్రులు దేవీ పూజ — ఆశ్వయుజ శుక్ల ప్రతిపద.",
  "Dasara (Vijayadasami)":          "ఆశ్వయుజ శుక్ల దశమి — అధర్మంపై ధర్మం విజయం. కొత్త కార్యాలకు శుభం.",
  "Deepavali (Naraka Chaturdashi)": "వెలుగుల పండుగ — నరక చతుర్దశి. నరకాసుర వధ సందర్భంగా తెల్లవారే దీపాలు వెలిగిస్తారు.",
  "Deepavali (Lakshmi Puja)":       "దీపావళి ముఖ్య రాత్రి — ఆశ్వయుజ అమావాస్య లక్ష్మీ పూజ. సంపదకు అత్యంత శుభ సమయం.",
  "Karthika Purnima":               "అత్యంత పుణ్యమైన పూర్ణిమ — శివాలయాలలో రాత్రంతా దీపాలు.",
  "Vaikunta Ekadashi":              "వైష్ణవులకు అత్యంత పవిత్రమైన ఏకాదశి — మార్గశిర శుక్లం.",
  "Maha Shivaratri":                "శివుని మహారాత్రి — రాత్రంతా జాగరణ మరియు ఉపవాసం. మాఘ కృష్ణ చతుర్దశి.",
};

const EVENT_LABEL_TE: Record<string, string> = {
  "Shukla Ekadashi":    "శుక్ల ఏకాదశి",
  "Krishna Ekadashi":   "కృష్ణ ఏకాదశి",
  "Purnima":            "పూర్ణిమ",
  "Amavasya":           "అమావాస్య",
  "Shukla Pradosham":   "శుక్ల ప్రదోషం",
  "Krishna Pradosham":  "కృష్ణ ప్రదోషం",
  "Shukla Chaturthi":   "శుక్ల చతుర్థి",
  "Sankashti Chaturthi":"సంకష్టి చతుర్థి",
};

const EVENT_NOTES_TE: Record<EventKind, string> = {
  ekadashi: "ఉపవాసం ఉండే రోజు. ప్రార్థన మరియు నియమనిష్ఠలకు శుభం.",
  amavasya: "అమావాస్య — పితృ తర్పణానికి వినియోగించే రోజు. శుభ కార్యాలకు పనికిరాదు.",
  purnima:  "పూర్ణిమ — పూజ, దానం, కుటుంబ సమావేశాలకు శుభం.",
  sankranti:"సూర్యుడు కొత్త రాశిలోకి ప్రవేశించే రోజు. కొత్త ప్రారంభాలకు మంచి సమయం.",
  pradosham:"త్రయోదశి సాయం వేళ — శివ పూజకు అత్యంత శుభం.",
  chaturthi:"వినాయకుని తిథి — కొత్త కార్యాలకు, విఘ్న నివారణకు శుభం.",
  festival: "",
};

const SOLAR_SIGN_TE: Record<string, string> = {
  Mesha: "మేషం", Vrishabha: "వృషభం", Mithuna: "మిథునం",
  Karka: "కర్కాటకం", Simha: "సింహం", Kanya: "కన్య",
  Tula: "తులా", Vrischika: "వృశ్చికం", Dhanu: "ధనుస్సు",
  Makara: "మకరం", Kumbha: "కుంభం", Meena: "మీనం",
};

const MASA_TE: Record<string, string> = {
  Chaitra: "చైత్రం", Vaisakha: "వైశాఖం", Jyeshtha: "జ్యేష్ఠం",
  Ashadha: "ఆషాఢం", Shravana: "శ్రావణం", Bhadrapada: "భాద్రపదం",
  Ashwayuja: "ఆశ్వయుజం", Kartika: "కార్తీకం", Margashira: "మార్గశిరం",
  Pushya: "పుష్యం", Magha: "మాఘం", Phalguna: "ఫాల్గుణం",
};

const GROUP_LABELS = {
  thisWeek: { en: "This week",   te: "ఈ వారం" },
  nextWeek: { en: "Next week",   te: "వచ్చే వారం" },
  comingUp: { en: "Coming up",   te: "రాబోయే రోజులు" },
};

// ─── Translation helpers ──────────────────────────────────────────────────────

function teFestivalLabel(name: string, lang: Lang): string {
  const te = FESTIVAL_NAME_TE[name];
  if (!te || lang === "en") return name;
  if (lang === "te") return te;
  return `${te} (${name})`; // te-en: bilingual
}

function teFestivalNote(name: string, enNote: string, lang: Lang): string {
  if (lang === "en") return enNote;
  return FESTIVAL_NOTE_TE[name] ?? enNote;
}

function teEventLabel(enLabel: string, lang: Lang): string {
  const te = EVENT_LABEL_TE[enLabel];
  if (!te || lang === "en") return enLabel;
  if (lang === "te") return te;
  return `${te} (${enLabel})`; // te-en: bilingual
}

function teEventNote(kind: EventKind, lang: Lang): string {
  if (lang === "en") return EVENT_NOTES[kind];
  return EVENT_NOTES_TE[kind] ?? EVENT_NOTES[kind];
}

function teSankrantiLabel(signName: string, masaName: string, lang: Lang): string {
  if (lang === "en") return `${signName} Sankranti (${masaName} starts)`;
  const signTe = SOLAR_SIGN_TE[signName] ?? signName;
  const masaTe = MASA_TE[masaName] ?? masaName;
  if (lang === "te") return `${signTe} సంక్రాంతి (${masaTe} మొదలు)`;
  return `${signTe} సంక్రాంతి (${masaTe} మొదలు) · ${signName} Sankranti`;
}

function eventDateStr(date: Date, timeZone: string, lang: Lang): string {
  const locale = lang === "en" ? "en-IN" : "te-IN";
  return date.toLocaleDateString(locale, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupLabelStr(key: keyof typeof GROUP_LABELS, lang: Lang): string {
  const g = GROUP_LABELS[key];
  if (lang === "en") return g.en;
  return g.te; // te and te-en: use Telugu
}

// ─── Masa name helper ─────────────────────────────────────────────────────────

function baseMasa(full: string): string {
  return full.startsWith("Adhika ") ? full.slice(7) : full;
}

// ─── Main computation ─────────────────────────────────────────────────────────

export function getUpcomingEvents(
  startDate: Date,
  timeZone: string,
  daysAhead = 90,
  lang: Lang = "en",
): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];
  const seen = new Set<string>();

  const { year, month, day } = getZonedParts(startDate, timeZone);
  const startJD = gregorianToJD(year, month, day);
  const endJD = startJD + daysAhead;

  // Step by 0.5 day for tithi granularity; deduplicate on local calendar date.
  // Masa computed once per full-day step (expensive getMasaFromSankranti).
  let lastMasaJD = -Infinity;
  let cachedMasa = "";

  for (let jd = startJD; jd <= endJD; jd += 0.5) {
    const sLon = toSidereal(sunLongitude(jd), jd);
    const mLon = toSidereal(moonLongitude(jd), jd);
    const tithiIdx = getTithiIndex(sLon, mLon);

    // Recompute masa only once per day (at the first of the two half-day steps)
    if (jd - lastMasaJD >= 0.9) {
      cachedMasa = getMasaFromSankranti(jd);
      lastMasaJD = jd;
    }
    const masa = cachedMasa;
    const masa0 = baseMasa(masa);

    const approxDate = jdToDate(jd);
    // Use local calendar date (not UTC) for all deduplication
    const dateKey = localDateKey(jd, timeZone);
    const dateStr = eventDateStr(approxDate, timeZone, lang);

    // ── Festivals (accurate masa match) ──────────────────────────────────────
    for (const rule of FESTIVAL_RULES) {
      if (rule.masaName !== masa0 || rule.tithiIdx !== tithiIdx) continue;
      const key = `festival-${rule.name}-${dateKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Suppress the redundant generic tithi event on the same day
      seen.add(`generic-tithi-${tithiIdx}-${dateKey}`);
      events.push({
        kind: "festival",
        label: teFestivalLabel(rule.name, lang),
        note:  teFestivalNote(rule.name, rule.note, lang),
        date: approxDate,
        dateStr,
        isFasting: rule.isFasting,
      });
    }

    // ── Ekadashi ─────────────────────────────────────────────────────────────
    if (tithiIdx === 10) {
      const key = `generic-tithi-10-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "ekadashi", label: teEventLabel("Shukla Ekadashi", lang), note: teEventNote("ekadashi", lang), date: approxDate, dateStr, isFasting: true });
      }
    }
    if (tithiIdx === 25) {
      const key = `generic-tithi-25-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "ekadashi", label: teEventLabel("Krishna Ekadashi", lang), note: teEventNote("ekadashi", lang), date: approxDate, dateStr, isFasting: true });
      }
    }

    // ── Purnima ───────────────────────────────────────────────────────────────
    if (tithiIdx === 14) {
      const key = `generic-tithi-14-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "purnima", label: teEventLabel("Purnima", lang), note: teEventNote("purnima", lang), date: approxDate, dateStr });
      }
    }

    // ── Amavasya ──────────────────────────────────────────────────────────────
    if (tithiIdx === 29) {
      const key = `generic-tithi-29-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "amavasya", label: teEventLabel("Amavasya", lang), note: teEventNote("amavasya", lang), date: approxDate, dateStr });
      }
    }

    // ── Pradosham ────────────────────────────────────────────────────────────
    if (tithiIdx === 12 || tithiIdx === 27) {
      const key = `generic-tithi-${tithiIdx}-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        const paksha = tithiIdx === 12 ? "Shukla" : "Krishna";
        const enLabel = `${paksha} Pradosham`;
        events.push({ kind: "pradosham", label: teEventLabel(enLabel, lang), note: teEventNote("pradosham", lang), date: approxDate, dateStr });
      }
    }

    // ── Chaturthi ─────────────────────────────────────────────────────────────
    if (tithiIdx === 3) {
      const key = `generic-tithi-3-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "chaturthi", label: teEventLabel("Shukla Chaturthi", lang), note: teEventNote("chaturthi", lang), date: approxDate, dateStr });
      }
    }
    if (tithiIdx === 18) {
      const key = `generic-tithi-18-${dateKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ kind: "chaturthi", label: teEventLabel("Sankashti Chaturthi", lang), note: teEventNote("chaturthi", lang), date: approxDate, dateStr });
      }
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
    const dateKey = localDateKey(crossingJD, timeZone);
    const masaName = TELUGU_MASA_NAMES[signIdx];
    const signName = SOLAR_SIGN_NAMES[signIdx];
    const key = `sankranti-${signIdx}-${dateKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      const sankDateStr = eventDateStr(crossingDate, timeZone, lang);
      events.push({
        kind: "sankranti",
        label: teSankrantiLabel(signName, masaName, lang),
        note:  teEventNote("sankranti", lang),
        date: crossingDate,
        dateStr: sankDateStr,
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
  lang: Lang = "en",
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
  if (thisWeek.length) groups.push({ label: groupLabelStr("thisWeek", lang), events: thisWeek });
  if (nextWeek.length) groups.push({ label: groupLabelStr("nextWeek", lang), events: nextWeek });
  if (later.length)    groups.push({ label: groupLabelStr("comingUp", lang), events: later });
  return groups;
}
