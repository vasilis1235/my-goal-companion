import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CoachChat } from "@/components/CoachChat";
import { BottomNav, Tab } from "@/components/BottomNav";
import { Dashboard } from "@/components/Dashboard";
import { NewMeasurementForm, NewMeasurementValues } from "@/components/NewMeasurementForm";
import { ReportView } from "@/components/ReportView";
import { HistoryList, HistoryEntry, NutritionEntry } from "@/components/HistoryList";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { SideMenu } from "@/components/SideMenu";
import { ProgressPage } from "@/components/ProgressPage";
import { DietPage } from "@/components/DietPage";
import {
  ACTIVITY_LABELS, ActivityLevel, Sex, UserProfile, Measurement,
  buildReport, bmr as calcBmr, amr as calcAmr, idealWeightKg, bmi as calcBmi,
  idealBodyFatPct, idealWaterPct, idealMusclePct, idealBonePct,
} from "@/lib/calculations";
import { useAppPrefs } from "@/contexts/AppPreferences";

interface FullEntry extends HistoryEntry {
  weight_kg: number;
  body_fat_pct: number | null; water_pct: number | null; muscle_pct: number | null; bone_pct: number | null;
  waist_cm: number | null; hip_cm: number | null; chest_cm: number | null; shoulders_cm: number | null;
  biceps_cm: number | null; forearm_cm: number | null; wrist_cm: number | null;
  thigh_cm: number | null; knee_cm: number | null; calf_cm: number | null; ankle_cm: number | null;
}

interface ProfileRow {
  display_name: string | null;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  avatar_url: string | null;
  language: string | null;
  units: string | null;
  onboarding_completed: boolean | null;
}

