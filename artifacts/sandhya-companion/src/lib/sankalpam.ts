/**
 * Generates the traditional Sankalpa deśa (location) phrase used at the
 * beginning of Sandhya Vandanam:
 *
 *   Meroḥ dakṣiṇa digbhāge,
 *   Śrīśailasya vāyavya digbhāge,
 *   Kṛṣṇā Godāvaryoḥ madhyadeśe,     ← only for Andhra/Telangana region
 *   Bhāgyanagare,                      ← city name, traditional or transliterated
 *   sva-gṛhe...
 *
 * Direction from Śrīśailam is computed from the saved GPS coordinates.
 * Works for any city in the world.
 */

// ─── Reference geography ─────────────────────────────────────────────────────

/** Śrīśailam Mallikārjuna Jyotirlinga temple, Andhra Pradesh */
const SRISHAILAM = { lat: 16.0736, lng: 78.8686 };

/**
 * Bounding box for the Andhra Pradesh + Telangana region.
 * If the user's location is inside this box, we add the traditional
 * "Kṛṣṇā Godāvaryoḥ madhyadeśe" (land associated with those rivers).
 */
const ANDHRA_TELANGANA = {
  latMin: 12.5, latMax: 19.5,
  lngMin: 76.5, lngMax: 84.5,
};

// ─── Bearing maths ────────────────────────────────────────────────────────────

function deg2rad(d: number) { return d * Math.PI / 180; }

/** Great-circle bearing in degrees (0 = North, clockwise). */
function computeBearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const φ1 = deg2rad(from.lat);
  const φ2 = deg2rad(to.lat);
  const Δλ = deg2rad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Map a compass bearing to one of the 8 Sanskrit cardinal directions. */
function bearingToSanskritDir(bearing: number): string {
  // Rotate by 22.5° so sector boundaries fall at 0, 45, 90, … 315°
  const idx = Math.round(bearing / 45) % 8;
  const dirs = [
    "uttara",    // 0   – North
    "īśāna",     // 45  – NE
    "pūrva",     // 90  – East
    "āgneya",    // 135 – SE
    "dakṣiṇa",   // 180 – South
    "nairṛtya",  // 225 – SW
    "paścima",   // 270 – West
    "vāyavya",   // 315 – NW
  ];
  return dirs[idx];
}

// ─── City-name lookup ─────────────────────────────────────────────────────────

/**
 * Traditional Sanskrit/Telugu forms of city names used in Sankalpam recitation.
 * Keys are lowercase normalised forms of the city string from geocoding.
 */
const CITY_NAMES: Record<string, string> = {
  // Telangana
  hyderabad: "Bhāgyanagare",
  secunderabad: "Bhāgyanagare",
  warangal: "Warangal nagare",
  karimnagar: "Karimnagare",
  nizamabad: "Nizāmābād nagare",
  khammam: "Khammam nagare",

  // Andhra Pradesh
  vijayawada: "Vijayawādā nagare",
  vijayavada: "Vijayawādā nagare",
  visakhapatnam: "Viśākhāpaṭṭaṇa nagare",
  vishakhapatnam: "Viśākhāpaṭṭaṇa nagare",
  vizag: "Viśākhāpaṭṭaṇa nagare",
  tirupati: "Tirupati nagare",
  guntur: "Guntūru nagare",
  rajahmundry: "Rājamahendrī nagare",
  nellore: "Nellūru nagare",
  kurnool: "Kurnūlu nagare",
  kadapa: "Kadapā nagare",
  anantapur: "Anantapura nagare",
  eluru: "Elūru nagare",
  ongole: "Ongolu nagare",
  srikakulam: "Śrīkākulam nagare",
  vizianagaram: "Vijayanagarama nagare",

  // Other major Indian cities
  bangalore: "Bengaḷūru nagare",
  bengaluru: "Bengaḷūru nagare",
  chennai: "Madrasāpurī nagare",
  madras: "Madrasāpurī nagare",
  mumbai: "Mumbaī nagare",
  bombay: "Mumbaī nagare",
  delhi: "Dillī nagare",
  "new delhi": "Dillī nagare",
  kolkata: "Kolkātā nagare",
  calcutta: "Kolkātā nagare",
  pune: "Puṇe nagare",
  ahmedabad: "Ahmedābād nagare",
  jaipur: "Jaipura nagare",
  lucknow: "Lakṣmīpura nagare",
  bhopal: "Bhopāl nagare",
  coimbatore: "Koyamputtur nagare",
  madurai: "Madurai nagare",
  thiruvananthapuram: "Tiruvanantapurama nagare",
  trivandrum: "Tiruvanantapurama nagare",
  kochi: "Koci nagare",
  cochin: "Koci nagare",

  // International
  singapore: "Singapure mahānagare",
  kuala: "Kuālālumpur mahānagare",   // matches "kuala lumpur"
  "kuala lumpur": "Kuālālumpur mahānagare",
  dubai: "Dubāy mahānagare",
  abudhabi: "Abū Dhabī mahānagare",
  "abu dhabi": "Abū Dhabī mahānagare",
  london: "Landan mahānagare",
  "new york": "Nyū Yark mahānagare",
  "new york city": "Nyū Yark mahānagare",
  houston: "Hyūsṭan mahānagare",
  chicago: "Cikāgo mahānagare",
  "los angeles": "Loṣ Ānjaliṣ mahānagare",
  toronto: "Ṭarānṭo mahānagare",
  sydney: "Sidnī mahānagare",
  melbourne: "Melborna mahānagare",
  auckland: "Āklānḍ mahānagare",
  tokyo: "Ṭōkyō mahānagare",
};

