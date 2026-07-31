/**
 * Derives plain-language guidance from a computed PanchangData object.
 *
 * All logic is synchronous — no API calls needed.
 * Used by the Today page to show the "Important Today" + "Upcoming Next" strip.
 */

import type { PanchangData } from "./panchang";

// ─── Festival rules ───────────────────────────────────────────────────────────
// Matched against panchang.masa (accurate Amanta string) + panchang.tithiIndex.
// "masaPrefix" allows matching "Adhika Chaitra" → "Chaitra" for intercalary months.

interface FestivalRule {
  name: string;
  masaName: string;    // Base masa name (matches even with "Adhika" prefix)
  tithiIdx: number;
  note: string;
  isFasting: boolean;
}

export const FESTIVAL_RULES: FestivalRule[] = [
  {
    name: "Ugadi",
    masaName: "Chaitra",
    tithiIdx: 0,
    note: "Telugu New Year — Chaitra Shukla Prathama. Auspicious for new beginnings.",
    isFasting: false,
  },
  {
    name: "Sri Rama Navami",
    masaName: "Chaitra",
    tithiIdx: 8,
    note: "Birthday of Sri Rama. Many observe fasting and bhajan.",
    isFasting: true,
  },
  {
    name: "Hanuman Jayanti",
    masaName: "Chaitra",
    tithiIdx: 14,
    note: "Chaitra Purnima — birthday of Hanuman. Auspicious for prayer.",
    isFasting: false,
  },
  {
    name: "Vinayaka Chavithi",
    masaName: "Bhadrapada",
    tithiIdx: 3,
    note: "Ganesh Chaturthi — Bhadrapada Shukla Chaturthi. Avoid moongazing today.",
    isFasting: false,
  },
  {
    name: "Navratri",
    masaName: "Ashwayuja",
    tithiIdx: 0,
    note: "Nine nights of Devi worship begin today. Auspicious for prayer.",
    isFasting: false,
  },
  {
    name: "Dasara (Vijayadasami)",
    masaName: "Ashwayuja",
    tithiIdx: 9,
    note: "Ashwayuja Shukla Dashami — victory of good over evil. Very auspicious for new beginnings.",
    isFasting: false,
  },
  {
    name: "Deepavali (Naraka Chaturdashi)",
    masaName: "Kartika",
    tithiIdx: 28,
    note: "Festival of lights — Kartika Krishna Chaturdashi. Lamps lit at dawn.",
    isFasting: false,
  },
  {
    name: "Karthika Purnima",
    masaName: "Kartika",
    tithiIdx: 14,
    note: "Kartika Purnima — highly auspicious. Lamps lit at Shiva temples all night.",
    isFasting: false,
  },
  {
    name: "Vaikunta Ekadashi",
    masaName: "Margashira",
    tithiIdx: 10,
    note: "Most sacred Ekadashi of the year for Vaishnavas. Fasting is observed.",
    isFasting: true,
  },
  {
    name: "Maha Shivaratri",
    masaName: "Phalguna",
    tithiIdx: 28,
    note: "Great night of Shiva — all-night vigil and fasting. Phalguna Krishna Chaturdashi.",
    isFasting: true,
  },
];

// ─── Tithi significance ───────────────────────────────────────────────────────

interface TithiGuidance {
  note: string;
  tone: "auspicious" | "caution" | "neutral";
  isFasting: boolean;
}

