import { useState } from "react";
import { getLocation } from "@/lib/storage";
import { calculatePanchang } from "@/lib/panchang";
import { getTimeZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "wouter";
import { MapPin, CalendarIcon } from "lucide-react";
import type { PanchangData } from "@/lib/panchang";

export default function Lookup() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [location] = useState(getLocation());
  const [timeZone] = useState(() => {
    const loc = getLocation();
    return loc ? getTimeZone(loc.lat, loc.lng) : "Asia/Kolkata";
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const p = calculatePanchang(date, timeZone);
      setPanchang(p);
    } else {
      setPanchang(null);
    }
  };

  if (!location) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 pb-24">
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">Date Lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground leading-relaxed">
              Set your location to look up panchang for any date.
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

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-serif text-3xl font-semibold text-foreground">Lookup</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location.city}</span>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            Find panchang for any date
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Date Picker */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Select a Date</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full max-w-sm justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    selectedDate.toLocaleDateString("en-IN", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone,
                    })
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Panchang Display */}
        {panchang && selectedDate && (
          <>
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
                </div>

                <Separator />

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Karana</div>
                  <div className="font-serif text-2xl font-semibold text-foreground">{panchang.karana}</div>
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
          </>
        )}

        {!selectedDate && (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a date to view its panchang</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
