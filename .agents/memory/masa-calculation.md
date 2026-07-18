---
name: Sandhya Companion — Amanta masa calculation
description: Why masa must use the Sankranti-within-the-lunar-month approach, and what fails if you use solar sign or Purnima nakshatra instead.
---

## The Rule

An Amanta (South-Indian) lunar month is named after the solar Sankranti that **falls within** that month — specifically, the solar sign the sun *enters* at that Sankranti.  `TELUGU_MASA_NAMES[signIdx]` gives the name (signIdx 0=Mesha→Chaitra … 3=Karka→Ashadha … 11=Meena→Phalguna).

## Why the Two Simpler Approaches Fail

**Today's solar sign (original code):** Works most of the year, but fails in the 0–8 days *before* the Sankranti when the sun is still in the previous sign but the Sankranti has not yet occurred within the current lunar month.  Example: July 16, 2026 — sun still in Mithuna (solarSignIdx=2 → "Jyeshtha"), but the month is Ashadha because Karka Sankranti (July 16–17) is about to fall within it.

**Purnima nakshatra:** Fails in years where a Purnima's moon nakshatra does not match the expected masa name.  Example: July 29, 2026 Ashadha Purnima has moon at 282° = Shravana nakshatra, yet Drikpanchang calls the month Ashadha (because Karka Sankranti is within the month, not because of the Purnima nakshatra).

## Correct Implementation (in panchang.ts)

1. `getPrevAmavasya(jd)` — Newton's method on `elongationSidereal`, targeting 0° (signed error: `e > 180 ? e-360 : e`).
2. `getNextAmavasya(jd)` — same, estimating forward.
3. `getMasaFromSankranti(jd)` — calls `findBoundaryCrossing(prevAmavasya, sunSiderealFn, 30, 35)` to find the next solar 30° crossing; if it falls before `nextAmavasya`, it's a Nija month; otherwise Adhika. Reads sun 0.01 days *after* crossing to get the entered sign index.

**Why:**  This matches Drikpanchang output exactly, handles the ~8-day lag, and automatically resolves adhika-masa years with no special-case code.

## Drikpanchang-Verified Data Points (Singapore)
- July 16, 2026: Ashadha Shukla Dwitiya — sun still in Mithuna, Karka Sankranti at 02:15 AM SGT July 17.
- July 18, 2026: Ashadha Shukla Panchami — elongation ≈ 48°, Karka Sankranti within the lunar month → Ashadha ✓.
- July 29, 2026: Ashadha Purnima — moon at ~282° (Shravana nakshatra) yet masa = Ashadha ✓.
