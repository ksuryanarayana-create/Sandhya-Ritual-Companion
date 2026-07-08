# Sandhya Companion

A calm, mobile-friendly daily companion app for Telugu-speaking Hindus doing Krishna Yajur Veda Sandhya Vandanam practice. Shows today's Telugu panchang, sunrise/sunset times, and three practice sections (Pratah, Madhyahna, Sayam) with checklists, notes, and completion tracking. All data stored locally on-device — no login, no ads.

## Run & Operate

- `pnpm --filter @workspace/sandhya-companion run dev` — run the app (port 20956)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, for future backend use)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS v4
- Routing: wouter
- Forms: react-hook-form + zod
- DB: none (v1 uses localStorage only)
- Panchang: custom astronomical calculations (Meeus) with Lahiri ayanamsa (sidereal)
- Sunrise/sunset: free sunrise-sunset.org API
- Geocoding: Nominatim (OpenStreetMap) API

## Where things live

- `artifacts/sandhya-companion/src/pages/Today.tsx` — main daily screen (panchang + 3 practice sections)
- `artifacts/sandhya-companion/src/pages/Settings.tsx` — city location input
- `artifacts/sandhya-companion/src/lib/panchang.ts` — all panchang/astronomical calculations (sidereal, Lahiri ayanamsa)
- `artifacts/sandhya-companion/src/lib/storage.ts` — localStorage read/write helpers for location + daily records
- `artifacts/sandhya-companion/src/lib/sunriseSunset.ts` — sunrise-sunset.org API + Nominatim geocoding + active session logic
- `lib/api-spec/openapi.yaml` — API contract (only has /healthz for now)

## Architecture decisions

- **Frontend-only for v1**: All user data (checklists, notes, completed flags) lives in localStorage keyed by date (`sc:daily:YYYY-MM-DD`) and location (`sc:location`). No server, no login.
- **Sidereal (nirayana) panchang**: All Hindu calendar elements (tithi, nakshatra, yoga, karana, masa, ayana) use Lahiri ayanamsa-corrected sidereal longitudes, not tropical. This is the official Indian government standard.
- **Timezone-correct JD**: Julian Day for panchang uses UT-equivalent of local noon (`localNoon = 12h - tzOffsetHours`), so tithi/nakshatra boundaries are correct for the user's timezone.
- **Telugu/Amanta calendar**: Month names follow the Amanta (lunar) system used in Andhra Pradesh/Telangana, approximated via the sidereal solar sign. Shalivahana Saka samvat used (not Vikram, Gujarat, or other samvats).
- **Same checklist for all 3 sessions**: 9 standard Krishna Yajur Veda steps shown identically in Pratah, Madhyahna, and Sayam sections.

## Product

**v1 features:**
- Today screen with full Telugu panchang (Tithi, Vara, Nakshatra, Yoga, Karana, Masa, Ayana, Ritu, Samvat)
- Sunrise/sunset display via API (requires city location to be set once)
- Three Sandhya Vandanam sections with 9-step KYV checklist, notes, completion toggle
- Location settings page with city search (geocoded via Nominatim)
- Active session auto-highlight based on current time vs sunrise/sunset windows

**Planned for v2:**
- Telugu language labels for panchang items and step names
- More precise panchang (full VSOP87 or trusted API)
- Cross-day history view

## User preferences

- Telugu-speaking South Indian user, Andhra/Telangana
- Krishna Yajur Veda tradition
- Elder-friendly: large text (18px+ body), high contrast, touch-friendly
- NO Vikram samvat, Gujarat samvat, Shalka samvat — Telugu/Shalivahana only
- No ads, no login, no payments

## Gotchas

- **Always restart** the sandhya-companion workflow after changes to lib files — HMR doesn't always pick up `.ts` utility files instantly.
- **Panchang accuracy**: Current calculations use ~0.3° accuracy for moon position (truncated Meeus series). Good for daily practice; not authoritative for precise muhurta calculations.
- **Nominatim rate limit**: Nominatim has a 1 request/second limit and requires a valid identification. The geocoding is triggered by user form submission, so this is fine in practice.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
