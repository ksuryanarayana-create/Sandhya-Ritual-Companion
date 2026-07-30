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
 * Known Andhra Pradesh + Telangana cities that always get the
 * "Kṛṣṇā Godāvaryoḥ madhyadeśe" river reference.
 * This is the primary check; the geographic fallback box below is secondary.
 */
const ANDHRA_TELANGANA_CITIES = new Set([
  // Telangana
  "hyderabad", "secunderabad", "warangal", "karimnagar", "nizamabad",
  "khammam", "nalgonda", "mahabubnagar", "medak", "adilabad", "sangareddy",
  "suryapet", "bhadradri", "mancherial", "jagtial", "rajanna", "vikarabad",
  "yadadri", "kamareddy", "nagarkurnool", "narayanpet", "wanaparthy",
  // Andhra Pradesh
  "vijayawada", "vijayavada", "visakhapatnam", "vishakhapatnam", "vizag",
  "tirupati", "guntur", "rajahmundry", "nellore", "kurnool", "kadapa",
  "anantapur", "eluru", "ongole", "srikakulam", "vizianagaram",
  "kakinada", "bhimavaram", "tadepalligudem", "tenali", "narasaraopet",
  "chittoor", "hindupur", "proddatur", "dharmavaram", "madanapalle",
  "guntakal", "adoni", "nandyal", "tadipatri", "chilakaluripet",
  "amaravati", "mangalagiri", "puttaparthi", "srikalahasti",
]);

/**
 * Tighter geographic fallback for cities not in the lookup table above.
 * Lat >= 15°N avoids Bangalore (12.97°N) and Chennai (13.08°N).
 * Lng >= 78°E avoids the overlap with eastern Karnataka.
 */
