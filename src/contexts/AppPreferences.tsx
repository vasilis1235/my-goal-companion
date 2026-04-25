// Centralized providers: Theme + Language + Units, persisted to profile when logged in
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, translate } from "@/lib/i18n";
import { Units } from "@/lib/units";
import { supabase } from "@/integrations/supabase/client";

type Theme = "light" | "dark";

interface PrefsContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  units: Units;
  setUnits: (u: Units) => void;
  t: (key: string) => string;
  hydratePrefs: (p: { language?: string | null; units?: string | null }) => void;
}

const Ctx = createContext<PrefsContextType | null>(null);

const LS_THEME = "ft.theme";
const LS_LANG = "ft.lang";
const LS_UNITS = "ft.units";

const applyTheme = (t: Theme) => {
  const root = document.documentElement;
  if (t === "light") root.classList.add("light");
  else root.classList.remove("light");
};

export const AppPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    (typeof window !== "undefined" && (localStorage.getItem(LS_THEME) as Theme)) || "dark"
  );
  const [lang, setLangState] = useState<Lang>(
    (typeof window !== "undefined" && (localStorage.getItem(LS_LANG) as Lang)) || "el"
  );
  const [units, setUnitsState] = useState<Units>(
    (typeof window !== "undefined" && (localStorage.getItem(LS_UNITS) as Units)) || "metric"
  );

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(LS_THEME, t);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LS_LANG, l);
    // Persist to profile if signed in (best-effort)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("profiles").update({ language: l }).eq("id", data.user.id);
    });
  }, []);
  const setUnits = useCallback((u: Units) => {
    setUnitsState(u);
    localStorage.setItem(LS_UNITS, u);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("profiles").update({ units: u }).eq("id", data.user.id);
    });
  }, []);

  const hydratePrefs = useCallback((p: { language?: string | null; units?: string | null }) => {
    if (p.language && (p.language === "el" || p.language === "en")) {
      setLangState(p.language);
      localStorage.setItem(LS_LANG, p.language);
    }
    if (p.units && (p.units === "metric" || p.units === "imperial")) {
      setUnitsState(p.units);
      localStorage.setItem(LS_UNITS, p.units);
    }
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return (
    <Ctx.Provider value={{ theme, setTheme, lang, setLang, units, setUnits, t, hydratePrefs }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAppPrefs = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppPrefs must be used within AppPreferencesProvider");
  return v;
};
