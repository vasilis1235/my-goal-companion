import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Flame, Activity, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { Progress } from "@/components/ui/progress";

interface MealItem {
  id: string;
  name: string;
  kcal: number;
  grams?: number;
}

interface FoodResult {
  source: "off" | "usda";
  id: string;
  name: string;
  brand?: string;
  kcal_per_100g: number | null;
  serving_size_g?: number | null;
  serving_kcal?: number | null;
}

interface Props {
  bmr: number | null;
  amr: number | null;
  onSaved?: () => void;
}

const STORAGE_KEY = "ft.foodtracker.today";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function FoodTracker({ bmr, amr, onSaved }: Props) {
  const { user } = useAuth();
  const { t } = useAppPrefs();
  const [items, setItems] = useState<MealItem[]>([]);
  const [activityKcal, setActivityKcal] = useState("");
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Selected food for portion entry
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [portionGrams, setPortionGrams] = useState("");

  // Manual entry
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayKey()) {
          setItems(parsed.items ?? []);
          setActivityKcal(parsed.activityKcal ?? "");
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: todayKey(), items, activityKcal })
    );
  }, [items, activityKcal]);

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

  const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0);
  const activity = parseFloat(activityKcal) || 0;
  const target = amr ?? 0;
  const net = totalKcal - activity;
  const balance = target ? net - target : 0;
  const pct = target ? Math.min(100, Math.round((net / target) * 100)) : 0;

  const pickFood = (f: FoodResult) => {
    setSelected(f);
    setPortionGrams(String(f.serving_size_g ?? 100));
    setSearchOpen(false);
    setSearchQ(f.brand ? `${f.name} — ${f.brand}` : f.name);
  };

  const addFromSelected = () => {
    if (!selected) return;
    const g = parseFloat(portionGrams);
    if (!Number.isFinite(g) || g <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    const kcal100 = selected.kcal_per_100g ?? 0;
    const kcal = Math.round((kcal100 * g) / 100);
    const label = selected.brand ? `${selected.name} (${selected.brand})` : selected.name;
    setItems((arr) => [
      ...arr,
      { id: crypto.randomUUID(), name: `${label} – ${g}γρ`, kcal, grams: g },
    ]);
    setSelected(null);
    setPortionGrams("");
    setSearchQ("");
    setSearchResults([]);
  };

  const addManual = () => {
    const k = parseFloat(manualKcal);
    if (!manualName.trim() || !Number.isFinite(k) || k <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    setItems((arr) => [
      ...arr,
      { id: crypto.randomUUID(), name: manualName.trim(), kcal: k },
    ]);
    setManualName("");
    setManualKcal("");
  };

  const removeItem = (id: string) => {
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  const saveDay = async () => {
    if (!user) return;
    if (items.length === 0) {
      toast.error(t("ft.noItems"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("nutrition_entries").insert({
      user_id: user.id,
      recorded_at: new Date().toISOString(),
      intake_kcal: totalKcal,
      activity_kcal: activity,
      bmr_kcal: bmr,
      amr_kcal: amr,
      note: items.map((i) => `${i.name} (${i.kcal})`).join(", "),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("ft.saved"));
    setItems([]);
    setActivityKcal("");
    localStorage.removeItem(STORAGE_KEY);
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("ft.today")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted p-2">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" /> {t("ft.intake")}
              </div>
              <div className="font-semibold">{totalKcal}</div>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Activity className="w-3 h-3" /> {t("ft.activity")}
              </div>
              <div className="font-semibold">{activity}</div>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <div className="text-xs text-muted-foreground">{t("ft.target")}</div>
              <div className="font-semibold">{target || "—"}</div>
            </div>
          </div>

          {target > 0 && (
            <>
              <Progress value={pct} />
              <div className={`text-sm text-center ${balance > 0 ? "text-warning" : "text-success"}`}>
                {balance > 0 ? `+${Math.round(balance)} ${t("ft.over")}` : `${Math.round(balance)} ${t("ft.under")}`}
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">{t("ft.activityLabel")}</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={activityKcal}
              onChange={(e) => setActivityKcal(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Smart search */}
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
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSelected(null);
              }}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {searching && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}

            {searchOpen && (searchResults.length > 0 || (!searching && searchQ.trim().length >= 2)) && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
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
                        <span className="whitespace-nowrap">
                          {r.kcal_per_100g} kcal/100g
                          {r.serving_kcal ? ` • ${r.serving_kcal} ${t("ft.perServing")}` : ""}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
              <div className="text-sm font-medium">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                {selected.kcal_per_100g} kcal {t("ft.per100g")}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">{t("ft.grams")}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFromSelected()}
                  />
                </div>
                <div className="text-sm font-semibold pb-2 whitespace-nowrap">
                  ≈ {Math.round(((selected.kcal_per_100g ?? 0) * (parseFloat(portionGrams) || 0)) / 100)} kcal
                </div>
              </div>
              <Button onClick={addFromSelected} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-1" /> {t("ft.add")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("ft.manualEntry")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Input
              placeholder={t("ft.mealName")}
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManual()}
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="kcal"
              value={manualKcal}
              onChange={(e) => setManualKcal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManual()}
            />
          </div>
          <Button onClick={addManual} className="w-full" variant="secondary">
            <Plus className="w-4 h-4 mr-1" /> {t("ft.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Items list */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border-b border-border last:border-0 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.kcal} kcal</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button onClick={saveDay} disabled={saving || items.length === 0} className="w-full">
        <Save className="w-4 h-4 mr-1" /> {saving ? t("common.loading") : t("ft.saveDay")}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {t("ft.note")}
      </p>
    </div>
  );
}
