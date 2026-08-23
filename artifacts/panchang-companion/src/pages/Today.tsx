import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  getLocations,
  getActiveLocationIndex,
  setActiveLocationIndex,
  getLang,
} from "@/lib/storage";
import type { Lang } from "@/lib/storage";
import { heading, label, val, pakshaLabel, varaDisplay, ui, relativeDays } from "@/lib/i18n";
import { calculatePanchang } from "@/lib/panchang";
import {
  fetchSunTimes,
  getRahuKalam,
  getGulikaKalam,
  getYamagandam,
  getAbhijitMuhurta,
  getDurMuhurtam,
  getAmritKalam,
  getSessionWindows,
  getActiveSession,
  formatTime,
} from "@/lib/sunriseSunset";
import type { AmritKalam } from "@/lib/sunriseSunset";
import { buildSankalpamDesha } from "@/lib/sankalpam";
import { getTimeZone, getZonedWeekday } from "@/lib/timezone";
import { getTodaySignificance } from "@/lib/guidance";
import type { TodaySignificance } from "@/lib/guidance";
import { getUpcomingEvents } from "@/lib/upcomingEvents";
import type { UpcomingEvent } from "@/lib/upcomingEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Sunrise, Sunset, ScrollText, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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

function daysUntil(eventDate: Date, fromDate: Date): number {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const to   = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

// ─── Card colour variants ─────────────────────────────────────────────────────

const WARM  = "bg-amber-50/70 border-amber-200/60 dark:bg-amber-900/10 dark:border-amber-700/30";
const PLAIN = "";

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionTitle({ lang, sectionKey, icon }: { lang: Lang; sectionKey: string; icon?: React.ReactNode }) {
  const h = heading(lang, sectionKey);
  return (
    <div>
      <div className="flex items-center gap-2">{icon}<span className="font-serif text-lg leading-tight">{h.primary}</span></div>
      <div className="text-[11px] text-muted-foreground tracking-wide mt-0.5 pl-0.5">{h.secondary}</div>
    </div>
  );
}

// ─── Row primitives ───────────────────────────────────────────────────────────

function Row({ lbl, value }: { lbl: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{lbl}</span>
      <span className="text-[15px] font-medium text-right">{value}</span>
    </div>
  );
}

function SegmentRow({ lbl, name, segments }: { lbl: string; name: string; segments: { name: string; upto: string }[] }) {
  return (
    <div className="py-2 border-b border-border/50 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{lbl}</span>
        <span className="text-[15px] font-medium text-right">{name}</span>
      </div>
      {segments.length > 0 && (
        <div className="mt-1 space-y-0.5 text-right">
          {segments.map((seg, i) => (
            <p key={i} className="text-[12px] text-muted-foreground">
              {seg.name} <span className="text-foreground/70 font-medium">until {seg.upto}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeRow({ lbl, window, timeZone }: { lbl: string; window: { start: Date; end: Date } | null | undefined; timeZone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{lbl}</span>
      <span className="text-[14px] font-medium tabular-nums">
        {window ? `${formatTime(window.start, timeZone)} – ${formatTime(window.end, timeZone)}` : "—"}
      </span>
    </div>
  );
}

function SessionChip({ lbl, timeWindow, isActive }: { lbl: string; timeWindow?: string; isActive: boolean }) {
  return (
    <div className={`flex-1 rounded-lg border-2 px-2 py-2 text-center transition-colors ${isActive ? "border-secondary bg-secondary/10" : "border-border bg-background/60"}`}>
      <div className={`text-[12px] font-bold ${isActive ? "text-secondary" : "text-foreground"}`}>{lbl}</div>
      <div className={`text-[11px] mt-0.5 leading-tight ${isActive ? "text-secondary/90 font-semibold" : "text-muted-foreground"}`}>{timeWindow ?? "—"}</div>
    </div>
  );
}

// ─── Guidance Strip ───────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  festival: "✨", ekadashi: "🌿", purnima: "🌕", amavasya: "🌑",
  pradosham: "🕯️", chaturthi: "🐘", sankranti: "☀️",
};

function GuidanceStrip({
  significance,
  upcomingNext,
  selectedDate,
  lang,
}: {
  significance: TodaySignificance;
  upcomingNext: UpcomingEvent[];
  selectedDate: string;
  lang: Lang;
}) {
  const [expanded, setExpanded] = useState(false);
  const fromDate = parseDateString(selectedDate);

  const hasAnything = significance.hasSignificance || upcomingNext.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="border-t border-border/40 pt-3 mt-1 space-y-2">

      {/* ── Important today ── */}
      {significance.hasSignificance && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {ui(lang, "importantToday")}
          </div>

          {/* Festival */}
          {significance.festival && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm bg-amber-100/70 border border-amber-300/60 text-amber-900">
              <span className="text-base leading-tight">✨</span>
              <div>
                <span className="font-semibold">{significance.festival.name}</span>
                {significance.isFasting && (
                  <span className="ml-2 text-[11px] font-medium bg-white/60 rounded px-1.5 py-0.5 border border-current/20">
                    🌿 {ui(lang, "fastingDay")}
                  </span>
                )}
                <p className="text-[12px] opacity-80 mt-0.5 leading-snug">{significance.festival.note}</p>
              </div>
            </div>
          )}

          {/* Generic tithi note (only shown when no festival) */}
          {significance.tithiNote && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
              significance.tithiTone === "auspicious"
                ? "bg-emerald-50/80 border border-emerald-200/60 text-emerald-900"
                : significance.tithiTone === "caution"
                ? "bg-orange-50/80 border border-orange-200/60 text-orange-900"
                : "bg-muted/50 border border-border text-foreground"
            }`}>
              <span className="text-base leading-tight mt-0.5">
                {significance.tithiTone === "auspicious" ? "⭐" : significance.tithiTone === "caution" ? "⚠️" : "📅"}
              </span>
              <div>
                {significance.isFasting && (
                  <span className="text-[11px] font-medium bg-white/60 rounded px-1.5 py-0.5 border border-current/20 mr-2">
                    🌿 {ui(lang, "fastingDay")}
                  </span>
                )}
                <span className="text-[13px] leading-snug">{significance.tithiNote}</span>
              </div>
            </div>
          )}

          {/* Yoga note */}
          {significance.yogaNote && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
              significance.yogaTone === "auspicious"
                ? "bg-emerald-50/60 border border-emerald-200/40 text-emerald-800"
                : "bg-orange-50/60 border border-orange-200/40 text-orange-800"
            }`}>
              <span>{significance.yogaTone === "auspicious" ? "✅" : "⚠️"}</span>
              <span>{significance.yogaNote}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming next ── */}
      {upcomingNext.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {ui(lang, "upcomingNext")}
          </div>

          {/* First event always visible */}
          {(() => {
            const ev = upcomingNext[0];
            const days = daysUntil(ev.date, fromDate);
            return (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <span>{EVENT_ICONS[ev.kind] ?? "📅"}</span>
                  <span className="font-medium">{ev.label}</span>
                  <span className="text-muted-foreground">{relativeDays(lang, days)}</span>
                  {ev.isFasting && (
                    <span className="text-[11px] text-muted-foreground">· {ui(lang, "fasting")}</span>
                  )}
                </div>
                {upcomingNext.length > 1 && (
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity shrink-0"
                  >
                    {expanded
                      ? (lang === "en" ? "less" : "తక్కువ")
                      : `+${upcomingNext.length - 1} ${lang === "en" ? "more" : "మరిన్ని"}`}
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Expanded list */}
          {expanded && upcomingNext.slice(1, 6).map((ev, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] pl-1 border-l-2 border-border/40 ml-1">
              <span>{EVENT_ICONS[ev.kind] ?? "📅"}</span>
              <span className="font-medium">{ev.label}</span>
              <span className="text-muted-foreground text-[12px]">· {ev.dateStr}</span>
              {ev.isFasting && (
                <span className="text-[11px] text-muted-foreground">· {ui(lang, "fasting")}</span>
              )}
            </div>
          ))}

          <Link href="/upcoming" className="text-[11px] text-primary hover:opacity-80 inline-flex items-center gap-1 mt-0.5">
            {ui(lang, "seeAll90Days")}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Today() {
  const [locations, setLocations]   = useState<(Location | null)[]>([null, null, null]);
  const [activeIdx, setActiveIdx]   = useState<0 | 1 | 2>(0);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [lang, setLangState]        = useState<Lang>(getLang());

  const [panchang, setPanchang]     = useState<PanchangData | null>(null);
  const [significance, setSignificance] = useState<TodaySignificance | null>(null);
  const [upcomingNext, setUpcomingNext] = useState<UpcomingEvent[]>([]);

  const [sankalpamDesha, setSankalpamDesha] = useState<SankalpamDesha | null>(null);
  const [timeZone, setTimeZone]     = useState<string>("Asia/Kolkata");

  const [sunTimes, setSunTimes]     = useState<SunTimes | null>(null);
  const [timeWindows, setTimeWindows] = useState<{
    rahuKalam: TimeWindow; gulikaKalam: TimeWindow; yamagandam: TimeWindow;
    abhijitMuhurta: TimeWindow; durMuhurtam: TimeWindow[];
  } | null>(null);
  const [amritKalam, setAmritKalam] = useState<AmritKalam | null>(null);
  const [sessionWindows, setSessionWindows] = useState<SessionWindows | null>(null);
  const [activeSession, setActiveSession]   = useState<ActiveSession>("none");

  const [panchangLoading, setPanchangLoading] = useState(true);
  const [sunLoading, setSunLoading]           = useState(false);

  const compute = useCallback(async (loc: Location, dateStr: string) => {
    setPanchangLoading(true);
    setSunTimes(null);
    setTimeWindows(null);
    setAmritKalam(null);
    setSessionWindows(null);
    setSignificance(null);
    setUpcomingNext([]);

    const tz = getTimeZone(loc.lat, loc.lng);
    setTimeZone(tz);

    const date = parseDateString(dateStr);

    // ── Panchang (sync) ──────────────────────────────────────────────────────
    const panchangData = calculatePanchang(date, tz);
    setPanchang(panchangData);
    setSankalpamDesha(buildSankalpamDesha(loc.city, loc.lat, loc.lng, loc.state, loc.countryCode));

    // ── Guidance (sync — derived from panchang + local event scan) ───────────
    const sig = getTodaySignificance(panchangData);
    setSignificance(sig);

    // Compute events for the next 30 days from selectedDate
    const allEvents = getUpcomingEvents(date, tz, 30, lang);
    // Upcoming: strictly in the future (tomorrow+)
    const upcoming = allEvents.filter(ev => daysUntil(ev.date, date) > 0);
    setUpcomingNext(upcoming);

    setPanchangLoading(false);

    // ── Sun times + Amrit Kalam (async) ─────────────────────────────────────
    setSunLoading(true);
    try {
      const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const [st, nextSt] = await Promise.all([
        fetchSunTimes(loc.lat, loc.lng, date),
        fetchSunTimes(loc.lat, loc.lng, nextDate),
      ]);
      setSunTimes(st);
      const weekday = getZonedWeekday(date, tz);
      setTimeWindows({
        rahuKalam: getRahuKalam(st, weekday),
        gulikaKalam: getGulikaKalam(st, weekday),
        yamagandam: getYamagandam(st, weekday),
        abhijitMuhurta: getAbhijitMuhurta(st),
        durMuhurtam: getDurMuhurtam(st, weekday),
      });
      setAmritKalam(getAmritKalam(st, nextSt.sunrise, weekday));
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
    const idx  = getActiveLocationIndex();
    setLocations(locs);
    setActiveIdx(idx);
    setLangState(getLang());
    const loc = locs[idx];
    if (loc) { compute(loc, selectedDate); } else { setPanchangLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onFocus = () => setLangState(getLang());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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

  const activeLoc   = locations[activeIdx] ?? null;
  const anyLocSet   = locations.some(l => l !== null);
  const isToday     = selectedDate === todayDateString();

  // ── No location ──────────────────────────────────────────────────────────────
  if (!anyLocSet && !panchangLoading) {
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
            <Link href="/settings" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              <MapPin className="w-5 h-5" />Set Your Location
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24">

      {/* ── Header panel ── */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-4 space-y-3">

          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-semibold text-foreground">{ui(lang, "todayTitle")}</h1>
            {activeLoc && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" /><span>{activeLoc.city}</span>
              </div>
            )}
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date" value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              className="flex-1 text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {!isToday && (
              <button onClick={() => handleDateChange(todayDateString())}
                className="text-xs text-primary underline underline-offset-2 hover:opacity-80 whitespace-nowrap">
                {ui(lang, "backToToday")}
              </button>
            )}
          </div>

          {/* Location pills */}
          {anyLocSet && (
            <div className="flex gap-2">
              {([0, 1, 2] as const).map(idx => {
                const loc = locations[idx];
                if (!loc) return (
                  <div key={idx} className="flex-1 text-center py-1.5 px-2 rounded-lg text-xs text-muted-foreground/40 border border-dashed border-border/50 bg-muted/20">
                    Loc {idx + 1}
                  </div>
                );
                return (
                  <button key={idx} onClick={() => handleLocSwitch(idx)}
                    className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all truncate ${
                      activeIdx === idx ? "bg-secondary text-secondary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    {loc.city}
                  </button>
                );
              })}
            </div>
          )}

          {/* Date string */}
          {activeLoc && (
            <p className="text-sm text-muted-foreground">
              {parseDateString(selectedDate).toLocaleDateString(
                lang === "en" ? "en-IN" : "te-IN",
                { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone }
              )}
            </p>
          )}

          {/* ── Guidance strip (appears as soon as panchang loads) ── */}
          {!panchangLoading && significance && (
            <GuidanceStrip
              significance={significance}
              upcomingNext={upcomingNext}
              selectedDate={selectedDate}
              lang={lang}
            />
          )}
        </div>
      </div>

      {/* ── Panchang loading ── */}
      {panchangLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">{ui(lang, "calculatingPanchang")}</p>
          </div>
        </div>
      )}

      {/* ── Main content cards ── */}
      {!panchangLoading && panchang && (
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* 1 ── Sun Times (WARM) ── */}
          <Card className={WARM}>
            <CardHeader className="pb-2">
              <CardTitle>
                <SectionTitle lang={lang} sectionKey="sunTimes" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sunTimes ? (
                <>
                  <div className="flex items-center justify-around">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-4 h-4 text-accent" />
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label(lang, "sunrise")}</div>
                        <div className="font-medium tabular-nums">{formatTime(sunTimes.sunrise, timeZone)}</div>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                      <Sunset className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label(lang, "sunset")}</div>
                        <div className="font-medium tabular-nums">{formatTime(sunTimes.sunset, timeZone)}</div>
                      </div>
                    </div>
                  </div>
                  {sessionWindows && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          {heading(lang, "sandhya").primary}{" "}
                          <span className="font-normal normal-case tracking-normal opacity-70">· {heading(lang, "sandhya").secondary}</span>
                        </div>
                        <div className="flex gap-2">
                          <SessionChip lbl={label(lang, "pratah")}    timeWindow={sessionWindows.pratah}    isActive={activeSession === "pratah"} />
                          <SessionChip lbl={label(lang, "madhyahna")} timeWindow={sessionWindows.madhyahna} isActive={activeSession === "madhyahna"} />
                          <SessionChip lbl={label(lang, "sayam")}     timeWindow={sessionWindows.sayam}     isActive={activeSession === "sayam"} />
                        </div>
                        {activeSession !== "none" && (
                          <p className="text-xs text-secondary font-medium mt-2 text-center">
                            {activeSession === "pratah"    && "🌅 ప్రాతః సంధ్య is active now"}
                            {activeSession === "madhyahna" && "☀️ మాధ్యాహ్న సంధ్య is active now"}
                            {activeSession === "sayam"     && "🌇 సాయం సంధ్య is active now"}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : sunLoading ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Fetching sun times…</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Sun times unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* 2 ── Deśa / Sankalpam (WARM) ── */}
          <Card className={WARM}>
            <CardHeader className="pb-2">
              <CardTitle>
                <SectionTitle lang={lang} sectionKey="desha" icon={<ScrollText className="w-4 h-4 text-accent flex-shrink-0" />} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sankalpamDesha ? (
                <div className="space-y-2">
                  <p className="text-[14px] leading-relaxed text-foreground font-medium italic">{sankalpamDesha.fullText}…</p>
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
                <p className="text-sm text-muted-foreground italic">{ui(lang, "setLocationSankalpam")}</p>
              )}
            </CardContent>
          </Card>

          {/* 3 ── Cycles of Time (PLAIN) ── */}
          <Card className={PLAIN}>
            <CardHeader className="pb-2">
              <CardTitle><SectionTitle lang={lang} sectionKey="cycles" /></CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <Row lbl={label(lang, "samvatsara")} value={`${panchang.samvatsara} (${panchang.samvat})`} />
              <Row lbl={label(lang, "ayana")}      value={val(lang, "ayana", panchang.ayana)} />
              <Row lbl={label(lang, "ritu")}       value={val(lang, "ritu", panchang.ritu)} />
              <Row lbl={label(lang, "masa")}       value={val(lang, "masa", panchang.masa)} />
              <Row lbl={label(lang, "solarSign")}  value={val(lang, "solarSign", panchang.solarSign)} />
            </CardContent>
          </Card>

          {/* 4 ── Panchanga (WARM + primary border) ── */}
          <Card className={`border-2 border-primary/20 ${WARM}`}>
            <CardHeader className="pb-2">
              <CardTitle><SectionTitle lang={lang} sectionKey="panchanga" /></CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label(lang, "paksha")}</span>
                <Badge variant="outline" className="text-xs">{pakshaLabel(lang, panchang.paksha)}</Badge>
              </div>
              <SegmentRow
                lbl={label(lang, "tithi")}
                name={val(lang, "tithi", panchang.tithi)}
                segments={panchang.tithiSegments.map(seg => ({
                  ...seg,
                  name: val(lang, "tithi", seg.name),
                }))}
              />
              <Row lbl={label(lang, "nakshatra")} value={val(lang, "nakshatra", panchang.nakshatra)} />
              <SegmentRow lbl={label(lang, "yoga")}   name={val(lang, "yoga", panchang.yoga)}   segments={panchang.yogaSegments} />
              <SegmentRow lbl={label(lang, "karana")} name={val(lang, "karana", panchang.karana)} segments={panchang.karanaSegments.slice(0, 2)} />
              <div className="flex items-baseline justify-between gap-3 py-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label(lang, "vara")}</span>
                <span className="text-[15px] font-medium text-right">{varaDisplay(lang, panchang.vara, panchang.varaShort)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 5 ── Muhurta Timings (PLAIN) ── */}
          {timeWindows ? (
            <Card className={PLAIN}>
              <CardHeader className="pb-2">
                <CardTitle><SectionTitle lang={lang} sectionKey="muhurta" /></CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <TimeRow lbl={label(lang, "abhijit")}    window={timeWindows.abhijitMuhurta} timeZone={timeZone} />
                <TimeRow lbl={label(lang, "rahuKalam")}  window={timeWindows.rahuKalam}      timeZone={timeZone} />
                <TimeRow lbl={label(lang, "gulikaKalam")}window={timeWindows.gulikaKalam}    timeZone={timeZone} />
                <TimeRow lbl={label(lang, "yamagandam")} window={timeWindows.yamagandam}     timeZone={timeZone} />
                {timeWindows.durMuhurtam.map((win, i) => (
                  <TimeRow key={i}
                    lbl={label(lang, timeWindows.durMuhurtam.length > 1 ? (i === 0 ? "durMuhurtam1" : "durMuhurtam2") : "durMuhurtam")}
                    window={win} timeZone={timeZone}
                  />
                ))}
                {panchang.varjyam && <TimeRow lbl={label(lang, "varjyam")} window={panchang.varjyam} timeZone={timeZone} />}
                {amritKalam && (
                  <>
                    <TimeRow lbl={label(lang, "amritKalamDay")}   window={amritKalam.day}   timeZone={timeZone} />
                    <TimeRow lbl={label(lang, "amritKalamNight")} window={amritKalam.night} timeZone={timeZone} />
                  </>
                )}
              </CardContent>
            </Card>
          ) : sunLoading ? (
            <Card className={`${PLAIN} opacity-60`}>
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                {heading(lang, "muhurta").primary} · {lang === "en" ? "Loading…" : "లోడవుతున్నాం…"}
              </CardContent>
            </Card>
          ) : null}

        </div>
      )}
    </div>
  );
}