const TITHI_GUIDANCE: Partial<Record<number, TithiGuidance>> = {
  0:  { note: "Prathama (1st) — good for new beginnings after sunrise.", tone: "auspicious", isFasting: false },
  4:  { note: "Panchami — auspicious, good for starting work.", tone: "auspicious", isFasting: false },
  10: { note: "Ekadashi — fasting day observed by many Telugu families.", tone: "caution", isFasting: true },
  11: { note: "Dwadashi — Parana day; break Ekadashi fast with light food.", tone: "neutral", isFasting: false },
  12: { note: "Pradosham evening — auspicious for Shiva worship.", tone: "auspicious", isFasting: false },
  14: { note: "Pournami — full moon, highly auspicious for worship and charity.", tone: "auspicious", isFasting: false },
  25: { note: "Krishna Ekadashi — fasting day observed by many families.", tone: "caution", isFasting: true },
  27: { note: "Pradosham evening — auspicious for Shiva worship.", tone: "auspicious", isFasting: false },
  29: { note: "Amavasya — ancestor day. Auspicious for Pitru Tarpanam; avoid new starts.", tone: "caution", isFasting: false },
};

// ─── Yoga significance ────────────────────────────────────────────────────────
// Index matches YOGA_NAMES array in panchang.ts (0-indexed, 27 yogas)

const AUSPICIOUS_YOGA_INDICES = new Set([1,2,3,4,6,7,10,11,13,15,20,21,22,23,24,25]);
const INAUSPICIOUS_YOGA_INDICES = new Set([0,5,8,9,12,14,16,18,26]);

// ─── Main output type ─────────────────────────────────────────────────────────

export interface TodaySignificance {
  /** Named festival if today matches a rule */
  festival: { name: string; note: string } | null;
  /** Tithi-level significance */
  tithiNote: string | null;
  tithiTone: "auspicious" | "caution" | "neutral";
  isFasting: boolean;
  /** Yoga character */
  yogaNote: string | null;
  yogaTone: "auspicious" | "inauspicious" | null;
  /** True if there is anything noteworthy today */
  hasSignificance: boolean;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Derives today's significance purely from already-computed PanchangData.
 * No API calls — instant.
 */
export function getTodaySignificance(panchang: PanchangData): TodaySignificance {
  const { tithiIndex, masa, yoga } = panchang;

  // ── Festival check ──────────────────────────────────────────────────────────
  // Masa from getMasaFromSankranti may be "Adhika Chaitra" etc. — strip prefix.
  const baseMasa = masa.startsWith("Adhika ") ? masa.slice(7) : masa;
  const festivalMatch = FESTIVAL_RULES.find(
    (r) => r.masaName === baseMasa && r.tithiIdx === tithiIndex
  );

  // ── Tithi guidance ──────────────────────────────────────────────────────────
  // Festival overrides generic tithi note if there's one
  const tithiG = TITHI_GUIDANCE[tithiIndex] ?? null;

  // ── Yoga character ──────────────────────────────────────────────────────────
  const yogaIdx = [
    "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda",
    "Sukarma","Dhriti","Shoola","Ganda","Vriddhi","Dhruva","Vyaghata",
    "Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva",
    "Siddha","Sadhya","Shubha","Shukla","Brahma","Aindra","Vaidhriti",
  ].indexOf(yoga);

  let yogaNote: string | null = null;
  let yogaTone: "auspicious" | "inauspicious" | null = null;
  if (yogaIdx >= 0) {
    if (AUSPICIOUS_YOGA_INDICES.has(yogaIdx)) {
      yogaNote = `${yoga} Yoga — auspicious quality today.`;
      yogaTone = "auspicious";
    } else if (INAUSPICIOUS_YOGA_INDICES.has(yogaIdx)) {
      yogaNote = `${yoga} Yoga — traditionally avoided for important starts.`;
      yogaTone = "inauspicious";
    }
  }

  const isFasting = festivalMatch?.isFasting ?? tithiG?.isFasting ?? false;

  const hasSignificance = !!(festivalMatch || tithiG || yogaTone === "auspicious" || yogaTone === "inauspicious");

  return {
    festival: festivalMatch ? { name: festivalMatch.name, note: festivalMatch.note } : null,
    tithiNote: festivalMatch ? null : (tithiG?.note ?? null), // suppress generic tithi note when festival already explains it
    tithiTone: tithiG?.tone ?? "neutral",
    isFasting,
    yogaNote,
    yogaTone,
    hasSignificance,
  };
}
