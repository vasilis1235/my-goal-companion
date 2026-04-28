// Εξαγωγή αναφοράς & διατροφικών στόχων σε PDF & Word
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { FullReport, MEASUREMENT_LABELS, RATIO_LABELS, UserProfile, ACTIVITY_LABELS } from "./calculations";
import { NutritionResult, fmtKcal, fmtNum } from "./nutrition";

const fmt = (n: number, d = 1) => n.toFixed(d);

type Dir = "up" | "down" | "ok";
const dirByCurrentTarget = (current: number, target: number, tol = 0.5): Dir => {
  if (Math.abs(current - target) <= tol) return "ok";
  return current > target ? "down" : "up";
};
const arrowEmoji = (d: Dir) => (d === "up" ? "🔺" : d === "down" ? "🔻" : "✅");
// PDF colors (RGB) — match UI semantic tokens approximately
const COL = {
  red: [220, 60, 60] as [number, number, number],
  blue: [60, 130, 220] as [number, number, number],
  green: [40, 160, 80] as [number, number, number],
  muted: [120, 120, 130] as [number, number, number],
  text: [20, 20, 30] as [number, number, number],
};
const colorOf = (d: Dir): [number, number, number] =>
  d === "ok" ? COL.green : d === "down" ? COL.red : COL.blue;

// Word colors (hex)
const WCOL = {
  red: "DC3C3C",
  blue: "3C82DC",
  green: "28A050",
  muted: "707080",
  text: "1A1A1E",
};
const wcolorOf = (d: Dir) => (d === "ok" ? WCOL.green : d === "down" ? WCOL.red : WCOL.blue);

