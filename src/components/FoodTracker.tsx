import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Flame, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { Progress } from "@/components/ui/progress";

interface MealItem {
  id: string;
  name: string;
  kcal: number;
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
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [activityKcal, setActivityKcal] = useState("");
  const [saving, setSaving] = useState(false);

  // Load today's draft from localStorage
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

  // Persist draft
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: todayKey(), items, activityKcal })
    );
  }, [items, activityKcal]);

  const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0);
  const activity = parseFloat(activityKcal) || 0;
  const target = amr ?? 0;
  const net = totalKcal - activity;
  const balance = target ? net - target : 0;
  const pct = target ? Math.min(100, Math.round((net / target) * 100)) : 0;

  const addItem = () => {
    const k = parseFloat(kcal);
    if (!name.trim() || !Number.isFinite(k) || k <= 0) {
      toast.error(t("ft.invalid"));
      return;
    }
    setItems((arr) => [...arr, { id: crypto.randomUUID(), name: name.trim(), kcal: k }]);
    setName("");
    setKcal("");
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

      {/* Add item */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("ft.addMeal")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Input
              placeholder={t("ft.mealName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="kcal"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          </div>
          <Button onClick={addItem} className="w-full" variant="secondary">
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
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.name}</div>
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
