import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, Loader2 } from "lucide-react";
import { fetchSunTimes, getActiveSession, getSessionWindows, formatTime, type SunTimes, type ActiveSession, type SessionWindows } from "@/lib/sunriseSunset";
import { calculatePanchang, type PanchangData, type PanchangSegment } from "@/lib/panchang";
import { buildSankalpamDesha, type SankalpamDesha } from "@/lib/sankalpam";
import { toDateKey, type Location, getLocation } from "@/lib/storage";

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
  const [activeSession, setActiveSession] = useState<ActiveSession>("none");
  const [sessionWindows, setSessionWindows] = useState<SessionWindows | null>(null);
  const [isLoadingSun, setIsLoadingSun] = useState(false);
  const [sunError, setSunError] = useState<string | null>(null);

  const today = new Date();
  const dateKey = toDateKey(today);

  useEffect(() => {
    const loc = getLocation();
    setLocationState(loc);
    setPanchang(calculatePanchang(today));
    if (loc) {
      setSankalpamDesha(buildSankalpamDesha(loc.city, loc.lat, loc.lng));
    }

    if (loc) {
      setIsLoadingSun(true);
      fetchSunTimes(loc.lat, loc.lng, today)
        .then(times => {
          setSunTimes(times);
          setActiveSession(getActiveSession(new Date(), times));
          setSessionWindows(getSessionWindows(times));
        })
        .catch(err => {
          console.error(err);
          setSunError("Could not fetch sun times.");
        })
        .finally(() => setIsLoadingSun(false));
    }
  }, [dateKey]);

  const dateStr = today.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-[480px] mx-auto min-h-[100dvh] bg-background text-foreground pb-16">
      <div className="p-4 md:p-6 space-y-8">
        <header className="space-y-5 text-center mt-4">
          <h1 className="text-4xl md:text-[42px] leading-tight font-serif font-bold text-primary">Sandhya Companion</h1>
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
                  <span className="flex items-center gap-2"><Sunrise className="w-5 h-5 text-primary" /> {formatTime(sunTimes.sunrise)}</span>
                  <span className="text-border/80">|</span>
                  <span className="flex items-center gap-2"><Sunset className="w-5 h-5 text-primary" /> {formatTime(sunTimes.sunset)}</span>
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
                <>
                  {/* Full text for reading aloud */}
                  <p className="text-[17px] leading-relaxed text-foreground font-medium italic mb-3">
                    {sankalpamDesha.fullText}...
                  </p>
                  {/* Individual lines for easy reading */}
                  <ol className="space-y-1 list-none">
                    {sankalpamDesha.lines.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-[16px] text-foreground/80">
                        <span className="text-primary font-bold shrink-0 w-5 text-right">{i + 1}.</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </>
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
      </div>
    </div>
  );
}
