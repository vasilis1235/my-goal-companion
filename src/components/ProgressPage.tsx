// Progress page: master chart + per-metric line charts with time ranges + target line
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppPrefs } from "@/contexts/AppPreferences";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { format } from "date-fns";

type Range = "1d" | "1w" | "1m" | "1y" | "3y" | "5y" | "10y" | "max";

interface Entry {
  recorded_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  water_pct: number | null;
  muscle_pct: number | null;
  bone_pct: number | null;
}

interface Props {
  entries: Entry[];
  targetWeight: number | null;
  idealBodyFat: number | null;
  idealWater: number | null;
  idealMuscle: number | null;
  idealBone: number | null;
}

const RANGE_DAYS: Record<Range, number | null> = {
  "1d": 1, "1w": 7, "1m": 30, "1y": 365,
  "3y": 365 * 3, "5y": 365 * 5, "10y": 365 * 10, "max": null,
};

function filterByRange<T extends { recorded_at: string }>(entries: T[], range: Range): T[] {
  const days = RANGE_DAYS[range];
  if (!days) return entries;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.recorded_at).getTime() >= cutoff);
}

const RangeBar = ({ value, onChange }: { value: Range; onChange: (r: Range) => void }) => {
  const { t } = useAppPrefs();
  const ranges: Range[] = ["1d", "1w", "1m", "1y", "3y", "5y", "10y", "max"];
  return (
    <div className="flex flex-wrap gap-1">
      {ranges.map((r) => (
        <Button
          key={r}
          size="sm"
          variant={value === r ? "default" : "outline"}
          className={cn("h-7 px-2 text-[10px]", value === r && "bg-primary text-primary-foreground")}
          onClick={() => onChange(r)}
        >
          {t(`progress.range.${r}`)}
        </Button>
      ))}
    </div>
  );
};

interface MetricChartProps {
  title: string;
  data: { date: string; value: number | null }[];
  target: number | null;
  unit: string;
  color: string;
}

const MetricChart = ({ title, data, target, unit, color }: MetricChartProps) => {
  const { t } = useAppPrefs();
  const [range, setRange] = useState<Range>("max");
  const filtered = useMemo(() => {
    return filterByRange(data.map((d) => ({ ...d, recorded_at: d.date })), range)
      .map(({ date, value }) => ({ date, value }));
  }, [data, range]);

  const hasData = filtered.some((d) => d.value != null);

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <RangeBar value={range} onChange={setRange} />
        {hasData ? (
          <div className="h-44 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filtered}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => format(new Date(v), "dd/MM")}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  domain={["auto", "auto"]}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelFormatter={(v) => format(new Date(v as string), "dd/MM/yyyy")}
                  formatter={(val: number) => [`${val?.toFixed?.(1)} ${unit}`, title]}
                />
                {target != null && (
                  <ReferenceLine
                    y={target}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 3"
                    label={{
                      value: `${t("progress.targetLine")}: ${target.toFixed(1)}`,
                      fill: "hsl(var(--primary))",
                      fontSize: 9,
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: color }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-8">{t("progress.noData")}</p>
        )}
      </CardContent>
    </Card>
  );
};

export const ProgressPage = ({
  entries, targetWeight, idealBodyFat, idealWater, idealMuscle, idealBone,
}: Props) => {
  const { t } = useAppPrefs();

  // Sort ascending by date for charts
  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()),
    [entries]
  );

  const series = (key: keyof Entry) =>
    sorted.map((e) => ({
      date: e.recorded_at,
      value: (e as any)[key] != null ? Number((e as any)[key]) : null,
    }));

  // Master chart: progress to target weight, normalized 0-100%
  const masterData = useMemo(() => {
    if (!targetWeight || sorted.length < 1) return [];
    const start = Number(sorted[0].weight_kg);
    const total = Math.abs(start - targetWeight);
    return sorted.map((e) => {
      const cur = Number(e.weight_kg);
      const done = Math.abs(start - cur);
      const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
      return { date: e.recorded_at, value: +pct.toFixed(1) };
    });
  }, [sorted, targetWeight]);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-2xl font-bold">{t("progress.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("progress.master")}</p>
      </div>

      {/* Master chart */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("progress.master")}</CardTitle>
        </CardHeader>
        <CardContent>
          {masterData.length > 1 ? (
            <div className="h-56 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={masterData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => format(new Date(v), "dd/MM")}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 100]}
                    width={32}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelFormatter={(v) => format(new Date(v as string), "dd/MM/yyyy")}
                    formatter={(val: number) => [`${val}%`, t("dash.progress")]}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="hsl(var(--success))"
                    strokeDasharray="4 3"
                    label={{ value: t("progress.targetLine"), fill: "hsl(var(--success))", fontSize: 9, position: "insideTopRight" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground py-8">{t("progress.noData")}</p>
          )}
        </CardContent>
      </Card>

      <MetricChart title={t("dash.weight")} data={series("weight_kg")} target={targetWeight} unit="kg" color="hsl(var(--primary))" />
      <MetricChart title={t("dash.fat")} data={series("body_fat_pct")} target={idealBodyFat} unit="%" color="hsl(var(--warning))" />
      <MetricChart title={t("dash.water")} data={series("water_pct")} target={idealWater} unit="%" color="hsl(var(--info))" />
      <MetricChart title={t("dash.muscle")} data={series("muscle_pct")} target={idealMuscle} unit="%" color="hsl(var(--success))" />
      <MetricChart title={t("dash.bone")} data={series("bone_pct")} target={idealBone} unit="%" color="hsl(var(--muted-foreground))" />
    </div>
  );
};