const ANDHRA_TELANGANA_FALLBACK = {
  latMin: 15.0, latMax: 19.9,
  lngMin: 78.0, lngMax: 84.7,
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

// ─── North America geography ──────────────────────────────────────────────────

/**
 * Bounding boxes for major North American regions.
 * Used to select the appropriate ocean/mountain deśa qualifier.
 */
const NA_BOUNDS = {
  /** Contiguous USA + southern Canada */
  northAmerica: { latMin: 25, latMax: 72, lngMin: -168, lngMax: -52 },
  /** East of the Rockies — add Atlantic reference */
  eastOfRockies: { lngMin: -105, lngMax: -52 },
  /** West of the Rockies — add Pacific reference */
  westOfRockies: { lngMin: -168, lngMax: -105 },
};

/** True if the coordinates are within North America (USA / Canada / Mexico). */
function isNorthAmerica(lat: number, lng: number): boolean {
  const b = NA_BOUNDS.northAmerica;
  return lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax;
}

/**
 * Build the ocean/mountain localising qualifier for a North American location.
 *
 * Coastal positions: "Atlantic sāgara pūrva tīre" / "Pacific sāgara paścima tīre"
 * Inland positions:  "Atlantic-Pacific sāgarayormadhya deśe" (traditional general form)
 *
 * Additionally, interior/mountain-west positions mention the Rockies.
 */
function naOceanQualifier(lat: number, lng: number): string {
  // East coast (longitude > -80°)
  if (lng > -80) return "Atlantic sāgara pūrva tīre";
  // West coast (longitude < -115°)
  if (lng < -115) return "Pacific sāgara paścima tīre";
  // Everything else (central, mountain west, Great Plains): general form
  return "Atlantic-Pacific sāgarayormadhya deśe";
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
 * India / Andhra-Telangana   → traditional Śrīśailam-relative form
 * North America (USA/Canada) → Krauñca-dvīpa / Rāmanaka-varṣa / uttara-amerukā form
 * Everywhere else            → Meroḥ dakṣiṇa digbhāge + Śrīśailam direction + city
 *
 * @param city        City name from geocoding (e.g. "Hyderabad", "Boston")
 * @param lat         Latitude
 * @param lng         Longitude
 * @param state       State / province from geocoding (e.g. "Massachusetts")
 * @param countryCode ISO 3166-1 alpha-2 lowercase (e.g. "us", "ca", "in")
 */
export function buildSankalpamDesha(
  city: string,
  lat: number,
  lng: number,
  state?: string,
  countryCode?: string,
): SankalpamDesha {
  // ── North America branch ──────────────────────────────────────────────────
  if (
    (countryCode === "us" || countryCode === "ca" || countryCode === "mx") ||
    (!countryCode && isNorthAmerica(lat, lng))
  ) {
    return buildNorthAmericaDesha(city, lat, lng, state, countryCode);
  }

  // ── India / rest-of-world branch ──────────────────────────────────────────
  const lines: string[] = [];

  // 1. South of cosmic Mount Meru (applicable to India and most of the world)
  lines.push("Meroḥ dakṣiṇa digbhāge");

  // 2. Direction from Śrīśailam to current location
  const dir =
    lookupCityDirection(city) ??
    bearingToSanskritDir(computeBearing(SRISHAILAM, { lat, lng }));
  lines.push(`Śrīśailasya ${dir} digbhāge`);

  // 3. Kṛṣṇā-Godāvarī reference for Andhra Pradesh / Telangana
  const cityKey = city.toLowerCase().trim();
  const isKnownAPCity =
    ANDHRA_TELANGANA_CITIES.has(cityKey) ||
    [...ANDHRA_TELANGANA_CITIES].some(
      k => cityKey.startsWith(k) || k.startsWith(cityKey),
    );
  const inFallbackBox =
    lat >= ANDHRA_TELANGANA_FALLBACK.latMin &&
    lat <= ANDHRA_TELANGANA_FALLBACK.latMax &&
    lng >= ANDHRA_TELANGANA_FALLBACK.lngMin &&
    lng <= ANDHRA_TELANGANA_FALLBACK.lngMax;
  if (isKnownAPCity || inFallbackBox) {
    lines.push("Kṛṣṇā Godāvaryoḥ madhyadeśe");
  }

  // 4. City name
  let cityPhrase = lookupCityName(city);
  if (!cityPhrase) {
    const isIndia = lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97;
    const suffix = isIndia ? "nagare" : "mahānagare";
    const capitalised = city
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    cityPhrase = `${capitalised} ${suffix}`;
  }
  lines.push(cityPhrase);

  // 5. At one's own home
  lines.push("sva-gṛhe");

  return { fullText: lines.join(", "), lines };
}

// ─── North America deśa builder ───────────────────────────────────────────────

/**
 * Traditional Purāṇic cosmological deśa for North American locations.
 *
 * Structure (per Smārta Vedic tradition for diaspora):
 *   Meroḥ paścima digbhāge           — west of Mount Meru
 *   Krauñca dvīpe                    — Krauñca continent (Purāṇic name for North America)
 *   Rāmanaka varṣe, Aindra khaṇḍe   — sub-region / zone
 *   Uttara amerukāyām                — North America
 *   [ocean qualifier]                — Atlantic / Pacific / between both oceans
 *   [State]-rāṣṭre                   — state (if known)
 *   [City] mahānagare                — city
 *   sva-gṛhe
 */
function buildNorthAmericaDesha(
  city: string,
  lat: number,
  lng: number,
  state?: string,
  countryCode?: string,
): SankalpamDesha {
  const lines: string[] = [];

  // 1. Direction from Meru — North America is to the west
  lines.push("Meroḥ paścima digbhāge");

  // 2. Purāṇic continent — Krauñca Dvīpa
  lines.push("Krauñca dvīpe");

  // 3. Sub-region within Krauñca Dvīpa
  lines.push("Rāmanaka varṣe, Aindra khaṇḍe");

  // 4. Landmass
  if (countryCode === "ca") {
    lines.push("Uttara amerukāyām");           // Canada is still "North America"
  } else {
    lines.push("Uttara amerukāyām");
  }

  // 5. Ocean / geographic qualifier
  lines.push(naOceanQualifier(lat, lng));

  // 6. State / province
  if (state) {
    // Capitalise each word; append -rāṣṭre (state/province)
    const statePhrase = state
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    lines.push(`${statePhrase}-rāṣṭre`);
  }

  // 7. City — use lookup table first, then auto-form
  let cityPhrase = lookupCityName(city);
  if (!cityPhrase) {
    const capitalised = city
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    cityPhrase = `${capitalised} mahānagare`;
  }
  lines.push(cityPhrase);

  // 8. At one's own home
  lines.push("sva-gṛhe");

  return { fullText: lines.join(", "), lines };
}
