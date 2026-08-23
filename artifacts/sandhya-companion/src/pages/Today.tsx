import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, Loader2 } from "lucide-react";
import {
  fetchSunTimes, getActiveSession, getSessionWindows, formatTime,
  getRahuKalam, getGulikaKalam, getYamagandam, getAbhijitMuhurta, getDurMuhurtam, getAmritKalam,
  type SunTimes, type ActiveSession, type SessionWindows, type TimeWindow, type AmritKalam,
} from "@/lib/sunriseSunset";
import { calculatePanchang, type PanchangData, type PanchangSegment } from "@/lib/panchang";
import { buildSankalpamDesha, buildSankalpamText, type SankalpamDesha, type SankalpamAllSandhyas } from "@/lib/sankalpam";
import { toDateKey, type Location, getLocation } from "@/lib/storage";
import { getTimeZone, getZonedWeekday } from "@/lib/timezone";
import SankalpamSection from "@/components/SankalpamSection";

/** A single recited panchang item, shown as a full-width row (label left, value right) for easy top-to-bottom reading in recitation order. */
function PanchangItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-[#e2cca4] dark:border-[#4a2e15] last:border-b-0">
      <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xl font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

/** Panchang item that can change partway through the day (tithi/yoga/karana). Shows each value with its end time. */
function PanchangTransitionItem({ label, segments }: { label: string; segments: PanchangSegment[] }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[#e2cca4] dark:border-[#4a2e15] last:border-b-0">
      <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest shrink-0 pt-0.5">{label}</span>
      <div className="flex flex-col items-end text-right">
        {segments.map((seg, i) => (
          <span key={i} className="leading-snug">
            <span className="text-xl font-medium text-foreground">{seg.name}</span>
            <span className="text-[13px] text-muted-foreground ml-1.5">upto {seg.upto}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** One inauspicious/auspicious muhurta row: label left, time range right. */
function MuhurtaItem({
  label,
  window,
  tone,
  timeZone,
}: {
  label: string;
  window: { start: Date; end: Date } | null;
  tone: "inauspicious" | "auspicious";
  timeZone: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-[#e2cca4] dark:border-[#4a2e15] last:border-b-0">
      <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label}</span>
      <span className={`text-lg font-medium text-right ${tone === "auspicious" ? "text-emerald-600" : "text-foreground"}`}>
        {window ? `${formatTime(window.start, timeZone)} – ${formatTime(window.end, timeZone)}` : "—"}
      </span>
    </div>
  );
}

/** Compact horizontal chip for one Sandhya practice window, sized to sit alongside sunrise/sunset. */
function SessionChip({
  label,
  timeWindow,
  isActive,
}: {
  label: string;
  timeWindow?: string;
  isActive: boolean;
}) {
  return (
    <div className={`flex-1 rounded-lg border-2 px-2 py-2.5 text-center transition-colors ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-background/60'}`}>
      <div className={`text-[14px] font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</div>
      <div className={`text-[12px] mt-0.5 leading-tight ${isActive ? 'text-primary/90 font-semibold' : 'text-muted-foreground'}`}>
        {timeWindow ?? "Set location"}
      </div>
    </div>
  );
}

export default function Today() {
  const [location, setLocationState] = useState<Location | null>(null);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [sankalpamDesha, setSankalpamDesha] = useState<SankalpamDesha | null>(null);
  const [sankalpamText, setSankalpamText] = useState<SankalpamAllSandhyas | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession>("none");
  const [sessionWindows, setSessionWindows] = useState<SessionWindows | null>(null);
  const [amritKalam, setAmritKalam] = useState<AmritKalam | null>(null);
  const [isLoadingSun, setIsLoadingSun] = useState(false);
  const [sunError, setSunError] = useState<string | null>(null);

  const today = new Date();
  const dateKey = toDateKey(today);
  // Everything below is computed in the *saved location's* timezone, not the
  // device's — otherwise times/dates would silently show in the browser's
  // own zone whenever it differs from the location (e.g. Singapore viewed
  // from a device set to IST).
  const timeZone = location ? getTimeZone(location.lat, location.lng) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekday = getZonedWeekday(today, timeZone);

  const rahuKalam: TimeWindow | null = sunTimes ? getRahuKalam(sunTimes, weekday) : null;
  const gulikaKalam: TimeWindow | null = sunTimes ? getGulikaKalam(sunTimes, weekday) : null;
  const yamagandam: TimeWindow | null = sunTimes ? getYamagandam(sunTimes, weekday) : null;
  const abhijitMuhurta: TimeWindow | null = sunTimes ? getAbhijitMuhurta(sunTimes) : null;
  const durMuhurtams: TimeWindow[] = sunTimes ? getDurMuhurtam(sunTimes, weekday) : [];

  useEffect(() => {
    const loc = getLocation();
    setLocationState(loc);
    const tz = loc ? getTimeZone(loc.lat, loc.lng) : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const pan = calculatePanchang(today, tz);
    setPanchang(pan);
    const desha = loc
      ? buildSankalpamDesha(loc.city, loc.lat, loc.lng, loc.state, loc.countryCode)
      : null;
    if (loc) setSankalpamDesha(desha);
    // Assemble the full Sankalpam text from today's panchang values.
    // tithi/yoga/karana can transition mid-day; use the first (morning) segment.
    setSankalpamText(
      buildSankalpamText(
        desha,
        pan.samvatsara,
        pan.ayana,
        pan.ritu,
        pan.masa,
        pan.paksha,
        pan.tithiSegments[0]?.name ?? pan.tithi,
        pan.vara,
        pan.nakshatra,
        pan.yogaSegments[0]?.name ?? pan.yoga,
        pan.karanaSegments[0]?.name ?? pan.karana,
      ),
    );

    if (loc) {
      setIsLoadingSun(true);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      Promise.all([
        fetchSunTimes(loc.lat, loc.lng, today),
        fetchSunTimes(loc.lat, loc.lng, tomorrow),
      ])
        .then(([times, tomorrowTimes]) => {
          const wd = getZonedWeekday(today, tz);
          setSunTimes(times);
          setActiveSession(getActiveSession(new Date(), times));
          setSessionWindows(getSessionWindows(times, tz));
          setAmritKalam(getAmritKalam(times, tomorrowTimes.sunrise, wd));
        })
        .catch(err => {
          console.error(err);
          setSunError("Could not fetch sun times.");
        })
        .finally(() => setIsLoadingSun(false));
    }
  }, [dateKey]);

  const dateStr = today.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone });

  return (
    <div className="max-w-[480px] mx-auto min-h-[100dvh] bg-background text-foreground pb-16">
      <div className="p-4 md:p-6 space-y-8">
        <header className="space-y-5 text-center mt-4">
          <h1 className="text-4xl md:text-[42px] leading-tight font-serif font-bold text-primary">Sandhyā</h1>
          <div className="text-[22px] font-medium text-foreground/90">{dateStr}</div>
          
          {location ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground bg-card rounded-xl p-4 border border-border shadow-sm">
              <Link href="/settings" className="flex items-center gap-1.5 font-bold text-[17px] text-foreground hover:text-primary transition-colors">
                <MapPin className="w-5 h-5 text-primary" /> {location.city}
              </Link>
              {isLoadingSun ? (
                <div className="flex items-center gap-2 text-[17px]">
                  <Loader2 className="w-5 h-5 animate-spin" /> Fetching sun times...
                </div>
              ) : sunError ? (
                <div className="text-[17px] text-destructive font-medium">{sunError}</div>
              ) : sunTimes ? (
                <div className="flex items-center gap-5 text-[17px] font-medium text-foreground/80">
                  <span className="flex items-center gap-2"><Sunrise className="w-5 h-5 text-primary" /> {formatTime(sunTimes.sunrise, timeZone)}</span>
                  <span className="text-border/80">|</span>
                  <span className="flex items-center gap-2"><Sunset className="w-5 h-5 text-primary" /> {formatTime(sunTimes.sunset, timeZone)}</span>
                </div>
              ) : null}

              <div className="flex gap-2 w-full mt-1">
                <SessionChip label="Pratah" timeWindow={sessionWindows?.pratah} isActive={activeSession === "pratah"} />
                <SessionChip label="Madhyahna" timeWindow={sessionWindows?.madhyahna} isActive={activeSession === "madhyahna"} />
                <SessionChip label="Sayam" timeWindow={sessionWindows?.sayam} isActive={activeSession === "sayam"} />
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <p className="mb-4 text-muted-foreground text-[17px]">Set your location to see sunrise and sunset times.</p>
              <Link href="/settings" className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-6 py-3 font-bold text-[17px] hover:bg-primary/90 transition-colors w-full">
                <MapPin className="w-5 h-5" /> Set Location
              </Link>
            </div>
          )}
        </header>

        {panchang && (
          <section className="bg-[#f4e6cc] dark:bg-[#352210] border border-[#e2cca4] dark:border-[#4a2e15] rounded-2xl p-6 shadow-sm">
            <h2 className="text-3xl font-serif font-bold mb-5 text-center text-primary">Today's Panchang</h2>

            {/* Deśa — recited first in the Sankalpam */}
            <div className="mb-5 pb-5 border-b border-[#e2cca4] dark:border-[#4a2e15]">
              <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Deśa · For Sankalpam
              </p>
              {sankalpamDesha ? (
                // Full text for reading aloud (the numbered per-line breakdown was
                // dropped since it just repeated this same text line-by-line).
                <p className="text-[17px] leading-relaxed text-foreground font-medium italic">
                  {sankalpamDesha.fullText}...
                </p>
              ) : (
                <p className="text-[15px] text-muted-foreground italic">
                  Set your location to see the Sankalpam deśa text.
                </p>
              )}
            </div>

            {/* Remaining elements, in the order recited during Sankalpam */}
            <div>
              <PanchangItem label="Samvatsara" value={`${panchang.samvatsara} Nama Samvatsare`} />
              <PanchangItem label="Ayana" value={panchang.ayana} />
              <PanchangItem label="Ritu" value={panchang.ritu} />
              <PanchangItem label="Masa" value={panchang.masa} />
              <PanchangItem label="Paksha" value={`${panchang.paksha} Paksha`} />
              <PanchangTransitionItem label="Tithi" segments={panchang.tithiSegments} />
              <PanchangItem label="Vara" value={panchang.vara} />
              <PanchangItem label="Nakshatra" value={panchang.nakshatra} />
              <PanchangTransitionItem label="Yoga" segments={panchang.yogaSegments} />
              <PanchangTransitionItem label="Karana" segments={panchang.karanaSegments} />
            </div>
          </section>
        )}

        {sankalpamText && (
          <SankalpamSection
            sankalpam={sankalpamText}
            activeSession={activeSession === "none" ? undefined : activeSession}
          />
        )}

        {panchang && (
          <section className="bg-[#f4e6cc] dark:bg-[#352210] border border-[#e2cca4] dark:border-[#4a2e15] rounded-2xl p-6 shadow-sm">
            <h2 className="text-3xl font-serif font-bold mb-5 text-center text-primary">Muhurta Timings</h2>

            {location && sunTimes ? (
              <div>
                <MuhurtaItem label="Rahu Kalam" window={rahuKalam} tone="inauspicious" timeZone={timeZone} />
                <MuhurtaItem label="Gulika Kalam" window={gulikaKalam} tone="inauspicious" timeZone={timeZone} />
                <MuhurtaItem label="Yamagandam" window={yamagandam} tone="inauspicious" timeZone={timeZone} />
                {durMuhurtams.map((w, i) => (
                  <MuhurtaItem
                    key={i}
                    label={durMuhurtams.length > 1 ? `Dur Muhurtam ${i + 1}` : "Dur Muhurtam"}
                    window={w}
                    tone="inauspicious"
                    timeZone={timeZone}
                  />
                ))}
                <MuhurtaItem label="Varjyam" window={panchang.varjyam} tone="inauspicious" timeZone={timeZone} />
                <MuhurtaItem label="Abhijit Muhurta" window={abhijitMuhurta} tone="auspicious" timeZone={timeZone} />
                <MuhurtaItem label="Amrit Kalam (Day)" window={amritKalam?.day ?? null} tone="auspicious" timeZone={timeZone} />
                <MuhurtaItem label="Amrit Kalam (Night)" window={amritKalam?.night ?? null} tone="auspicious" timeZone={timeZone} />
              </div>
            ) : (
              <p className="text-[15px] text-muted-foreground italic text-center">
                Set your location to see today's muhurta timings.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
