/**
 * localStorage helpers for Telugu Panchang Companion.
 * All user data stays on-device — no server, no login.
 *
 * Supports up to 3 saved locations (slots 0, 1, 2).
 * One slot is "active" at a time; the Today page shows that slot's panchang.
 */

export interface Location {
  city: string;
  lat: number;
  lng: number;
  state?: string;
  countryCode?: string;
}

const LOCATIONS_KEY = "pc:locations";
const ACTIVE_IDX_KEY = "pc:activeLocationIndex";
const LEGACY_LOCATION_KEY = "pc:location";

/** One-time migration: move old single-location key into slot 0. */
function migrateLegacy(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_LOCATION_KEY);
    const existing = localStorage.getItem(LOCATIONS_KEY);
    if (legacy && !existing) {
      const loc = JSON.parse(legacy) as Location;
      const arr: (Location | null)[] = [loc, null, null];
      localStorage.setItem(LOCATIONS_KEY, JSON.stringify(arr));
      localStorage.removeItem(LEGACY_LOCATION_KEY);
    }
  } catch {
    // Ignore
  }
}

/** Returns an array of exactly 3 slots (null = not set). */
export function getLocations(): (Location | null)[] {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw) as (Location | null)[];
    while (parsed.length < 3) parsed.push(null);
    return parsed.slice(0, 3);
  } catch {
    return [null, null, null];
  }
}

/** Save a location into a specific slot (0, 1, or 2). */
export function setLocationAt(idx: 0 | 1 | 2, loc: Location): void {
  try {
    const locs = getLocations();
    locs[idx] = loc;
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locs));
  } catch {
    // Storage quota exceeded or private mode — silently ignore
  }
}

/** Clear a specific slot. If it was active, shift active to first filled slot. */
export function clearLocationAt(idx: 0 | 1 | 2): void {
  try {
    const locs = getLocations();
    locs[idx] = null;
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locs));
    // If the cleared slot was active, switch to first available slot
    if (getActiveLocationIndex() === idx) {
      const firstFilled = locs.findIndex((l) => l !== null);
      setActiveLocationIndex(firstFilled >= 0 ? (firstFilled as 0 | 1 | 2) : 0);
    }
  } catch {
    // Ignore
  }
}

export function getActiveLocationIndex(): 0 | 1 | 2 {
  try {
    const raw = localStorage.getItem(ACTIVE_IDX_KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return (n >= 0 && n <= 2 ? n : 0) as 0 | 1 | 2;
  } catch {
    return 0;
  }
}

export function setActiveLocationIndex(idx: 0 | 1 | 2): void {
  try {
    localStorage.setItem(ACTIVE_IDX_KEY, String(idx));
  } catch {
    // Ignore
  }
}

/** Convenience: return the currently active location (or null). */
export function getLocation(): Location | null {
  const locs = getLocations();
  const idx = getActiveLocationIndex();
  return locs[idx] ?? null;
}

/** Convenience: save into the currently active slot. */
export function setLocation(loc: Location): void {
  setLocationAt(getActiveLocationIndex(), loc);
}

/** Convenience: clear the currently active slot. */
export function clearLocation(): void {
  clearLocationAt(getActiveLocationIndex());
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
