import { useState } from "react";
import {
  getLocations,
  setLocationAt,
  clearLocationAt,
  getActiveLocationIndex,
  setActiveLocationIndex,
} from "@/lib/storage";
import { geocodeCity } from "@/lib/sunriseSunset";
import { getTimeZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, Trash2, CheckCircle2 } from "lucide-react";
import type { Location } from "@/lib/storage";

const SLOT_LABELS = ["Location 1", "Location 2", "Location 3"];
const SLOT_SUBTITLES = ["Primary / Home", "Family / Parents", "Travel / Work"];

export default function Settings() {
  const [locations, setLocations] = useState<(Location | null)[]>(getLocations());
  const [activeIdx, setActiveIdx] = useState<0 | 1 | 2>(getActiveLocationIndex());
  const [inputs, setInputs] = useState(["", "", ""]);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSearch = async (slotIdx: 0 | 1 | 2) => {
    const city = inputs[slotIdx].trim();
    if (!city) {
      toast({ title: "Enter a city name", variant: "destructive" });
      return;
    }
    setLoadingIdx(slotIdx);
    try {
      const result = await geocodeCity(city);
      const tz = getTimeZone(result.lat, result.lng);
      const loc: Location = {
        city: result.city,
        lat: result.lat,
        lng: result.lng,
        state: result.state,
        countryCode: result.countryCode,
      };
      setLocationAt(slotIdx, loc);
      const updated = [...locations] as (Location | null)[];
      updated[slotIdx] = loc;
      setLocations(updated);
      toast({ title: `${SLOT_LABELS[slotIdx]} saved`, description: `${result.city} (${tz})` });
      const newInputs = [...inputs];
      newInputs[slotIdx] = "";
      setInputs(newInputs);
    } catch (err) {
      toast({
        title: "Location not found",
        description: err instanceof Error ? err.message : "Try a different city name.",
        variant: "destructive",
      });
    } finally {
      setLoadingIdx(null);
    }
  };

  const handleClear = (slotIdx: 0 | 1 | 2) => {
    clearLocationAt(slotIdx);
    const updated = [...locations] as (Location | null)[];
    updated[slotIdx] = null;
    setLocations(updated);
    // If cleared slot was active, find next filled
    if (activeIdx === slotIdx) {
      const next = updated.findIndex((l) => l !== null);
      const newActive = (next >= 0 ? next : 0) as 0 | 1 | 2;
      setActiveLocationIndex(newActive);
      setActiveIdx(newActive);
    }
    toast({ title: `${SLOT_LABELS[slotIdx]} cleared` });
  };

  const handleSetActive = (slotIdx: 0 | 1 | 2) => {
    if (!locations[slotIdx]) return;
    setActiveLocationIndex(slotIdx);
    setActiveIdx(slotIdx);
    toast({ title: `Switched to ${SLOT_LABELS[slotIdx]}`, description: locations[slotIdx]!.city });
  };

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Save up to 3 locations — toggle between them on the Today page
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 3-column location grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([0, 1, 2] as const).map((slotIdx) => {
            const loc = locations[slotIdx];
            const isActive = activeIdx === slotIdx;
            const isLoading = loadingIdx === slotIdx;

            return (
              <Card
                key={slotIdx}
                className={`transition-all ${
                  isActive && loc
                    ? "border-2 border-secondary shadow-md bg-secondary/5"
                    : "border border-border"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-serif text-lg flex items-center gap-2">
                        {isActive && loc && (
                          <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                        )}
                        {SLOT_LABELS[slotIdx]}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {SLOT_SUBTITLES[slotIdx]}
                      </p>
                    </div>
                    {isActive && loc && (
                      <span className="text-xs bg-secondary/15 text-secondary font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Saved city display */}
                  {loc ? (
                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="font-medium text-base">{loc.city}</div>
                        {loc.state && (
                          <div className="text-xs text-muted-foreground">{loc.state}</div>
                        )}
                        <div className="text-xs text-muted-foreground font-mono">
                          {getTimeZone(loc.lat, loc.lng)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-secondary text-secondary hover:bg-secondary/10"
                            onClick={() => handleSetActive(slotIdx)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`text-muted-foreground hover:text-destructive ${isActive ? "flex-1" : ""}`}
                          onClick={() => handleClear(slotIdx)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic pb-1">Not set</div>
                  )}

                  {/* Search input — always shown */}
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">
                      {loc ? "Change city" : "Add city"}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        type="text"
                        placeholder="City name…"
                        value={inputs[slotIdx]}
                        onChange={(e) => {
                          const next = [...inputs];
                          next[slotIdx] = e.target.value;
                          setInputs(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch(slotIdx);
                        }}
                        disabled={isLoading}
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSearch(slotIdx)}
                        disabled={isLoading || !inputs[slotIdx].trim()}
                      >
                        {isLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Hint */}
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <MapPin className="w-4 h-4" />
          Tap <strong>Set Active</strong> on a location to see its panchang on the Today page
        </p>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">About This App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Telugu Panchang Companion</strong> is a
              frontend-only app. All calculations happen locally in your browser using
              astronomical formulas based on Meeus's algorithms.
            </p>
            <p>
              Your locations are saved only on your device (localStorage). No data is sent to any
              server. The app works offline once loaded.
            </p>
            <p>
              Panchang calculations follow the{" "}
              <strong className="text-foreground">Amanta system</strong> used in Andhra Pradesh
              and Telangana, with the Lahiri ayanamsa as per the Indian government standard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
