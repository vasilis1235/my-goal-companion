import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  Pencil,
  Sun,
  Sandwich,
  Moon,
  Cookie,
  Info,
  Settings as SettingsIcon,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { defaultTargetsFromAMR, mergeTargets, MealType, MEAL_TYPES, resolveTarget, buildEngineFromAMR } from "@/lib/macroTargets";
import { NUTRIENT_META, NUTRIENT_INFO, NutrientKey, MACRO_KEYS, MICRO_KEYS } from "@/lib/nutrientInfo";
import { FlaskConical, AlertTriangle } from "lucide-react";

interface FoodResult {
  source: "off" | "usda";
  id: string;
  external_id: string;
  name: string;
  brand?: string;
  serving_size_g?: number | null;
  kcal_per_100g: number | null;
  protein_g_100g?: number | null;
  carbs_g_100g?: number | null;
  fat_g_100g?: number | null;
  saturated_fat_g_100g?: number | null;
  sugars_g_100g?: number | null;
  fiber_g_100g?: number | null;
  sodium_mg_100g?: number | null;
  potassium_mg_100g?: number | null;
  calcium_mg_100g?: number | null;
  iron_mg_100g?: number | null;
  vitamin_c_mg_100g?: number | null;
  vitamin_a_iu_100g?: number | null;
  cholesterol_mg_100g?: number | null;
}

interface LogItem {
  id: string;
  user_id: string;
  logged_date: string;
  logged_at: string;
  meal_type: MealType;
  name: string;
  brand: string | null;
  source: string | null;
  external_id: string | null;
  grams: number;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  sugars_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  vitamin_a_iu: number | null;
  cholesterol_mg: number | null;
  note: string | null;
}

interface Props {
  bmr: number | null;
  amr: number | null;
  profile?: {
    sex: "male" | "female" | null;
    age: number | null;
    height_cm: number | null;
    activity_level?: string | null;
    pregnancy?: boolean;
    lactation?: boolean;
  } | null;
  weightKg?: number | null;
  onSaved?: () => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const MEAL_ICON: Record<MealType, typeof Sun> = {
  breakfast: Sun,
  lunch: Sandwich,
  dinner: Moon,
  snack: Cookie,
};

const scale = (per100: number | null | undefined, grams: number): number | null =>
  per100 == null ? null : Math.round(((per100 * grams) / 100) * 100) / 100;

export function FoodTracker({ amr, profile, weightKg, onSaved }: Props) {
  const { user } = useAuth();
  const { t } = useAppPrefs();

  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualTargets, setManualTargets] = useState<any>(null);

  // Search
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [portionGrams, setPortionGrams] = useState("100");
  const [mealType, setMealType] = useState<MealType>("snack");

  // Manual
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [manualGrams, setManualGrams] = useState("");
  const [manualMeal, setManualMeal] = useState<MealType>("snack");

  // Edit
  const [editing, setEditing] = useState<LogItem | null>(null);
  const [editGrams, setEditGrams] = useState("");

  // Detail
  const [detail, setDetail] = useState<LogItem | null>(null);

  // Nutrient info dialog (Cronometer-style)
  const [infoKey, setInfoKey] = useState<NutrientKey | null>(null);

  // Targets manual-override dialog
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [targetsForm, setTargetsForm] = useState<Record<string, string>>({});

  // DRI breakdown dialog
  const [driOpen, setDriOpen] = useState(false);

  const targets = useMemo(() => mergeTargets(amr, manualTargets), [amr, manualTargets]);

  const targetFor = (k: NutrientKey) => resolveTarget(k, amr, manualTargets, profile ?? null, weightKg ?? null);
  const totalFor = (k: NutrientKey) =>
    items.reduce((s, i) => s + (Number((i as any)[NUTRIENT_META[k].field]) || 0), 0);
  const isManual = (k: NutrientKey) =>
    manualTargets && (manualTargets as any)[k] != null && Number((manualTargets as any)[k]) > 0;

  // Build full USDA DRI breakdown for current user (used in DRI dialog).
  const driEngine = useMemo(
    () => buildEngineFromAMR(amr, profile ?? null, weightKg ?? null),
    [amr, profile, weightKg]
  );

