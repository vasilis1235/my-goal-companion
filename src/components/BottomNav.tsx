import { Home, FileText, LineChart, Utensils, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppPrefs } from "@/contexts/AppPreferences";

export type Tab = "home" | "report" | "progress" | "diet" | "history";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export const BottomNav = ({ active, onChange }: BottomNavProps) => {
  const { t } = useAppPrefs();
  // Σειρά: Αρχική, Αναφορά, Progress, Διατροφή, Ιστορικό
  // Outline icons με ομοιόμορφο stroke 2 (lucide default)
  const items: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: "home", label: t("nav.home"), Icon: Home },
    { id: "report", label: t("nav.report"), Icon: FileText },
    { id: "progress", label: t("nav.progress"), Icon: LineChart },
    { id: "diet", label: t("nav.diet"), Icon: Utensils },
    { id: "history", label: t("nav.history"), Icon: Clock },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border z-40">
      <div className="container mx-auto max-w-3xl grid grid-cols-5">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
              active === id ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
          >
            <Icon className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
