import React, { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { SankalpamAllSandhyas, SandhyaType } from "@/lib/sankalpam";

const SANDHYA_LABELS: { key: SandhyaType; label: string; sublabel: string }[] = [
  { key: "pratah",    label: "Prātaḥ",    sublabel: "Dawn" },
  { key: "madhyahna", label: "Mādhyāhna", sublabel: "Midday" },
  { key: "sayam",     label: "Sāyam",     sublabel: "Dusk" },
];

interface Props {
  sankalpam: SankalpamAllSandhyas;
  activeSession?: "pratah" | "madhyahna" | "sayam" | "none";
}

export default function SankalpamSection({ sankalpam, activeSession }: Props) {
  // Default to the currently active sandhya session, or pratah
  const defaultTab: SandhyaType =
    activeSession && activeSession !== "none" ? activeSession : "pratah";
  const [selected, setSelected] = useState<SandhyaType>(defaultTab);
  const [copied, setCopied] = useState(false);

  const current = sankalpam[selected];

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(current.fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [current.fullText]);

  return (
    <section className="bg-[#f4e6cc] dark:bg-[#352210] border border-[#e2cca4] dark:border-[#4a2e15] rounded-2xl p-6 shadow-sm">
      <h2 className="text-3xl font-serif font-bold mb-2 text-center text-primary">Sankalpam</h2>
      <p className="text-center text-[13px] text-muted-foreground mb-5">
        Complete text for reading aloud before Sandhyā Vandanam
      </p>

      {/* Sandhya selector tabs */}
      <div className="flex gap-2 mb-5">
        {SANDHYA_LABELS.map(({ key, label, sublabel }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`flex-1 rounded-lg border-2 py-2.5 text-center transition-colors ${
              selected === key
                ? "border-primary bg-primary/10"
                : "border-border bg-background/60 hover:border-primary/40"
            }`}
          >
            <div className={`text-[14px] font-bold ${selected === key ? "text-primary" : "text-foreground"}`}>
              {label}
            </div>
            <div className={`text-[11px] mt-0.5 ${selected === key ? "text-primary/80 font-semibold" : "text-muted-foreground"}`}>
              {sublabel}
            </div>
          </button>
        ))}
      </div>

      {/* Full text block */}
      <div className="relative bg-background/70 rounded-xl border border-[#e2cca4] dark:border-[#4a2e15] p-5 mb-4">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-primary transition-colors bg-background/80 rounded-md px-2.5 py-1.5 border border-border"
          title="Copy to clipboard"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" />Copy</>
          )}
        </button>

        {/* Readable continuous text — large, comfortable for elders */}
        <p className="text-[19px] leading-[1.75] font-medium text-foreground pr-20">
          {current.fullText}
        </p>
      </div>

      {/* Phrase-by-phrase breakdown for following along */}
      <div className="space-y-0">
        {current.phrases.map((phrase, i) => {
          const isLast = i === current.phrases.length - 1;
          const isInvocation = isLast;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 py-2 border-b border-[#e2cca4]/60 dark:border-[#4a2e15]/60 last:border-b-0 ${
                isInvocation ? "pt-3" : ""
              }`}
            >
              <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest shrink-0 mt-1 w-4 text-right">
                {i + 1}
              </span>
              <span
                className={`text-[16px] leading-snug ${
                  isInvocation
                    ? "font-bold text-primary italic"
                    : "font-medium text-foreground"
                }`}
              >
                {phrase}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
