import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ACTIVITY_LABELS, ActivityLevel, Sex } from "@/lib/calculations";
import { Save } from "lucide-react";

export interface NewMeasurementValues {
  // profile
  sex: Sex;
  age: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  // measurement
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
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<NewMeasurementValues>>({
    sex: "male",
    activity_level: "moderate",
    recorded_at: today,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof NewMeasurementValues>(k: K, val: NewMeasurementValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const numField = (key: keyof NewMeasurementValues, label: string, placeholder?: string, unit?: string) => (
    <div>
      <Label className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
      <Input
        type="number"
        step="0.1"
        inputMode="decimal"
        value={(v[key] as number | null | undefined) ?? ""}
        onChange={(e) => set(key, (e.target.value === "" ? null : parseFloat(e.target.value.replace(",", "."))) as never)}
        placeholder={placeholder}
        className="h-9"
      />
    </div>
  );

  const handleSave = async () => {
    if (!v.weight_kg || v.weight_kg <= 0) return;
    setSaving(true);
    try {
      await onSave(v as NewMeasurementValues);
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!v.weight_kg && v.weight_kg > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Νέα μέτρηση</h2>
        <p className="text-sm text-muted-foreground">Συμπλήρωσε τα στοιχεία σου και τις μετρήσεις. Μόνο το βάρος είναι υποχρεωτικό.</p>
      </div>

      {/* Στοιχεία */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Τα στοιχεία σου</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Φύλο</Label>
            <RadioGroup
              value={v.sex}
              onValueChange={(val) => set("sex", val as Sex)}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center gap-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male" className="cursor-pointer">Άντρας</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female" className="cursor-pointer">Γυναίκα</Label></div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {numField("age", "Ηλικία")}
            {numField("height_cm", "Ύψος", "π.χ. 175", "cm")}
          </div>
          <div>
            <Label className="text-xs">Επίπεδο δραστηριότητας</Label>
            <Select value={v.activity_level} onValueChange={(val) => set("activity_level", val as ActivityLevel)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACTIVITY_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ημερομηνία μέτρησης</Label>
            <Input
              type="date"
              value={v.recorded_at ?? today}
              onChange={(e) => set("recorded_at", e.target.value)}
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Σύσταση */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Σύσταση Σώματος</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("weight_kg", "Βάρος *", "π.χ. 75.5", "kg")}
          {numField("body_fat_pct", "Λίπος", undefined, "%")}
          {numField("water_pct", "Υγρά", undefined, "%")}
          {numField("muscle_pct", "Μύες", undefined, "%")}
          {numField("bone_pct", "Κόκαλα", undefined, "%")}
        </CardContent>
      </Card>

      {/* Κορμός */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Μετρήσεις Κορμού</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("waist_cm", "Μέση", undefined, "cm")}
          {numField("hip_cm", "Ισχίο", undefined, "cm")}
          {numField("chest_cm", "Στήθος", undefined, "cm")}
          {numField("shoulders_cm", "Ώμοι", undefined, "cm")}
        </CardContent>
      </Card>

      {/* Άκρα */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Μετρήσεις Άκρων</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {numField("biceps_cm", "Δικέφαλα", undefined, "cm")}
          {numField("forearm_cm", "Πήχης", undefined, "cm")}
          {numField("wrist_cm", "Καρπός", undefined, "cm")}
          {numField("thigh_cm", "Τετρακέφαλα", undefined, "cm")}
          {numField("knee_cm", "Γόνατο", undefined, "cm")}
          {numField("calf_cm", "Γάμπα", undefined, "cm")}
          {numField("ankle_cm", "Αστράγαλος", undefined, "cm")}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]"
        size="lg"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Αποθήκευση..." : "Αποθήκευση μέτρησης"}
      </Button>
    </div>
  );
};
