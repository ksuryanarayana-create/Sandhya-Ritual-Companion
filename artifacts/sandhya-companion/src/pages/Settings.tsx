import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { geocodeCity } from "@/lib/sunriseSunset";
import { getLocation, setLocation, clearLocation, type Location } from "@/lib/storage";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";

const locationSchema = z.object({
  cityName: z.string().min(2, "City name must be at least 2 characters")
});

type LocationFormValues = z.infer<typeof locationSchema>;

export default function Settings() {
  const [, navigate] = useLocation();
  const [currentLoc, setCurrentLoc] = useState<Location | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: { cityName: "" }
  });

  useEffect(() => {
    setCurrentLoc(getLocation());
  }, []);

  const onSubmit = async (data: LocationFormValues) => {
    setErrorMsg(null);
    try {
      const result = await geocodeCity(data.cityName);
      const newLoc: Location = {
        city: result.city,
        lat: result.lat,
        lng: result.lng,
        state: result.state,
        countryCode: result.countryCode,
      };
      setLocation(newLoc);
      navigate("/");
    } catch (err: any) {
      setErrorMsg("City not found. Please try a different name.");
    }
  };

  const handleClear = () => {
    clearLocation();
    setCurrentLoc(null);
    form.reset({ cityName: "" });
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-[100dvh] bg-background text-foreground pb-12">
      <div className="p-4 md:p-6 space-y-8 mt-4">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold text-lg">
          <ArrowLeft className="w-6 h-6" /> Back to Today
        </Link>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-serif font-bold text-primary">Location Settings</h1>
          <p className="text-[19px] leading-relaxed text-muted-foreground">
            Your location is used to calculate accurate sunrise and sunset times. It is stored only on this device.
          </p>
        </div>

        {currentLoc && (
          <div className="bg-card border-2 border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[15px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Current location</div>
              <div className="text-2xl font-bold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5 text-primary"/> {currentLoc.city}</div>
            </div>
            <button onClick={handleClear} className="text-destructive font-bold text-[17px] hover:bg-destructive/10 px-4 py-2 rounded-md transition-colors">
              Clear
            </button>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card border-2 border-border rounded-xl p-5 shadow-sm">
          <div className="space-y-3">
            <label className="text-[17px] font-bold text-foreground">Find a new city</label>
            <div className="relative">
              <Search className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                {...form.register("cityName")}
                placeholder="e.g. Hyderabad, Bangalore"
                className="w-full text-[19px] pl-12 pr-4 py-4 rounded-lg border-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
            {form.formState.errors.cityName && (
              <p className="text-[17px] font-medium text-destructive">{form.formState.errors.cityName.message}</p>
            )}
            {errorMsg && (
              <p className="text-[17px] font-medium text-destructive">{errorMsg}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-bold text-[19px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70 shadow-sm"
          >
            {form.formState.isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Finding Location...</>
            ) : (
              <><MapPin className="w-6 h-6" /> Save Location</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
