// Top-level 5-category hub (Phase 1 architecture)
import { Card, CardContent } from "@/components/ui/card";
import { Home, Activity, Utensils, Dumbbell, ClipboardCheck } from "lucide-react";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { cn } from "@/lib/utils";

export type Category = "home" | "body" | "nutrition" | "exercise" | "assessment";

interface Props {
  onSelect: (cat: Category) => void;
}

export const CategoryHub = ({ onSelect }: Props) => {
  const { t } = useAppPrefs();
  const items: { id: Category; label: string; desc: string; Icon: typeof Home; ring: string }[] = [
    { id: "home", label: t("cat.home"), desc: t("cat.home.desc"), Icon: Home, ring: "bg-slate-500/15 text-slate-300" },
    { id: "body", label: t("cat.body"), desc: t("cat.body.desc"), Icon: Activity, ring: "bg-sky-500/15 text-sky-400" },
    { id: "nutrition", label: t("cat.nutrition"), desc: t("cat.nutrition.desc"), Icon: Utensils, ring: "bg-emerald-500/15 text-emerald-400" },
    { id: "exercise", label: t("cat.exercise"), desc: t("cat.exercise.desc"), Icon: Dumbbell, ring: "bg-amber-500/15 text-amber-400" },
    { id: "assessment", label: t("cat.assessment"), desc: t("cat.assessment.desc"), Icon: ClipboardCheck, ring: "bg-fuchsia-500/15 text-fuchsia-400" },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("hub.title")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ id, label, desc, Icon, ring }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="text-left transition-transform active:scale-[0.98]"
          >
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", ring)}>
                  <Icon className="w-7 h-7" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-base">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};
