// Εξαγωγή αναφοράς & διατροφικών στόχων σε PDF & Word
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { FullReport, MEASUREMENT_LABELS, RATIO_LABELS, UserProfile, ACTIVITY_LABELS } from "./calculations";
import { NutritionResult, fmtKcal, fmtNum } from "./nutrition";

const fmt = (n: number, d = 1) => n.toFixed(d);
type Dir = "up" | "down" | "ok";
const dirOf = (deltaAbs: number, deltaPct: number, tol = 1): Dir => {
  if (Math.abs(deltaPct) <= tol) return "ok";
  return deltaAbs > 0 ? "up" : "down";
};
const arrow = (d: Dir) => (d === "up" ? "▲" : d === "down" ? "▼" : "✅");

// ============ PDF EXPORT ============
export function exportPDF(profile: UserProfile, report: FullReport, dateLabel: string, displayName: string, weightKg: number) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 50;
  const margin = 40;
  const lineH = 16;

  const ensure = (extra = 0) => { if (y + extra > 800) { doc.addPage(); y = 50; } };

  const text = (s: string, x: number, opts: { bold?: boolean; size?: number; color?: [number, number, number]; align?: "left" | "right" } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    if (opts.color) doc.setTextColor(...opts.color); else doc.setTextColor(20, 20, 30);
    doc.text(s, x, y, { align: opts.align ?? "left" });
  };

  const sectionTitle = (title: string) => {
    y += 12; ensure(28);
    text(title, margin, { bold: true, size: 16 });
    y += 6;
    doc.setDrawColor(60, 60, 80);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // Row: label left, "current → target" right, then "(▼ Δ unit, ▼ Δ%)" on next line right-aligned
  const scalarRow = (label: string, current: number, target: number, deltaAbs: number, deltaPct: number, unit: string, decimals = 1) => {
    ensure(40);
    const dir = dirOf(deltaAbs, deltaPct);
    const okColor: [number, number, number] = [40, 160, 80];
    const badColor: [number, number, number] = [220, 60, 60];
    const targetColor = dir === "ok" ? okColor : badColor;

    text(label, margin, { color: [120, 120, 130], size: 11 });
    const main = `${fmt(current, decimals)}${unit ? " " + unit : ""}  →  ${fmt(target, decimals)}${unit ? " " + unit : ""}`;
    // current part normal, then arrow, then target colored
    const currentStr = `${fmt(current, decimals)}${unit ? " " + unit : ""}`;
    const arrowStr = "  →  ";
    const targetStr = `${fmt(target, decimals)}${unit ? " " + unit : ""}`;

    // Right-aligned manual layout
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(20, 20, 30);
    const targetW = doc.getTextWidth(targetStr);
    const arrowW = doc.getTextWidth(arrowStr);
    const currentW = doc.getTextWidth(currentStr);
    const rightX = pageW - margin;
    const targetX = rightX - targetW;
    const arrowX = targetX - arrowW;
    const currentX = arrowX - currentW;
    text(currentStr, currentX, { size: 11 });
    text(arrowStr, arrowX, { size: 11, color: [120, 120, 130] });
    text(targetStr, targetX, { size: 11, bold: true, color: targetColor });
    y += lineH;

    // Delta line
    if (dir === "ok") {
      text("✅ Στόχος επετεύχθη", rightX, { align: "right", color: okColor, size: 10 });
    } else {
      const deltaStr = `( ${arrow(dir)} ${fmt(Math.abs(deltaAbs), decimals)}${unit ? " " + unit : ""}, ${arrow(dir)} ${fmt(Math.abs(deltaPct), 1)}%)`;
      text(deltaStr, rightX, { align: "right", color: badColor, size: 10 });
    }
    y += lineH - 2;
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const compositionRow = (label: string, currentPct: number, targetPct: number) => {
    ensure(40);
    const currentKg = (currentPct / 100) * weightKg;
    const targetKg = (targetPct / 100) * weightKg;
    const deltaPctSigned = targetPct - currentPct;
    const remainingPct = currentPct === 0 ? 0 : (Math.abs(deltaPctSigned) / currentPct) * 100;
    const deltaKgAbs = Math.abs(currentKg - targetKg);
    const isOk = Math.abs(deltaPctSigned) <= 0.5;
    const dir: Dir = isOk ? "ok" : deltaPctSigned > 0 ? "up" : "down";
    const okColor: [number, number, number] = [40, 160, 80];
    const badColor: [number, number, number] = [220, 60, 60];
    const targetColor = isOk ? okColor : badColor;

    text(label, margin, { color: [120, 120, 130], size: 11 });

    const currentStr = `${fmt(currentPct)} % - ${fmt(currentKg)} kg`;
    const arrowStr = "  →  ";
    const targetStr = `${fmt(targetPct)} % - ${fmt(targetKg)} kg`;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    const rightX = pageW - margin;
    const targetW = doc.getTextWidth(targetStr);
    const arrowW = doc.getTextWidth(arrowStr);
    const currentW = doc.getTextWidth(currentStr);
    const targetX = rightX - targetW;
    const arrowX = targetX - arrowW;
    const currentX = arrowX - currentW;
    text(currentStr, currentX, { size: 11 });
    text(arrowStr, arrowX, { size: 11, color: [120, 120, 130] });
    text(targetStr, targetX, { size: 11, bold: true, color: targetColor });
    y += lineH;

    if (isOk) {
      text("✅ Στόχος επετεύχθη", rightX, { align: "right", color: okColor, size: 10 });
    } else {
      const deltaStr = `( ${arrow(dir)} ${fmt(Math.abs(deltaPctSigned))} %, ${arrow(dir)} ${fmt(remainingPct)}%, ${arrow(dir)} ${fmt(deltaKgAbs)} kg)`;
      text(deltaStr, rightX, { align: "right", color: badColor, size: 10 });
    }
    y += lineH - 2;
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  // Header
  doc.setFillColor(15, 20, 40);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("Αναφορά", margin, 35);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${displayName}`, margin, 55);
  y = 100;

  text(`Ημερομηνία μέτρησης: ${dateLabel}`, margin, { bold: true, size: 12 });
  y += lineH + 4;
  text(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm · Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`, margin, { size: 10, color: [100, 100, 110] });
  y += lineH + 4;

  // Legend
  text("Σημαίνουν:", margin, { bold: true, size: 10, color: [120, 120, 130] }); y += lineH;
  text("(▼) Πρέπει να μειωθεί", margin, { size: 10, color: [220, 60, 60] }); y += lineH;
  text("(▲) Πρέπει να αυξηθεί", margin, { size: 10, color: [60, 120, 220] }); y += lineH;
  text("(✅) Στόχος επετεύχθη", margin, { size: 10, color: [40, 160, 80] }); y += lineH;
  text("Κατηγορία: Τρέχον μέτρηση → Στόχος (Διαφορά, %, kg)", margin, { size: 10, color: [120, 120, 130] }); y += lineH;

  // Σύσταση Σώματος
  sectionTitle("Σύσταση Σώματος");
  scalarRow("Βάρος", report.weight.current, report.weight.target, report.weight.deltaAbs, report.weight.deltaPct, "kg");
  if (report.bodyFat) compositionRow("Λίπος", report.bodyFat.current, report.bodyFat.target);
  if (report.water) compositionRow("Υγρά", report.water.current, report.water.target);
  if (report.muscle) compositionRow("Μύες", report.muscle.current, report.muscle.target);
  if (report.bone) compositionRow("Κόκαλα", report.bone.current, report.bone.target);
  scalarRow("ΔΜΣ", report.bmi.current, report.bmi.target, report.bmi.deltaAbs, report.bmi.deltaPct, "μονάδες");
  ensure(20);
  text("Κατηγορία ΔΜΣ", margin, { color: [120, 120, 130], size: 11 });
  text(report.bmiCategory, pageW - margin, { align: "right", size: 11, bold: true, color: [220, 130, 40] });
  y += lineH + 4;

  // Μετρήσεις
  if (Object.keys(report.measurements).length > 0) {
    sectionTitle("Μετρήσεις Σώματος");
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) scalarRow(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d.current, d.target, d.deltaAbs, d.deltaPct, "εκ.");
    }
  }

  // Αναλογίες
  if (Object.keys(report.ratios).length > 0) {
    sectionTitle("Αναλογίες Σώματος");
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) scalarRow(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d.current, d.target, d.deltaAbs, d.deltaPct, "", 2);
    }
  }

  // Μεταβολικά
  sectionTitle("Μεταβολικά Δεδομένα");
  scalarRow("BMR", report.bmr.current, report.bmr.target,
    report.bmr.target - report.bmr.current,
    report.bmr.current === 0 ? 0 : ((report.bmr.target - report.bmr.current) / report.bmr.current) * 100,
    "kcal", 0);
  scalarRow("AMR", report.amr.current, report.amr.target,
    report.amr.target - report.amr.current,
    report.amr.current === 0 ? 0 : ((report.amr.target - report.amr.current) / report.amr.current) * 100,
    "kcal", 0);

  doc.save(`fitness-report-${dateLabel}.pdf`);
}

