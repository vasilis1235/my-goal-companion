import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CoachChat } from "@/components/CoachChat";
import { BottomNav, Tab } from "@/components/BottomNav";
import { Dashboard } from "@/components/Dashboard";
import { NewMeasurementForm, NewMeasurementValues } from "@/components/NewMeasurementForm";
import { ReportView } from "@/components/ReportView";
import { HistoryList, HistoryEntry } from "@/components/HistoryList";
import { ACTIVITY_LABELS, ActivityLevel, Sex, UserProfile, Measurement, buildReport, bmr as calcBmr, amr as calcAmr, idealWeightKg } from "@/lib/calculations";

interface FullEntry extends HistoryEntry {
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

interface ProfileRow {
  display_name: string | null;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
}

interface GoalRow {
  target_weight_kg: number;
  target_date: string | null;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportEntryId, setReportEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: e }, { data: p }, { data: g }] = await Promise.all([
      supabase.from("weight_entries").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }),
      supabase.from("profiles").select("display_name, sex, age, height_cm, activity_level").eq("id", user.id).maybeSingle(),
      supabase.from("goals").select("target_weight_kg, target_date").eq("user_id", user.id).maybeSingle(),
    ]);
    setEntries((e ?? []) as unknown as FullEntry[]);
    setProfile((p ?? null) as ProfileRow | null);
    setGoal((g ?? null) as GoalRow | null);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const latest = entries[0]; // sorted desc
  const start = entries[entries.length - 1];

  const userProfile: UserProfile | null = useMemo(() => {
    if (!profile?.sex || !profile.age || !profile.height_cm) return null;
    return {
      sex: profile.sex,
      age: profile.age,
      height_cm: profile.height_cm,
      activity_level: profile.activity_level ?? "moderate",
    };
  }, [profile]);

  const targetWeight = useMemo(() => {
    if (goal) return Number(goal.target_weight_kg);
    if (userProfile) return Math.round(idealWeightKg(userProfile.height_cm) * 10) / 10;
    return null;
  }, [goal, userProfile]);

  const dashboardBmr = latest && userProfile
    ? Math.round(calcBmr(userProfile.sex, Number(latest.weight_kg), userProfile.height_cm, userProfile.age))
    : null;
  const dashboardAmr = dashboardBmr && userProfile
    ? Math.round(calcAmr(dashboardBmr, userProfile.activity_level))
    : null;

  const progress = (() => {
    if (!latest || !start || !targetWeight || start.id === latest.id) return 0;
    const total = Math.abs(Number(start.weight_kg) - targetWeight);
    const done = Math.abs(Number(start.weight_kg) - Number(latest.weight_kg));
    return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  })();

  const handleSaveMeasurement = async (v: NewMeasurementValues) => {
    if (!user) return;

    // Update profile
    await supabase.from("profiles").update({
      sex: v.sex,
      age: v.age,
      height_cm: v.height_cm,
      activity_level: v.activity_level,
    }).eq("id", user.id);

    // Insert entry
    const { error } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      recorded_at: new Date(v.recorded_at).toISOString(),
      weight_kg: v.weight_kg,
      body_fat_pct: v.body_fat_pct,
      water_pct: v.water_pct,
      muscle_pct: v.muscle_pct,
      bone_pct: v.bone_pct,
      waist_cm: v.waist_cm,
      hip_cm: v.hip_cm,
      chest_cm: v.chest_cm,
      shoulders_cm: v.shoulders_cm,
      biceps_cm: v.biceps_cm,
      forearm_cm: v.forearm_cm,
      wrist_cm: v.wrist_cm,
      thigh_cm: v.thigh_cm,
      knee_cm: v.knee_cm,
      calf_cm: v.calf_cm,
      ankle_cm: v.ankle_cm,
    });

    if (error) {
      toast.error("Σφάλμα: " + error.message);
      return;
    }

    // Auto-set goal if not exists
    if (!goal && v.height_cm) {
      const ideal = idealWeightKg(v.height_cm);
      await supabase.from("goals").upsert({
        user_id: user.id,
        target_weight_kg: Math.round(ideal * 10) / 10,
        source: "ai",
      }, { onConflict: "user_id" });
    }

    toast.success("Μέτρηση αποθηκεύτηκε!");
    await loadAll();
    setTab("home");
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("weight_entries").delete().eq("id", id);
    toast.success("Διαγράφηκε");
    loadAll();
  };

  const viewReport = (id: string) => {
    setReportEntryId(id);
    setTab("report");
  };

  const reportEntry = reportEntryId ? entries.find((e) => e.id === reportEntryId) : latest;

  // AI context
  const aiContext = (() => {
    const parts: string[] = [];
    if (profile?.display_name) parts.push(`Όνομα: ${profile.display_name}`);
    if (userProfile) {
      parts.push(`Φύλο: ${userProfile.sex === "male" ? "Άντρας" : "Γυναίκα"}`);
      parts.push(`Ηλικία: ${userProfile.age}`);
      parts.push(`Ύψος: ${userProfile.height_cm} cm`);
      parts.push(`Δραστηριότητα: ${ACTIVITY_LABELS[userProfile.activity_level]}`);
    }
    if (latest) {
      parts.push(`Τρέχον βάρος: ${latest.weight_kg} kg`);
      if (latest.body_fat_pct != null) parts.push(`Λίπος: ${latest.body_fat_pct}%`);
      if (latest.muscle_pct != null) parts.push(`Μύες: ${latest.muscle_pct}%`);
    }
    if (start && start.id !== latest?.id) parts.push(`Αρχικό βάρος: ${start.weight_kg} kg`);
    if (targetWeight) parts.push(`Στόχος βάρους: ${targetWeight} kg`);
    parts.push(`Συνολικές μετρήσεις: ${entries.length}`);
    return parts.join("\n");
  })();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Φόρτωση...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">{profile?.display_name ?? "Fitness Tracker"}</h1>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Έξοδος">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-5 pb-28">
        {tab === "home" && (
          <Dashboard
            displayName={profile?.display_name ?? ""}
            weight={latest ? Number(latest.weight_kg) : null}
            targetWeight={targetWeight}
            bodyFat={latest?.body_fat_pct != null ? Number(latest.body_fat_pct) : null}
            water={latest?.water_pct != null ? Number(latest.water_pct) : null}
            muscle={latest?.muscle_pct != null ? Number(latest.muscle_pct) : null}
            bone={latest?.bone_pct != null ? Number(latest.bone_pct) : null}
            bmr={dashboardBmr}
            amr={dashboardAmr}
            progress={progress}
          />
        )}

        {tab === "new" && (
          <NewMeasurementForm
            initial={{
              sex: profile?.sex ?? "male",
              age: profile?.age ?? null,
              height_cm: profile?.height_cm ?? null,
              activity_level: profile?.activity_level ?? "moderate",
            }}
            onSave={handleSaveMeasurement}
          />
        )}

        {tab === "report" && (
          reportEntry && userProfile ? (
            <ReportView
              profile={userProfile}
              report={buildReport(userProfile, reportEntry as Measurement)}
              dateLabel={format(new Date(reportEntry.recorded_at), "yyyy-MM-dd")}
              displayName={profile?.display_name ?? user?.email ?? ""}
            />
          ) : (
            <div className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">Δεν υπάρχει αναφορά διαθέσιμη.</p>
              <p className="text-sm text-muted-foreground">
                Χρειάζεσαι: πλήρες προφίλ (φύλο, ηλικία, ύψος) και τουλάχιστον 1 μέτρηση.
              </p>
              <Button onClick={() => setTab("new")}>Προσθήκη μέτρησης</Button>
            </div>
          )
        )}

        {tab === "history" && (
          <HistoryList
            entries={entries}
            onView={viewReport}
            onDelete={deleteEntry}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={(t) => { setTab(t); if (t !== "report") setReportEntryId(null); }} />
      <CoachChat context={aiContext} />
    </div>
  );
};

export default Index;
