import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getZone, ZONE_CLASSES, MetricKind, SUBCATEGORY_INFO, SubcategoryInfo } from "@/lib/zoneAnalysis";

interface MetricBoxProps {
  title: string;          // π.χ. "Ιδανικό βάρος (IBW)"
  kind: MetricKind;
  current: number;
  target: number;
  children: React.ReactNode;
}

export const MetricBox = ({ title, kind, current, target, children }: MetricBoxProps) => {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<SubcategoryInfo | null>(null);
  const zone = getZone(kind, current, target);

  const cls = zone ? ZONE_CLASSES[zone.severity] : { bg: "", border: "border-border", text: "" };

  return (
    <>
      <div className={cn("rounded-lg border-2 p-3 mb-3 transition-colors", cls.bg, cls.border)}>
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <h4 className="font-semibold text-sm leading-tight">{title}</h4>
          {zone && (
            <button
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80",
                cls.border, cls.text
              )}
            >
              <span>{zone.emoji}</span>
              <span>{zone.label}</span>
              <Info className="w-3 h-3 ml-0.5 opacity-60" />
            </button>
          )}
        </div>
        <div className="space-y-1 text-sm">{children}</div>
        {/* Helper hint to discover subcategory explanations */}
        <button
          onClick={() => setSubOpen(SUBCATEGORY_INFO[2])}
          className="mt-2 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <Info className="w-3 h-3" /> Τι σημαίνουν οι υποκατηγορίες;
        </button>
      </div>

      {/* Zone analysis dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{zone?.emoji}</span>
              <span>{zone?.label}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">{title}</DialogDescription>
          </DialogHeader>
          {zone && (
            <div className="space-y-4 text-sm">
              <p className="leading-relaxed">{zone.description}</p>
              {zone.sources.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">Επιστημονικές πηγές</h5>
                  <ul className="space-y-1.5">
                    {zone.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-primary hover:underline text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <h5 className="font-semibold mb-2 text-xs uppercase text-muted-foreground">Υποκατηγορίες — επεξήγηση</h5>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUBCATEGORY_INFO.map((sc) => (
                    <Button
                      key={sc.key}
                      variant="outline"
                      size="sm"
                      className="h-auto py-1.5 text-[11px] justify-start"
                      onClick={() => setSubOpen(sc)}
                    >
                      {sc.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subcategory dialog */}
      <Dialog open={!!subOpen} onOpenChange={(o) => !o && setSubOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{subOpen?.title}</DialogTitle>
          </DialogHeader>
          {subOpen && (
            <div className="space-y-3 text-sm">
              <p className="leading-relaxed">{subOpen.description}</p>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Υπολογισμός</div>
                <div className="font-mono text-xs bg-muted p-2 rounded">{subOpen.formula}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Παράδειγμα</div>
                <div className="text-xs leading-relaxed">{subOpen.example}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
