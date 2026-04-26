import { Droplet, Bone, User, Heart, Flame, Activity } from "lucide-react";
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

type IconLike = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const ringColorClass = {
  fat: "bg-warning/15 text-warning",
  water: "bg-info/15 text-info",
  muscle: "bg-success/15 text-success",
  bone: "bg-muted text-muted-foreground",
  bmr: "bg-orange-500/15 text-orange-500",
  amr: "bg-yellow-500/15 text-yellow-500",
  bmi: "bg-info/15 text-info",
  category: "bg-warning/15 text-warning",
} as const;

const StatRow = ({
  icon: Icon,
  label,
  value,
  unit,
  variant,
  isLast,
}: {
  icon: IconLike;
  label: string;
  value: string;
  unit?: string;
  variant: keyof typeof ringColorClass;
  isLast?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-4 py-3 px-1",
      !isLast && "border-b border-border/50"
    )}
  >
    <div
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        ringColorClass[variant]
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
    </div>
    <span className="flex-1 text-base">{label}</span>
    <span className="text-muted-foreground text-sm">—</span>
    <span className="tabular-nums text-base font-medium ml-3">
      {value}
      {unit && <span className="ml-1">{unit}</span>}
    </span>
  </div>
);

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

  const bmiCat = bmi != null ? t(bmiCategoryKey(bmi)) : "—";
  const fmtPct = (v: number | null) => (v != null ? `${v.toFixed(0)}%` : "—");

  return (
    <div className="space-y-4">
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

      {/* Stats list (PDF style: 1 row each) */}
      <Card>
        <CardContent className="py-1">
          <StatRow icon={FatCellsIcon} label={`% ${t("dash.fat")}`} value={fmtPct(bodyFat)} variant="fat" />
          <StatRow icon={Droplet} label={`% ${t("dash.water")}`} value={fmtPct(water)} variant="water" />
          <StatRow icon={FlexBicepIcon} label={`% ${t("dash.muscle")}`} value={fmtPct(muscle)} variant="muscle" />
          <StatRow icon={Bone} label={`% ${t("dash.bone")}`} value={fmtPct(bone)} variant="bone" />
          <StatRow
            icon={User}
            label={t("dash.bmi")}
            value={bmi != null ? bmi.toFixed(1) : "—"}
            variant="bmi"
          />
          <StatRow
            icon={Heart}
            label={t("dash.bmiCategory")}
            value={bmiCat}
            variant="category"
          />
          <StatRow
            icon={Flame}
            label="BMR"
            value={bmr != null ? String(bmr) : "—"}
            unit="kcal"
            variant="bmr"
          />
          <StatRow
            icon={Activity}
            label="AMR"
            value={amr != null ? String(amr) : "—"}
            unit="kcal"
            variant="amr"
            isLast
          />
        </CardContent>
      </Card>

      {!hasWeight && (
        <p className="text-center text-xs text-muted-foreground pt-2">{t("dash.firstMeasurement")}</p>
      )}
    </div>
  );
};
