import { Activity, Droplet, Dumbbell, Bone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DashboardProps {
  displayName: string;
  weight: number | null;
  targetWeight: number | null;
  bodyFat: number | null;
  water: number | null;
  muscle: number | null;
  bone: number | null;
  bmr: number | null;
  amr: number | null;
  progress: number;
}

export const Dashboard = ({
  displayName, weight, targetWeight, bodyFat, water, muscle, bone, bmr, amr, progress
}: DashboardProps) => {
  const hasWeight = weight != null;
  const ringSize = 240;
  const stroke = 14;
  const radius = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (progress / 100);

  return (
    <div className="space-y-5">
      {/* Big circle */}
      <div className="flex flex-col items-center pt-4">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth={stroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Βάρος (kg)</span>
            <span className="text-5xl font-bold tabular-nums">
              {hasWeight ? weight!.toFixed(1) : "—"}
            </span>
            {targetWeight != null && (
              <span className="text-xs text-muted-foreground mt-1">
                Στόχος: <span className="text-primary font-semibold">{targetWeight.toFixed(1)} kg</span>
              </span>
            )}
          </div>
        </div>
        {targetWeight != null && hasWeight && (
          <p className="text-xs text-muted-foreground mt-2">Πρόοδος: {progress}%</p>
        )}
      </div>

      {/* Composition cards */}
      <div className="grid grid-cols-2 gap-3">
        <CompositionCard icon={Activity} label="Λίπος" value={bodyFat} unit="%" color="warning" />
        <CompositionCard icon={Droplet} label="Υγρά" value={water} unit="%" color="info" />
        <CompositionCard icon={Dumbbell} label="Μύες" value={muscle} unit="%" color="success" />
        <CompositionCard icon={Bone} label="Κόκαλα" value={bone} unit="%" color="muted" />
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

      <p className="text-center text-xs text-muted-foreground pt-2">
        {hasWeight ? "Δες αναλυτική Αναφορά για στόχους & αναλογίες" : "Πάτα «Νέα» για την πρώτη σου μέτρηση"}
      </p>
    </div>
  );
};

const colorClasses = {
  warning: "text-warning border-warning/30 bg-warning/5",
  info: "text-info border-info/30 bg-info/5",
  success: "text-success border-success/30 bg-success/5",
  muted: "text-muted-foreground border-border bg-muted/30",
};

const CompositionCard = ({ icon: Icon, label, value, unit, color }: { icon: typeof Activity; label: string; value: number | null; unit: string; color: keyof typeof colorClasses }) => (
  <Card className={cn("border", colorClasses[color])}>
    <CardContent className="p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-bold tabular-nums">
          {value != null ? value.toFixed(1) : "—"}
          <span className="text-xs font-normal opacity-60 ml-0.5">{unit}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);