// Mobile-friendly file save: native share sheet on mobile, regular download on desktop.
async function saveBlob(blob: Blob, filename: string) {
  // Try native sharing first (mobile)
  const f = new File([blob], filename, { type: blob.type });
  const navAny = navigator as any;
  if (navAny.canShare && navAny.canShare({ files: [f] })) {
    try {
      await navAny.share({ files: [f], title: filename });
      return;
    } catch {
      // user cancelled or failed → fall through to download
    }
  }
  saveAs(blob, filename);
}

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
    if (opts.color) doc.setTextColor(...opts.color); else doc.setTextColor(...COL.text);
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

  // Right-aligned segmented row: places segments with mixed colors right-to-left.
  type Seg = { text: string; color?: [number, number, number]; bold?: boolean; size?: number };
  const drawSegments = (segments: Seg[], rightX: number, defaultSize = 11) => {
    let x = rightX;
    // Compute widths first
    const withWidth = segments.map((s) => {
      doc.setFont("helvetica", s.bold ? "bold" : "normal");
      doc.setFontSize(s.size ?? defaultSize);
      return { ...s, width: doc.getTextWidth(s.text) };
    });
    // Place from right
    for (let i = withWidth.length - 1; i >= 0; i--) {
      const s = withWidth[i];
      x -= s.width;
    }
    let cursor = x;
    for (const s of withWidth) {
      doc.setFont("helvetica", s.bold ? "bold" : "normal");
      doc.setFontSize(s.size ?? defaultSize);
      doc.setTextColor(...(s.color ?? COL.text));
      doc.text(s.text, cursor, y);
      cursor += s.width;
    }
  };

  // Scalar row: kg-style or any unit (e.g. "Βάρος 75.0 kg → Στόχος: 70.0 kg" + delta line)
  const scalarRow = (label: string, current: number, target: number, unit: string, decimals = 1) => {
    ensure(40);
    const dir = dirByCurrentTarget(current, target);
    const numColor = colorOf(dir);
    const u = unit ? ` ${unit}` : "";

    text(label, margin, { color: COL.muted, size: 11 });

    const rightX = pageW - margin;
    drawSegments([
      { text: fmt(current, decimals), color: numColor, bold: true },
      { text: u, color: COL.text },
      { text: "  →  ", color: COL.muted },
      { text: "Στόχος: ", color: COL.muted },
      { text: fmt(target, decimals), color: numColor, bold: true },
      { text: u, color: COL.text },
    ], rightX);
    y += lineH;

    if (dir === "ok") {
      text("✅ Στόχος επετεύχθη", rightX, { align: "right", color: COL.green, size: 10 });
    } else {
      const deltaAbs = Math.abs(current - target);
      const deltaPct = current === 0 ? 0 : (Math.abs(current - target) / current) * 100;
      const arrow = arrowEmoji(dir);
      drawSegments([
        { text: `(${arrow} `, color: COL.text, size: 10 },
        { text: fmt(deltaAbs, decimals), color: numColor, bold: true, size: 10 },
        { text: u, color: COL.text, size: 10 },
        { text: `, ${arrow} `, color: COL.text, size: 10 },
        { text: fmt(deltaPct, 1), color: numColor, bold: true, size: 10 },
        { text: "%)", color: COL.text, size: 10 },
      ], rightX, 10);
    }
    y += lineH - 2;
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  // Composition row: kg first, then %, then triple-stat parens
  const compositionRow = (label: string, currentPct: number, targetPct: number) => {
    ensure(40);
    const currentKg = (currentPct / 100) * weightKg;
    const targetKg = (targetPct / 100) * weightKg;
    const dir = dirByCurrentTarget(currentPct, targetPct, 0.5);
    const numColor = colorOf(dir);
    const arrow = arrowEmoji(dir);

    text(label, margin, { color: COL.muted, size: 11 });

    const rightX = pageW - margin;
    drawSegments([
      { text: fmt(currentKg), color: numColor, bold: true },
      { text: " kg - ", color: COL.text },
      { text: fmt(currentPct), color: numColor, bold: true },
      { text: " %", color: COL.text },
      { text: "  →  ", color: COL.muted },
      { text: "Στόχος: ", color: COL.muted },
      { text: fmt(targetKg), color: numColor, bold: true },
      { text: " kg - ", color: COL.text },
      { text: fmt(targetPct), color: numColor, bold: true },
      { text: " %", color: COL.text },
    ], rightX);
    y += lineH;

    if (dir === "ok") {
      text("✅ Στόχος επετεύχθη", rightX, { align: "right", color: COL.green, size: 10 });
    } else {
      const deltaKg = Math.abs(currentKg - targetKg);
      const deltaPctPoints = Math.abs(currentPct - targetPct);
      const pctChange = currentPct === 0 ? 0 : (Math.abs(currentPct - targetPct) / currentPct) * 100;
      drawSegments([
        { text: `(${arrow} `, color: COL.text, size: 10 },
        { text: fmt(deltaKg), color: numColor, bold: true, size: 10 },
        { text: ` kg, ${arrow} `, color: COL.text, size: 10 },
        { text: fmt(pctChange), color: numColor, bold: true, size: 10 },
        { text: ` %, ${arrow} `, color: COL.text, size: 10 },
        { text: fmt(deltaPctPoints), color: numColor, bold: true, size: 10 },
        { text: "%)", color: COL.text, size: 10 },
      ], rightX, 10);
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
  text(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm · Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`, margin, { size: 10, color: COL.muted });
  y += lineH + 4;

  // Legend
  text("Σημαίνουν:", margin, { bold: true, size: 10, color: COL.muted }); y += lineH;
  text("(🔻) Πρέπει να μειωθεί", margin, { size: 10, color: COL.red }); y += lineH;
  text("(🔺) Πρέπει να αυξηθεί", margin, { size: 10, color: COL.red }); y += lineH;
  text("(✅) Στόχος επετεύχθη", margin, { size: 10, color: COL.green }); y += lineH;
  text("Κατηγορία: Τρέχον μέτρηση → Στόχος: [Στόχος kg] - [Στόχος %] (Διαφορά kg, % Μεταβολής, Διαφορά Ποσοστιαίων Μονάδων)", margin, { size: 10, color: COL.muted });
  y += lineH;

  // Σύσταση Σώματος
  sectionTitle("Σύσταση Σώματος");
  scalarRow("Βάρος", report.weight.current, report.weight.target, "kg");
  if (report.bodyFat) compositionRow("Λίπος", report.bodyFat.current, report.bodyFat.target);
  if (report.water) compositionRow("Υγρά", report.water.current, report.water.target);
  if (report.muscle) compositionRow("Μύες", report.muscle.current, report.muscle.target);
  if (report.bone) compositionRow("Κόκαλα", report.bone.current, report.bone.target);
  scalarRow("ΔΜΣ", report.bmi.current, report.bmi.target, "μονάδες");
  ensure(20);
  text("Κατηγορία ΔΜΣ", margin, { color: COL.muted, size: 11 });
  text(report.bmiCategory, pageW - margin, { align: "right", size: 11, bold: true, color: [220, 130, 40] });
  y += lineH + 4;

  // Μετρήσεις
  if (Object.keys(report.measurements).length > 0) {
    sectionTitle("Μετρήσεις Σώματος");
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) scalarRow(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d.current, d.target, "εκ.");
    }
  }

  // Αναλογίες
  if (Object.keys(report.ratios).length > 0) {
    sectionTitle("Αναλογίες Σώματος");
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) scalarRow(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d.current, d.target, "", 2);
    }
  }

  // Μεταβολικά
  sectionTitle("Μεταβολικά Δεδομένα");
  scalarRow("BMR", report.bmr.current, report.bmr.target, "kcal", 0);
  scalarRow("AMR", report.amr.current, report.amr.target, "kcal", 0);

  const blob = doc.output("blob");
  void saveBlob(blob, `fitness-report-${dateLabel}.pdf`);
}

// ============ WORD EXPORT ============
export async function exportWord(profile: UserProfile, report: FullReport, dateLabel: string, displayName: string, weightKg: number) {
  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
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

  const scalarParas = (label: string, current: number, target: number, unit: string, decimals = 1): Paragraph[] => {
    const dir = dirByCurrentTarget(current, target);
    const numCol = wcolorOf(dir);
    const u = unit ? ` ${unit}` : "";
    const main = new Paragraph({
      children: [
        new TextRun({ text: `${label}    `, color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(current, decimals), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: u, size: 22, font: "Calibri" }),
        new TextRun({ text: "  →  ", color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: "Στόχος: ", color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(target, decimals), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: u, size: 22, font: "Calibri" }),
      ],
    });
    let delta: Paragraph;
    if (dir === "ok") {
      delta = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "✅ Στόχος επετεύχθη", color: WCOL.green, size: 20, font: "Calibri" })],
      });
    } else {
      const arrow = arrowEmoji(dir);
      const deltaAbs = Math.abs(current - target);
      const deltaPct = current === 0 ? 0 : (Math.abs(current - target) / current) * 100;
      delta = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `(${arrow} `, size: 20, font: "Calibri" }),
          new TextRun({ text: fmt(deltaAbs, decimals), bold: true, color: numCol, size: 20, font: "Calibri" }),
          new TextRun({ text: `${u}, ${arrow} `, size: 20, font: "Calibri" }),
          new TextRun({ text: fmt(deltaPct, 1), bold: true, color: numCol, size: 20, font: "Calibri" }),
          new TextRun({ text: "%)", size: 20, font: "Calibri" }),
        ],
      });
    }
    return [main, delta];
  };

  const compositionParas = (label: string, currentPct: number, targetPct: number): Paragraph[] => {
    const currentKg = (currentPct / 100) * weightKg;
    const targetKg = (targetPct / 100) * weightKg;
    const dir = dirByCurrentTarget(currentPct, targetPct, 0.5);
    const numCol = wcolorOf(dir);
    const arrow = arrowEmoji(dir);

    const main = new Paragraph({
      children: [
        new TextRun({ text: `${label}    `, color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(currentKg), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: " kg - ", size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(currentPct), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: " %", size: 22, font: "Calibri" }),
        new TextRun({ text: "  →  ", color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: "Στόχος: ", color: WCOL.muted, size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(targetKg), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: " kg - ", size: 22, font: "Calibri" }),
        new TextRun({ text: fmt(targetPct), bold: true, color: numCol, size: 22, font: "Calibri" }),
        new TextRun({ text: " %", size: 22, font: "Calibri" }),
      ],
    });

    let delta: Paragraph;
    if (dir === "ok") {
      delta = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "✅ Στόχος επετεύχθη", color: WCOL.green, size: 20, font: "Calibri" })],
      });
    } else {
      const deltaKg = Math.abs(currentKg - targetKg);
      const deltaPctPoints = Math.abs(currentPct - targetPct);
      const pctChange = currentPct === 0 ? 0 : (Math.abs(currentPct - targetPct) / currentPct) * 100;
      delta = new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `(${arrow} `, size: 20, font: "Calibri" }),
          new TextRun({ text: fmt(deltaKg), bold: true, color: numCol, size: 20, font: "Calibri" }),
          new TextRun({ text: ` kg, ${arrow} `, size: 20, font: "Calibri" }),
          new TextRun({ text: fmt(pctChange), bold: true, color: numCol, size: 20, font: "Calibri" }),
          new TextRun({ text: ` %, ${arrow} `, size: 20, font: "Calibri" }),
          new TextRun({ text: fmt(deltaPctPoints), bold: true, color: numCol, size: 20, font: "Calibri" }),
          new TextRun({ text: "%)", size: 20, font: "Calibri" }),
        ],
      });
    }
    return [main, delta];
  };

  const children: Paragraph[] = [
    para("Αναφορά", { bold: true, size: 40, align: AlignmentType.CENTER }),
    para(`${displayName}`, { size: 22, color: "666666", align: AlignmentType.CENTER }),
    para(""),
    para(`Ημερομηνία μέτρησης: ${dateLabel}`, { bold: true, size: 24 }),
    para(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm`, { size: 20, color: WCOL.muted }),
    para(`Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`, { size: 20, color: WCOL.muted }),
    para(""),
    para("Σημαίνουν:", { bold: true, size: 20, color: WCOL.muted }),
    para("(🔻) Πρέπει να μειωθεί", { size: 20, color: WCOL.red }),
    para("(🔺) Πρέπει να αυξηθεί", { size: 20, color: WCOL.red }),
    para("(✅) Στόχος επετεύχθη", { size: 20, color: WCOL.green }),
    para("Κατηγορία: Τρέχον μέτρηση → Στόχος: [Στόχος kg] - [Στόχος %] (Διαφορά kg, % Μεταβολής, Διαφορά Ποσοστιαίων Μονάδων)", { size: 20, color: WCOL.muted }),

    heading("Σύσταση Σώματος"),
    ...scalarParas("Βάρος", report.weight.current, report.weight.target, "kg"),
  ];

  if (report.bodyFat) children.push(...compositionParas("Λίπος", report.bodyFat.current, report.bodyFat.target));
  if (report.water) children.push(...compositionParas("Υγρά", report.water.current, report.water.target));
  if (report.muscle) children.push(...compositionParas("Μύες", report.muscle.current, report.muscle.target));
  if (report.bone) children.push(...compositionParas("Κόκαλα", report.bone.current, report.bone.target));

  children.push(...scalarParas("ΔΜΣ", report.bmi.current, report.bmi.target, "μονάδες"));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: "Κατηγορία ΔΜΣ    ", color: WCOL.muted, size: 22, font: "Calibri" }),
      new TextRun({ text: report.bmiCategory, bold: true, color: "DC8228", size: 22, font: "Calibri" }),
    ],
  }));

  if (Object.keys(report.measurements).length > 0) {
    children.push(heading("Μετρήσεις Σώματος"));
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) children.push(...scalarParas(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d.current, d.target, "εκ."));
    }
  }

  if (Object.keys(report.ratios).length > 0) {
    children.push(heading("Αναλογίες Σώματος"));
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) children.push(...scalarParas(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d.current, d.target, "", 2));
    }
  }

  children.push(heading("Μεταβολικά Δεδομένα"));
  children.push(...scalarParas("BMR", report.bmr.current, report.bmr.target, "kcal", 0));
  children.push(...scalarParas("AMR", report.amr.current, report.amr.target, "kcal", 0));

  const docx = new Document({
    sections: [{
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(docx);
  await saveBlob(blob, `fitness-report-${dateLabel}.docx`);
}


// ============ DIET — κοινό κείμενο για PDF & Word (text-list, αυτούσιο) ============
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
  const blob = doc.output("blob");
  void saveBlob(blob, `diet-${dateLabel}.pdf`);
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
  await saveBlob(blob, `diet-${dateLabel}.docx`);
}
