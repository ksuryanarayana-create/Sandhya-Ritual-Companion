import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Sunrise, Sunset, Check, Loader2 } from "lucide-react";
import { fetchSunTimes, getActiveSession, getSessionWindows, formatTime, type SunTimes, type ActiveSession, type SessionWindows } from "@/lib/sunriseSunset";
import { calculatePanchang, type PanchangData } from "@/lib/panchang";
import { buildSankalpamDesha, type SankalpamDesha } from "@/lib/sankalpam";
import {
  getDailyRecord, updateNotes, toggleCompleted,
  toDateKey, type SessionKey, type DailyRecord, type Location, getLocation
} from "@/lib/storage";

function PanchangItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col mb-1">
      <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-xl font-medium text-foreground">{value}</span>
    </div>
  );
}

function PracticeSection({
  sessionKey,
  title,
  subtext,
  timeWindow,
  isActive,
  dateKey,
  sectionData,
  onUpdate
}: {
  sessionKey: SessionKey;
  title: string;
  subtext: string;
  timeWindow?: string;
  isActive: boolean;
  dateKey: string;
  sectionData: any;
  onUpdate: (record: DailyRecord) => void;
}) {
  const [localNotes, setLocalNotes] = useState(sectionData.notes);

  useEffect(() => {
    setLocalNotes(sectionData.notes);
  }, [sectionData.notes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  };

  useEffect(() => {
    if (localNotes === sectionData.notes) return;
    const timer = setTimeout(() => {
      const updated = updateNotes(dateKey, sessionKey, localNotes);
      onUpdate(updated);
    }, 300);
    return () => clearTimeout(timer);
  }, [localNotes, dateKey, sessionKey, sectionData.notes, onUpdate]);

  const handleToggleCompleted = () => {
    const updated = toggleCompleted(dateKey, sessionKey);
    onUpdate(updated);
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-colors ${isActive ? 'border-primary shadow-md' : 'border-border'} ${sectionData.completed ? 'opacity-75' : ''}`}>
      {/* Header — not collapsible */}
      <div className={`p-5 flex items-start justify-between ${isActive ? 'bg-primary/10' : 'bg-card'}`}>
        <div>
          <h2 className={`text-2xl font-serif font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{title}</h2>
          <div className="text-[17px] text-muted-foreground mt-1">{subtext}</div>
          {timeWindow && (
            <div className="text-[16px] font-semibold text-primary mt-2 tabular-nums">
              🕐 {timeWindow}
            </div>
          )}
          {!timeWindow && (
            <div className="text-[15px] text-muted-foreground/70 mt-2 italic">
              Set location for exact times
            </div>
          )}
        </div>
        {sectionData.completed && (
          <div className="shrink-0 ml-3 flex items-center gap-1.5 text-[15px] font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Check className="w-4 h-4" /> Done
          </div>
        )}
      </div>

      {/* Content — always visible */}
      <div className="p-5 border-t-2 border-border space-y-6 bg-card">
        <div className="space-y-3">
          <label className="text-[15px] font-bold text-muted-foreground uppercase tracking-wider">Notes for this practice</label>
          <textarea
            value={localNotes}
            onChange={handleNotesChange}
            placeholder="Any specific thoughts, delays, or intentions..."
            className="w-full min-h-[100px] p-4 rounded-md border-2 border-input bg-background text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground/60"
            rows={3}
          />
        </div>

        <button
          onClick={handleToggleCompleted}
          className={`w-full py-4 rounded-lg text-[19px] font-bold transition-colors ${sectionData.completed ? 'bg-background text-muted-foreground border-2 border-input hover:bg-muted' : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'}`}
        >
          {sectionData.completed ? "Mark as Incomplete" : "Mark as Completed ✓"}
        </button>
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
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [isLoadingSun, setIsLoadingSun] = useState(false);
  const [sunError, setSunError] = useState<string | null>(null);

  const today = new Date();
  const dateKey = toDateKey(today);

  useEffect(() => {
    const loc = getLocation();
    setLocationState(loc);
    setPanchang(calculatePanchang(today));
    setRecord(getDailyRecord(dateKey));
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
            <h2 className="text-3xl font-serif font-bold mb-6 text-center text-primary">Today's Panchang</h2>
            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
              <PanchangItem label="Tithi" value={panchang.tithi} />
              <PanchangItem label="Vara" value={panchang.vara} />
              <PanchangItem label="Nakshatra" value={panchang.nakshatra} />
              <PanchangItem label="Yoga" value={panchang.yoga} />
              <PanchangItem label="Karana" value={panchang.karana} />
              <PanchangItem label="Masa" value={panchang.masa} />
              <PanchangItem label="Ayana" value={panchang.ayana} />
              <PanchangItem label="Ritu" value={panchang.ritu} />
              <div className="col-span-2 mt-3 pt-4 border-t border-[#e2cca4] dark:border-[#4a2e15]">
                <PanchangItem label="Samvatsara" value={`${panchang.samvatsara} Nama Samvatsare`} />
                <PanchangItem label="Shalivahana Saka" value={`${panchang.samvat}`} />
              </div>
            </div>

            {/* Sankalpam Desha — recited at the beginning of Sankalpam */}
            {sankalpamDesha && (
              <div className="mt-5 pt-5 border-t border-[#e2cca4] dark:border-[#4a2e15]">
                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Deśa · For Sankalpam
                </p>
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
              </div>
            )}
            {!sankalpamDesha && (
              <p className="mt-4 text-[15px] text-muted-foreground italic text-center">
                Set your location to see the Sankalpam deśa text.
              </p>
            )}
          </section>
        )}

        {record && (
          <div className="space-y-5">
            <PracticeSection
              sessionKey="pratah"
              title="Pratah Sandhya"
              subtext="Morning Practice"
              timeWindow={sessionWindows?.pratah}
              isActive={activeSession === "pratah"}
              dateKey={dateKey}
              sectionData={record.pratah}
              onUpdate={setRecord}
            />
            <PracticeSection
              sessionKey="madhyahna"
              title="Madhyahna Sandhya"
              subtext="Midday Practice"
              timeWindow={sessionWindows?.madhyahna}
              isActive={activeSession === "madhyahna"}
              dateKey={dateKey}
              sectionData={record.madhyahna}
              onUpdate={setRecord}
            />
            <PracticeSection
              sessionKey="sayam"
              title="Sayam Sandhya"
              subtext="Evening Practice"
              timeWindow={sessionWindows?.sayam}
              isActive={activeSession === "sayam"}
              dateKey={dateKey}
              sectionData={record.sayam}
              onUpdate={setRecord}
            />
          </div>
        )}
      </div>
    </div>
  );
}