  // Load today's items + targets
  const loadDay = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: rows }, { data: tg }] = await Promise.all([
      supabase
        .from("food_log_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_date", todayKey())
        .order("logged_at", { ascending: true }),
      supabase
        .from("nutrition_targets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setItems((rows ?? []) as LogItem[]);
    setManualTargets(tg ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (searchQ.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      setSearchOpen(true);
      try {
        const { data, error } = await supabase.functions.invoke("food-search", {
          body: { query: searchQ.trim() },
        });
        if (error) throw error;
        setSearchResults((data?.results ?? []) as FoodResult[]);
      } catch (e) {
        console.error("food-search error", e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQ]);

  // Totals
  const totals = useMemo(() => {
    const sum = (k: keyof LogItem) =>
      items.reduce((s, i) => s + (Number(i[k]) || 0), 0);
    return {
      kcal: sum("kcal"),
      protein_g: sum("protein_g"),
      carbs_g: sum("carbs_g"),
      fat_g: sum("fat_g"),
      fiber_g: sum("fiber_g"),
      sodium_mg: sum("sodium_mg"),
      sugars_g: sum("sugars_g"),
      saturated_fat_g: sum("saturated_fat_g"),
      potassium_mg: sum("potassium_mg"),
      calcium_mg: sum("calcium_mg"),
      iron_mg: sum("iron_mg"),
      vitamin_c_mg: sum("vitamin_c_mg"),
      vitamin_a_iu: sum("vitamin_a_iu"),
      cholesterol_mg: sum("cholesterol_mg"),
    };
  }, [items]);

  const pct = (v: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0;

  // Pick food → open add dialog
  const pickFood = (f: FoodResult) => {
    setSelected(f);
    setPortionGrams(String(f.serving_size_g ?? 100));
    setMealType(guessMealByTime());
    setSearchOpen(false);
    setAddOpen(true);
  };

  const guessMealByTime = (): MealType => {
    const h = new Date().getHours();
    if (h < 11) return "breakfast";
    if (h < 16) return "lunch";
    if (h < 21) return "dinner";
    return "snack";
  };

  // Add from API
  const addFromSelected = async () => {
    if (!selected || !user) return;
    const g = parseFloat(portionGrams);
    if (!Number.isFinite(g) || g <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    const kcal100 = selected.kcal_per_100g ?? 0;
    const payload = {
      user_id: user.id,
      logged_date: todayKey(),
      meal_type: mealType,
      name: selected.name,
      brand: selected.brand ?? null,
      source: selected.source,
      external_id: selected.external_id,
      grams: g,
      kcal: Math.round((kcal100 * g) / 100),
      protein_g: scale(selected.protein_g_100g, g),
      carbs_g: scale(selected.carbs_g_100g, g),
      fat_g: scale(selected.fat_g_100g, g),
      saturated_fat_g: scale(selected.saturated_fat_g_100g, g),
      sugars_g: scale(selected.sugars_g_100g, g),
      fiber_g: scale(selected.fiber_g_100g, g),
      sodium_mg: scale(selected.sodium_mg_100g, g),
      potassium_mg: scale(selected.potassium_mg_100g, g),
      calcium_mg: scale(selected.calcium_mg_100g, g),
      iron_mg: scale(selected.iron_mg_100g, g),
      vitamin_c_mg: scale(selected.vitamin_c_mg_100g, g),
      vitamin_a_iu: scale(selected.vitamin_a_iu_100g, g),
      cholesterol_mg: scale(selected.cholesterol_mg_100g, g),
    };

    const { data, error } = await supabase
      .from("food_log_items")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((arr) => [...arr, data as LogItem]);
    toast.success(t("ft.added"));
    setAddOpen(false);
    setSelected(null);
    setSearchQ("");
    setSearchResults([]);
    onSaved?.();
  };

  const addManual = async () => {
    if (!user) return;
    const k = parseFloat(manualKcal);
    const g = parseFloat(manualGrams) || 0;
    if (!manualName.trim() || !Number.isFinite(k) || k <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    const { data, error } = await supabase
      .from("food_log_items")
      .insert({
        user_id: user.id,
        logged_date: todayKey(),
        meal_type: manualMeal,
        name: manualName.trim(),
        grams: g,
        kcal: Math.round(k),
        source: "manual",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((arr) => [...arr, data as LogItem]);
    setManualName("");
    setManualKcal("");
    setManualGrams("");
    toast.success(t("ft.added"));
    onSaved?.();
  };

  const removeItem = async (id: string) => {
    const prev = items;
    setItems((arr) => arr.filter((i) => i.id !== id));
    const { error } = await supabase.from("food_log_items").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.error(error.message);
      return;
    }
    toast.success(t("ft.deleted"));
    onSaved?.();
  };

  const startEdit = (it: LogItem) => {
    setEditing(it);
    setEditGrams(String(it.grams));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const newG = parseFloat(editGrams);
    if (!Number.isFinite(newG) || newG <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    const ratio = editing.grams > 0 ? newG / editing.grams : 1;
    const updated: Partial<LogItem> = {
      grams: newG,
      kcal: Math.round(editing.kcal * ratio),
      protein_g: editing.protein_g != null ? Math.round(editing.protein_g * ratio * 100) / 100 : null,
      carbs_g: editing.carbs_g != null ? Math.round(editing.carbs_g * ratio * 100) / 100 : null,
      fat_g: editing.fat_g != null ? Math.round(editing.fat_g * ratio * 100) / 100 : null,
      saturated_fat_g: editing.saturated_fat_g != null ? Math.round(editing.saturated_fat_g * ratio * 100) / 100 : null,
      sugars_g: editing.sugars_g != null ? Math.round(editing.sugars_g * ratio * 100) / 100 : null,
      fiber_g: editing.fiber_g != null ? Math.round(editing.fiber_g * ratio * 100) / 100 : null,
      sodium_mg: editing.sodium_mg != null ? Math.round(editing.sodium_mg * ratio * 100) / 100 : null,
      potassium_mg: editing.potassium_mg != null ? Math.round(editing.potassium_mg * ratio * 100) / 100 : null,
      calcium_mg: editing.calcium_mg != null ? Math.round(editing.calcium_mg * ratio * 100) / 100 : null,
      iron_mg: editing.iron_mg != null ? Math.round(editing.iron_mg * ratio * 100) / 100 : null,
      vitamin_c_mg: editing.vitamin_c_mg != null ? Math.round(editing.vitamin_c_mg * ratio * 100) / 100 : null,
      vitamin_a_iu: editing.vitamin_a_iu != null ? Math.round(editing.vitamin_a_iu * ratio * 100) / 100 : null,
      cholesterol_mg: editing.cholesterol_mg != null ? Math.round(editing.cholesterol_mg * ratio * 100) / 100 : null,
    };
    const { data, error } = await supabase
      .from("food_log_items")
      .update(updated)
      .eq("id", editing.id)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((arr) => arr.map((i) => (i.id === editing.id ? (data as LogItem) : i)));
    setEditing(null);
    onSaved?.();
  };

  // Open targets dialog with current values pre-filled (manual overrides only; placeholders show auto)
  const openTargets = () => {
    const f: Record<string, string> = {};
    if (manualTargets) {
      Object.keys(manualTargets).forEach((k) => {
        const v = (manualTargets as any)[k];
        if (typeof v === "number") f[k] = String(v);
      });
    }
    setTargetsForm(f);
    setTargetsOpen(true);
  };

  const saveTargets = async () => {
    if (!user) return;
    const payload: any = { user_id: user.id };
    const keys = ["kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "water_ml",
      "saturated_fat_g", "sugars_g", "cholesterol_mg",
      "sodium_mg", "potassium_mg", "calcium_mg", "iron_mg", "vitamin_c_mg", "vitamin_a_iu"];
    keys.forEach((k) => {
      const raw = targetsForm[k];
      const n = raw == null || raw === "" ? null : parseFloat(raw);
      payload[k] = n != null && Number.isFinite(n) && n > 0 ? n : null;
    });
    const { data, error } = await supabase
      .from("nutrition_targets")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setManualTargets(data);
    setTargetsOpen(false);
    toast.success(t("ft.targets.saved"));
  };

  const resetTargets = async () => {
    if (!user) return;
    const { error } = await supabase.from("nutrition_targets").delete().eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    setManualTargets(null);
    setTargetsForm({});
    toast.success(t("ft.targets.cleared"));
  };

  // Group by meal type
  const grouped = useMemo(() => {
    const g: Record<MealType, LogItem[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    items.forEach((i) => g[i.meal_type as MealType]?.push(i));
    return g;
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Day summary — Cronometer-style: clickable nutrients */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle className="text-base">{t("ft.today")}</CardTitle>
          <div className="flex gap-1">
            {driEngine && (
              <Button size="sm" variant="ghost" onClick={() => setDriOpen(true)} className="h-8">
                <FlaskConical className="w-4 h-4 mr-1" />
                {t("ft.dri.open")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={openTargets} className="h-8">
              <SettingsIcon className="w-4 h-4 mr-1" />
              {t("ft.targetSetup")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calories — clickable */}
          <NutrientRow
            nKey="kcal"
            label={t("ft.calories")}
            value={totalFor("kcal")}
            target={targetFor("kcal")}
            manual={isManual("kcal")}
            onClick={() => setInfoKey("kcal")}
            big
          />

          {/* Macros */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("ft.macros")}
            </div>
            {MACRO_KEYS.map((k) => (
              <NutrientRow
                key={k}
                nKey={k}
                label={t(`n.${k}`) !== `n.${k}` ? t(`n.${k}`) : nutrientLabelFallback(k, t)}
                value={totalFor(k)}
                target={targetFor(k)}
                manual={isManual(k)}
                onClick={() => setInfoKey(k)}
              />
            ))}
          </div>

          {/* Micros */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("ft.micros")}
            </div>
            {MICRO_KEYS.map((k) => (
              <NutrientRow
                key={k}
                nKey={k}
                label={t(`n.${k}`)}
                value={totalFor(k)}
                target={targetFor(k)}
                manual={isManual(k)}
                onClick={() => setInfoKey(k)}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            {t("ft.tapForInfo")}
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" /> {t("ft.search")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="relative">
            <Input
              placeholder={t("ft.searchPlaceholder")}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {searching && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {searchOpen && (searchResults.length > 0 || (!searching && searchQ.trim().length >= 2)) && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
                {searchResults.length === 0 && !searching ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {t("ft.noResults")}
                  </div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickFood(r)}
                      className="w-full text-left p-2 hover:bg-muted border-b border-border last:border-0 transition-colors"
                    >
                      <div className="text-sm font-medium line-clamp-1">{r.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                        <span className="line-clamp-1">
                          {r.brand ? `${r.brand} • ` : ""}
                          {r.source === "usda" ? "USDA" : "OFF"}
                        </span>
                        <span className="whitespace-nowrap">{r.kcal_per_100g} kcal/100g</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground mb-2 block">
              {t("ft.manualEntry")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t("ft.mealName")}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="col-span-2"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={`${t("ft.grams")}`}
                value={manualGrams}
                onChange={(e) => setManualGrams(e.target.value)}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="kcal"
                value={manualKcal}
                onChange={(e) => setManualKcal(e.target.value)}
              />
              <Select value={manualMeal} onValueChange={(v) => setManualMeal(v as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`ft.meal.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addManual} variant="secondary">
                <Plus className="w-4 h-4 mr-1" /> {t("ft.add")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily log grouped by meal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("ft.dailyLog")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              {t("common.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              {t("ft.empty")}
            </div>
          ) : (
            MEAL_TYPES.map((m) => {
              const list = grouped[m];
              if (list.length === 0) return null;
              const Icon = MEAL_ICON[m];
              const mealKcal = list.reduce((s, i) => s + i.kcal, 0);
              return (
                <div key={m} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {t(`ft.meal.${m}`)}
                    </span>
                    <span>{Math.round(mealKcal)} kcal</span>
                  </div>
                  <div className="space-y-1">
                    {list.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 border border-border rounded-md p-2 bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => setDetail(it)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.grams ? `${Math.round(it.grams)}γρ • ` : ""}
                            {Math.round(it.kcal)} kcal
                            {it.protein_g != null && (
                              <>
                                {" • P "}
                                {Math.round(it.protein_g)}
                              </>
                            )}
                            {it.carbs_g != null && (
                              <>
                                {" C "}
                                {Math.round(it.carbs_g)}
                              </>
                            )}
                            {it.fat_g != null && (
                              <>
                                {" F "}
                                {Math.round(it.fat_g)}
                              </>
                            )}
                          </div>
                        </button>
                        <Button size="icon" variant="ghost" onClick={() => setDetail(it)}>
                          <Info className="w-4 h-4" />
                        </Button>
                        {it.grams > 0 && (
                          <Button size="icon" variant="ghost" onClick={() => startEdit(it)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {selected.brand ? `${selected.brand} • ` : ""}
                {selected.source === "usda" ? "USDA" : "OFF"} • {selected.kcal_per_100g} kcal/100g
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{t("ft.grams")}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("ft.mealType")}</Label>
                  <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_TYPES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {t(`ft.meal.${m}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live preview totals */}
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                {(() => {
                  const g = parseFloat(portionGrams) || 0;
                  const k = Math.round(((selected.kcal_per_100g ?? 0) * g) / 100);
                  return (
                    <>
                      <div className="flex justify-between font-medium">
                        <span>{t("ft.calories")}</span>
                        <span>{k} kcal</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span>P: {scale(selected.protein_g_100g, g) ?? "—"}g</span>
                        <span>C: {scale(selected.carbs_g_100g, g) ?? "—"}g</span>
                        <span>F: {scale(selected.fat_g_100g, g) ?? "—"}g</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={addFromSelected}>
              <Plus className="w-4 h-4 mr-1" /> {t("ft.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-left">{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{t("ft.grams")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={editGrams}
              onChange={(e) => setEditGrams(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={saveEdit}>{t("common.save") || "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left">{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {detail.brand ? `${detail.brand} • ` : ""}
                {detail.grams ? `${Math.round(detail.grams)}γρ` : ""}
              </div>
              <Section title={t("ft.macros")}>
                <ClickRow onClick={() => setInfoKey("kcal")} label={t("ft.calories")} value={`${Math.round(detail.kcal)} kcal`} />
                <ClickRow onClick={() => setInfoKey("protein_g")} label={t("ft.protein")} value={fmtG(detail.protein_g)} />
                <ClickRow onClick={() => setInfoKey("carbs_g")} label={t("ft.carbs")} value={fmtG(detail.carbs_g)} />
                <ClickRow onClick={() => setInfoKey("fat_g")} label={t("ft.fat")} value={fmtG(detail.fat_g)} />
                <ClickRow onClick={() => setInfoKey("saturated_fat_g")} label={`• ${t("n.saturated_fat_g")}`} value={fmtG(detail.saturated_fat_g)} />
                <ClickRow onClick={() => setInfoKey("sugars_g")} label={`• ${t("n.sugars_g")}`} value={fmtG(detail.sugars_g)} />
                <ClickRow onClick={() => setInfoKey("fiber_g")} label={t("ft.fiber")} value={fmtG(detail.fiber_g)} />
                <ClickRow onClick={() => setInfoKey("cholesterol_mg")} label={t("n.cholesterol_mg")} value={fmtMg(detail.cholesterol_mg)} />
              </Section>
              <Section title={t("ft.micros")}>
                <ClickRow onClick={() => setInfoKey("sodium_mg")} label={t("n.sodium_mg")} value={fmtMg(detail.sodium_mg)} />
                <ClickRow onClick={() => setInfoKey("potassium_mg")} label={t("n.potassium_mg")} value={fmtMg(detail.potassium_mg)} />
                <ClickRow onClick={() => setInfoKey("calcium_mg")} label={t("n.calcium_mg")} value={fmtMg(detail.calcium_mg)} />
                <ClickRow onClick={() => setInfoKey("iron_mg")} label={t("n.iron_mg")} value={fmtMg(detail.iron_mg)} />
                <ClickRow onClick={() => setInfoKey("vitamin_c_mg")} label={t("n.vitamin_c_mg")} value={fmtMg(detail.vitamin_c_mg)} />
                <ClickRow onClick={() => setInfoKey("vitamin_a_iu")} label={t("n.vitamin_a_iu")} value={detail.vitamin_a_iu != null ? `${Math.round(detail.vitamin_a_iu)} IU` : "—"} />
              </Section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nutrient info dialog (Cronometer-style) */}
      <Dialog open={!!infoKey} onOpenChange={(o) => !o && setInfoKey(null)}>
        <DialogContent className="max-w-md">
          {infoKey && (() => {
            const meta = NUTRIENT_META[infoKey];
            const info = NUTRIENT_INFO[infoKey];
            const consumed = totalFor(infoKey);
            const target = targetFor(infoKey);
            const remaining = Math.max(0, target - consumed);
            const over = consumed > target;
            const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
            const isLimit = meta.kind === "limit";
            const lang = (t("app.name") === "Fitness Tracker" ? "en" : "el") as "el" | "en";
            const txt = info[lang];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-left">{txt.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{txt.desc}</p>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{t("ft.consumed")}</span>
                      <span className="font-medium">
                        {Math.round(consumed * 10) / 10} {meta.unit}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {t("ft.dailyValue")}: {target} {meta.unit}{" "}
                        ({isLimit ? t("ft.target.limit") : t("ft.target.goal")})
                        {isManual(infoKey) ? "" : ` • ${t("ft.auto")}`}
                      </span>
                      <span>
                        {over
                          ? `+${Math.round((consumed - target) * 10) / 10} ${meta.unit} ${t("ft.over")}`
                          : `${Math.round(remaining * 10) / 10} ${meta.unit} ${t("ft.remaining")}`}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setInfoKey(null)}>
                    {t("common.cancel") || "Close"}
                  </Button>
                  <Button onClick={() => { setInfoKey(null); openTargets(); }}>
                    <SettingsIcon className="w-4 h-4 mr-1" />
                    {t("ft.targetSetup")}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Targets manual override dialog */}
      <Dialog open={targetsOpen} onOpenChange={setTargetsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left">{t("ft.targets.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t("ft.targets.desc")}</p>
          <div className="space-y-3">
            <TargetGroup title={t("ft.macros")} nKeys={["kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "saturated_fat_g", "sugars_g", "cholesterol_mg"]}
              t={t} amr={amr} profile={profile} weightKg={weightKg} form={targetsForm} setForm={setTargetsForm} />
            <TargetGroup title={t("ft.micros")} nKeys={["sodium_mg", "potassium_mg", "calcium_mg", "iron_mg", "vitamin_c_mg", "vitamin_a_iu"]}
              t={t} amr={amr} profile={profile} weightKg={weightKg} form={targetsForm} setForm={setTargetsForm} />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button variant="ghost" onClick={resetTargets} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-1" />
              {t("ft.targets.reset")}
            </Button>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setTargetsOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={saveTargets}>{t("common.save")}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* USDA DRI Full Breakdown */}
      <Dialog open={driOpen} onOpenChange={setDriOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-left flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              {t("ft.dri.title")}
            </DialogTitle>
          </DialogHeader>
          {driEngine && (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">{t("ft.dri.desc")}</p>

              {driEngine.flags.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-2 space-y-1">
                  {driEngine.flags.map((f) => (
                    <div key={f.nutrient} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                      <div><span className="font-medium">{f.nutrient}:</span> {f.message} ({f.value} / {f.limit})</div>
                    </div>
                  ))}
                </div>
              )}

              <DriSection title={t("ft.dri.carbs")}>
                <Row label={t("n.fiber_g")} value={`${driEngine.carbohydrates.fiber_g} g`} />
                <Row label={t("ft.dri.netCarbs")} value={`${driEngine.carbohydrates.net_carbs_g} g`} />
                <Row label={t("ft.dri.sugarMax")} value={`${driEngine.carbohydrates.sugar_max_g} g`} />
                <Row label={t("ft.dri.starch")} value={`${driEngine.carbohydrates.starch_g} g`} />
              </DriSection>

              <DriSection title={t("ft.dri.lipids")}>
                <Row label={t("n.saturated_fat_g")} value={`${driEngine.lipids.saturated_g} g`} />
                <Row label={t("ft.dri.mono")} value={`${driEngine.lipids.monounsaturated_g} g`} />
                <Row label={t("ft.dri.poly")} value={`${driEngine.lipids.polyunsaturated_g} g`} />
                <Row label={t("ft.dri.omega3")} value={`${driEngine.lipids.omega3.total_g} g (ALA ${driEngine.lipids.omega3.ALA_g} / EPA ${driEngine.lipids.omega3.EPA_g} / DHA ${driEngine.lipids.omega3.DHA_g})`} />
                <Row label={t("ft.dri.omega6")} value={`${driEngine.lipids.omega6.total_g} g (LA ${driEngine.lipids.omega6.LA_g})`} />
                <Row label={t("n.cholesterol_mg")} value={`≤ ${driEngine.lipids.cholesterol_mg} mg`} />
              </DriSection>

              <DriSection title={t("ft.dri.aminoAcids")}>
                {Object.entries(driEngine.amino_acids).map(([k, v]) => (
                  <Row key={k} label={k.replace("_g", "")} value={`${v} g`} />
                ))}
              </DriSection>

              <DriSection title={t("ft.dri.vitamins")}>
                <Row label="Β1 Thiamine" value={`${driEngine.vitamins.B1_mg} mg`} />
                <Row label="Β2 Riboflavin" value={`${driEngine.vitamins.B2_mg} mg`} />
                <Row label="Β3 Niacin" value={`${driEngine.vitamins.B3_mg} mg (UL ${driEngine.vitamins.B3_UL_mg})`} />
                <Row label="Β5 Pantothenic" value={`${driEngine.vitamins.B5_mg} mg`} />
                <Row label="Β6" value={`${driEngine.vitamins.B6_mg} mg (UL ${driEngine.vitamins.B6_UL_mg})`} />
                <Row label="Β12" value={`${driEngine.vitamins.B12_mcg} mcg`} />
                <Row label="Folate" value={`${driEngine.vitamins.folate_mcg} mcg (UL ${driEngine.vitamins.folate_UL_mcg})`} />
                <Row label={t("n.vitamin_a_iu")} value={`${driEngine.vitamins.A_mcg} mcg RAE (UL ${driEngine.vitamins.A_UL_mcg})`} />
                <Row label={t("n.vitamin_c_mg")} value={`${driEngine.vitamins.C_mg} mg (UL ${driEngine.vitamins.C_UL_mg})`} />
                <Row label="Vitamin D" value={`${driEngine.vitamins.D_IU} IU (UL ${driEngine.vitamins.D_UL_IU})`} />
                <Row label="Vitamin E" value={`${driEngine.vitamins.E_mg} mg (UL ${driEngine.vitamins.E_UL_mg})`} />
                <Row label="Vitamin K" value={`${driEngine.vitamins.K_mcg} mcg`} />
              </DriSection>

              <DriSection title={t("ft.dri.minerals")}>
                <Row label={t("n.calcium_mg")} value={`${driEngine.minerals.calcium_mg} mg (UL ${driEngine.minerals.calcium_UL_mg})`} />
                <Row label={t("n.iron_mg")} value={`${driEngine.minerals.iron_mg} mg (UL ${driEngine.minerals.iron_UL_mg})`} />
                <Row label="Magnesium" value={`${driEngine.minerals.magnesium_mg} mg`} />
                <Row label="Zinc" value={`${driEngine.minerals.zinc_mg} mg (UL ${driEngine.minerals.zinc_UL_mg})`} />
                <Row label={t("n.potassium_mg")} value={`${driEngine.minerals.potassium_mg} mg`} />
                <Row label={t("n.sodium_mg")} value={`${driEngine.minerals.sodium_mg} mg (UL ${driEngine.minerals.sodium_UL_mg})`} />
                <Row label="Phosphorus" value={`${driEngine.minerals.phosphorus_mg} mg`} />
                <Row label="Selenium" value={`${driEngine.minerals.selenium_mcg} mcg`} />
                <Row label="Copper" value={`${driEngine.minerals.copper_mcg} mcg`} />
                <Row label="Manganese" value={`${driEngine.minerals.manganese_mg} mg`} />
                <Row label={t("ft.water")} value={`${driEngine.minerals.water_L} L`} />
              </DriSection>

              <DriSection title={t("ft.dri.balance")}>
                <Row label="Ω6 : Ω3" value={`${driEngine.balance_ratios.omega6_to_omega3.value} (${driEngine.balance_ratios.omega6_to_omega3.target_range})`} />
                <Row label="Zn : Cu" value={`${driEngine.balance_ratios.zinc_to_copper.value} (${driEngine.balance_ratios.zinc_to_copper.target_range})`} />
                <Row label="Ca : Mg" value={`${driEngine.balance_ratios.calcium_to_magnesium.value} (${driEngine.balance_ratios.calcium_to_magnesium.target_range})`} />
                <Row label="K : Na" value={`${driEngine.balance_ratios.potassium_to_sodium.value} (${driEngine.balance_ratios.potassium_to_sodium.target_range})`} />
                <Row label="Ca : P" value={`${driEngine.balance_ratios.calcium_to_phosphorus.value} (${driEngine.balance_ratios.calcium_to_phosphorus.target_range})`} />
                <Row label="PRAL" value={`${driEngine.balance_ratios.PRAL_score.value} — ${driEngine.balance_ratios.PRAL_score.interpretation}`} />
              </DriSection>

              <p className="text-[11px] text-muted-foreground pt-2">{t("ft.dri.source")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}

// Cronometer-style nutrient row used in Today summary
function NutrientRow({
  nKey, label, value, target, manual, onClick, big = false,
}: {
  nKey: NutrientKey;
  label: string;
  value: number;
  target: number;
  manual: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  const meta = NUTRIENT_META[nKey];
  const isLimit = meta.kind === "limit";
  const ratio = target > 0 ? value / target : 0;
  const pct = Math.min(100, ratio * 100);
  const over = ratio > 1;
  // For limits we want red when over; for goals we want green-ish when met.
  const barColor = over
    ? (isLimit ? "bg-destructive" : "bg-warning")
    : (isLimit ? "bg-warning" : "bg-primary");
  const v = Math.round(value * 10) / 10;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-md hover:bg-muted/50 transition-colors px-1 py-1 -mx-1"
    >
      <div className={`flex justify-between ${big ? "text-sm" : "text-xs"}`}>
        <span className={big ? "font-semibold" : "font-medium"}>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {v} / {target} {meta.unit}
          {manual ? "" : <span className="opacity-60"> · auto</span>}
        </span>
      </div>
      <div className={`mt-1 ${big ? "h-2" : "h-1.5"} rounded-full bg-muted overflow-hidden`}>
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

function nutrientLabelFallback(k: NutrientKey, t: (s: string) => string) {
  if (k === "protein_g") return t("ft.protein");
  if (k === "carbs_g") return t("ft.carbs");
  if (k === "fat_g") return t("ft.fat");
  if (k === "fiber_g") return t("ft.fiber");
  return k;
}

function ClickRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex justify-between text-sm border-b border-border/50 py-1 last:border-0 hover:bg-muted/40 px-1 -mx-1 rounded transition-colors"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </button>
  );
}

function TargetGroup({
  title, nKeys, t, amr, profile, weightKg, form, setForm,
}: {
  title: string;
  nKeys: NutrientKey[];
  t: (s: string) => string;
  amr: number | null;
  profile?: any;
  weightKg?: number | null;
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {nKeys.map((k) => {
          const meta = NUTRIENT_META[k];
          const auto = resolveTarget(k, amr, null, profile ?? null, weightKg ?? null);
          const labelKey = `n.${k}`;
          const lab = t(labelKey) !== labelKey ? t(labelKey) : nutrientLabelFallback(k, t);
          return (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{lab} ({meta.unit})</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={`${t("ft.auto")}: ${auto}`}
                value={form[k] ?? ""}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const p = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">{label}</div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${p}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">
        {Math.round(value)} / {target}g
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-border/50 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const fmtG = (v: number | null) => (v == null ? "—" : `${Math.round(v * 10) / 10} g`);
const fmtMg = (v: number | null) => (v == null ? "—" : `${Math.round(v * 10) / 10} mg`);
