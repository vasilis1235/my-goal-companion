// Read-only profile fields (used in NewMeasurement & Report)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY_LABELS } from "@/lib/calculations";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { displayLength } from "@/lib/units";
import { Lock } from "lucide-react";

interface Props {
  sex: "male" | "female" | null;
  age: number | null;
  height_cm: number | null;
  activity: keyof typeof ACTIVITY_LABELS | null;
  title?: string;
}

export const ProfileInfoCard = ({ sex, age, height_cm, activity, title }: Props) => {
  const { t, units } = useAppPrefs();
  const sexLabel = sex === "male" ? t("onb.male") : sex === "female" ? t("onb.female") : "—";
  const heightLabel = height_cm != null ? displayLength(height_cm, units, 1) : "—";
  const activityLabel = activity ? ACTIVITY_LABELS[activity] : "—";
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base">{title ?? t("report.profileCard")}</CardTitle>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("onb.sex")}</div>
          <div className="font-medium">{sexLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("onb.age")}</div>
          <div className="font-medium">{age ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("onb.height")}</div>
          <div className="font-medium">{heightLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("onb.activity")}</div>
          <div className="font-medium">{activityLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
};
