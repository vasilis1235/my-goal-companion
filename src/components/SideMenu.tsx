import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAppPrefs } from "@/contexts/AppPreferences";

interface Props {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const SideMenu = ({ displayName, email, avatarUrl, onOpenProfile, onOpenSettings, onLogout }: Props) => {
  const { t } = useAppPrefs();
  const [open, setOpen] = useState(false);
  const initials = (displayName || email || "?").trim().slice(0, 2).toUpperCase();

  const item = (icon: any, label: string, onClick: () => void) => {
    const Icon = icon;
    return (
      <button
        onClick={() => { setOpen(false); onClick(); }}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted text-left transition-colors"
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="menu" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
          <Avatar className="w-9 h-9 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <div className="flex items-center gap-3 pt-2">
            <Avatar className="w-12 h-12">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <SheetTitle className="text-base truncate">{displayName || email}</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          {item(User, t("menu.profile"), onOpenProfile)}
          {item(SettingsIcon, t("menu.settings"), onOpenSettings)}
          <div className="pt-4 border-t border-border mt-4">
            {item(LogOut, t("menu.logout"), onLogout)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
