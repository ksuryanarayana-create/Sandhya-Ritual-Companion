import { useState, useEffect } from "react";
import { getLocation } from "@/lib/storage";
import { calculatePanchang } from "@/lib/panchang";
import { fetchSunTimes, getRahuKalam, getGulikaKalam, getYamagandam, getAbhijitMuhurta, getDurMuhurtam, formatTime } from "@/lib/sunriseSunset";
import { getTimeZone, getZonedWeekday } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, Clock } from "lucide-react";
import type { PanchangData } from "@/lib/panchang";
import type { SunTimes, TimeWindow } from "@/lib/sunriseSunset";
import type { AbsoluteWindow } from "@/lib/panchang";

export default function Today() {
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [timeWindows, setTimeWindows] = useState<{
    rahuKalam: TimeWindow;
    gulikaKalam: TimeWindow;
    yamagandam: TimeWindow;
    abhijitMuhurta: TimeWindow;
    durMuhurtam: TimeWindow[];
  } | null>(null);
  const [location, setLocation] = useState<ReturnType<typeof getLocation>>(null);
  const [timeZone, setTimeZone] = useState<string>("Asia/Kolkata");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loc = getLocation();
    setLocation(loc);
    
    if (!loc) {
      setLoading(false);
      return;
    }

    const tz = getTimeZone(loc.lat, loc.lng);
    setTimeZone(tz);

    const today = new Date();
    const panchangData = calculatePanchang(today, tz);
    setPanchang(panchangData);

    fetchSunTimes(loc.lat, loc.lng, today)
      .then(st => {
        setSunTimes(st);
        const weekday = getZonedWeekday(today, tz);
        setTimeWindows({
          rahuKalam: getRahuKalam(st, weekday),
          gulikaKalam: getGulikaKalam(st, weekday),
          yamagandam: getYamagandam(st, weekday),
          abhijitMuhurta: getAbhijitMuhurta(st),
          durMuhurtam: getDurMuhurtam(st, weekday),
        });
      })
      .catch(err => console.error("Failed to fetch sun times:", err))
      .finally(() => setLoading(false));
  }, []);

  if (!location) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 pb-24">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">Welcome to Panchang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground leading-relaxed">
              To show you today's panchang, we need to know your location. Sunrise and sunset times vary by city, and many time windows depend on them.
            </p>
            <Link href="/settings" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
              <MapPin className="w-5 h-5" />
              Set Your Location
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !panchang) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Calculating panchang...</p>
        </div>
      </div>
    );
  }

  const formatTimeWindow = (win: TimeWindow | AbsoluteWindow) => {
    return `${formatTime(win.start, timeZone)} – ${formatTime(win.end, timeZone)}`;
  };

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-serif text-3xl font-semibold text-foreground">Today</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location.city}</span>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone })}
          </p>
        </div>
      </div>

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
                <span className="font-serif text-2xl font-semibold text-foreground">{panchang.tithi}</span>
                <Badge variant="outline" className="text-xs">{panchang.paksha} Paksha</Badge>
              </div>
              {panchang.tithiSegments.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {panchang.tithiSegments.map((seg, i) => (
                    <div key={i}>
                      {seg.name} until <span className="font-medium text-foreground">{seg.upto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Nakshatra</div>
              <div className="font-serif text-2xl font-semibold text-foreground">{panchang.nakshatra}</div>
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Yoga</div>
              <div className="font-serif text-2xl font-semibold text-foreground">{panchang.yoga}</div>
              {panchang.yogaSegments.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {panchang.yogaSegments.map((seg, i) => (
                    <div key={i}>
                      {seg.name} until <span className="font-medium text-foreground">{seg.upto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Karana</div>
              <div className="font-serif text-2xl font-semibold text-foreground">{panchang.karana}</div>
              {panchang.karanaSegments.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground space-y-1">
                  {panchang.karanaSegments.slice(0, 3).map((seg, i) => (
                    <div key={i}>
                      {seg.name} until <span className="font-medium text-foreground">{seg.upto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Vara</div>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-2xl font-semibold text-foreground">{panchang.vara}</span>
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
              <div className="font-medium text-lg">{panchang.samvatsara} (Samvat {panchang.samvat})</div>
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
                  <div className="font-medium text-lg">{formatTime(sunTimes.sunrise, timeZone)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Sunset className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Sunset</div>
                  <div className="font-medium text-lg">{formatTime(sunTimes.sunset, timeZone)}</div>
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
                <div className="font-medium text-lg text-secondary">{formatTimeWindow(timeWindows.abhijitMuhurta)}</div>
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
                      <div key={i} className="font-medium">{formatTimeWindow(win)}</div>
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
      </div>
    </div>
  );
}
