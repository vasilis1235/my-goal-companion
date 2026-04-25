import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Scale, Target, LogOut, Plus, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { CoachChat } from "@/components/CoachChat";

interface WeightEntry {
  id: string;
  weight_kg: number;
  recorded_at: string;
  note: string | null;
}

interface Goal {
  id: string;
  target_weight_kg: number;
  target_date: string | null;
  source: string;
}

interface Profile {
  display_name: string | null;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [weightInput, setWeightInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const [goalInput, setGoalInput] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);

  const [heightInput, setHeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: e }, { data: g }, { data: p }] = await Promise.all([
      supabase.from("weight_entries").select("*").eq("user_id", user.id).order("recorded_at", { ascending: true }),
      supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("display_name, height_cm, age, sex").eq("id", user.id).maybeSingle(),
    ]);
    setEntries(e ?? []);
    setGoal(g ?? null);
    setProfile(p ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const addEntry = async () => {
    const w = parseFloat(weightInput.replace(",", "."));
    if (!user || isNaN(w) || w <= 0) {
      toast.error("Δώσε έγκυρο βάρος");
      return;
    }
    const { error } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      weight_kg: w,
      note: noteInput || null,
    });
    if (error) {
      toast.error("Σφάλμα: " + error.message);
    } else {
      toast.success("Καταγράφηκε!");
      setWeightInput("");
      setNoteInput("");
      setAddOpen(false);
      loadAll();
    }
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("weight_entries").delete().eq("id", id);
    loadAll();
  };

  const saveGoal = async () => {
    const w = parseFloat(goalInput.replace(",", "."));
    if (!user || isNaN(w) || w <= 0) {
      toast.error("Δώσε έγκυρο βάρος στόχο");
      return;
    }
    const payload = {
      user_id: user.id,
      target_weight_kg: w,
      target_date: goalDate || null,
      source: "manual",
    };
    const { error } = await supabase.from("goals").upsert(payload, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("Στόχος αποθηκεύτηκε!");
      setGoalOpen(false);
      loadAll();
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const h = heightInput ? parseFloat(heightInput) : null;
    const a = ageInput ? parseInt(ageInput) : null;
    const { error } = await supabase
      .from("profiles")
      .update({ height_cm: h, age: a })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Ενημερώθηκε!");
      setProfileOpen(false);
      loadAll();
    }
  };

  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const start = entries[0];

  const chartData = entries.map((e) => ({
    date: format(new Date(e.recorded_at), "dd MMM", { locale: el }),
    kg: Number(e.weight_kg),
  }));

  let progress = 0;
  let trend: "up" | "down" | "flat" = "flat";
  if (latest && previous) {
    if (latest.weight_kg < previous.weight_kg) trend = "down";
    else if (latest.weight_kg > previous.weight_kg) trend = "up";
  }
  if (goal && start && latest) {
    const total = Math.abs(Number(start.weight_kg) - Number(goal.target_weight_kg));
    const done = Math.abs(Number(start.weight_kg) - Number(latest.weight_kg));
    progress = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  }

  const aiContext = (() => {
    const parts: string[] = [];
    if (profile?.display_name) parts.push(`Όνομα: ${profile.display_name}`);
    if (profile?.height_cm) parts.push(`Ύψος: ${profile.height_cm} cm`);
    if (profile?.age) parts.push(`Ηλικία: ${profile.age}`);
    if (latest) parts.push(`Τρέχον βάρος: ${latest.weight_kg} kg`);
    if (start && start.id !== latest?.id) parts.push(`Αρχικό βάρος: ${start.weight_kg} kg`);
    if (goal) parts.push(`Στόχος: ${goal.target_weight_kg} kg${goal.target_date ? ` έως ${goal.target_date}` : ""}`);
    parts.push(`Συνολικές καταγραφές: ${entries.length}`);
    return parts.join("\n");
  })();

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Φόρτωση...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">WeightCoach</h1>
              <p className="text-xs text-muted-foreground">Γεια σου, {profile?.display_name ?? "φίλε"}!</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Έξοδος">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-3xl pb-32">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Τρέχον βάρος</CardDescription>
              <CardTitle className="text-2xl flex items-baseline gap-1">
                {latest ? (
                  <>
                    {Number(latest.weight_kg).toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground">kg</span>
                    {trend === "down" && <TrendingDown className="w-4 h-4 text-primary ml-1" />}
                    {trend === "up" && <TrendingUp className="w-4 h-4 text-destructive ml-1" />}
                    {trend === "flat" && <Minus className="w-4 h-4 text-muted-foreground ml-1" />}
                  </>
                ) : (
                  <span className="text-base text-muted-foreground">—</span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Στόχος</CardDescription>
              <CardTitle className="text-2xl flex items-baseline gap-1">
                {goal ? (
                  <>
                    {Number(goal.target_weight_kg).toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground">kg</span>
                  </>
                ) : (
                  <span className="text-base text-muted-foreground">Όρισε</span>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Progress */}
        {goal && start && latest && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Πρόοδος προς στόχο</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Πορεία βάρους</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 1 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    {goal && <ReferenceLine y={Number(goal.target_weight_kg)} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: "Στόχος", fontSize: 10, fill: "hsl(var(--primary))" }} />}
                    <Line type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Πρόσθεσε τουλάχιστον 2 καταγραφές για να δεις τη γραφική.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))]">
                <Plus className="w-4 h-4 mr-1" /> Βάρος
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέα καταγραφή</DialogTitle>
                <DialogDescription>Πρόσθεσε το τρέχον βάρος σου.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Βάρος (kg)</Label>
                  <Input type="number" step="0.1" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="π.χ. 75.5" autoFocus />
                </div>
                <div>
                  <Label>Σημείωση (προαιρετικό)</Label>
                  <Input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="π.χ. πρωί, πριν το πρωινό" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addEntry}>Αποθήκευση</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={goalOpen} onOpenChange={(o) => { setGoalOpen(o); if (o && goal) { setGoalInput(String(goal.target_weight_kg)); setGoalDate(goal.target_date ?? ""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="w-4 h-4 mr-1" /> Στόχος
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Στόχος βάρους</DialogTitle>
                <DialogDescription>Όρισε στόχο ή ζήτα από τον AI πρόταση.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Στόχος (kg)</Label>
                  <Input type="number" step="0.1" inputMode="decimal" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="π.χ. 70" />
                </div>
                <div>
                  <Label>Ημερομηνία (προαιρετικό)</Label>
                  <Input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Άνοιξε το AI chat (κάτω δεξιά) και ζήτα: «πρότεινέ μου στόχο».
                </p>
              </div>
              <DialogFooter>
                <Button onClick={saveGoal}>Αποθήκευση</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={profileOpen} onOpenChange={(o) => { setProfileOpen(o); if (o) { setHeightInput(profile?.height_cm ? String(profile.height_cm) : ""); setAgeInput(profile?.age ? String(profile.age) : ""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline">Προφίλ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Τα στοιχεία σου</DialogTitle>
                <DialogDescription>Βοηθούν τον AI να σου δίνει καλύτερες προτάσεις.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Ύψος (cm)</Label>
                  <Input type="number" inputMode="numeric" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} placeholder="π.χ. 175" />
                </div>
                <div>
                  <Label>Ηλικία</Label>
                  <Input type="number" inputMode="numeric" value={ageInput} onChange={(e) => setAgeInput(e.target.value)} placeholder="π.χ. 30" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveProfile}>Αποθήκευση</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ιστορικό</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Καμία καταγραφή ακόμη. Πάτα «Βάρος» για να ξεκινήσεις!
              </p>
            ) : (
              <ul className="divide-y">
                {[...entries].reverse().map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-sm">
                        {Number(e.weight_kg).toFixed(1)} kg
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(e.recorded_at), "dd MMM yyyy, HH:mm", { locale: el })}
                        {e.note && ` · ${e.note}`}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteEntry(e.id)} aria-label="Διαγραφή">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      <CoachChat context={aiContext} />
    </div>
  );
};

export default Index;