/**
 * Traditional direction from Śrīśailam for well-known cities.
 * Overrides the computed bearing where the traditional Sankalpam recitation
 * uses a specific direction that differs from the strict mathematical sector.
 * (e.g. Hyderabad computes to 344.5° — just inside "uttara" — but tradition says "vāyavya".)
 */
const CITY_DIRECTIONS: Record<string, string> = {
  // Telangana
  hyderabad:    "vāyavya",   // NW (traditional)
  secunderabad: "vāyavya",
  warangal:     "uttara",    // ~north of Srishailam
  karimnagar:   "uttara",
  nizamabad:    "uttara",
  khammam:      "īśāna",    // NE

  // Andhra Pradesh
  vijayawada:       "pūrva",    // ~east
  vijayavada:       "pūrva",
  visakhapatnam:    "pūrva",   // east/NE
  vishakhapatnam:   "pūrva",
  vizag:            "pūrva",
  tirupati:         "āgneya",  // SE (south of Srishailam and slightly east)
  guntur:           "pūrva",
  rajahmundry:      "pūrva",
  nellore:          "dakṣiṇa", // south
  kurnool:          "paścima", // west
  kadapa:           "dakṣiṇa",
  anantapur:        "nairṛtya",// SW
  eluru:            "pūrva",
  ongole:           "dakṣiṇa",

  // Other Indian cities (computed direction is accurate here — no override needed,
  // but leaving a few here in case traditional texts differ)
  bangalore:        "nairṛtya",
  bengaluru:        "nairṛtya",
  chennai:          "dakṣiṇa",
  madras:           "dakṣiṇa",
};

function lookupCityName(city: string): string | null {
  const key = city.toLowerCase().trim();
  if (CITY_NAMES[key]) return CITY_NAMES[key];
  // Partial match: check if any known key is a prefix of the city or vice versa
  for (const [k, v] of Object.entries(CITY_NAMES)) {
    if (key.startsWith(k) || k.startsWith(key)) return v;
  }
  return null; // sentinel — caller provides lat/lng context
}

function lookupCityDirection(city: string): string | null {
  const key = city.toLowerCase().trim();
  if (CITY_DIRECTIONS[key]) return CITY_DIRECTIONS[key];
  for (const [k, v] of Object.entries(CITY_DIRECTIONS)) {
    if (key.startsWith(k) || k.startsWith(key)) return v;
  }
  return null; // fall back to computed bearing
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SankalpamDesha {
  /** Full Sanskrit phrase for reading aloud */
  fullText: string;
  /** Individual lines for display */
  lines: string[];
}

/**
 * Generate the Sankalpam deśa phrase for any saved location.
 *
 * @param city        City name from geocoding (e.g. "Hyderabad", "Singapore")
 * @param lat         Latitude
 * @param lng         Longitude
 */
export function buildSankalpamDesha(
  city: string,
  lat: number,
  lng: number,
): SankalpamDesha {
  const lines: string[] = [];

  // 1. Everyone is south of cosmic Mount Meru (the North Pole in Hindu cosmology)
  lines.push("Meroḥ dakṣiṇa digbhāge");

  // 2. Direction from Śrīśailam to current location
  // Use traditional lookup first; fall back to computed bearing for unknown cities.
  const dir =
    lookupCityDirection(city) ??
    bearingToSanskritDir(computeBearing(SRISHAILAM, { lat, lng }));
  lines.push(`Śrīśailasya ${dir} digbhāge`);

  // 3. Kṛṣṇā-Godāvarī reference only for Andhra / Telangana region
  const inAndhraTelangana =
    lat >= ANDHRA_TELANGANA.latMin &&
    lat <= ANDHRA_TELANGANA.latMax &&
    lng >= ANDHRA_TELANGANA.lngMin &&
    lng <= ANDHRA_TELANGANA.lngMax;

  if (inAndhraTelangana) {
    lines.push("Kṛṣṇā Godāvaryoḥ madhyadeśe");
  }

  // 4. City name
  let cityPhrase = lookupCityName(city);
  if (!cityPhrase) {
    // Capitalise and choose suffix based on whether the location seems Indian
    const isIndia = lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97;
    const suffix = isIndia ? "nagare" : "mahānagare";
    // Capitalise first letter of each word for a clean transliteration
    const capitalised = city
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    cityPhrase = `${capitalised} ${suffix}`;
  }
  lines.push(cityPhrase);

  // 5. At one's own home
  lines.push("sva-gṛhe");

  return {
    fullText: lines.join(", "),
    lines,
  };
}
