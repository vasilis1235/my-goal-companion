import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FullReport, MEASUREMENT_LABELS, RATIO_LABELS, MEASUREMENT_KIND, RATIO_KIND, UserProfile,
} from "@/lib/calculations";
import { exportPDF, exportWord } from "@/lib/exporters";
import { FileText, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProfileInfoCard } from "./ProfileInfoCard";
import { useAppPrefs } from "@/contexts/AppPreferences";
import { MetricBox } from "./MetricBox";
import { MetricKind } from "@/lib/zoneAnalysis";

interface ReportViewProps {
  profile: UserProfile;
  report: FullReport;
  dateLabel: string;
  displayName: string;
  weightKg: number;
}

const fmt = (n: number, d = 1) => n.toFixed(d);

type Dir = "up" | "down" | "ok";
const dirByCurrentTarget = (current: number, target: number, tol = 0.5): Dir => {
  if (Math.abs(current - target) <= tol) return "ok";
  return current > target ? "down" : "up";
};
const colorClass = (dir: Dir) =>
  dir === "ok" ? "text-success" : dir === "down" ? "text-destructive" : "text-sky-400";
const arrow = (dir: Dir) => (dir === "ok" ? "✅" : dir === "down" ? "🔻" : "🔺");

const Num = ({ children, dir }: { children: React.ReactNode; dir: Dir }) => (
  <span className={cn("tabular-nums font-semibold", colorClass(dir))}>{children}</span>
);

// ── Stat row inside a MetricBox ──
const StatLine = ({
  label, value, accent,
}: { label: string; value: React.ReactNode; accent?: boolean }) => (
  <div className="flex items-baseline justify-between gap-2 py-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn("text-sm tabular-nums", accent && "font-semibold")}>{value}</span>
  </div>
);

// ── Scalar metric (weight, BMI, measurements, ratios, BMR, AMR) ──
const ScalarMetric = ({
  label, kind, current, target, unit, decimals = 1,
}: {
  label: string; kind: MetricKind;
  current: number; target: number; unit: string; decimals?: number;
}) => {
  const dir = dirByCurrentTarget(current, target);
  const deltaAbs = Math.abs(current - target);
  const deltaPct = current === 0 ? 0 : (Math.abs(current - target) / current) * 100;
  const u = unit ? ` ${unit}` : "";

  return (
    <MetricBox title={label} kind={kind} current={current} target={target}>
      <StatLine label="Τρέχον" value={<><Num dir={dir}>{fmt(current, decimals)}</Num>{u}</>} accent />
      <StatLine label="Στόχος" value={<><Num dir={dir}>{fmt(target, decimals)}</Num>{u}</>} />
      <StatLine
        label="Απόλυτη διαφορά"
        value={
          dir === "ok" ? (
            <span className="text-success">✅ Στόχος επετεύχθη</span>
          ) : (
            <span>
              {arrow(dir)} <Num dir={dir}>{fmt(deltaAbs, decimals)}</Num>{u} (<Num dir={dir}>{fmt(deltaPct, 1)}</Num>%)
            </span>
          )
        }
      />
    </MetricBox>
  );
};

// ── Body composition (kg + %) ──
const CompositionMetric = ({
  label, kind, currentPct, targetPct, weightKg,
}: {
  label: string; kind: MetricKind;
  currentPct: number; targetPct: number; weightKg: number;
}) => {
  const currentKg = (currentPct / 100) * weightKg;
  const targetKg = (targetPct / 100) * weightKg;
  const dir = dirByCurrentTarget(currentPct, targetPct, 0.5);
  const deltaKg = Math.abs(currentKg - targetKg);
  const deltaPctPoints = Math.abs(currentPct - targetPct);
  const pctChange = currentPct === 0 ? 0 : (Math.abs(currentPct - targetPct) / currentPct) * 100;

  return (
    <MetricBox title={label} kind={kind} current={currentPct} target={targetPct}>
      <StatLine
        label="Τρέχον"
        accent
        value={<><Num dir={dir}>{fmt(currentKg)}</Num> kg · <Num dir={dir}>{fmt(currentPct)}</Num>%</>}
      />
      <StatLine
        label="Στόχος"
        value={<><Num dir={dir}>{fmt(targetKg)}</Num> kg · <Num dir={dir}>{fmt(targetPct)}</Num>%</>}
      />
      <StatLine
        label="Απόλυτη διαφορά"
        value={
          dir === "ok" ? (
            <span className="text-success">✅ Στόχος επετεύχθη</span>
          ) : (
            <span>
              {arrow(dir)} <Num dir={dir}>{fmt(deltaKg)}</Num> kg, <Num dir={dir}>{fmt(pctChange)}</Num>%, <Num dir={dir}>{fmt(deltaPctPoints)}</Num>pp
            </span>
          )
        }
      />
    </MetricBox>
  );
};

