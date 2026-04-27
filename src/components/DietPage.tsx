// Nutrition Goals page — UI like ReportView (cards), strict text-list export
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { computeNutrition, fmtKcal, fmtNum, NutritionResult } from "@/lib/nutrition";
import { exportDietPDF, exportDietWord } from "@/lib/exporters";
import { FileText, FileType, Save, Utensils, Flame, TrendingDown, TrendingUp, Beef, Wheat, Droplet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Latest {
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_pct: number | null;
  water_pct: number | null;
  bone_pct: number | null;
}

interface Props {
  latest: Latest | null;
  bmr: number | null;
  idealWeightKg: number | null;
  targetWeightKg: number | null;
  displayName: string;
  onSaved?: () => void;
}

// Themed stat row similar to Dashboard/Report
const StatLine = ({
  icon: Icon, label, value, sub, variant = "muted",
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  variant?: "muted" | "primary" | "warning" | "info" | "success" | "destructive";
}) => {
  const ringClass = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[variant];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", ringClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-base font-medium tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
};

export const DietPage = ({ latest, bmr, idealWeightKg, targetWeightKg, displayName, onSaved }: Props) => {
  const { t } = useAppPrefs();
  const { user } = useAuth();
  const [intake, setIntake] = useState<string>("");
  const [activity, setActivity] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const intakeNum = parseFloat(intake.replace(",", ".")) || 0;
  const activityNum = parseFloat(activity.replace(",", ".")) || 0;

  const result: NutritionResult | null = useMemo(() => {
    if (!latest || bmr == null) return null;
    return computeNutrition({
      weight_kg: Number(latest.weight_kg),
      body_fat_pct: latest.body_fat_pct ?? 0,
      muscle_pct: latest.muscle_pct ?? 0,
      water_pct: latest.water_pct ?? 0,
      bone_pct: latest.bone_pct ?? 0,
      bmr_kcal: bmr,
      ideal_weight_kg: idealWeightKg ?? 0,
      intake_kcal: intakeNum,
      activity_kcal: activityNum,
    });
  }, [latest, bmr, idealWeightKg, intakeNum, activityNum]);

  const dateLabel = format(new Date(), "yyyy-MM-dd");

  const saveDay = async () => {
    if (!user || !result) return;
    if (intakeNum <= 0) {
      toast.error(t("diet.intake") + " > 0");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("nutrition_entries").insert({
      user_id: user.id,
      recorded_at: new Date().toISOString(),
      intake_kcal: intakeNum,
      activity_kcal: activityNum,
      bmr_kcal: bmr,
      amr_kcal: result.tdee_kcal,
      target_weight_kg: targetWeightKg,
      weight_kg: latest?.weight_kg ?? null,
      body_fat_pct: latest?.body_fat_pct ?? null,
      muscle_pct: latest?.muscle_pct ?? null,
      water_pct: latest?.water_pct ?? null,
      bone_pct: latest?.bone_pct ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("diet.saved"));
    setIntake("");
    setActivity("");
    onSaved?.();
  };

  const handlePdf = () => {
    if (!result) return;
    try {
      exportDietPDF(result, dateLabel, displayName);
      toast.success(t("export.pdfOk"));
    } catch (e) { console.error(e); toast.error("PDF error"); }
  };
  const handleWord = async () => {
    if (!result) return;
    try {
      await exportDietWord(result, dateLabel, displayName);
      toast.success(t("export.wordOk"));
    } catch (e) { console.error(e); toast.error("Word error"); }
  };

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-3xl font-bold flex items-center gap-2">
        <Utensils className="w-7 h-7 text-primary" /> {t("diet.title")}
      </h2>

      {!latest || bmr == null ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("diet.noLatest")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Inputs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Καταχώρηση Ημέρας</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("diet.intake")}</Label>
                <Input
                  type="number" inputMode="decimal" step="1"
                  placeholder="kcal"
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">{t("diet.activity")}</Label>
                <Input
                  type="number" inputMode="decimal" step="1"
                  placeholder="kcal"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Energy Balance card */}
          {result && (
            <>
              <h3 className="text-2xl font-bold pt-2">Ενεργειακό Ισοζύγιο</h3>
              <Card>
                <CardContent className="py-1">
                  <StatLine
                    icon={Flame}
                    variant="warning"
                    label="Θερμίδες διατροφής"
                    value={<>🔺 +{fmtKcal(result.intake_kcal)} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                  />
                  <StatLine
                    icon={Flame}
                    variant="info"
                    label="Βασικός μεταβολισμός (BMR)"
                    value={<>🔻 -{fmtKcal(result.bmr_kcal)} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                    sub={`${fmtNum(result.bmrPctOfIntake, 1)}% της πρόσληψης`}
                  />
                  <StatLine
                    icon={Wheat}
                    variant="info"
                    label="Θερμική επίδραση τροφής (TEF)"
                    value={<>🔻 -{fmtKcal(result.tef_kcal)} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                    sub={`${fmtNum(result.tefPctOfIntake, 1)}% της πρόσληψης (10% επί της πρόσληψης)`}
                  />
                  <StatLine
                    icon={Flame}
                    variant="info"
                    label="Θερμίδες ασκήσεων"
                    value={<>🔻 -{fmtKcal(result.exercise_kcal)} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                    sub={`${fmtNum(result.exercisePctOfIntake, 1)}% της πρόσληψης`}
                  />
                  <StatLine
                    icon={Flame}
                    variant="primary"
                    label="Συνολική σπατάλη ενέργειας (TDEE)"
                    value={<>🔺 +{fmtKcal(result.tdee_kcal)} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                  />
                  <StatLine
                    icon={result.weight_loss ? TrendingDown : TrendingUp}
                    variant={result.weight_loss ? "destructive" : "success"}
                    label={`Συνολικό θερμιδικό ${result.weight_loss ? "έλλειμμα" : "πλεόνασμα"}`}
                    value={<>{result.weight_loss ? "–" : "+"}{fmtKcal(Math.abs(result.deficit_kcal))} <span className="text-muted-foreground text-sm">kcal/ημέρα</span></>}
                    sub={`${fmtNum(result.deficitPctOfIntake, 1)}% της πρόσληψης`}
                  />
                  <StatLine
                    icon={result.weight_loss ? TrendingDown : TrendingUp}
                    variant={result.weight_loss ? "destructive" : "success"}
                    label={`Συνολική ${result.weight_loss ? "απώλεια" : "αύξηση"} βάρους`}
                    value={<>{fmtNum(Math.abs(result.weight_change_kg_day), 2)} kg/ημέρα</>}
                    sub={`${fmtNum(Math.abs(result.weight_change_kg_week), 2)} kg/εβδομάδα · ${fmtNum(Math.abs(result.weight_change_kg_month), 2)} kg/μήνα`}
                  />
                </CardContent>
              </Card>

              {/* Macros */}
              <h3 className="text-2xl font-bold pt-2">Μακροθρεπτικά</h3>
              <Card>
                <CardContent className="py-1">
                  <StatLine
                    icon={Beef}
                    variant="destructive"
                    label="Πρωτεΐνη (βασικού μεταβολισμού)"
                    value={<>{fmtNum(result.protein_baseline_g, 1)} <span className="text-muted-foreground text-sm">γρ./ημέρα</span></>}
                    sub={`1.5 γρ. × ${fmtNum(result.lean_mass_kg, 1)} kg Άλιπης Μάζας`}
                  />
                  <StatLine
                    icon={Beef}
                    variant="destructive"
                    label="Πρωτεΐνη (ασκήσεων)"
                    value={<>{fmtNum(result.protein_exercise_g, 1)} <span className="text-muted-foreground text-sm">γρ./ημέρα</span></>}
                    sub={`${fmtKcal(Math.abs(result.deficit_kcal))} kcal × 0.035 γρ.`}
                  />
                  <StatLine
                    icon={Beef}
                    variant="primary"
                    label="Συνολική πρωτεΐνη"
                    value={<>{fmtNum(result.protein_total_g, 1)} <span className="text-muted-foreground text-sm">γρ./ημέρα</span></>}
                    sub={`${fmtKcal(result.protein_kcal)} kcal · ${fmtNum(result.protein_pct, 1)}% πρόσληψης`}
                  />
                  <StatLine
                    icon={Droplet}
                    variant="warning"
                    label="Λιπαρά"
                    value={<>{fmtNum(result.fat_g, 1)} <span className="text-muted-foreground text-sm">γρ./ημέρα</span></>}
                    sub={`${fmtKcal(result.fat_kcal)} kcal / 9`}
                  />
                  <StatLine
                    icon={Wheat}
                    variant="success"
                    label="Υδατάνθρακες"
                    value={<>{fmtNum(result.carbs_g, 1)} <span className="text-muted-foreground text-sm">γρ./ημέρα</span></>}
                    sub={`${fmtKcal(result.carbs_kcal)} kcal · ${fmtNum(result.carbs_pct, 1)}% πρόσληψης / 4`}
                  />
                </CardContent>
              </Card>

              {/* Body composition snapshot */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Σύσταση Σώματος (από τελευταία μέτρηση)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Συνολικό Βάρος</span><span className="tabular-nums">{fmtNum(Number(latest.weight_kg), 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ιδανικό Βάρος</span><span className="tabular-nums">{fmtNum(idealWeightKg ?? 0, 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Άλιπη Μάζα</span><span className="tabular-nums">{fmtNum(result.lean_mass_pct, 1)}% · {fmtNum(result.lean_mass_kg, 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Μύες</span><span className="tabular-nums">{fmtNum(latest.muscle_pct ?? 0, 1)}% · {fmtNum(result.muscle_kg, 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Υγρά</span><span className="tabular-nums">{fmtNum(latest.water_pct ?? 0, 1)}% · {fmtNum(result.water_kg, 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Κόκαλα</span><span className="tabular-nums">{fmtNum(latest.bone_pct ?? 0, 1)}% · {fmtNum(result.bone_kg, 1)} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Λίπος</span><span className="tabular-nums">{fmtNum(latest.body_fat_pct ?? 0, 1)}% · {fmtNum(result.fat_kg, 1)} kg</span></div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={saveDay} disabled={saving || intakeNum <= 0} className="bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]">
              <Save className="w-4 h-4 mr-1" /> {t("diet.save")}
            </Button>
            <Button variant="outline" onClick={handlePdf} disabled={!result || intakeNum <= 0}>
              <FileText className="w-4 h-4 mr-1" /> {t("export.pdf")}
            </Button>
            <Button variant="outline" onClick={handleWord} disabled={!result || intakeNum <= 0}>
              <FileType className="w-4 h-4 mr-1" /> {t("export.word")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
