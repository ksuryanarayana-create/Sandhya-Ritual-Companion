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
  formatTime,
} from "@/lib/sunriseSunset";
import { getTimeZone, getZonedWeekday } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, Clock, CalendarDays } from "lucide-react";
import type { PanchangData } from "@/lib/panchang";
import type { SunTimes, TimeWindow } from "@/lib/sunriseSunset";
import type { AbsoluteWindow } from "@/lib/panchang";
import type { Location } from "@/lib/storage";

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" into a Date at noon local time so timezone math is unambiguous. */
function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export default function Today() {
  const [locations, setLocations] = useState<(Location | null)[]>([null, null, null]);
  const [activeIdx, setActiveIdx] = useState<0 | 1 | 2>(0);
  const [selectedDate, setSelectedDate] = useState(todayDateString());

  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [timeWindows, setTimeWindows] = useState<{
    rahuKalam: TimeWindow;
    gulikaKalam: TimeWindow;
    yamagandam: TimeWindow;
    abhijitMuhurta: TimeWindow;
    durMuhurtam: TimeWindow[];
  } | null>(null);
  const [timeZone, setTimeZone] = useState<string>("Asia/Kolkata");
  const [loading, setLoading] = useState(true);

  // Compute panchang for a given location + date
  const compute = useCallback(async (loc: Location, dateStr: string) => {
    setLoading(true);
    setSunTimes(null);
    setTimeWindows(null);

    const tz = getTimeZone(loc.lat, loc.lng);
    setTimeZone(tz);

    const date = parseDateString(dateStr);
    const panchangData = calculatePanchang(date, tz);
    setPanchang(panchangData);

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
    } catch (err) {
      console.error("Failed to fetch sun times:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: read locations + active index
  useEffect(() => {
    const locs = getLocations();
    const idx = getActiveLocationIndex();
    setLocations(locs);
    setActiveIdx(idx);

    const loc = locs[idx];
    if (loc) {
      compute(loc, selectedDate);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When active location or date changes (after mount)
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

  // ── No location set yet ──
  if (!anyLocationSet && !loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 pb-24">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">Welcome to Panchang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground leading-relaxed">
              To show you today's panchang, we need to know your location. Sunrise and sunset times
              vary by city, and many time windows depend on them.
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

  const formatTimeWindow = (win: TimeWindow | AbsoluteWindow) =>
    `${formatTime(win.start, timeZone)} – ${formatTime(win.end, timeZone)}`;

  const isToday = selectedDate === todayDateString();

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 space-y-4">
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
                const isActive = activeIdx === idx;
                if (!loc) {
                  // Empty slot — greyed out, not clickable
                  return (
                    <div
                      key={idx}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg text-xs text-muted-foreground/40 border border-dashed border-border/50 bg-muted/20"
                    >
                      Location {idx + 1}
                    </div>
                  );
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleLocSwitch(idx)}
                    className={`flex-1 text-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all truncate ${
                      isActive
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

          {/* Date subtitle */}
          {activeLoc && (
            <p className="text-base text-muted-foreground">
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

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Calculating panchang...</p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && panchang && (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Core Five Elements */}
          <Card className="border-2 border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-xl">The Five Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Tithi</div>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-2xl font-semibold text-foreground">
                    {panchang.tithi}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {panchang.paksha} Paksha
                  </Badge>
                </div>
                {panchang.tithiSegments.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {panchang.tithiSegments.map((seg, i) => (
                      <div key={i}>
                        {seg.name} until{" "}
                        <span className="font-medium text-foreground">{seg.upto}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-1">Nakshatra</div>
                <div className="font-serif text-2xl font-semibold text-foreground">
                  {panchang.nakshatra}
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-1">Yoga</div>
                <div className="font-serif text-2xl font-semibold text-foreground">
                  {panchang.yoga}
                </div>
                {panchang.yogaSegments.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {panchang.yogaSegments.map((seg, i) => (
                      <div key={i}>
                        {seg.name} until{" "}
                        <span className="font-medium text-foreground">{seg.upto}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-1">Karana</div>
                <div className="font-serif text-2xl font-semibold text-foreground">
                  {panchang.karana}
                </div>
                {panchang.karanaSegments.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {panchang.karanaSegments.slice(0, 3).map((seg, i) => (
                      <div key={i}>
                        {seg.name} until{" "}
                        <span className="font-medium text-foreground">{seg.upto}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <div className="text-sm text-muted-foreground mb-1">Vara</div>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-2xl font-semibold text-foreground">
                    {panchang.vara}
                  </span>
                  <span className="text-sm text-muted-foreground">({panchang.varaShort})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temporal Context */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Cycles of Time</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Masa</div>
                <div className="font-medium text-lg">{panchang.masa}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Ritu</div>
                <div className="font-medium text-lg">{panchang.ritu}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Ayana</div>
                <div className="font-medium text-lg">{panchang.ayana}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Solar Sign</div>
                <div className="font-medium text-lg">{panchang.solarSign}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Samvatsara</div>
                <div className="font-medium text-lg">
                  {panchang.samvatsara} (Samvat {panchang.samvat})
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sun Times */}
          {sunTimes && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Sun Times
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Sunrise className="w-5 h-5 text-accent" />
                  <div>
                    <div className="text-sm text-muted-foreground">Sunrise</div>
                    <div className="font-medium text-lg">
                      {formatTime(sunTimes.sunrise, timeZone)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Sunset className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm text-muted-foreground">Sunset</div>
                    <div className="font-medium text-lg">
                      {formatTime(sunTimes.sunset, timeZone)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auspicious Times */}
          {timeWindows && (
            <Card className="border-2 border-secondary/30 bg-secondary/5">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-secondary">Auspicious Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Abhijit Muhurta</div>
                  <div className="font-medium text-lg text-secondary">
                    {formatTimeWindow(timeWindows.abhijitMuhurta)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    The most reliable auspicious window of the day, around solar noon.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inauspicious Times */}
          {timeWindows && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-xl">Inauspicious Times</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Traditionally avoided for new beginnings and important work.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Rahu Kalam</div>
                  <div className="font-medium">{formatTimeWindow(timeWindows.rahuKalam)}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Gulika Kalam</div>
                  <div className="font-medium">{formatTimeWindow(timeWindows.gulikaKalam)}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Yamagandam</div>
                  <div className="font-medium">{formatTimeWindow(timeWindows.yamagandam)}</div>
                </div>
                {timeWindows.durMuhurtam.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Dur Muhurtam</div>
                      {timeWindows.durMuhurtam.map((win, i) => (
                        <div key={i} className="font-medium">
                          {formatTimeWindow(win)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {panchang.varjyam && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Varjyam</div>
                      <div className="font-medium">{formatTimeWindow(panchang.varjyam)}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sun times loading placeholder */}
          {!sunTimes && !loading && (
            <Card className="opacity-50">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Sun times unavailable for this date
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
