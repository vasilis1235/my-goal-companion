// Settings page — Theme, Language, Units
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Moon, Sun, Globe, Ruler } from "lucide-react";
import { useAppPrefs } from "@/contexts/AppPreferences";

const Settings = () => {
  const navigate = useNavigate();
  const { t, theme, setTheme, lang, setLang, units, setUnits } = useAppPrefs();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* Theme */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4" strokeWidth={2} /> : <Sun className="w-4 h-4" strokeWidth={2} />}
            <CardTitle className="text-base">{t("settings.theme")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="justify-start"
            >
              <Sun className="w-4 h-4 mr-2" /> {t("settings.themeLight")}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="justify-start"
            >
              <Moon className="w-4 h-4 mr-2" /> {t("settings.themeDark")}
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Globe className="w-4 h-4" strokeWidth={2} />
            <CardTitle className="text-base">{t("settings.language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={lang} onValueChange={(v) => setLang(v as "el" | "en")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="el">Ελληνικά</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Ruler className="w-4 h-4" strokeWidth={2} />
            <CardTitle className="text-base">{t("settings.units")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={units} onValueChange={(v) => setUnits(v as "metric" | "imperial")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("settings.metric")}</SelectItem>
                <SelectItem value="imperial">{t("settings.imperial")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
