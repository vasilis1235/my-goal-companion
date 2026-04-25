// Profile editing page — avatar, name, sex, age, height, activity
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { ACTIVITY_KEYS } from "@/lib/i18n";
import { ActivityLevel, Sex } from "@/lib/calculations";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useAppPrefs();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setDisplayName(data.display_name ?? "");
        if (data.sex === "male" || data.sex === "female") setSex(data.sex);
        setAge(data.age?.toString() ?? "");
        setHeightCm(data.height_cm?.toString() ?? "");
        if (data.activity_level) setActivity(data.activity_level as ActivityLevel);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    setUploading(false);
    toast.success("✓");
  };

  const handleSave = async () => {
    if (!user) return;
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(heightCm.replace(",", "."));
    if (!displayName.trim() || !ageNum || !heightNum) {
      toast.error("?");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      sex, age: ageNum, height_cm: heightNum, activity_level: activity,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("profile.saved"));
    navigate("/", { replace: true });
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  const initials = (displayName || user?.email || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">{t("profile.title")}</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Big avatar */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t("profile.changePhoto")}
          >
            <Avatar className="w-32 h-32 border-2 border-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
              <Camera className="w-4 h-4" />
            </span>
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); }}
          />
          <p className="text-xs text-muted-foreground">{uploading ? "..." : t("profile.changePhoto")}</p>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("profile.title")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">{t("onb.name")}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9" />
            </div>

            <div>
              <Label className="text-xs">{t("onb.sex")}</Label>
              <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("onb.male")}</SelectItem>
                  <SelectItem value="female">{t("onb.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("onb.age")}</Label>
                <Input type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">{t("onb.height")}</Label>
                <Input type="number" inputMode="decimal" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="h-9" />
              </div>
            </div>

            <div>
              <Label className="text-xs">{t("onb.activity")}</Label>
              <Select value={activity} onValueChange={(v) => setActivity(v as ActivityLevel)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_KEYS) as Array<keyof typeof ACTIVITY_KEYS>).map((k) => (
                    <SelectItem key={k} value={k}>{ACTIVITY_KEYS[k][lang]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]" size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "..." : t("common.save")}
        </Button>
      </main>
    </div>
  );
};

export default Profile;
