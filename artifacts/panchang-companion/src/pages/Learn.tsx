import { useState } from "react";
import { getGlossaryByCategory } from "@/lib/glossary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";

export default function Learn() {
  const categories = getGlossaryByCategory();

  return (
    <div className="min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">Learn</h1>
          <p className="text-lg text-muted-foreground">
            A plain-language guide to panchang terms
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              {cat.label}
            </h2>
            <Card>
              <CardContent className="p-0">
                <Accordion type="multiple" className="w-full">
                  {cat.entries.map((entry, entryIdx) => (
                    <AccordionItem key={entryIdx} value={`${catIdx}-${entryIdx}`} className="border-b last:border-0">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-foreground mb-1">
                            {entry.term}
                          </div>
                          <div className="text-sm text-primary font-medium">
                            {entry.pronunciation}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {entry.shortDef}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-3">
                          <p className="text-foreground leading-relaxed">
                            {entry.fullExplanation}
                          </p>
                          {entry.example && (
                            <div className="bg-accent/10 border-l-4 border-accent p-4 rounded">
                              <div className="flex items-start gap-2">
                                <BookOpen className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                                <p className="text-sm text-foreground leading-relaxed">
                                  <span className="font-medium text-accent">Everyday analogy:</span> {entry.example}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
