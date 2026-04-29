// Exercise Library — Phase 3: wger free public API integration
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Dumbbell, AlertCircle, Filter } from "lucide-react";

// ---- wger API types (subset of /api/v2/exerciseinfo) ----
interface WgerCategory { id: number; name: string }
interface WgerMuscle { id: number; name: string; name_en: string | null }
interface WgerEquipment { id: number; name: string }
interface WgerImage { id: number; image: string; is_main: boolean }
interface WgerTranslation { id: number; language: number; name: string; description: string }
interface WgerExercise {
  id: number;
  uuid: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  images: WgerImage[];
  translations: WgerTranslation[];
}

// wger language IDs: 2=en, 1=de, 3=fr, 5=it (no el → fallback en)
const LANG_MAP: Record<string, number> = { en: 2, de: 1, fr: 3, it: 5, el: 2 };

// Map our equipment IDs → wger equipment names (lowercase contains match)
const EQUIPMENT_MAP: Record<string, string[]> = {
  bodyweight: ["none (bodyweight exercise)", "bodyweight"],
  dumbbells: ["dumbbell"],
  barbell: ["barbell", "ez-bar"],
  bands: ["resistance band"],
  kettlebells: ["kettlebell"],
  machines: ["machine"],
  pullup_bar: ["pull-up bar"],
};

// Goal → muscle category preference (wger category names)
const GOAL_CATEGORY: Record<string, string[]> = {
  strength: ["Chest", "Back", "Legs", "Arms", "Shoulders"],
  fat_loss: ["Cardio", "Legs", "Abs"],
  mobility: ["Calves", "Abs"],
  endurance: ["Cardio", "Legs"],
};

interface TrainingProfile {
  injuries: string[];
  equipment: string[];
  goal: string;
  experience: string;
}

const INJURY_AVOID: Record<string, string[]> = {
  lower_back: ["Deadlift", "Good Morning", "Bent Over"],
  knees: ["Squat", "Lunge", "Jump"],
  shoulders: ["Overhead Press", "Bench Press", "Dip"],
  neck: ["Shrug", "Upright Row"],
  wrists: ["Push-up", "Plank"],
  ankles: ["Jump", "Sprint"],
};

const WGER_BASE = "https://wger.de/api/v2";

export function ExerciseLibrary() {
  const { user } = useAuth();
  const { lang, t } = useAppPrefs();
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [exercises, setExercises] = useState<WgerExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterEquip, setFilterEquip] = useState<string>("all");
  const [smartFilter, setSmartFilter] = useState(true);

  // Load training profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("training_profile")
      .select("injuries, equipment, goal, experience")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as TrainingProfile | null));
  }, [user]);

  // Fetch exercises from wger (one-shot, paginated)
  useEffect(() => {
    let cancelled = false;
    const langId = LANG_MAP[lang] ?? 2;
    setLoading(true);
    setError(null);
    fetch(`${WGER_BASE}/exerciseinfo/?language=${langId}&limit=120&status=2`)
      .then((r) => {
        if (!r.ok) throw new Error(`wger ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const results: WgerExercise[] = (data.results ?? []).filter(
          (e: WgerExercise) => e.translations.some((tr) => tr.language === langId) || e.translations.length > 0
        );
        setExercises(results);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Failed to load exercises");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    const langId = LANG_MAP[lang] ?? 2;
    let list = exercises;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const tr = e.translations.find((x) => x.language === langId) ?? e.translations[0];
        return tr?.name?.toLowerCase().includes(q);
      });
    }

    // Equipment filter (manual override)
    if (filterEquip !== "all") {
      const wgerNames = EQUIPMENT_MAP[filterEquip] ?? [];
      list = list.filter((e) =>
        e.equipment.some((eq) => wgerNames.some((n) => eq.name.toLowerCase().includes(n.toLowerCase())))
      );
    }

    // Smart filter using assessment profile
    if (smartFilter && profile) {
      // Equipment match (any one of user's equipment)
      if (profile.equipment.length > 0 && filterEquip === "all") {
        const allowed = profile.equipment.flatMap((id) => EQUIPMENT_MAP[id] ?? []);
        if (allowed.length > 0) {
          list = list.filter((e) => {
            if (e.equipment.length === 0) return profile.equipment.includes("bodyweight");
            return e.equipment.some((eq) => allowed.some((n) => eq.name.toLowerCase().includes(n.toLowerCase())));
          });
        }
      }

      // Injury exclusion
      if (profile.injuries.length > 0) {
        const avoidPatterns = profile.injuries.flatMap((inj) => INJURY_AVOID[inj] ?? []);
        list = list.filter((e) => {
          const tr = e.translations.find((x) => x.language === langId) ?? e.translations[0];
          const name = tr?.name ?? "";
          return !avoidPatterns.some((p) => name.toLowerCase().includes(p.toLowerCase()));
        });
      }

      // Goal-based sort (preferred categories first)
      const preferred = GOAL_CATEGORY[profile.goal] ?? [];
      if (preferred.length > 0) {
        list = [...list].sort((a, b) => {
          const ai = preferred.indexOf(a.category.name);
          const bi = preferred.indexOf(b.category.name);
          const aRank = ai === -1 ? 999 : ai;
          const bRank = bi === -1 ? 999 : bi;
          return aRank - bRank;
        });
      }
    }

    return list;
  }, [exercises, search, filterEquip, smartFilter, profile, lang]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("ex.lib.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="font-semibold">{t("ex.lib.error")}</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const langId = LANG_MAP[lang] ?? 2;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ex.lib.search")}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={filterEquip} onValueChange={setFilterEquip}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ex.lib.allEquip")}</SelectItem>
                <SelectItem value="bodyweight">{t("ex.eq.bodyweight")}</SelectItem>
                <SelectItem value="dumbbells">{t("ex.eq.dumbbells")}</SelectItem>
                <SelectItem value="barbell">{t("ex.eq.barbell")}</SelectItem>
                <SelectItem value="bands">{t("ex.eq.bands")}</SelectItem>
                <SelectItem value="kettlebells">{t("ex.eq.kettlebells")}</SelectItem>
                <SelectItem value="machines">{t("ex.eq.machines")}</SelectItem>
                <SelectItem value="pullup_bar">{t("ex.eq.pullup_bar")}</SelectItem>
              </SelectContent>
            </Select>
            {profile && (
              <Button
                variant={smartFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setSmartFilter((v) => !v)}
              >
                <Filter className="w-3.5 h-3.5 mr-1" />
                {t("ex.lib.smart")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {t("ex.lib.results")}
            {!profile && " · " + t("ex.lib.noProfile")}
          </p>
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {t("ex.lib.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.slice(0, 60).map((ex) => {
            const tr = ex.translations.find((x) => x.language === langId) ?? ex.translations[0];
            const name = tr?.name ?? `Exercise #${ex.id}`;
            const mainImg = ex.images.find((i) => i.is_main) ?? ex.images[0];
            return (
              <Card key={ex.id} className="overflow-hidden">
                <CardContent className="p-3 flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {mainImg ? (
                      <img src={mainImg.image} alt={name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Dumbbell className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-tight">{name}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {ex.category.name}
                      </Badge>
                      {ex.equipment.slice(0, 2).map((eq) => (
                        <Badge key={eq.id} variant="outline" className="text-[10px] py-0">
                          {eq.name}
                        </Badge>
                      ))}
                      {ex.muscles.slice(0, 2).map((m) => (
                        <Badge key={m.id} variant="outline" className="text-[10px] py-0">
                          {m.name_en ?? m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
