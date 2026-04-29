// History page split in two tabs: Body Composition + Nutrition Diary
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { displayWeight } from "@/lib/units";

export interface HistoryEntry {
  id: string;
  recorded_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
}

export interface NutritionEntry {
  id: string;
  recorded_at: string;
  intake_kcal: number;
  activity_kcal: number;
  bmr_kcal: number | null;
  amr_kcal: number | null;
}

interface Props {
  entries: HistoryEntry[];
  nutrition: NutritionEntry[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteNutrition: (id: string) => void;
  /** "both" (default) shows tabs, "body" or "diet" shows only that section */
  only?: "both" | "body" | "diet";
  /** hide the outer h2 title (when used inside a SectionShell) */
  hideTitle?: boolean;
}

export const HistoryList = ({ entries, nutrition, onView, onDelete, onDeleteNutrition, only = "both", hideTitle = false }: Props) => {
  const { t, units } = useAppPrefs();

  const bodySection = (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground">
        {entries.length} {entries.length === 1 ? t("hist.entry") : t("hist.entries")}
      </p>
      {entries.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("hist.empty")}</CardContent></Card>
      ) : (
        entries.map((e, i) => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  #{String(entries.length - i).padStart(2, "0")} · {format(new Date(e.recorded_at), "dd/MM/yyyy")}
                </div>
                <div className="font-semibold tabular-nums">
                  {displayWeight(Number(e.weight_kg), units, 1)}
                  {e.body_fat_pct != null && (
                    <span className="text-muted-foreground font-normal text-sm ml-2">
                      · {Number(e.body_fat_pct).toFixed(1)}% {t("dash.fat").toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onView(e.id)}>
                <Eye className="w-4 h-4 mr-1" /> {t("common.view")}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)} aria-label={t("common.delete")}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const dietSection = (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground">
        {nutrition.length} {nutrition.length === 1 ? t("hist.entry") : t("hist.entries")}
      </p>
      {nutrition.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("hist.empty")}</CardContent></Card>
      ) : (
        nutrition.map((e, i) => {
          const tdee = (e.bmr_kcal ?? 0) + Number(e.intake_kcal) * 0.10 + Number(e.activity_kcal);
          const deficit = Number(e.intake_kcal) - tdee;
          const isLoss = deficit < 0;
          return (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">
                    #{String(nutrition.length - i).padStart(2, "0")} · {format(new Date(e.recorded_at), "dd/MM/yyyy")}
                  </div>
                  <div className="text-sm tabular-nums">
                    <span className="font-semibold">{Number(e.intake_kcal).toFixed(0)} kcal</span>
                    <span className="text-muted-foreground ml-2">+ {Number(e.activity_kcal).toFixed(0)} act.</span>
                  </div>
                  <div className={`text-[11px] tabular-nums ${isLoss ? "text-success" : "text-warning"}`}>
                    {isLoss ? "▼" : "▲"} {Math.abs(deficit).toFixed(0)} kcal/{t("diet.kcalDay").split("/")[1] ?? "day"}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onDeleteNutrition(e.id)} aria-label={t("common.delete")}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  if (only === "body") {
    return <div className="space-y-4">{!hideTitle && <h2 className="text-2xl font-bold">{t("hist.body")}</h2>}{bodySection}</div>;
  }
  if (only === "diet") {
    return <div className="space-y-4">{!hideTitle && <h2 className="text-2xl font-bold">{t("hist.diet")}</h2>}{dietSection}</div>;
  }

  return (
    <div className="space-y-4">
      {!hideTitle && <h2 className="text-2xl font-bold">{t("hist.title")}</h2>}
      <Tabs defaultValue="body" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="body">{t("hist.body")}</TabsTrigger>
          <TabsTrigger value="diet">{t("hist.diet")}</TabsTrigger>
        </TabsList>
        <TabsContent value="body">{bodySection}</TabsContent>
        <TabsContent value="diet">{dietSection}</TabsContent>
      </Tabs>
    </div>
  );
};
