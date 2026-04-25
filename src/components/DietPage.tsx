// Nutrition Goals page — live calculator, full breakdown, save day, exports
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { computeNutrition, fmtKcal, fmtNum, NutritionResult } from "@/lib/nutrition";
import { exportDietPDF, exportDietWord } from "@/lib/exporters";
import { FileText, FileType, Save, Utensils } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="w-5 h-5" /> {t("diet.title")}
        </h2>
      </div>

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
            <CardHeader className="pb-2"><CardTitle className="text-base">Live</CardTitle></CardHeader>
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

          {/* Results panel */}
          {result && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("diet.title")}:</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <p>• Συνολική ημερήσια πρόσληψη θρεπτικών στοιχείων.</p>
                <p>• Θερμίδες διατροφής: <span className="text-warning">🔺</span>+{fmtKcal(result.intake_kcal)} kcal/ημέρα</p>
                <p>• Θερμίδες βασικού μεταβολισμού (BMR): <span className="text-warning">🔺</span>-{fmtKcal(result.bmr_kcal)} kcal ({fmtNum(result.bmrPctOfIntake, 1)}%)/ημέρα</p>
                <p>• Θερμική επίδραση τροφής (TEF): <span className="text-warning">🔺</span>-{fmtKcal(result.tef_kcal)} kcal ({fmtNum(result.tefPctOfIntake, 1)}%)/ημέρα (10% επί της πρόσληψης)</p>
                <p>• Θερμίδες ασκήσεων: <span className="text-warning">🔺</span>-{fmtKcal(result.exercise_kcal)} kcal ({fmtNum(result.exercisePctOfIntake, 1)}%)/ημέρα</p>
                <p>• Συνολική σπατάλη ενέργειας (TDEE): <span className="text-warning">🔺</span>+{fmtKcal(result.tdee_kcal)} kcal/ημέρα</p>
                <p>• Συνολικό θερμιδικό {result.weight_loss ? "έλλειμμα" : "πλεόνασμα"}: {result.weight_loss ? "–" : "+"}{fmtKcal(Math.abs(result.deficit_kcal))} kcal ({fmtNum(result.deficitPctOfIntake, 1)}%)/ημέρα</p>
                <p>• Συνολική {result.weight_loss ? "απώλεια" : "αύξηση"} βάρους: {fmtNum(Math.abs(result.weight_change_kg_day), 2)} Kg/ημέρα, {fmtNum(Math.abs(result.weight_change_kg_week), 2)} Kg/εβδομάδα, {fmtNum(Math.abs(result.weight_change_kg_month), 2)} Kg/μήνα.</p>
                <p>
                  • Πρόσληψη πρωτεΐνης βασικού μεταβολισμού: 1.5 γρ. πρωτεΐνη × {fmtNum(result.lean_mass_kg, 1)} Kg Άλιπης Μάζας
                  {" "}(Άλιπη Μάζα: {fmtNum(result.lean_mass_pct, 1)}% - {fmtNum(result.lean_mass_kg, 1)} Kg /
                  {" "}Μύες: {fmtNum(latest.muscle_pct ?? 0, 1)}% - {fmtNum(result.muscle_kg, 1)} Kg /
                  {" "}Υγρά: {fmtNum(latest.water_pct ?? 0, 1)}% - {fmtNum(result.water_kg, 1)} Kg /
                  {" "}Κόκαλα: {fmtNum(latest.bone_pct ?? 0, 1)}% - {fmtNum(result.bone_kg, 1)} Kg /
                  {" "}Λίπος: {fmtNum(latest.body_fat_pct ?? 0, 1)}% - {fmtNum(result.fat_kg, 1)} Kg /
                  {" "}Συνολικό Βάρος: {fmtNum(Number(latest.weight_kg), 1)} Kg /
                  {" "}Ιδανικό Βάρος: {fmtNum(idealWeightKg ?? 0, 1)} Kg) = {fmtNum(result.protein_baseline_g, 1)} γρ. πρωτεΐνης/ημέρα
                </p>
                <p>• Πρόσληψη πρωτεΐνης ασκήσεων: {fmtKcal(Math.abs(result.deficit_kcal))} kcal {result.weight_loss ? "έλλειμμα" : "πλεόνασμα"} × 0.035 γρ. πρωτεΐνη = {fmtNum(result.protein_exercise_g, 1)} γρ. πρωτεΐνης/ημέρα</p>
                <p>• Συνολική πρόσληψη πρωτεΐνης: {fmtNum(result.protein_total_g, 1)} γρ./ημέρα ({fmtKcal(result.protein_kcal)} kcal, {fmtNum(result.protein_pct, 1)}%)</p>
                <p>• Συνολική πρόσληψη λιπαρών: {fmtKcal(result.fat_kcal)} kcal / 9 = {fmtNum(result.fat_g, 1)} γρ./ημέρα</p>
                <p>• Συνολική πρόσληψη υδατανθράκων: {fmtKcal(result.carbs_kcal)} kcal ({fmtNum(result.carbs_pct, 1)}%) / 4 = {fmtNum(result.carbs_g, 1)} γρ./ημέρα</p>
              </CardContent>
            </Card>
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
