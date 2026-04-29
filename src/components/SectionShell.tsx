// Wrapper around any sub-section with a Back button to return to the hub
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useAppPrefs } from "@/contexts/AppPreferences";

interface Props {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const SectionShell = ({ title, onBack, children }: Props) => {
  const { t } = useAppPrefs();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Button>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
};
