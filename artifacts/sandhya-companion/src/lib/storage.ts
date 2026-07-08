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

export interface SectionData {
  /** checklist item key → checked state */
  checks: Record<string, boolean>;
  notes: string;
  completed: boolean;
}

export interface DailyRecord {
  pratah: SectionData;
  madhyahna: SectionData;
  sayam: SectionData;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const LOCATION_KEY = "sc:location";
const DAILY_KEY_PREFIX = "sc:daily:";

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

// ─── Daily records ───────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD (local time) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptySection(): SectionData {
  return { checks: {}, notes: "", completed: false };
}

function emptyRecord(): DailyRecord {
  return {
    pratah: emptySection(),
    madhyahna: emptySection(),
    sayam: emptySection(),
  };
}

export function getDailyRecord(dateKey: string): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY_PREFIX + dateKey);
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<DailyRecord>;
    // Merge with defaults so new fields don't break old data
    return {
      pratah: { ...emptySection(), ...parsed.pratah },
      madhyahna: { ...emptySection(), ...parsed.madhyahna },
      sayam: { ...emptySection(), ...parsed.sayam },
    };
  } catch {
    return emptyRecord();
  }
}

export function saveDailyRecord(dateKey: string, record: DailyRecord): void {
  try {
    localStorage.setItem(DAILY_KEY_PREFIX + dateKey, JSON.stringify(record));
  } catch {
    // Storage quota exceeded or private mode — silently ignore
  }
}

export type SessionKey = "pratah" | "madhyahna" | "sayam";

/** Toggle a single checklist item and persist. */
export function toggleCheck(
  dateKey: string,
  session: SessionKey,
  itemKey: string,
): DailyRecord {
  const record = getDailyRecord(dateKey);
  const section = record[session];
  section.checks[itemKey] = !section.checks[itemKey];
  saveDailyRecord(dateKey, record);
  return record;
}

/** Update notes and persist. */
export function updateNotes(
  dateKey: string,
  session: SessionKey,
  notes: string,
): DailyRecord {
  const record = getDailyRecord(dateKey);
  record[session].notes = notes;
  saveDailyRecord(dateKey, record);
  return record;
}

/** Toggle the completed flag and persist. */
export function toggleCompleted(
  dateKey: string,
  session: SessionKey,
): DailyRecord {
  const record = getDailyRecord(dateKey);
  record[session].completed = !record[session].completed;
  saveDailyRecord(dateKey, record);
  return record;
}

// ─── History helpers ─────────────────────────────────────────────────────────

/** Return all stored date keys, sorted newest-first. */
export function getAllDates(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DAILY_KEY_PREFIX)) {
      keys.push(key.slice(DAILY_KEY_PREFIX.length));
    }
  }
  return keys.sort((a, b) => b.localeCompare(a));
}