interface GoalRow { target_weight_kg: number; target_date: string | null; }

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, hydratePrefs } = useAppPrefs();
  const [tab, setTab] = useState<Tab>("home");
  const [showNewForm, setShowNewForm] = useState(false);
  const [entries, setEntries] = useState<FullEntry[]>([]);
  const [nutrition, setNutrition] = useState<NutritionEntry[]>([]);
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
    const [{ data: e }, { data: p }, { data: g }, { data: n }] = await Promise.all([
      supabase.from("weight_entries").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("goals").select("target_weight_kg, target_date").eq("user_id", user.id).maybeSingle(),
      supabase.from("nutrition_entries").select("id, recorded_at, intake_kcal, activity_kcal, bmr_kcal, amr_kcal").eq("user_id", user.id).order("recorded_at", { ascending: false }),
    ]);
    setEntries((e ?? []) as unknown as FullEntry[]);
    setNutrition((n ?? []) as unknown as NutritionEntry[]);
    setProfile((p ?? null) as ProfileRow | null);
    setGoal((g ?? null) as GoalRow | null);
    if (p) hydratePrefs({ language: (p as any).language, units: (p as any).units });
    setLoading(false);
  };

  useEffect(() => { if (user) loadAll(); }, [user]);

  const latest = entries[0];
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
  const dashboardBmi = latest && userProfile
    ? calcBmi(Number(latest.weight_kg), userProfile.height_cm)
    : null;

  const progress = (() => {
    if (!latest || !start || !targetWeight || start.id === latest.id) return 0;
    const total = Math.abs(Number(start.weight_kg) - targetWeight);
    const done = Math.abs(Number(start.weight_kg) - Number(latest.weight_kg));
    return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  })();

  const handleSaveMeasurement = async (v: NewMeasurementValues) => {
    if (!user) return;
    const { error } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      recorded_at: new Date(v.recorded_at).toISOString(),
      weight_kg: v.weight_kg,
      body_fat_pct: v.body_fat_pct, water_pct: v.water_pct, muscle_pct: v.muscle_pct, bone_pct: v.bone_pct,
      waist_cm: v.waist_cm, hip_cm: v.hip_cm, chest_cm: v.chest_cm, shoulders_cm: v.shoulders_cm,
      biceps_cm: v.biceps_cm, forearm_cm: v.forearm_cm, wrist_cm: v.wrist_cm,
      thigh_cm: v.thigh_cm, knee_cm: v.knee_cm, calf_cm: v.calf_cm, ankle_cm: v.ankle_cm,
      bmr_kcal: v.bmr_override, amr_kcal: v.amr_override,
    });
    if (error) { toast.error(error.message); return; }

    if (!goal && profile?.height_cm) {
      const ideal = idealWeightKg(profile.height_cm);
      await supabase.from("goals").upsert({
        user_id: user.id, target_weight_kg: Math.round(ideal * 10) / 10, source: "ai",
      }, { onConflict: "user_id" });
    }

    toast.success(t("common.save") + " ✓");
    setShowNewForm(false);
    await loadAll();
    setTab("home");
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("weight_entries").delete().eq("id", id);
    toast.success(t("common.delete") + " ✓");
    loadAll();
  };

  const deleteNutrition = async (id: string) => {
    await supabase.from("nutrition_entries").delete().eq("id", id);
    toast.success(t("common.delete") + " ✓");
    loadAll();
  };

  const viewReport = (id: string) => { setReportEntryId(id); setTab("report"); };

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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  const needsOnboarding = !!profile && !profile.onboarding_completed;

  // Progress page targets
  const progressIdealFat = userProfile ? idealBodyFatPct(userProfile.sex, userProfile.age) : null;
  const progressIdealWater = userProfile ? idealWaterPct(userProfile.sex) : null;
  const progressIdealMuscle = userProfile ? idealMusclePct(userProfile.sex) : null;
  const progressIdealBone = latest ? idealBonePct(Number(latest.weight_kg)) : 15;

  // Diet latest
  const dietLatest = latest ? {
    weight_kg: Number(latest.weight_kg),
    body_fat_pct: latest.body_fat_pct != null ? Number(latest.body_fat_pct) : null,
    muscle_pct: latest.muscle_pct != null ? Number(latest.muscle_pct) : null,
    water_pct: latest.water_pct != null ? Number(latest.water_pct) : null,
    bone_pct: latest.bone_pct != null ? Number(latest.bone_pct) : null,
  } : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding wizard (forced) */}
      {user && needsOnboarding && (
        <OnboardingDialog
          open={true}
          userId={user.id}
          initialName={profile?.display_name ?? user.email?.split("@")[0]}
          onComplete={() => loadAll()}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-start">
          <SideMenu
            displayName={profile?.display_name ?? ""}
            email={user?.email ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
            onOpenProfile={() => navigate("/profile")}
            onOpenSettings={() => navigate("/settings")}
            onLogout={signOut}
          />
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-5 pb-28">
        {tab === "home" && (
          <Dashboard
            weight={latest ? Number(latest.weight_kg) : null}
            targetWeight={targetWeight}
            bodyFat={latest?.body_fat_pct != null ? Number(latest.body_fat_pct) : null}
            water={latest?.water_pct != null ? Number(latest.water_pct) : null}
            muscle={latest?.muscle_pct != null ? Number(latest.muscle_pct) : null}
            bone={latest?.bone_pct != null ? Number(latest.bone_pct) : null}
            bmr={dashboardBmr}
            amr={dashboardAmr}
            bmi={dashboardBmi}
            progress={progress}
          />
        )}

        {tab === "report" && (
          showNewForm ? (
            <NewMeasurementForm
              initial={{
                sex: profile?.sex ?? "male",
                age: profile?.age ?? null,
                height_cm: profile?.height_cm ?? null,
                activity_level: profile?.activity_level ?? "moderate",
              }}
              onSave={handleSaveMeasurement}
            />
          ) : reportEntry && userProfile ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowNewForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> {t("report.add")}
                </Button>
              </div>
              <ReportView
                profile={userProfile}
                report={buildReport(userProfile, reportEntry as Measurement)}
                dateLabel={format(new Date(reportEntry.recorded_at), "yyyy-MM-dd")}
                displayName={profile?.display_name ?? user?.email ?? ""}
              />
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">{t("report.notAvailable")}</p>
              <p className="text-sm text-muted-foreground">{t("report.needMore")}</p>
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> {t("report.add")}
              </Button>
            </div>
          )
        )}

        {tab === "progress" && (
          <ProgressPage
            entries={entries.map((e) => ({
              recorded_at: e.recorded_at,
              weight_kg: Number(e.weight_kg),
              body_fat_pct: e.body_fat_pct != null ? Number(e.body_fat_pct) : null,
              water_pct: e.water_pct != null ? Number(e.water_pct) : null,
              muscle_pct: e.muscle_pct != null ? Number(e.muscle_pct) : null,
              bone_pct: e.bone_pct != null ? Number(e.bone_pct) : null,
            }))}
            targetWeight={targetWeight}
            idealBodyFat={progressIdealFat}
            idealWater={progressIdealWater}
            idealMuscle={progressIdealMuscle}
            idealBone={progressIdealBone}
          />
        )}

        {tab === "diet" && (
          <DietPage
            latest={dietLatest}
            bmr={dashboardBmr}
            idealWeightKg={userProfile ? idealWeightKg(userProfile.height_cm) : null}
            targetWeightKg={targetWeight}
            displayName={profile?.display_name ?? user?.email ?? ""}
            onSaved={() => loadAll()}
          />
        )}

        {tab === "history" && (
          <HistoryList
            entries={entries}
            nutrition={nutrition}
            onView={viewReport}
            onDelete={deleteEntry}
            onDeleteNutrition={deleteNutrition}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={(newTab) => {
        setTab(newTab);
        setShowNewForm(false);
        if (newTab !== "report") setReportEntryId(null);
      }} />
      <CoachChat context={aiContext} />
    </div>
  );
};

export default Index;
