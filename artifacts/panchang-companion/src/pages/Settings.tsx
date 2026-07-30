import { useState } from "react";
import { getLocation, setLocation, clearLocation } from "@/lib/storage";
import { geocodeCity } from "@/lib/sunriseSunset";
import { getTimeZone } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, Trash2, CheckCircle2 } from "lucide-react";

export default function Settings() {
  const [cityInput, setCityInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedLocation, setSavedLocation] = useState(getLocation());
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!cityInput.trim()) {
      toast({
        title: "Enter a city name",
        description: "Please type a city name before searching.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await geocodeCity(cityInput);
      const tz = getTimeZone(result.lat, result.lng);
      
      setLocation({
        city: result.city,
        lat: result.lat,
        lng: result.lng,
        state: result.state,
        countryCode: result.countryCode,
      });
      
      setSavedLocation({
        city: result.city,
        lat: result.lat,
        lng: result.lng,
        state: result.state,
        countryCode: result.countryCode,
      });

      toast({
        title: "Location saved",
        description: `${result.city} (${tz})`,
      });
      
      setCityInput("");
    } catch (err) {
      toast({
        title: "Location not found",
        description: err instanceof Error ? err.message : "Please try a different city name.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearLocation();
    setSavedLocation(null);
    toast({
      title: "Location cleared",
      description: "You can set a new location anytime.",
    });
  };

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your location and preferences
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Current Location */}
        {savedLocation && (
          <Card className="border-2 border-secondary/30 bg-secondary/5">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2 text-secondary">
                <CheckCircle2 className="w-5 h-5" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">City</div>
                <div className="font-medium text-lg">{savedLocation.city}</div>
              </div>
              {savedLocation.state && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">State</div>
                  <div className="font-medium">{savedLocation.state}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Timezone</div>
                <div className="font-medium">{getTimeZone(savedLocation.lat, savedLocation.lng)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Latitude</div>
                  <div className="font-mono text-sm">{savedLocation.lat.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Longitude</div>
                  <div className="font-mono text-sm">{savedLocation.lng.toFixed(4)}</div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleClear}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Location
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Set Location */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {savedLocation ? "Change Location" : "Set Your Location"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Panchang calculations depend on sunrise and sunset times, which vary by location. 
              Enter your city name to get accurate timings for all muhurtas and time windows.
            </p>
            <div className="space-y-2">
              <Label htmlFor="city-input">City Name</Label>
              <div className="flex gap-2">
                <Input
                  id="city-input"
                  type="text"
                  placeholder="e.g. Hyderabad, Vijayawada, Tirupati"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading || !cityInput.trim()}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              We use OpenStreetMap to find your city's coordinates and calculate the local timezone.
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">About This App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Telugu Panchang Companion</strong> is a frontend-only app. 
              All calculations happen locally in your browser using astronomical formulas based on Meeus's algorithms.
            </p>
            <p>
              Your location is saved only on your device (localStorage). No data is sent to any server. 
              The app works offline once loaded.
            </p>
            <p>
              Panchang calculations follow the <strong className="text-foreground">Amanta system</strong> used 
              in Andhra Pradesh and Telangana, with the Lahiri ayanamsa as per the Indian government standard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
