import { useState, useEffect, useCallback } from "react";
import {
  getLocations,
  getActiveLocationIndex,
  setActiveLocationIndex,
} from "@/lib/storage";
import { calculatePanchang } from "@/lib/panchang";
import {
  fetchSunTimes,
  getRahuKalam,
  getGulikaKalam,
  getYamagandam,
  getAbhijitMuhurta,
  getDurMuhurtam,
  getSessionWindows,
  getActiveSession,
  formatTime,
} from "@/lib/sunriseSunset";
import { buildSankalpamDesha } from "@/lib/sankalpam";
import { getTimeZone, getZonedWeekday } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, ScrollText, CalendarDays } from "lucide-react";
import type { PanchangData, AbsoluteWindow } from "@/lib/panchang";
import type { SunTimes, TimeWindow, SessionWindows, ActiveSession } from "@/lib/sunriseSunset";
import type { SankalpamDesha } from "@/lib/sankalpam";
import type { Location } from "@/lib/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// ─── Row primitives ───────────────────────────────────────────────────────────

/** Single compact row: label left (small caps), value right. */
function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className={`text-[15px] font-medium text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

/** Row with sub-segments shown below the main value. */
function SegmentRow({
  label,
  name,
  segments,
}: {
  label: string;
  name: string;
  segments: { name: string; upto: string }[];
}) {
  return (
    <div className="py-2 border-b border-border/50 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
          {label}
        </span>
        <span className="text-[15px] font-medium text-right">{name}</span>
      </div>
      {segments.length > 0 && (
        <div className="mt-1 space-y-0.5 text-right">
          {segments.map((seg, i) => (
            <p key={i} className="text-[12px] text-muted-foreground">
              {seg.name}{" "}
              <span className="text-foreground/70 font-medium">until {seg.upto}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact row for a time window: label left, time range right. */
function TimeRow({
  label,
  window,
  tone = "neutral",
  timeZone,
}: {
  label: string;
  window: { start: Date; end: Date } | null | undefined;
  tone?: "auspicious" | "inauspicious" | "neutral";
  timeZone: string;
}) {
  const colorClass =
    tone === "auspicious"
      ? "text-emerald-600"
      : tone === "inauspicious"
      ? "text-foreground"
      : "text-foreground";

  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className={`text-[14px] font-medium tabular-nums ${colorClass}`}>
        {window
          ? `${formatTime(window.start, timeZone)} – ${formatTime(window.end, timeZone)}`
          : "—"}
      </span>
    </div>
  );
}

/** Compact session chip: name + time range, highlights when active. */
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
    <div
      className={`flex-1 rounded-lg border-2 px-2 py-2 text-center transition-colors ${
        isActive ? "border-secondary bg-secondary/10" : "border-border bg-background/60"
      }`}
    >
      <div className={`text-[12px] font-bold ${isActive ? "text-secondary" : "text-foreground"}`}>
        {label}
      </div>
      <div className={`text-[11px] mt-0.5 leading-tight ${isActive ? "text-secondary/90 font-semibold" : "text-muted-foreground"}`}>
        {timeWindow ?? "—"}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Today() {
  const [locations, setLocations] = useState<(Location | null)[]>([null, null, null]);
  const [activeIdx, setActiveIdx] = useState<0 | 1 | 2>(0);
  const [selectedDate, setSelectedDate] = useState(todayDateString());

  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [sankalpamDesha, setSankalpamDesha] = useState<SankalpamDesha | null>(null);
  const [timeZone, setTimeZone] = useState<string>("Asia/Kolkata");

  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [timeWindows, setTimeWindows] = useState<{
    rahuKalam: TimeWindow;
    gulikaKalam: TimeWindow;
    yamagandam: TimeWindow;
    abhijitMuhurta: TimeWindow;
    durMuhurtam: TimeWindow[];
  } | null>(null);
  const [sessionWindows, setSessionWindows] = useState<SessionWindows | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession>("none");

  // Two separate loading flags so panchang shows immediately while sun API loads
  const [panchangLoading, setPanchangLoading] = useState(true);
  const [sunLoading, setSunLoading] = useState(false);

  const compute = useCallback(async (loc: Location, dateStr: string) => {
    setPanchangLoading(true);
    setSunTimes(null);
    setTimeWindows(null);
    setSessionWindows(null);

    const tz = getTimeZone(loc.lat, loc.lng);
    setTimeZone(tz);

    const date = parseDateString(dateStr);

    // Panchang is synchronous — show it immediately
    const panchangData = calculatePanchang(date, tz);
    setPanchang(panchangData);
    setSankalpamDesha(
      buildSankalpamDesha(loc.city, loc.lat, loc.lng, loc.state, loc.countryCode)
    );
    setPanchangLoading(false);

    // Sun times require an API call — load separately
    setSunLoading(true);
    try {
      const st = await fetchSunTimes(loc.lat, loc.lng, date);
      setSunTimes(st);
      const weekday = getZonedWeekday(date, tz);
      setTimeWindows({
        rahuKalam: getRahuKalam(st, weekday),
        gulikaKalam: getGulikaKalam(st, weekday),
        yamagandam: getYamagandam(st, weekday),
        abhijitMuhurta: getAbhijitMuhurta(st),
        durMuhurtam: getDurMuhurtam(st, weekday),
      });
      setSessionWindows(getSessionWindows(st, tz));
      setActiveSession(dateStr === todayDateString() ? getActiveSession(new Date(), st) : "none");
    } catch (err) {
      console.error("Failed to fetch sun times:", err);
    } finally {
      setSunLoading(false);
    }
  }, []);

  useEffect(() => {
    const locs = getLocations();
    const idx = getActiveLocationIndex();
    setLocations(locs);
    setActiveIdx(idx);
    const loc = locs[idx];
    if (loc) {
      compute(loc, selectedDate);
    } else {
      setPanchangLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocSwitch = (idx: 0 | 1 | 2) => {
    const loc = locations[idx];
    if (!loc) return;
    setActiveLocationIndex(idx);
    setActiveIdx(idx);
    compute(loc, selectedDate);
  };

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    const loc = locations[activeIdx];
    if (loc) compute(loc, dateStr);
  };

  const activeLoc = locations[activeIdx] ?? null;
  const anyLocationSet = locations.some((l) => l !== null);
  const isToday = selectedDate === todayDateString();

  const fmt = (w: TimeWindow | AbsoluteWindow | null | undefined) =>
    w ? `${formatTime(w.start, timeZone)} – ${formatTime(w.end, timeZone)}` : "—";

  // ── No location ──
  if (!anyLocationSet && !panchangLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 pb-24">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">Welcome to Panchang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground leading-relaxed">
              Set your location so we can calculate sunrise, sunset, and all muhurta windows.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <MapPin className="w-5 h-5" />
              Set Your Location
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-semibold text-foreground">Today</h1>
            {activeLoc && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{activeLoc.city}</span>
              </div>
            )}
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="flex-1 text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {!isToday && (
              <button
                onClick={() => handleDateChange(todayDateString())}
                className="text-xs text-primary underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
              >
                Back to today
              </button>
            )}
          </div>

          {/* Location toggle pills */}
          {anyLocationSet && (
            <div className="flex gap-2">
              {([0, 1, 2] as const).map((idx) => {
                const loc = locations[idx];
                if (!loc) {
                  return (
                    <div
                      key={idx}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg text-xs text-muted-foreground/40 border border-dashed border-border/50 bg-muted/20"
                    >
                      Loc {idx + 1}
                    </div>
                  );
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleLocSwitch(idx)}
                    className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all truncate ${
                      activeIdx === idx
                        ? "bg-secondary text-secondary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {loc.city}
                  </button>
                );
              })}
            </div>
          )}

          {activeLoc && (
            <p className="text-sm text-muted-foreground">
              {parseDateString(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone,
              })}
            </p>
          )}
        </div>
      </div>

      {/* ── Panchang loading spinner ── */}
      {panchangLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Calculating panchang…</p>
          </div>
        </div>
      )}

      {/* ── Main content (shows as soon as panchang is ready) ── */}
      {!panchangLoading && panchang && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* 1 ── Sun Times + Sandhya Windows ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg flex items-center justify-between">
                <span>Sun Times</span>
                {sunLoading && (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sunTimes ? (
                <>
                  <div className="flex items-center justify-around">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-4 h-4 text-accent" />
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Sunrise</div>
                        <div className="font-medium tabular-nums">{formatTime(sunTimes.sunrise, timeZone)}</div>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                      <Sunset className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Sunset</div>
                        <div className="font-medium tabular-nums">{formatTime(sunTimes.sunset, timeZone)}</div>
                      </div>
                    </div>
                  </div>

                  {sessionWindows && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          Sandhya Windows
                        </div>
                        <div className="flex gap-2">
                          <SessionChip label="Pratah" timeWindow={sessionWindows.pratah} isActive={activeSession === "pratah"} />
                          <SessionChip label="Madhyahna" timeWindow={sessionWindows.madhyahna} isActive={activeSession === "madhyahna"} />
                          <SessionChip label="Sayam" timeWindow={sessionWindows.sayam} isActive={activeSession === "sayam"} />
                        </div>
                        {activeSession !== "none" && (
                          <p className="text-xs text-secondary font-medium mt-2 text-center">
                            {activeSession === "pratah" && "🌅 Pratah Sandhya is active now"}
                            {activeSession === "madhyahna" && "☀️ Madhyahna Sandhya is active now"}
                            {activeSession === "sayam" && "🌇 Sayam Sandhya is active now"}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : sunLoading ? (
                <p className="text-sm text-muted-foreground text-center py-2">Fetching sun times…</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Sun times unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* 2 ── Deśa / Sankalpam ── */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-accent" />
                Deśa · Sankalpam
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sankalpamDesha ? (
                <div className="space-y-2">
                  <p className="text-[14px] leading-relaxed text-foreground font-medium italic">
                    {sankalpamDesha.fullText}…
                  </p>
                  <div className="space-y-0.5 pt-1">
                    {sankalpamDesha.lines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                        <span className="text-accent font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Set location to see Sankalpam deśa.</p>
              )}
            </CardContent>
          </Card>

          {/* 3 ── Cycles of Time ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg">Cycles of Time</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <Row label="Samvatsara" value={`${panchang.samvatsara} (Samvat ${panchang.samvat})`} />
              <Row label="Ayana" value={panchang.ayana} />
              <Row label="Ritu" value={panchang.ritu} />
              <Row label="Masa" value={panchang.masa} />
              <Row label="Solar Sign" value={panchang.solarSign} />
            </CardContent>
          </Card>

          {/* 4 ── Five Elements ── */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg">Five Elements</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <SegmentRow
                label="Tithi"
                name={`${panchang.tithi}`}
                segments={panchang.tithiSegments}
              />
              <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Paksha</span>
                <Badge variant="outline" className="text-xs">{panchang.paksha} Paksha</Badge>
              </div>
              <Row label="Nakshatra" value={panchang.nakshatra} />
              <SegmentRow
                label="Yoga"
                name={panchang.yoga}
                segments={panchang.yogaSegments}
              />
              <SegmentRow
                label="Karana"
                name={panchang.karana}
                segments={panchang.karanaSegments.slice(0, 2)}
              />
              <div className="flex items-baseline justify-between gap-3 py-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Vara</span>
                <span className="text-[15px] font-medium text-right">
                  {panchang.vara}{" "}
                  <span className="text-muted-foreground text-[12px]">({panchang.varaShort})</span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 5 ── Muhurta Timings ── */}
          {timeWindows ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-lg">Muhurta Timings</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <TimeRow label="Abhijit Muhurta" window={timeWindows.abhijitMuhurta} tone="auspicious" timeZone={timeZone} />
                <TimeRow label="Rahu Kalam" window={timeWindows.rahuKalam} tone="inauspicious" timeZone={timeZone} />
                <TimeRow label="Gulika Kalam" window={timeWindows.gulikaKalam} tone="inauspicious" timeZone={timeZone} />
                <TimeRow label="Yamagandam" window={timeWindows.yamagandam} tone="inauspicious" timeZone={timeZone} />
                {timeWindows.durMuhurtam.map((win, i) => (
                  <TimeRow
                    key={i}
                    label={timeWindows.durMuhurtam.length > 1 ? `Dur Muhurtam ${i + 1}` : "Dur Muhurtam"}
                    window={win}
                    tone="inauspicious"
                    timeZone={timeZone}
                  />
                ))}
                {panchang.varjyam && (
                  <TimeRow label="Varjyam" window={panchang.varjyam} tone="inauspicious" timeZone={timeZone} />
                )}
              </CardContent>
            </Card>
          ) : sunLoading ? (
            <Card className="opacity-60">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                Loading muhurta timings…
              </CardContent>
            </Card>
          ) : null}

        </div>
      )}
    </div>
  );
}
