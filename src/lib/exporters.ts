// Εξαγωγή αναφοράς & διατροφικών στόχων σε PDF & Word
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { FullReport, MEASUREMENT_LABELS, RATIO_LABELS, UserProfile, ACTIVITY_LABELS } from "./calculations";
import { NutritionResult, fmtKcal, fmtNum } from "./nutrition";

const arrow = (dir: "up" | "down" | "ok") => (dir === "up" ? "▲" : dir === "down" ? "▼" : "✅");
const fmt = (n: number, d = 1) => n.toFixed(d);

// ============ PDF EXPORT ============
export function exportPDF(profile: UserProfile, report: FullReport, dateLabel: string, displayName: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 50;
  const margin = 40;
  const lineH = 16;

  const addLine = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number } = {}) => {
    if (y > 780) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(20, 20, 30);
    doc.text(text, margin + (opts.indent ?? 0), y);
    y += lineH;
  };

  const section = (title: string) => {
    y += 8;
    if (y > 760) { doc.addPage(); y = 50; }
    doc.setFillColor(220, 50, 50);
    doc.rect(margin, y - 12, pageW - margin * 2, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, margin + 8, y + 2);
    y += 22;
    doc.setTextColor(20, 20, 30);
  };

  // Header
  doc.setFillColor(15, 20, 40);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Fitness Tracker — Αναφορά", margin, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${displayName} · ${dateLabel}`, margin, 55);
  y = 100;

  addLine(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm · Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`);

  // Λεζάντα
  y += 6;
  addLine("Σημαίνουν: ▼ μείωση, ▲ αύξηση, ✅ επετεύχθη", { size: 9, color: [100, 100, 110] });

  // Σύσταση Σώματος
  section("Σύσταση Σώματος");
  const dRow = (label: string, d: { current: number; target: number; deltaAbs: number; deltaPct: number; direction?: "up" | "down" | "ok" }, unit: string) => {
    const dir = d.direction ?? (Math.abs(d.deltaPct) <= 3 ? "ok" : d.deltaAbs > 0 ? "up" : "down");
    addLine(`${label}: ${fmt(d.current)} ${unit} → ${fmt(d.target)} ${unit}`, { bold: true });
    addLine(`   ${arrow(dir)} ${fmt(Math.abs(d.deltaAbs))} ${unit} (${fmt(Math.abs(d.deltaPct))}%)`, { size: 9, color: [120, 120, 130] });
  };

  dRow("Βάρος", report.weight, "kg");
  dRow("ΔΜΣ (BMI)", report.bmi, "");
  addLine(`Κατηγορία ΔΜΣ: ${report.bmiCategory}`, { bold: true, color: [180, 60, 60] });
  if (report.bodyFat) dRow("Λίπος", report.bodyFat, "%");
  if (report.water) dRow("Υγρά", report.water, "%");
  if (report.muscle) dRow("Μύες", report.muscle, "%");
  if (report.bone) dRow("Κόκαλα", report.bone, "%");

  // Μετρήσεις
  if (Object.keys(report.measurements).length > 0) {
    section("Περιφέρειες");
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) dRow(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d, "εκ.");
    }
  }

  // Αναλογίες
  if (Object.keys(report.ratios).length > 0) {
    section("Αναλογίες Σώματος");
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) dRow(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d, "");
    }
  }

  // Μεταβολικά
  section("Μεταβολικά Δεδομένα");
  addLine(`BMR: ${report.bmr.current} kcal → ${report.bmr.target} kcal`, { bold: true });
  addLine(`AMR: ${report.amr.current} kcal → ${report.amr.target} kcal`, { bold: true });

  doc.save(`fitness-report-${dateLabel}.pdf`);
}

// ============ WORD EXPORT ============
export async function exportWord(profile: UserProfile, report: FullReport, dateLabel: string, displayName: string) {
  const para = (text: string, bold = false, size = 22) =>
    new Paragraph({ children: [new TextRun({ text, bold, size, font: "Calibri" })] });

  const dRows = (label: string, d: { current: number; target: number; deltaAbs: number; deltaPct: number; direction?: "up" | "down" | "ok" }, unit: string): Paragraph[] => {
    const dir = d.direction ?? (Math.abs(d.deltaPct) <= 3 ? "ok" : d.deltaAbs > 0 ? "up" : "down");
    return [
      para(`${label}: ${fmt(d.current)} ${unit} → ${fmt(d.target)} ${unit}`, true),
      para(`   ${arrow(dir)} ${fmt(Math.abs(d.deltaAbs))} ${unit} (${fmt(Math.abs(d.deltaPct))}%)`, false, 20),
    ];
  };

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text, bold: true, size: 28, color: "DC3232" })],
    });

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Fitness Tracker — Αναφορά", bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${displayName} · ${dateLabel}`, size: 22, color: "666666" })],
    }),
    new Paragraph({ text: "" }),
    para(`Φύλο: ${profile.sex === "male" ? "Άντρας" : "Γυναίκα"} · Ηλικία: ${profile.age} · Ύψος: ${profile.height_cm} cm`),
    para(`Δραστηριότητα: ${ACTIVITY_LABELS[profile.activity_level]}`),
    para("Σημαίνουν: ▼ μείωση, ▲ αύξηση, ✅ επετεύχθη", false, 18),

    heading("Σύσταση Σώματος"),
    ...dRows("Βάρος", report.weight, "kg"),
    ...dRows("ΔΜΣ (BMI)", report.bmi, ""),
    para(`Κατηγορία ΔΜΣ: ${report.bmiCategory}`, true),
  ];

  if (report.bodyFat) children.push(...dRows("Λίπος", report.bodyFat, "%"));
  if (report.water) children.push(...dRows("Υγρά", report.water, "%"));
  if (report.muscle) children.push(...dRows("Μύες", report.muscle, "%"));
  if (report.bone) children.push(...dRows("Κόκαλα", report.bone, "%"));

  if (Object.keys(report.measurements).length > 0) {
    children.push(heading("Περιφέρειες"));
    for (const [k, d] of Object.entries(report.measurements)) {
      if (d) children.push(...dRows(MEASUREMENT_LABELS[k as keyof typeof MEASUREMENT_LABELS], d, "εκ."));
    }
  }

  if (Object.keys(report.ratios).length > 0) {
    children.push(heading("Αναλογίες Σώματος"));
    for (const [k, d] of Object.entries(report.ratios)) {
      if (d) children.push(...dRows(RATIO_LABELS[k as keyof typeof RATIO_LABELS], d, ""));
    }
  }

  children.push(
    heading("Μεταβολικά Δεδομένα"),
    para(`BMR: ${report.bmr.current} kcal → ${report.bmr.target} kcal`, true),
    para(`AMR: ${report.amr.current} kcal → ${report.amr.target} kcal`, true),
  );

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

