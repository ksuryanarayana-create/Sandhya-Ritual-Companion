import { useState, useEffect } from "react";
import { getLocation, getLang } from "@/lib/storage";
import type { Lang } from "@/lib/storage";
import { getUpcomingEvents, groupEventsByWeek } from "@/lib/upcomingEvents";
import { getTimeZone } from "@/lib/timezone";
import { ui } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { MapPin, Calendar } from "lucide-react";
import type { UpcomingEvent } from "@/lib/upcomingEvents";

const EVENT_COLORS: Record<UpcomingEvent["kind"], string> = {
  ekadashi: "bg-[hsl(var(--chart-1))] text-[hsl(var(--chart-1))]",
  purnima:  "bg-[hsl(var(--chart-2))] text-[hsl(var(--chart-2))]",
  amavasya: "bg-[hsl(var(--chart-3))] text-[hsl(var(--chart-3))]",
  sankranti:"bg-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))]",
  pradosham:"bg-[hsl(var(--chart-5))] text-[hsl(var(--chart-5))]",
  chaturthi:"bg-secondary text-secondary",
  festival: "bg-primary text-primary",
};

export default function Upcoming() {
  const [lang, setLang] = useState<Lang>(() => getLang());
  const [groups, setGroups] = useState<{ label: string; events: UpcomingEvent[] }[]>([]);
  const [location, setLocation] = useState<ReturnType<typeof getLocation>>(null);
  const [loading, setLoading] = useState(true);

  // Re-read lang when user returns from Settings (window focus)
  useEffect(() => {
    const onFocus = () => setLang(getLang());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Recompute events whenever lang or location changes
  useEffect(() => {
    const loc = getLocation();
    setLocation(loc);

    if (!loc) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const tz = getTimeZone(loc.lat, loc.lng);
    const today = new Date();
    const events = getUpcomingEvents(today, tz, 90, lang);
    const grouped = groupEventsByWeek(events, today, lang);
    setGroups(grouped);
    setLoading(false);
  }, [lang]);

  // Locale used for the day-of-month date badge in each card
  const monthLocale = lang === "en" ? "en-US" : "te-IN";

  if (!location) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 pb-24">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">
              {ui(lang, "upcomingEvents")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground leading-relaxed">
              {ui(lang, "setLocationToSeeEvents")}
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <MapPin className="w-5 h-5" />
              {ui(lang, "setYourLocation")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{ui(lang, "loadingEvents")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              {ui(lang, "upcoming")}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location.city}</span>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            {ui(lang, "next90Days")}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{ui(lang, "noEventsFound")}</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.events.map((event, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Date badge */}
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {event.date.getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {event.date.toLocaleDateString(monthLocale, { month: "short" })}
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <Badge
                              variant="secondary"
                              className={`${EVENT_COLORS[event.kind]} bg-opacity-15 border-current border-opacity-20 font-medium`}
                            >
                              {event.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {event.note}
                          </p>
                          <div className="text-xs text-muted-foreground mt-2">
                            {event.dateStr}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
