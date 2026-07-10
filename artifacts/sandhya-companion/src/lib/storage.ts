/**
 * localStorage helpers for Sandhya Companion.
 * All user data stays on-device — no server, no login.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Location {
  city: string;
  lat: number;
  lng: number;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const LOCATION_KEY = "sc:location";

// ─── Location ────────────────────────────────────────────────────────────────

export function getLocation(): Location | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Location;
  } catch {
    return null;
  }
}

export function setLocation(loc: Location): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch {
    // Storage quota exceeded or private mode — silently ignore
  }
}

export function clearLocation(): void {
  try {
    localStorage.removeItem(LOCATION_KEY);
  } catch {
    // Ignore
  }
}

/** Format a Date as YYYY-MM-DD (local time) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
