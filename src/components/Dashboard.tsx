import { Droplet, Bone, User, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { displayWeight } from "@/lib/units";
import { bmiCategoryKey } from "@/lib/i18n";
import { FatCellsIcon, FlexBicepIcon } from "@/components/icons/CustomIcons";

interface DashboardProps {
  weight: number | null;          // kg
  targetWeight: number | null;    // kg
  bodyFat: number | null;         // %
  water: number | null;
  muscle: number | null;
  bone: number | null;
  bmr: number | null;
  amr: number | null;
  bmi: number | null;
  progress: number;
}

export const Dashboard = ({
  weight, targetWeight, bodyFat, water, muscle, bone, bmr, amr, bmi, progress,
}: DashboardProps) => {
  const { t, units } = useAppPrefs();
  const hasWeight = weight != null;
  const ringSize = 240;
  const stroke = 14;
  const radius = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (progress / 100);

  const wDisp = hasWeight ? displayWeight(weight!, units, 1) : "—";
  const tDisp = targetWeight != null ? displayWeight(targetWeight, units, 1) : null;

  // kg για κάθε σύσταση = % × βάρος / 100
  const kgOf = (pct: number | null): string => {
    if (pct == null || weight == null) return "—";
    return displayWeight((pct / 100) * weight, units, 1);
  };

  const bmiCat = bmi != null ? t(bmiCategoryKey(bmi)) : "—";

  return (
    <div className="space-y-5">
      {/* Big circle */}
      <div className="flex flex-col items-center pt-4">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              className="transition-all duration-700"
              style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("dash.weight")}</span>
            <span className="text-5xl font-bold tabular-nums">{wDisp.split(" ")[0]}</span>
            <span className="text-xs text-muted-foreground -mt-1">{wDisp.split(" ")[1] ?? ""}</span>
            {tDisp && (
              <span className="text-xs text-muted-foreground mt-1">
                {t("dash.target")}: <span className="text-primary font-semibold">{tDisp}</span>
              </span>
            )}
          </div>
        </div>
        {tDisp && hasWeight && (
          <p className="text-xs text-muted-foreground mt-2">{t("dash.progress")}: {progress}%</p>
        )}
      </div>

      {/* BMI cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-3 flex items-center gap-3">
            <User className="w-5 h-5 shrink-0 text-info" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider opacity-70 text-info">{t("dash.bmi")}</div>
              <div className="text-lg font-bold tabular-nums text-info">{bmi != null ? bmi.toFixed(1) : "—"}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Heart className="w-5 h-5 shrink-0 text-warning" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider opacity-70 text-warning">{t("dash.bmiCategory")}</div>
              <div className="text-sm font-bold text-warning leading-tight">{bmiCat}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Composition cards */}
      <div className="grid grid-cols-2 gap-3">
        <CompositionCard icon={FatCellsIcon} label={t("dash.fat")} pct={bodyFat} kg={kgOf(bodyFat)} color="warning" />
        <CompositionCard icon={Droplet} label={t("dash.water")} pct={water} kg={kgOf(water)} color="info" />
        <CompositionCard icon={FlexBicepIcon} label={t("dash.muscle")} pct={muscle} kg={kgOf(muscle)} color="success" />
        <CompositionCard icon={Bone} label={t("dash.bone")} pct={bone} kg={kgOf(bone)} color="muted" />
      </div>

      {/* Metabolic */}
      {(bmr != null || amr != null) && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">BMR</div>
                <div className="text-xl font-bold tabular-nums">{bmr ?? "—"}<span className="text-xs font-normal text-muted-foreground ml-1">kcal</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">AMR</div>
                <div className="text-xl font-bold tabular-nums">{amr ?? "—"}<span className="text-xs font-normal text-muted-foreground ml-1">kcal</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasWeight && (
        <p className="text-center text-xs text-muted-foreground pt-2">{t("dash.firstMeasurement")}</p>
      )}
    </div>
  );
};

const colorClasses = {
  warning: "text-warning border-warning/30 bg-warning/5",
  info: "text-info border-info/30 bg-info/5",
  success: "text-success border-success/30 bg-success/5",
  muted: "text-muted-foreground border-border bg-muted/30",
};

type IconLike = React.ComponentType<any>;

const CompositionCard = ({ icon: Icon, label, pct, kg, color }: { icon: IconLike; label: string; pct: number | null; kg: string; color: keyof typeof colorClasses }) => (
  <Card className={cn("border", colorClasses[color])}>
    <CardContent className="p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-bold tabular-nums">
          {pct != null ? pct.toFixed(1) : "—"}<span className="text-xs font-normal opacity-60 ml-0.5">%</span>
        </div>
        <div className="text-[11px] tabular-nums opacity-70">{kg}</div>
      </div>
    </CardContent>
  </Card>
);
