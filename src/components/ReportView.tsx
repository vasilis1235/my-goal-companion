import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullReport, MEASUREMENT_LABELS, RATIO_LABELS, UserProfile, ACTIVITY_LABELS } from "@/lib/calculations";
import { exportPDF, exportWord } from "@/lib/exporters";
import { FileText, FileType, TrendingDown, TrendingUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProfileInfoCard } from "./ProfileInfoCard";
import { useAppPrefs } from "@/contexts/AppPreferences";

interface ReportViewProps {
  profile: UserProfile;
  report: FullReport;
  dateLabel: string;
  displayName: string;
}

const fmt = (n: number, d = 1) => n.toFixed(d);

const DiffRow = ({
  label, current, target, deltaAbs, deltaPct, unit, direction,
}: {
  label: string;
  current: number;
  target: number;
  deltaAbs: number;
  deltaPct: number;
  unit: string;
  direction?: "up" | "down" | "ok";
}) => {
  const dir = direction ?? (Math.abs(deltaPct) <= 3 ? "ok" : deltaAbs > 0 ? "up" : "down");
  const Icon = dir === "ok" ? Check : dir === "up" ? TrendingUp : TrendingDown;
  const color =
    dir === "ok" ? "text-success" :
    dir === "up" ? "text-info" :
    "text-warning";

  return (
    <div className="py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", color)} />
      </div>
      <div className="flex items-baseline gap-2 mt-1 text-sm">
        <span className="tabular-nums">{fmt(current)}{unit}</span>
        <span className="text-muted-foreground">→</span>
        <span className="tabular-nums font-semibold text-primary">{fmt(target)}{unit}</span>
      </div>
      <div className={cn("text-xs mt-0.5 tabular-nums", color)}>
        {dir === "ok" ? "✅ Στόχος επετεύχθη" : `${dir === "up" ? "▲" : "▼"} ${fmt(Math.abs(deltaAbs))}${unit} (${fmt(Math.abs(deltaPct))}%)`}
      </div>
    </div>
  );
};

export const ReportView = ({ profile, report, dateLabel, displayName }: ReportViewProps) => {
  const { t } = useAppPrefs();
  const handlePDF = () => {
    try {
      exportPDF(profile, report, dateLabel, displayName);
      toast.success(t("export.pdfOk"));
    } catch (e) {
      toast.error("PDF error");
      console.error(e);
    }
  };

  const handleWord = async () => {
    try {
      await exportWord(profile, report, dateLabel, displayName);
      toast.success(t("export.wordOk"));
    } catch (e) {
      toast.error("Word error");
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t("report.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("report.date")}: {dateLabel}</p>
      </div>

      {/* Profile info card (Prompt 1: between date and legend) */}
      <ProfileInfoCard
        sex={profile.sex}
        age={profile.age}
        height_cm={profile.height_cm}
        activity={profile.activity_level}
        title={t("report.profileCard")}
      />

      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><Check className="w-3 h-3 text-success" /> Στόχος επετεύχθη</Badge>
            <Badge variant="outline" className="gap-1"><TrendingDown className="w-3 h-3 text-warning" /> Πρέπει να μειωθεί</Badge>
            <Badge variant="outline" className="gap-1"><TrendingUp className="w-3 h-3 text-info" /> Πρέπει να αυξηθεί</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Σύσταση Σώματος */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Σύσταση Σώματος</CardTitle></CardHeader>
        <CardContent>
          <DiffRow label="Βάρος" {...report.weight} unit=" kg" />
          <DiffRow label="ΔΜΣ (BMI)" {...report.bmi} unit="" />
          <div className="py-2 text-sm">
            <span className="text-muted-foreground">Κατηγορία ΔΜΣ: </span>
            <span className="font-semibold text-warning">{report.bmiCategory}</span>
          </div>
          {report.bodyFat && <DiffRow label="Λίπος" {...report.bodyFat} unit=" %" />}
          {report.water && <DiffRow label="Υγρά" {...report.water} unit=" %" />}
          {report.muscle && <DiffRow label="Μύες" {...report.muscle} unit=" %" />}
          {report.bone && <DiffRow label="Κόκαλα" {...report.bone} unit=" %" />}
        </CardContent>
      </Card>

      {/* Περιφέρειες */}
      {Object.keys(report.measurements).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Περιφέρειες</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(report.measurements).map(([k, d]) =>
              d ? <DiffRow key={k} label={MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS]} {...d} unit=" εκ." /> : null
            )}
          </CardContent>
        </Card>
      )}

      {/* Αναλογίες */}
      {Object.keys(report.ratios).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Αναλογίες Σώματος</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(report.ratios).map(([k, d]) =>
              d ? (
                <DiffRow
                  key={k}
                  label={RATIO_LABELS[k as keyof typeof RATIO_LABELS]}
                  current={d.current}
                  target={d.target}
                  deltaAbs={d.deltaAbs}
                  deltaPct={d.deltaPct}
                  unit=""
                />
              ) : null
            )}
          </CardContent>
        </Card>
      )}

      {/* Μεταβολικά */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Μεταβολικά Δεδομένα</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm">BMR</span>
            <div className="text-sm tabular-nums">
              {report.bmr.current} kcal <span className="text-muted-foreground">→</span> <span className="font-semibold text-primary">{report.bmr.target} kcal</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm">AMR</span>
            <div className="text-sm tabular-nums">
              {report.amr.current} kcal <span className="text-muted-foreground">→</span> <span className="font-semibold text-primary">{report.amr.target} kcal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Εξαγωγή αναφοράς</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handlePDF}>
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" onClick={handleWord}>
            <FileType className="w-4 h-4 mr-2" /> Word
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
