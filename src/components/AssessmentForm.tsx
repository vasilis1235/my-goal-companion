// Smart Trainer assessment form — Φάση 2
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Pencil, CheckCircle2 } from "lucide-react";

type Injury = "lower_back" | "knees" | "shoulders" | "neck" | "wrists" | "ankles";
type Location = "home" | "gym" | "outdoor";
type Equipment = "bodyweight" | "dumbbells" | "barbell" | "bands" | "kettlebells" | "machines" | "pullup_bar";
type Goal = "strength" | "fat_loss" | "mobility" | "endurance";
type Experience = "beginner" | "intermediate" | "advanced";

interface TrainingProfile {
  injuries: Injury[];
  injury_notes: string;
  location: Location;
  equipment: Equipment[];
  goal: Goal;
  experience: Experience;
  minutes_per_week: number | null;
}

const DEFAULTS: TrainingProfile = {
  injuries: [],
  injury_notes: "",
  location: "home",
  equipment: ["bodyweight"],
  goal: "strength",
  experience: "beginner",
  minutes_per_week: 180,
};

const INJURY_OPTS: { id: Injury; label: string }[] = [
  { id: "lower_back", label: "Μέση" },
  { id: "knees", label: "Γόνατα" },
  { id: "shoulders", label: "Ώμοι" },
  { id: "neck", label: "Αυχένας" },
  { id: "wrists", label: "Καρποί" },
  { id: "ankles", label: "Αστράγαλοι" },
];

const EQUIPMENT_OPTS: { id: Equipment; label: string }[] = [
  { id: "bodyweight", label: "Βάρος Σώματος" },
  { id: "dumbbells", label: "Αλτήρες" },
  { id: "barbell", label: "Μπάρα" },
  { id: "bands", label: "Λάστιχα" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "machines", label: "Μηχανήματα" },
  { id: "pullup_bar", label: "Μονόζυγο" },
];

const LOCATION_LABELS: Record<Location, string> = {
  home: "Σπίτι", gym: "Γυμναστήριο", outdoor: "Εξωτερικός Χώρος",
};
const GOAL_LABELS: Record<Goal, string> = {
  strength: "Μυϊκή ενδυνάμωση", fat_loss: "Απώλεια λίπους",
  mobility: "Κινητικότητα/Αποκατάσταση", endurance: "Αντοχή",
};
const EXP_LABELS: Record<Experience, string> = {
  beginner: "Αρχάριος", intermediate: "Μέτριος", advanced: "Προχωρημένος",
};

export const AssessmentForm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<TrainingProfile>(DEFAULTS);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await supabase
        .from("training_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) {
        setData({
          injuries: (row.injuries ?? []) as Injury[],
          injury_notes: row.injury_notes ?? "",
          location: row.location as Location,
          equipment: (row.equipment ?? []) as Equipment[],
          goal: row.goal as Goal,
          experience: row.experience as Experience,
          minutes_per_week: row.minutes_per_week,
        });
        setHasProfile(true);
      } else {
        setEditing(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const toggle = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = async () => {
    if (!user) return;
    if (data.equipment.length === 0) {
      toast.error("Διάλεξε τουλάχιστον μία επιλογή εξοπλισμού");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("training_profile").upsert({
      user_id: user.id,
      injuries: data.injuries,
      injury_notes: data.injury_notes || null,
      location: data.location,
      equipment: data.equipment,
      goal: data.goal,
      experience: data.experience,
      minutes_per_week: data.minutes_per_week,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Αποθηκεύτηκε ✓");
    setHasProfile(true);
    setEditing(false);
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  // Read-only summary
  if (hasProfile && !editing) {
    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <CardTitle className="text-base">Προφίλ προπόνησης</CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Επεξεργασία
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Στόχος" value={GOAL_LABELS[data.goal]} />
            <Row label="Επίπεδο" value={EXP_LABELS[data.experience]} />
            <Row label="Τοποθεσία" value={LOCATION_LABELS[data.location]} />
            <Row label="Εξοπλισμός" value={data.equipment.map((e) => EQUIPMENT_OPTS.find((o) => o.id === e)?.label).join(", ") || "—"} />
            <Row label="Τραυματισμοί" value={data.injuries.length ? data.injuries.map((i) => INJURY_OPTS.find((o) => o.id === i)?.label).join(", ") : "Κανένας"} />
            {data.injury_notes && <Row label="Σημειώσεις" value={data.injury_notes} />}
            {data.minutes_per_week != null && <Row label="Λεπτά/εβδομάδα" value={`${data.minutes_per_week} min`} />}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit form
  return (
    <div className="space-y-4">
      {/* Health */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">1. Υγεία & Ασφάλεια</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs text-muted-foreground">Έχετε ενεργούς τραυματισμούς ή χρόνιους πόνους;</Label>
          <div className="grid grid-cols-2 gap-2">
            {INJURY_OPTS.map((o) => (
              <label key={o.id} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-accent/30">
                <Checkbox
                  checked={data.injuries.includes(o.id)}
                  onCheckedChange={() => setData({ ...data, injuries: toggle(data.injuries, o.id) })}
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs text-muted-foreground">Επιπλέον σημειώσεις (προαιρετικό)</Label>
            <Textarea
              id="notes"
              value={data.injury_notes}
              onChange={(e) => setData({ ...data, injury_notes: e.target.value })}
              placeholder="π.χ. χειρουργείο γόνατος 2023…"
              className="mt-1"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">2. Τοποθεσία & Εξοπλισμός</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Πού θα προπονείστε;</Label>
            <RadioGroup
              value={data.location}
              onValueChange={(v) => setData({ ...data, location: v as Location })}
              className="grid grid-cols-3 gap-2 mt-2"
            >
              {(Object.keys(LOCATION_LABELS) as Location[]).map((l) => (
                <label key={l} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-accent/30">
                  <RadioGroupItem value={l} />
                  <span className="text-sm">{LOCATION_LABELS[l]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Διαθέσιμος εξοπλισμός</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {EQUIPMENT_OPTS.map((o) => (
                <label key={o.id} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-accent/30">
                  <Checkbox
                    checked={data.equipment.includes(o.id)}
                    onCheckedChange={() => setData({ ...data, equipment: toggle(data.equipment, o.id) })}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">3. Στόχος</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup
            value={data.goal}
            onValueChange={(v) => setData({ ...data, goal: v as Goal })}
            className="grid grid-cols-2 gap-2"
          >
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <label key={g} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-accent/30">
                <RadioGroupItem value={g} />
                <span className="text-sm">{GOAL_LABELS[g]}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Experience + minutes */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">4. Εμπειρία & Διαθεσιμότητα</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Επίπεδο εμπειρίας</Label>
            <RadioGroup
              value={data.experience}
              onValueChange={(v) => setData({ ...data, experience: v as Experience })}
              className="grid grid-cols-3 gap-2 mt-2"
            >
              {(Object.keys(EXP_LABELS) as Experience[]).map((e) => (
                <label key={e} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-accent/30">
                  <RadioGroupItem value={e} />
                  <span className="text-sm">{EXP_LABELS[e]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="mins" className="text-xs text-muted-foreground">Διαθέσιμος χρόνος (λεπτά/εβδομάδα)</Label>
            <Input
              id="mins"
              type="number"
              inputMode="numeric"
              value={data.minutes_per_week ?? ""}
              onChange={(e) => setData({ ...data, minutes_per_week: e.target.value ? Number(e.target.value) : null })}
              className="mt-1"
              placeholder="180"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {hasProfile && (
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Άκυρο</Button>
        )}
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Αποθήκευση
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