export const ReportView = ({ profile, report, dateLabel, displayName, weightKg }: ReportViewProps) => {
  const { t } = useAppPrefs();

  const handlePDF = async () => {
    try {
      await exportPDF(profile, report, dateLabel, displayName, weightKg, "report-export-root");
      toast.success(t("export.pdfOk"));
    } catch (e) { toast.error("PDF error"); console.error(e); }
  };
  const handleWord = async () => {
    try {
      await exportWord(profile, report, dateLabel, displayName, weightKg);
      toast.success(t("export.wordOk"));
    } catch (e) { toast.error("Word error"); console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div id="report-export-root" className="space-y-4 bg-background p-2">
        <h2 className="text-3xl font-bold">{t("report.title")}</h2>

        <Card>
          <CardContent className="py-3">
            <p className="text-sm">
              <span className="text-muted-foreground">{t("report.date")}: </span>
              <span className="font-semibold">{dateLabel}</span>
            </p>
          </CardContent>
        </Card>

        <ProfileInfoCard
          sex={profile.sex}
          age={profile.age}
          height_cm={profile.height_cm}
          activity={profile.activity_level}
          title={t("report.profileCard")}
        />

        <Card>
          <CardContent className="py-3 text-xs space-y-1 text-muted-foreground">
            <div>Πατήστε στο σχόλιο (⚠️ / ✅) κάθε στοιχείου για επιστημονική ανάλυση & πηγές.</div>
            <div>(<span className="text-destructive">🔻</span>) πρέπει να μειωθεί · (<span className="text-sky-400">🔺</span>) πρέπει να αυξηθεί · (<span className="text-success">✅</span>) στόχος επετεύχθη</div>
          </CardContent>
        </Card>

        <h3 className="text-2xl font-bold pt-2">Σύσταση σώματος</h3>
        <ScalarMetric label="Ιδανικό βάρος (IBW)" kind="weight" current={report.weight.current} target={report.weight.target} unit="kg" />
        {report.bodyFat && <CompositionMetric label="Λίπος (BF%)" kind="body_fat" currentPct={report.bodyFat.current} targetPct={report.bodyFat.target} weightKg={weightKg} />}
        {report.water && <CompositionMetric label="Υγρά (TBW)" kind="water" currentPct={report.water.current} targetPct={report.water.target} weightKg={weightKg} />}
        {report.muscle && <CompositionMetric label="Μύες (SMM%)" kind="muscle" currentPct={report.muscle.current} targetPct={report.muscle.target} weightKg={weightKg} />}
        {report.bone && <CompositionMetric label="Κόκαλα (BMM%)" kind="bone" currentPct={report.bone.current} targetPct={report.bone.target} weightKg={weightKg} />}
        <ScalarMetric label="Δείκτης μάζας σώματος (BMI)" kind="weight" current={report.bmi.current} target={report.bmi.target} unit="μονάδες" />
        <Card>
          <CardContent className="py-3 flex items-baseline gap-3">
            <span className="text-sm text-muted-foreground min-w-[140px]">Κατηγορία ΔΜΣ</span>
            <span className="flex-1 text-right text-base font-semibold text-warning">{report.bmiCategory}</span>
          </CardContent>
        </Card>

        {Object.keys(report.measurements).length > 0 && (
          <>
            <h3 className="text-2xl font-bold pt-2">Μετρήσεις σώματος</h3>
            {Object.entries(report.measurements).map(([k, d]) =>
              d ? (
                <ScalarMetric
                  key={k}
                  label={MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS]}
                  kind={MEASUREMENT_KIND[k as keyof typeof MEASUREMENT_KIND]}
                  current={d.current}
                  target={d.target}
                  unit="εκ."
                />
              ) : null
            )}
          </>
        )}

        {Object.keys(report.ratios).length > 0 && (
          <>
            <h3 className="text-2xl font-bold pt-2">Αναλογίες σώματος</h3>
            {Object.entries(report.ratios).map(([k, d]) =>
              d ? (
                <ScalarMetric
                  key={k}
                  label={RATIO_LABELS[k as keyof typeof RATIO_LABELS]}
                  kind={RATIO_KIND[k as keyof typeof RATIO_KIND]}
                  current={d.current}
                  target={d.target}
                  unit=""
                  decimals={2}
                />
              ) : null
            )}
          </>
        )}

        <h3 className="text-2xl font-bold pt-2">Μεταβολικά δεδομένα</h3>
        <ScalarMetric label="Βασικός μεταβολισμός (BMR)" kind="weight" current={report.bmr.current} target={report.bmr.target} unit="kcal" decimals={0} />
        <ScalarMetric label="Συνολικός μεταβολισμός (AMR)" kind="weight" current={report.amr.current} target={report.amr.target} unit="kcal" decimals={0} />
      </div>

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
