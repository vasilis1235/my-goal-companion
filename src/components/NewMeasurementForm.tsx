import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLevel, Sex } from "@/lib/calculations";
import { Save } from "lucide-react";
import { ProfileInfoCard } from "./ProfileInfoCard";
import { useAppPrefs } from "@/contexts/AppPreferences";

export interface NewMeasurementValues {
  sex: Sex;
  age: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  recorded_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  water_pct: number | null;
  muscle_pct: number | null;
  bone_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  shoulders_cm: number | null;
  biceps_cm: number | null;
  forearm_cm: number | null;
  wrist_cm: number | null;
  thigh_cm: number | null;
  knee_cm: number | null;
  calf_cm: number | null;
  ankle_cm: number | null;
}

interface Props {
  initial: Partial<NewMeasurementValues>;
  onSave: (values: NewMeasurementValues) => Promise<void>;
}

export const NewMeasurementForm = ({ initial, onSave }: Props) => {
  const { t } = useAppPrefs();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<NewMeasurementValues>>({
    sex: initial.sex ?? "male",
    activity_level: initial.activity_level ?? "moderate",
    recorded_at: today,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof NewMeasurementValues>(k: K, val: NewMeasurementValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const numField = (key: keyof NewMeasurementValues, label: string, placeholder?: string, unit?: string) => (
    <div>
      <Label className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
      <Input type="number" step="0.1" inputMode="decimal"
        value={(v[key] as number | null | undefined) ?? ""}
        onChange={(e) => set(key, (e.target.value === "" ? null : parseFloat(e.target.value.replace(",", "."))) as never)}
        placeholder={placeholder} className="h-9" />
    </div>
  );

  const handleSave = async () => {
    if (!v.weight_kg || v.weight_kg <= 0) return;
    setSaving(true);
    try { await onSave(v as NewMeasurementValues); }
    finally { setSaving(false); }
  };

  const canSave = !!v.weight_kg && v.weight_kg > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("report.add")}</h2>
        <p className="text-sm text-muted-foreground">Μόνο το βάρος είναι υποχρεωτικό. Τα στοιχεία προφίλ αλλάζουν μόνο από το Προφίλ.</p>
      </div>

      {/* Read-only profile */}
      <ProfileInfoCard
        sex={(v.sex as Sex) ?? null}
        age={v.age ?? null}
        height_cm={v.height_cm ?? null}
        activity={v.activity_level as ActivityLevel ?? null}
        title={t("report.profileCard")}
      />

      <div>
        <Label className="text-xs">Ημερομηνία μέτρησης</Label>
        <Input type="date" value={v.recorded_at ?? today} onChange={(e) => set("recorded_at", e.target.value)} className="h-9" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Σύσταση Σώματος</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("weight_kg", "Βάρος *", "π.χ. 75.5", "kg")}
          {numField("body_fat_pct", t("dash.fat"), "π.χ. 18.0", "%")}
          {numField("water_pct", t("dash.water"), "π.χ. 60.0", "%")}
          {numField("muscle_pct", t("dash.muscle"), "π.χ. 42.0", "%")}
          {numField("bone_pct", t("dash.bone"), "π.χ. 15.0", "%")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Μετρήσεις Κορμού</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("waist_cm", "Περιφέρεια Μέσης", "π.χ. 82.0", "cm")}
          {numField("hip_cm", "Περιφέρεια Ισχίου", "π.χ. 95.0", "cm")}
          {numField("chest_cm", "Περιφέρεια Στήθους", "π.χ. 102.0", "cm")}
          {numField("shoulders_cm", "Περιφέρεια Ώμων", "π.χ. 118.0", "cm")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Μετρήσεις Άκρων</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("biceps_cm", "Περιφέρεια Δικεφάλων", "π.χ. 35.0", "cm")}
          {numField("forearm_cm", "Περιφέρεια Πήχη", "π.χ. 28.0", "cm")}
          {numField("wrist_cm", "Περιφέρεια Καρπού", "π.χ. 17.0", "cm")}
          {numField("thigh_cm", "Περιφέρεια Τετρακεφάλων", "π.χ. 56.0", "cm")}
          {numField("knee_cm", "Περιφέρεια Γόνατος", "π.χ. 38.0", "cm")}
          {numField("calf_cm", "Περιφέρεια Γάμπας", "π.χ. 37.0", "cm")}
          {numField("ankle_cm", "Περιφέρεια Αστραγάλου", "π.χ. 22.0", "cm")}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={!canSave || saving}
        className="w-full bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]" size="lg">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "..." : t("common.save")}
      </Button>
    </div>
  );
};
