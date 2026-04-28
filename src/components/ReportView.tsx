import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FullReport, MEASUREMENT_LABELS, RATIO_LABELS, UserProfile } from "@/lib/calculations";
import { exportPDF, exportWord } from "@/lib/exporters";
import { FileText, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProfileInfoCard } from "./ProfileInfoCard";
import { useAppPrefs } from "@/contexts/AppPreferences";

interface ReportViewProps {
  profile: UserProfile;
  report: FullReport;
  dateLabel: string;
  displayName: string;
  weightKg: number;
}

const fmt = (n: number, d = 1) => n.toFixed(d);

// Direction logic: based on current vs target.
// "down" = current is above target → must decrease → RED
// "up"   = current is below target → must increase → BLUE
// "ok"   = within tolerance → GREEN
type Dir = "up" | "down" | "ok";
const dirByCurrentTarget = (current: number, target: number, tol = 0.5): Dir => {
  if (Math.abs(current - target) <= tol) return "ok";
  return current > target ? "down" : "up";
};

const colorClass = (dir: Dir) =>
  dir === "ok" ? "text-success" : dir === "down" ? "text-destructive" : "text-sky-400";

const arrowEmoji = (dir: Dir) => (dir === "ok" ? "✅" : dir === "down" ? "🔻" : "🔺");

// Number wrapper: colors only the numeric value, keeps surrounding chars (units/symbols) neutral
const Num = ({ children, dir }: { children: React.ReactNode; dir: Dir }) => (
  <span className={cn("tabular-nums font-semibold", colorClass(dir))}>{children}</span>
);

// Generic scalar row (Weight, BMI, measurements, ratios, BMR, AMR)
const ScalarRow = ({
  label,
  current,
  target,
  unit,
  decimals = 1,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  decimals?: number;
}) => {
  const dir = dirByCurrentTarget(current, target);
  const deltaAbs = Math.abs(current - target);
  const deltaPct = current === 0 ? 0 : (Math.abs(current - target) / current) * 100;
  const u = unit ? ` ${unit}` : "";

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-base text-muted-foreground min-w-[140px]">{label}</span>
        <div className="flex-1 text-right text-base">
          <Num dir={dir}>{fmt(current, decimals)}</Num>
          {unit && <span>{u}</span>}
          <span className="text-muted-foreground mx-2">→</span>
          <span className="text-muted-foreground">Στόχος: </span>
          <Num dir={dir}>{fmt(target, decimals)}</Num>
          {unit && <span>{u}</span>}
        </div>
      </div>
      <div className="text-right text-sm mt-0.5">
        {dir === "ok" ? (
          <span className={colorClass(dir)}>✅ Στόχος επετεύχθη</span>
        ) : (
          <span>
            ({arrowEmoji(dir)} <Num dir={dir}>{fmt(deltaAbs, decimals)}</Num>
            {unit && ` ${unit}`}, {arrowEmoji(dir)} <Num dir={dir}>{fmt(deltaPct, 1)}</Num>%)
          </span>
        )}
      </div>
    </div>
  );
};

// Body composition row: kg first, then %, with triple-stat parens (Δkg, %change, Δpoints)
const CompositionRow = ({
  label, currentPct, targetPct, weightKg,
}: {
  label: string;
  currentPct: number;
  targetPct: number;
  weightKg: number;
}) => {
  const currentKg = (currentPct / 100) * weightKg;
  const targetKg = (targetPct / 100) * weightKg;
  const dir = dirByCurrentTarget(currentPct, targetPct, 0.5);

  const deltaKg = Math.abs(currentKg - targetKg);
  const deltaPctPoints = Math.abs(currentPct - targetPct); // ποσοστιαίες μονάδες
  const pctChange = currentPct === 0 ? 0 : (Math.abs(currentPct - targetPct) / currentPct) * 100; // % μεταβολής

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-base text-muted-foreground min-w-[140px]">{label}</span>
        <div className="flex-1 text-right text-base">
          <Num dir={dir}>{fmt(currentKg)}</Num>
          <span> kg - </span>
          <Num dir={dir}>{fmt(currentPct)}</Num>
          <span> %</span>
          <span className="text-muted-foreground mx-2">→</span>
          <span className="text-muted-foreground">Στόχος: </span>
          <Num dir={dir}>{fmt(targetKg)}</Num>
          <span> kg - </span>
          <Num dir={dir}>{fmt(targetPct)}</Num>
          <span> %</span>
        </div>
      </div>
      <div className="text-right text-sm mt-0.5">
        {dir === "ok" ? (
          <span className={colorClass(dir)}>✅ Στόχος επετεύχθη</span>
        ) : (
          <span>
            ({arrowEmoji(dir)} <Num dir={dir}>{fmt(deltaKg)}</Num> kg, {arrowEmoji(dir)}{" "}
            <Num dir={dir}>{fmt(pctChange)}</Num> %, {arrowEmoji(dir)}{" "}
            <Num dir={dir}>{fmt(deltaPctPoints)}</Num>%)
          </span>
        )}
      </div>
    </div>
  );
};

