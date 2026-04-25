import { Home, Plus, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "home" | "new" | "report" | "history";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const items: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Αρχική", Icon: Home },
  { id: "new", label: "Νέα", Icon: Plus },
  { id: "report", label: "Αναφορά", Icon: BarChart3 },
  { id: "history", label: "Ιστορικό", Icon: Clock },
];

export const BottomNav = ({ active, onChange }: BottomNavProps) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border z-40">
    <div className="container mx-auto max-w-3xl grid grid-cols-4">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
            active === id
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={label}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);
