import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_LABELS, ActivityLevel, Sex } from "@/lib/calculations";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { toast } from "sonner";

interface Props {
  open: boolean;
  userId: string;
  initialName?: string;
  onComplete: () => void;
}

interface Form {
  display_name: string;
  sex: Sex | "";
  age: string;
  height_cm: string;
  activity_level: ActivityLevel;
  avatar_url: string | null;
}

export const OnboardingDialog = ({ open, userId, initialName, onComplete }: Props) => {
  const { t } = useAppPrefs();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Form>({
    display_name: initialName ?? "",
    sex: "",
    age: "",
    height_cm: "",
    activity_level: "moderate",
    avatar_url: null,
  });

  useEffect(() => { if (initialName && !form.display_name) setForm((p) => ({ ...p, display_name: initialName })); }, [initialName]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleAvatar = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      set("avatar_url", `${data.publicUrl}?t=${Date.now()}`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const canProceed = (() => {
    if (step === 0) return true; // photo optional
    if (step === 1) return form.display_name.trim().length > 0;
    if (step === 2) return form.sex !== "";
    if (step === 3) return parseInt(form.age) > 0 && parseInt(form.age) < 130;
    if (step === 4) return parseFloat(form.height_cm) > 50 && parseFloat(form.height_cm) < 260;
    if (step === 5) return !!form.activity_level;
    return false;
  })();

  const finish = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name.trim(),
      sex: form.sex,
      age: parseInt(form.age),
      height_cm: parseFloat(form.height_cm),
      activity_level: form.activity_level,
      avatar_url: form.avatar_url,
      onboarding_completed: true,
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("✓");
    onComplete();
  };

  const next = () => {
    if (step < 5) setStep((s) => s + 1);
    else finish();
  };

  const initials = (form.display_name || initialName || "?").trim().slice(0, 2).toUpperCase();
  const total = 6;

  return (
    <Dialog open={open} onOpenChange={() => { /* required, no close */ }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">{t("onb.title")}</DialogTitle>
          <p className="text-center text-sm text-muted-foreground">{t("onb.subtitle")}</p>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 px-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="min-h-[180px] py-2">
          {step === 0 && (
            <div className="flex flex-col items-center gap-3">
              <Label className="text-sm">{t("onb.photo")}</Label>
              <div className="relative">
                <Avatar className="w-28 h-28">
                  {form.avatar_url ? <AvatarImage src={form.avatar_url} /> : null}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-lg">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground text-center">{uploading ? "Upload..." : t("onb.photoOptional")}</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="onb-name">{t("onb.name")}</Label>
              <Input id="onb-name" autoFocus value={form.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder={t("auth.namePh")} />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <Label>{t("onb.sex")}</Label>
              <RadioGroup value={form.sex} onValueChange={(v) => set("sex", v as Sex)} className="grid grid-cols-2 gap-3">
                <label className={`border rounded-lg p-4 cursor-pointer text-center transition ${form.sex === "male" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="male" className="sr-only" />
                  <div className="text-3xl">♂</div>
                  <div className="text-sm mt-1">{t("onb.male")}</div>
                </label>
                <label className={`border rounded-lg p-4 cursor-pointer text-center transition ${form.sex === "female" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <RadioGroupItem value="female" className="sr-only" />
                  <div className="text-3xl">♀</div>
                  <div className="text-sm mt-1">{t("onb.female")}</div>
                </label>
              </RadioGroup>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="onb-age">{t("onb.age")}</Label>
              <Input id="onb-age" type="number" autoFocus value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="30" />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-2">
              <Label htmlFor="onb-h">{t("onb.height")}</Label>
              <Input id="onb-h" type="number" step="0.1" autoFocus value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} placeholder="175" />
            </div>
          )}
          {step === 5 && (
            <div className="space-y-2">
              <Label>{t("onb.activity")}</Label>
              <Select value={form.activity_level} onValueChange={(v) => set("activity_level", v as ActivityLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>{t("common.back")}</Button>
          <Button onClick={next} disabled={!canProceed || saving} className="bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]">
            {step === total - 1 ? <><Check className="w-4 h-4 mr-1" /> {t("onb.complete")}</> : <>{t("common.next")} <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