// ============ WORD EXPORT ============
export async function exportWord(profile: UserProfile, report: FullReport, dateLabel: string, displayName: string, weightKg: number) {
  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string; align?: AlignmentType } = {}) =>
    new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, color: opts.color, font: "Calibri" })],
    });

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 140 },
      children: [new TextRun({ text, bold: true, size: 32, color: "1A1A2E" })],
    });

  const scalarParas = (label: string, current: number, target: number, deltaAbs: number, deltaPct: number, unit: string, decimals = 1): Paragraph[] => {
    const dir = dirOf(deltaAbs, deltaPct);
    const targetColor = dir === "ok" ? "28A050" : "DC3C3C";
    const u = unit ? ` ${unit}` : "";
    const main = new Paragraph({
      children: [
        new TextRun({ text: `${label}    `, color: "707080", size: 22, font: "Calibri" }),
        new TextRun({ text: `${fmt(current, decimals)}${u}`, size: 22, font: "Calibri" }),
        new TextRun({ text: "  →  ", color: "707080", size: 22, font: "Calibri" }),
        new TextRun({ text: `${fmt(target, decimals)}${u}`, bold: true, color: targetColor, size: 22, font: "Calibri" }),
      ],
    });
    const deltaText = dir === "ok"
      ? "✅ Στόχος επετεύχθη"
      : `( ${arrow(dir)} ${fmt(Math.abs(deltaAbs), decimals)}${u}, ${arrow(dir)} ${fmt(Math.abs(deltaPct), 1)}%)`;
    const delta = new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: deltaText, color: dir === "ok" ? "28A050" : "DC3C3C", size: 20, font: "Calibri" })],
    });
    return [main, delta];
  };

  const compositionParas = (label: string, currentPct: number, targetPct: number): Paragraph[] => {
    const currentKg = (currentPct / 100) * weightKg;
    const targetKg = (targetPct / 100) * weightKg;
    const deltaPctSigned = targetPct - currentPct;
    const remainingPct = currentPct === 0 ? 0 : (Math.abs(deltaPctSigned) / currentPct) * 100;
    const deltaKgAbs = Math.abs(currentKg - targetKg);
    const isOk = Math.abs(deltaPctSigned) <= 0.5;
    const dir: Dir = isOk ? "ok" : deltaPctSigned > 0 ? "up" : "down";
    const targetColor = isOk ? "28A050" : "DC3C3C";
    const main = new Paragraph({
      children: [
        new TextRun({ text: `${label}    `, color: "707080", size: 22, font: "Calibri" }),
        new TextRun({ text: `${fmt(currentPct)} % - ${fmt(currentKg)} kg`, size: 22, font: "Calibri" }),
        new TextRun({ text: "  →  ", color: "707080", size: 22, font: "Calibri" }),
        new TextRun({ text: `${fmt(targetPct)} % - ${fmt(targetKg)} kg`, bold: true, color: targetColor, size: 22, font: "Calibri" }),
      ],
    });
    const deltaText = isOk
      ? "✅ Στόχος επετεύχθη"
      : `( ${arrow(dir)} ${fmt(Math.abs(deltaPctSigned))} %, ${arrow(dir)} ${fmt(remainingPct)}%, ${arrow(dir)} ${fmt(deltaKgAbs)} kg)`;
    const delta = new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: deltaText, color: isOk ? "28A050" : "DC3C3C", size: 20, font: "Calibri" })],
    });
    return [main, delta];
  };

  const children: Paragraph[] = [
    para("Αναφορά", { bold: true, size: 40, align: AlignmentType.CENTER }),
    para(`${displayName}`, { size: 22, color: "666666", align: AlignmentType.CENTER }),
    para(""),
    para(`Ημερομηνία μέτρησης: ${dateLabel}`, { bold: true, size: 24 }),
    para(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm`, { size: 20, color: "707080" }),
    para(`Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`, { size: 20, color: "707080" }),
    para(""),
    para("Σημαίνουν:", { bold: true, size: 20, color: "707080" }),
    para("(▼) Πρέπει να μειωθεί", { size: 20, color: "DC3C3C" }),
    para("(▲) Πρέπει να αυξηθεί", { size: 20, color: "3C78DC" }),
    para("(✅) Στόχος επετεύχθη", { size: 20, color: "28A050" }),
    para("Κατηγορία: Τρέχον μέτρηση → Στόχος (Διαφορά, %, kg)", { size: 20, color: "707080" }),

    heading("Σύσταση Σώματος"),
    ...scalarParas("Βάρος", report.weight.current, report.weight.target, report.weight.deltaAbs, report.weight.deltaPct, "kg"),
  ];

  if (report.bodyFat) children.push(...compositionParas("Λίπος", report.bodyFat.current, report.bodyFat.target));
  if (report.water) children.push(...compositionParas("Υγρά", report.water.current, report.water.target));
  if (report.muscle) children.push(...compositionParas("Μύες", report.muscle.current, report.muscle.target));
  if (report.bone) children.push(...compositionParas("Κόκαλα", report.bone.current, report.bone.target));

  children.push(...scalarParas("ΔΜΣ", report.bmi.current, report.bmi.target, report.bmi.deltaAbs, report.bmi.deltaPct, "μονάδες"));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: "Κατηγορία ΔΜΣ    ", color: "707080", size: 22, font: "Calibri" }),
      new TextRun({ text: report.bmiCategory, bold: true, color: "DC8228", size: 22, font: "Calibri" }),
    ],
  }));

  if (Object.keys(report.measurements).length > 0) {
    children.push(heading("Μετρήσεις Σώματος"));
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) children.push(...scalarParas(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d.current, d.target, d.deltaAbs, d.deltaPct, "εκ."));
    }
  }

  if (Object.keys(report.ratios).length > 0) {
    children.push(heading("Αναλογίες Σώματος"));
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) children.push(...scalarParas(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d.current, d.target, d.deltaAbs, d.deltaPct, "", 2));
    }
  }

  children.push(heading("Μεταβολικά Δεδομένα"));
  children.push(...scalarParas("BMR", report.bmr.current, report.bmr.target,
    report.bmr.target - report.bmr.current,
    report.bmr.current === 0 ? 0 : ((report.bmr.target - report.bmr.current) / report.bmr.current) * 100,
    "kcal", 0));
  children.push(...scalarParas("AMR", report.amr.current, report.amr.target,
    report.amr.target - report.amr.current,
    report.amr.current === 0 ? 0 : ((report.amr.target - report.amr.current) / report.amr.current) * 100,
    "kcal", 0));

  const docx = new Document({
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(docx);
  saveAs(blob, `fitness-report-${dateLabel}.docx`);
}


// ============ DIET — κοινό κείμενο για PDF & Word ============
function dietLines(n: NutritionResult, dateLabel: string): string[] {
  const arrow = "🔺";
  const sign = (v: number) => (v > 0 ? `+${fmtKcal(v)}` : fmtKcal(v));
  return [
    `Διατροφικοί στόχοι — ${dateLabel}`,
    "",
    "• Συνολική ημερήσια πρόσληψη θρεπτικών στοιχείων.",
    `• Θερμίδες διατροφής: ${arrow}${sign(n.intake_kcal)} kcal/ημέρα`,
    `• Θερμίδες βασικού μεταβολισμού (BMR): ${arrow}-${fmtKcal(n.bmr_kcal)} kcal (${fmtNum(n.bmrPctOfIntake, 1)}%)/ημέρα`,
    `• Θερμική επίδραση τροφής (TEF): ${arrow}-${fmtKcal(n.tef_kcal)} kcal (${fmtNum(n.tefPctOfIntake, 1)}%)/ημέρα (10% επί της πρόσληψης)`,
    `• Θερμίδες ασκήσεων: ${arrow}-${fmtKcal(n.exercise_kcal)} kcal (${fmtNum(n.exercisePctOfIntake, 1)}%)/ημέρα`,
    `• Συνολική σπατάλη ενέργειας (TDEE): ${arrow}${sign(n.tdee_kcal)} kcal/ημέρα`,
    `• Συνολικό θερμιδικό ${n.weight_loss ? "έλλειμμα" : "πλεόνασμα"}: ${n.weight_loss ? "–" : "+"}${fmtKcal(Math.abs(n.deficit_kcal))} kcal (${fmtNum(n.deficitPctOfIntake, 1)}%)/ημέρα`,
    `• Συνολική ${n.weight_loss ? "απώλεια" : "αύξηση"} βάρους: ${fmtNum(Math.abs(n.weight_change_kg_day), 2)} Kg/ημέρα, ${fmtNum(Math.abs(n.weight_change_kg_week), 2)} Kg/εβδομάδα, ${fmtNum(Math.abs(n.weight_change_kg_month), 2)} Kg/μήνα.`,
    `• Πρόσληψη πρωτεΐνης βασικού μεταβολισμού: 1.5 γρ. πρωτεΐνη × ${fmtNum(n.lean_mass_kg, 1)} Kg Άλιπης Μάζας = ${fmtNum(n.protein_baseline_g, 1)} γρ. πρωτεΐνης/ημέρα`,
    `• Πρόσληψη πρωτεΐνης ασκήσεων: ${fmtKcal(Math.abs(n.deficit_kcal))} kcal ${n.weight_loss ? "έλλειμμα" : "πλεόνασμα"} × 0.035 γρ. πρωτεΐνη = ${fmtNum(n.protein_exercise_g, 1)} γρ. πρωτεΐνης/ημέρα`,
    `• Συνολική πρόσληψη πρωτεΐνης: ${fmtNum(n.protein_total_g, 1)} γρ./ημέρα (${fmtKcal(n.protein_kcal)} kcal, ${fmtNum(n.protein_pct, 1)}%)`,
    `• Συνολική πρόσληψη λιπαρών: ${fmtKcal(n.fat_kcal)} kcal / 9 = ${fmtNum(n.fat_g, 1)} γρ./ημέρα`,
    `• Συνολική πρόσληψη υδατανθράκων: ${fmtKcal(n.carbs_kcal)} kcal (${fmtNum(n.carbs_pct, 1)}%) / 4 = ${fmtNum(n.carbs_g, 1)} γρ./ημέρα`,
  ];
}

export function exportDietPDF(n: NutritionResult, dateLabel: string, displayName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  doc.setFillColor(15, 20, 40);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("Fitness Tracker — Διατροφικοί στόχοι", margin, 35);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${displayName} · ${dateLabel}`, margin, 55);
  y = 100;

  doc.setTextColor(20, 20, 30);
  doc.setFontSize(10);
  for (const line of dietLines(n, dateLabel)) {
    if (y > 780) { doc.addPage(); y = 50; }
    if (line === "") { y += 8; continue; }
    if (line.startsWith("Διατροφικοί")) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text(line, margin, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      y += 22;
    } else {
      const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14;
    }
  }
  doc.save(`diet-${dateLabel}.pdf`);
}

export async function exportDietWord(n: NutritionResult, dateLabel: string, displayName: string) {
  const para = (text: string, bold = false, size = 22) =>
    new Paragraph({ children: [new TextRun({ text, bold, size, font: "Calibri" })] });

  const lines = dietLines(n, dateLabel);
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Fitness Tracker — Διατροφικοί στόχοι", bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${displayName} · ${dateLabel}`, size: 22, color: "666666" })],
    }),
    new Paragraph({ text: "" }),
  ];
  for (const line of lines) {
    if (line === "") { children.push(new Paragraph({ text: "" })); continue; }
    if (line.startsWith("Διατροφικοί")) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line, bold: true, size: 28, color: "DC3232" })] }));
    } else {
      children.push(para(line));
    }
  }

  const docx = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
      children,
    }],
  });
  const blob = await Packer.toBlob(docx);
  saveAs(blob, `diet-${dateLabel}.docx`);
}

