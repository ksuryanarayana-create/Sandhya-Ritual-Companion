/**
 * Plain-language glossary of Telugu Panchang terms.
 * English-first with the Sanskrit/Telugu term as a label.
 */

export interface GlossaryEntry {
  term: string;           // Sanskrit/Telugu name
  pronunciation: string;  // Simple phonetic guide
  category: "core" | "timing" | "cycle" | "other";
  shortDef: string;       // One-sentence definition (shown in list)
  fullExplanation: string; // 2-4 sentence explanation (shown on expand)
  example?: string;        // Optional everyday analogy
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Tithi",
    pronunciation: "TITH-ee",
    category: "core",
    shortDef: "The lunar day — determined by the Moon's position relative to the Sun.",
    fullExplanation:
      "A tithi is roughly equivalent to a calendar date, but measured by the angle between the Moon and the Sun rather than the clock. Each tithi spans about 12° of the Moon's travel around the zodiac. Since the Moon moves at a variable speed, a tithi can last anywhere from 19 to 26 hours, so sometimes two tithis occur in a single calendar day, or the same tithi spans two days.",
    example:
      "Think of it like a lunar \"date\" number — there are 30 tithis in a lunar month, split across the bright (Shukla) and dark (Krishna) fortnights.",
  },
  {
    term: "Nakshatra",
    pronunciation: "nuk-SHATRA",
    category: "core",
    shortDef: "The lunar mansion — the 27-fold division of the sky the Moon occupies today.",
    fullExplanation:
      "The sky is divided into 27 equal segments of 13°20' each, called nakshatras. The Moon moves through one nakshatra approximately every day. Each nakshatra has a ruling deity, a quality (gentle, fierce, mixed), and traditional associations used for selecting auspicious timings. The nakshatra of the day comes from where the Moon currently sits.",
    example:
      "If you imagine the Moon on a 27-stop circular railway, the nakshatra is the stop it's currently at.",
  },
  {
    term: "Yoga",
    pronunciation: "YO-ga",
    category: "core",
    shortDef: "A quality of the day derived from adding the Sun's and Moon's longitudes together.",
    fullExplanation:
      "There are 27 yogas, each spanning 13°20' of the combined Sun+Moon longitude. Unlike tithi or nakshatra, yoga doesn't correspond to a physical body's direct position — it's a computed combination. Some yogas (like Siddhi, Shubha) are considered auspicious; others (like Vishkambha, Vyatipata) are traditionally avoided for important work.",
  },
  {
    term: "Karana",
    pronunciation: "KAR-ana",
    category: "core",
    shortDef: "Half a tithi — there are two karanas per lunar day.",
    fullExplanation:
      "A karana is exactly half a tithi — about 6° of Moon-Sun separation. Because there are two per tithi, they change more frequently. There are 11 karana names: 7 movable ones that repeat in sequence, and 4 fixed ones that appear only at specific points in the lunar cycle. Karanas are used for timing shorter-duration activities.",
  },
  {
    term: "Vara",
    pronunciation: "VAH-ra",
    category: "core",
    shortDef: "The weekday — each day is associated with a planet and has its own character.",
    fullExplanation:
      "The seven varas correspond to the seven classical planets: Ravivasara (Sun/Sunday), Somavasara (Moon/Monday), Mangalavasara (Mars/Tuesday), and so on. Each vara has traditional associations — Somavasara is favorable for water-related work; Guruvasara (Thursday) is auspicious for prayers and starting learning.",
  },
  {
    term: "Masa",
    pronunciation: "MAH-sa",
    category: "cycle",
    shortDef: "The Telugu lunar month — named after the solar Sankranti that falls within it.",
    fullExplanation:
      "The Telugu Amanta system uses lunar months that begin the day after Amavasya (new moon) and end on the next Amavasya. The month is named after whichever solar Sankranti falls within it — so the month containing the Karka Sankranti is called Ashadha. There are 12 regular months; in some years, an extra \"Adhika\" (intercalary) month is added to keep the lunar and solar calendars aligned.",
  },
  {
    term: "Paksha",
    pronunciation: "PAHK-sha",
    category: "cycle",
    shortDef: "Fortnight — Shukla (bright, waxing) or Krishna (dark, waning).",
    fullExplanation:
      "Each lunar month is divided into two fortnights of 15 tithis each. Shukla Paksha is the bright fortnight from new moon to full moon (Purnima). Krishna Paksha is the dark fortnight from full moon back to new moon (Amavasya). Shukla Paksha is generally considered more auspicious for starting new things.",
  },
  {
    term: "Ritu",
    pronunciation: "RI-too",
    category: "cycle",
    shortDef: "Season — the traditional six-season Indian year.",
    fullExplanation:
      "The Indian calendar recognizes six seasons (ritus), each spanning two solar months: Vasanta (Spring), Grishma (Summer), Varsha (Monsoon), Sharad (Autumn), Hemanta (Pre-winter), and Shishira (Winter). The current ritu is determined by the Sun's position in the sidereal zodiac.",
  },
  {
    term: "Ayana",
    pronunciation: "AY-ana",
    category: "cycle",
    shortDef: "The Sun's half-yearly journey — Uttarayana (northward) or Dakshinayana (southward).",
    fullExplanation:
      "Uttarayana is the six-month period when the Sun appears to move northward (traditionally from Makar Sankranti in mid-January through Karka Sankranti in mid-July). Dakshinayana is the southward half. Uttarayana is considered more auspicious overall and is associated with the light half of the cosmic year.",
  },
  {
    term: "Samvatsara",
    pronunciation: "sam-VAT-sara",
    category: "cycle",
    shortDef: "The current year in the 60-year Jupiter cycle — each has its own name and character.",
    fullExplanation:
      "Hindu time-keeping uses a 60-year cycle of named years (samvatsaras) based loosely on Jupiter's movement. Each samvatsara has a Sanskrit name and associated qualities. The year 2025–26 is called Parabhava (roughly meaning 'humility'). The cycle has been in use for over 1500 years and is mentioned in the Sankalpam recited at the start of rituals.",
  },
  {
    term: "Rahu Kalam",
    pronunciation: "RA-hoo KAH-lam",
    category: "timing",
    shortDef: "A roughly 90-minute inauspicious window each day, traditionally avoided for new starts.",
    fullExplanation:
      "The daylight period (sunrise to sunset) is divided into 8 equal parts, and one part is ruled by Rahu each weekday. Rahu is considered a shadow planet associated with obstacles. Most Telugu families avoid starting journeys, signing contracts, or beginning important work during Rahu Kalam. The specific part varies by day of the week.",
    example:
      "Think of it like a daily \"do not disturb\" period — not because something bad will happen, but as a traditional precaution.",
  },
  {
    term: "Gulika Kalam",
    pronunciation: "GOO-lika KAH-lam",
    category: "timing",
    shortDef: "Another inauspicious window each day, associated with Saturn's son Gulika.",
    fullExplanation:
      "Gulika Kalam follows the same 8-part daylight division as Rahu Kalam but is ruled by Gulika, a sub-planet associated with Saturn. It is traditionally avoided for auspicious activities, though it is considered less severe than Rahu Kalam.",
  },
  {
    term: "Yamagandam",
    pronunciation: "yama-GAN-dam",
    category: "timing",
    shortDef: "A third inauspicious time window, associated with Yama (the deity of death).",
    fullExplanation:
      "Yamagandam is the third of the three daily inauspicious windows, associated with Yama, the lord of death in Hindu tradition. Like Rahu Kalam and Gulika Kalam, it occupies one of the eight equal parts of the day and is traditionally avoided when scheduling important activities.",
  },
  {
    term: "Abhijit Muhurta",
    pronunciation: "ab-HEE-jit moo-HOOR-ta",
    category: "timing",
    shortDef: "An auspicious ~48-minute window around solar noon — the most reliable good time of the day.",
    fullExplanation:
      "Abhijit Muhurta is the 8th of the 15 equal muhurtas of the daytime. It occurs around solar noon and is considered universally auspicious regardless of the day's other factors. Many families use it as a fallback auspicious time when other conditions are unfavorable.",
    example:
      "If you can't avoid Rahu Kalam for something important, scheduling it around Abhijit Muhurta is a reliable auspicious alternative.",
  },
  {
    term: "Varjyam",
    pronunciation: "VARJ-yam",
    category: "timing",
    shortDef: "A short inauspicious window within the day's ruling nakshatra period.",
    fullExplanation:
      "Varjyam (also called Thyajyam) is derived from the nakshatra active on a given day. Each nakshatra has a specific range of ghatis (traditional time units) within its span that are considered inauspicious for any activity. The window is about 1 hour 36 minutes long and shifts with the nakshatra.",
  },
  {
    term: "Muhurta",
    pronunciation: "moo-HOOR-ta",
    category: "timing",
    shortDef: "An auspicious moment or time window selected for important events.",
    fullExplanation:
      "A muhurta is technically 1/15th of the daytime period (about 48 minutes each), but the word is more broadly used to mean any carefully selected auspicious time for important events like weddings, housewarming ceremonies, or starting a new business. A good muhurta considers the tithi, nakshatra, yoga, and other factors together.",
  },
  {
    term: "Purnima",
    pronunciation: "POOR-ni-ma",
    category: "cycle",
    shortDef: "Full moon day — the 15th tithi of Shukla Paksha.",
    fullExplanation:
      "Purnima is the full moon, when the Moon is directly opposite the Sun (180° separation). It is considered highly auspicious and is associated with specific festivals (Holi falls on Phalguna Purnima, Guru Purnima on Ashadha Purnima, etc.). Many families observe fasting or special prayers on Purnima.",
  },
  {
    term: "Amavasya",
    pronunciation: "ama-VAHSS-ya",
    category: "cycle",
    shortDef: "New moon day — the 30th (last) tithi, when the Moon is closest to the Sun.",
    fullExplanation:
      "Amavasya is the new moon, when Moon and Sun are nearly at the same position (0° or 360° separation). It is traditionally associated with ancestor worship — many families perform Pitru Tarpanam (water offerings to ancestors) on this day. Amavasya is generally considered inauspicious for starting new ventures.",
  },
  {
    term: "Ekadashi",
    pronunciation: "ek-AH-da-shee",
    category: "cycle",
    shortDef: "The 11th tithi — a traditional fasting day observed twice per lunar month.",
    fullExplanation:
      "Ekadashi falls on the 11th tithi of both Shukla and Krishna Paksha, making it a twice-monthly observance. Many devout Vaishnavas and Telugu families observe a fast on Ekadashi, avoiding grains and legumes. There are 24 Ekadashis in a normal year (26 in a leap lunar year), each with its own name and associated story.",
  },
  {
    term: "Sankranti",
    pronunciation: "san-KRAN-tee",
    category: "cycle",
    shortDef: "The moment the Sun crosses into a new zodiac sign — occurs approximately monthly.",
    fullExplanation:
      "There are 12 Sankrantis per year as the Sun moves through each of the 12 sidereal zodiac signs. The most celebrated is Makara Sankranti (around January 14-15), the Sun's entry into Capricorn, which is the major harvest festival in Andhra Pradesh and Telangana. Each Sankranti marks the start of a new solar month and determines the name of the Telugu lunar month.",
  },
  {
    term: "Sankalpam",
    pronunciation: "san-KAL-pam",
    category: "other",
    shortDef: "The ritual declaration of time, place, and purpose recited at the start of worship.",
    fullExplanation:
      "A sankalpam is a formal statement of intent spoken before performing a puja or ritual. It anchors the worship in precise cosmic time by stating the samvatsara, ayana, ritu, masa, paksha, tithi, vara, nakshatra, yoga, and karana, followed by the location in traditional geographic terms, and concludes with the specific purpose of the ritual. Reciting it is considered important for the ritual's efficacy.",
  },
  {
    term: "Samvat",
    pronunciation: "SAM-vat",
    category: "cycle",
    shortDef: "The Shalivahana Saka era year number used in Telugu/Andhra tradition.",
    fullExplanation:
      "The Shalivahana Saka calendar began in 78 CE and is widely used in Andhra Pradesh and Telangana. To convert: subtract 78 from the Gregorian year (and subtract one more if the date falls before Ugadi, the Telugu New Year). The Saka year 1947 began on Ugadi 2025. This Saka year number is used in the Sankalpam and official religious almanacs.",
  },
];

/** Group the glossary by category for sectioned display */
export function getGlossaryByCategory(): {
  label: string;
  entries: GlossaryEntry[];
}[] {
  const categories: { key: GlossaryEntry["category"]; label: string }[] = [
    { key: "core", label: "The Five Core Elements" },
    { key: "timing", label: "Auspicious & Inauspicious Times" },
    { key: "cycle", label: "Cycles of Time" },
    { key: "other", label: "Rituals & Traditions" },
  ];
  return categories.map(({ key, label }) => ({
    label,
    entries: GLOSSARY.filter(e => e.category === key),
  }));
}
