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

type Dir = "up" | "down" | "ok";
const dirOf = (deltaAbs: number, deltaPct: number, tol = 1): Dir => {
  if (Math.abs(deltaPct) <= tol) return "ok";
  // deltaAbs = target - current. Αν θετικό → πρέπει να αυξηθεί
  return deltaAbs > 0 ? "up" : "down";
};

const DirGlyph = ({ dir, className }: { dir: Dir; className?: string }) => {
  const cls = cn(
    "inline-block",
    dir === "ok" ? "text-success" : dir === "down" ? "text-destructive" : "text-info",
    className,
  );
  return <span className={cls}>{dir === "ok" ? "✅" : dir === "down" ? "▼" : "▲"}</span>;
};

// Generic row: label | current → target  + (Δabs unit, Δpct%)
const ScalarRow = ({
  label,
  current,
  target,
  deltaAbs,
  deltaPct,
  unit,
  decimals = 1,
}: {
  label: string;
  current: number;
  target: number;
  deltaAbs: number;
  deltaPct: number;
  unit: string;
  decimals?: number;
}) => {
  const dir = dirOf(deltaAbs, deltaPct);
  const targetColor = dir === "ok" ? "text-success" : "text-destructive";
  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-base text-muted-foreground min-w-[140px]">{label}</span>
        <div className="flex-1 text-right tabular-nums">
          <span className="text-base">{fmt(current, decimals)}{unit ? ` ${unit}` : ""}</span>
          <span className="text-muted-foreground mx-2">→</span>
          <span className={cn("text-base font-semibold", targetColor)}>{fmt(target, decimals)}{unit ? ` ${unit}` : ""}</span>
        </div>
      </div>
      <div className="text-right text-sm tabular-nums mt-0.5">
        {dir === "ok" ? (
          <span className="text-success">✅ Στόχος επετεύχθη</span>
        ) : (
          <span className="text-destructive">
            ( <DirGlyph dir={dir} /> {fmt(Math.abs(deltaAbs), decimals)}{unit ? ` ${unit}` : ""},{" "}
            <DirGlyph dir={dir} /> {fmt(Math.abs(deltaPct), 1)}%)
          </span>
        )}
      </div>
    </div>
  );
};

// Σύσταση σώματος row: % - kg → % - kg + (Δ%, % απομένει, Δkg)
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
  const deltaPctSigned = targetPct - currentPct; // αν θετικό → πρέπει να αυξηθεί
  const remainingPct = currentPct === 0 ? 0 : (Math.abs(deltaPctSigned) / currentPct) * 100;
  const deltaKgAbs = Math.abs(currentKg - targetKg);

  const isOk = Math.abs(deltaPctSigned) <= 0.5;
  const dir: Dir = isOk ? "ok" : deltaPctSigned > 0 ? "up" : "down";
  const targetColor = isOk ? "text-success" : "text-destructive";

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-base text-muted-foreground min-w-[140px]">{label}</span>
        <div className="flex-1 text-right tabular-nums">
          <span className="text-base">{fmt(currentPct)} % - {fmt(currentKg)} kg</span>
          <span className="text-muted-foreground mx-2">→</span>
          <span className={cn("text-base font-semibold", targetColor)}>{fmt(targetPct)} % - {fmt(targetKg)} kg</span>
        </div>
      </div>
      <div className="text-right text-sm tabular-nums mt-0.5">
        {isOk ? (
          <span className="text-success">✅ Στόχος επετεύχθη</span>
        ) : (
          <span className="text-destructive">
            ( <DirGlyph dir={dir} /> {fmt(Math.abs(deltaPctSigned))} %,{" "}
            <DirGlyph dir={dir} /> {fmt(remainingPct)}%,{" "}
            <DirGlyph dir={dir} /> {fmt(deltaKgAbs)} kg)
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

  const bmrDir = dirOf(report.bmr.target - report.bmr.current,
    report.bmr.current === 0 ? 0 : ((report.bmr.target - report.bmr.current) / report.bmr.current) * 100);
  const amrDir = dirOf(report.amr.target - report.amr.current,
    report.amr.current === 0 ? 0 : ((report.amr.target - report.amr.current) / report.amr.current) * 100);

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
          <div>(<span className="text-destructive">▼</span>) Πρέπει να μειωθεί</div>
          <div>(<span className="text-info">▲</span>) Πρέπει να αυξηθεί</div>
          <div>(<span className="text-success">✅</span>) Στόχος επετεύχθη</div>
          <div className="text-muted-foreground pt-1">
            Κατηγορία: Τρέχον μέτρηση → Στόχος (Διαφορά, %, kg)
          </div>
        </CardContent>
      </Card>

      {/* Σύσταση Σώματος */}
      <h3 className="text-2xl font-bold pt-2">Σύσταση Σώματος</h3>
      <Card>
        <CardContent className="py-1">
          <ScalarRow label="Βάρος" {...report.weight} unit="kg" />
          {report.bodyFat && <CompositionRow label="Λίπος" currentPct={report.bodyFat.current} targetPct={report.bodyFat.target} weightKg={weightKg} />}
          {report.water && <CompositionRow label="Υγρά" currentPct={report.water.current} targetPct={report.water.target} weightKg={weightKg} />}
          {report.muscle && <CompositionRow label="Μύες" currentPct={report.muscle.current} targetPct={report.muscle.target} weightKg={weightKg} />}
          {report.bone && <CompositionRow label="Κόκαλα" currentPct={report.bone.current} targetPct={report.bone.target} weightKg={weightKg} />}
          <ScalarRow label="ΔΜΣ" {...report.bmi} unit="μονάδες" />
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
                d ? <ScalarRow key={k} label={MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS]} {...d} unit="εκ." /> : null
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
                    deltaAbs={d.deltaAbs}
                    deltaPct={d.deltaPct}
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
          <ScalarRow
            label="BMR"
            current={report.bmr.current}
            target={report.bmr.target}
            deltaAbs={report.bmr.target - report.bmr.current}
            deltaPct={report.bmr.current === 0 ? 0 : ((report.bmr.target - report.bmr.current) / report.bmr.current) * 100}
            unit="kcal"
            decimals={0}
          />
          <ScalarRow
            label="AMR"
            current={report.amr.current}
            target={report.amr.target}
            deltaAbs={report.amr.target - report.amr.current}
            deltaPct={report.amr.current === 0 ? 0 : ((report.amr.target - report.amr.current) / report.amr.current) * 100}
            unit="kcal"
            decimals={0}
          />
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