export const ReportView = ({ profile, report, dateLabel, displayName, weightKg }: ReportViewProps) => {
  const { t } = useAppPrefs();
  const handlePDF = () => {
    try {
      exportPDF(profile, report, dateLabel, displayName, weightKg);
      toast.success(t("export.pdfOk"));
    } catch (e) {
      toast.error("PDF error");
      console.error(e);
    }
  };

  const handleWord = async () => {
    try {
      await exportWord(profile, report, dateLabel, displayName, weightKg);
      toast.success(t("export.wordOk"));
    } catch (e) {
      toast.error("Word error");
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">{t("report.title")}</h2>

      {/* Date */}
      <Card>
        <CardContent className="py-3">
          <p className="text-sm">
            <span className="text-muted-foreground">{t("report.date")}: </span>
            <span className="font-semibold">{dateLabel}</span>
          </p>
        </CardContent>
      </Card>

      {/* Profile info */}
      <ProfileInfoCard
        sex={profile.sex}
        age={profile.age}
        height_cm={profile.height_cm}
        activity={profile.activity_level}
        title={t("report.profileCard")}
      />

      {/* Legend */}
      <Card>
        <CardContent className="py-3 text-sm space-y-1">
          <div className="text-muted-foreground">Σημαίνουν:</div>
          <div>(<span className="text-destructive">🔻</span>) Πρέπει να μειωθεί</div>
          <div>(<span className="text-destructive">🔺</span>) Πρέπει να αυξηθεί</div>
          <div>(<span className="text-success">✅</span>) Στόχος επετεύχθη</div>
          <div className="text-muted-foreground pt-1">
            Κατηγορία: Τρέχον μέτρηση → Στόχος: [Στόχος kg] - [Στόχος %] (Διαφορά kg, % Μεταβολής, Διαφορά Ποσοστιαίων Μονάδων)
          </div>
        </CardContent>
      </Card>

      {/* Σύσταση Σώματος */}
      <h3 className="text-2xl font-bold pt-2">Σύσταση Σώματος</h3>
      <Card>
        <CardContent className="py-1">
          <ScalarRow label="Βάρος" current={report.weight.current} target={report.weight.target} unit="kg" />
          {report.bodyFat && <CompositionRow label="Λίπος" currentPct={report.bodyFat.current} targetPct={report.bodyFat.target} weightKg={weightKg} />}
          {report.water && <CompositionRow label="Υγρά" currentPct={report.water.current} targetPct={report.water.target} weightKg={weightKg} />}
          {report.muscle && <CompositionRow label="Μύες" currentPct={report.muscle.current} targetPct={report.muscle.target} weightKg={weightKg} />}
          {report.bone && <CompositionRow label="Κόκαλα" currentPct={report.bone.current} targetPct={report.bone.target} weightKg={weightKg} />}
          <ScalarRow label="ΔΜΣ" current={report.bmi.current} target={report.bmi.target} unit="μονάδες" />
          <div className="py-3 flex items-baseline gap-3">
            <span className="text-base text-muted-foreground min-w-[140px]">Κατηγορία ΔΜΣ</span>
            <span className="flex-1 text-right text-base font-semibold text-warning">{report.bmiCategory}</span>
          </div>
        </CardContent>
      </Card>

      {/* Περιφέρειες */}
      {Object.keys(report.measurements).length > 0 && (
        <>
          <h3 className="text-2xl font-bold pt-2">Μετρήσεις Σώματος</h3>
          <Card>
            <CardContent className="py-1">
              {Object.entries(report.measurements).map(([k, d]) =>
                d ? <ScalarRow key={k} label={MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS]} current={d.current} target={d.target} unit="εκ." /> : null
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Αναλογίες */}
      {Object.keys(report.ratios).length > 0 && (
        <>
          <h3 className="text-2xl font-bold pt-2">Αναλογίες Σώματος</h3>
          <Card>
            <CardContent className="py-1">
              {Object.entries(report.ratios).map(([k, d]) =>
                d ? (
                  <ScalarRow
                    key={k}
                    label={RATIO_LABELS[k as keyof typeof RATIO_LABELS]}
                    current={d.current}
                    target={d.target}
                    unit=""
                    decimals={2}
                  />
                ) : null
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Μεταβολικά */}
      <h3 className="text-2xl font-bold pt-2">Μεταβολικά Δεδομένα</h3>
      <Card>
        <CardContent className="py-1">
          <ScalarRow label="BMR" current={report.bmr.current} target={report.bmr.target} unit="kcal" decimals={0} />
          <ScalarRow label="AMR" current={report.amr.current} target={report.amr.target} unit="kcal" decimals={0} />
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Εξαγωγή αναφοράς</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handlePDF}>
            <FileText className="w-4 h-4 mr-2" /> Εξαγωγή PDF
          </Button>
          <Button variant="outline" onClick={handleWord}>
            <FileType className="w-4 h-4 mr-2" /> Εξαγωγή Word
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
