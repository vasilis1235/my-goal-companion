import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { useAppPrefs } from "@/contexts/AppPreferences";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useAppPrefs();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places recovery tokens in the URL hash; the SDK auto-handles them
    // and triggers a PASSWORD_RECOVERY auth event. We just need to wait for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    // If neither happens within a moment, still let user attempt (covers magic links already consumed)
    const tm = setTimeout(() => setReady(true), 1500);
    return () => { subscription.unsubscribe(); clearTimeout(tm); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwd2) { toast.error(t("auth.passwordsDontMatch")); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("auth.passwordUpdated"));
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center mb-2">
            <Activity className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle>{t("auth.resetTitle")}</CardTitle>
          <CardDescription>{t("auth.newPassword")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="np">{t("auth.newPassword")}</Label>
              <Input id="np" type="password" minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} required disabled={!ready} />
            </div>
            <div>
              <Label htmlFor="np2">{t("auth.confirmPassword")}</Label>
              <Input id="np2" type="password" minLength={6} value={pwd2} onChange={(e) => setPwd2(e.target.value)} required disabled={!ready} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? "..." : t("auth.updatePassword")}
            </Button>
            <button type="button" onClick={() => navigate("/auth")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              {t("auth.backToSignin")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
