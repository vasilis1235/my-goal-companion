// Διατροφικοί υπολογισμοί
// Λογική:
//  TEF = 10% intake
//  Λιπαρά: 25% των intake kcal / 9
//  Πρωτεΐνη: 1.5g/kg άλιπης μάζας + 0.035g/kcal ελλείμματος
//  Υδατάνθρακες: υπόλοιπες kcal / 4

export interface NutritionInputs {
  weight_kg: number;
  body_fat_pct?: number | null;     // %
  muscle_pct?: number | null;       // %
  water_pct?: number | null;        // %
  bone_pct?: number | null;         // %
  bmr_kcal: number;                 // calculated
  ideal_weight_kg: number;
  intake_kcal: number;              // user input
  activity_kcal: number;            // user input
}

export interface NutritionResult {
  intake_kcal: number;
  bmr_kcal: number;
  tef_kcal: number;                 // 10% του intake
  exercise_kcal: number;
  tdee_kcal: number;                // BMR + TEF + exercise
  deficit_kcal: number;             // intake - tdee
  bmrPctOfIntake: number;
  tefPctOfIntake: number;
  exercisePctOfIntake: number;
  deficitPctOfIntake: number;
  // Σύσταση
  fat_kg: number;
  muscle_kg: number;
  water_kg: number;
  bone_kg: number;
  lean_mass_kg: number;             // 100% - fat%
  lean_mass_pct: number;
  // Πρωτεΐνη
  protein_baseline_g: number;       // 1.5g × lean
  protein_exercise_g: number;       // 0.035g × |deficit|
  protein_total_g: number;
  protein_kcal: number;
  protein_pct: number;
  // Λιπαρά (25% των intake)
  fat_g: number;
  fat_kcal: number;
  fat_pct: number;
  // Υδατάνθρακες (υπόλοιπο)
  carbs_g: number;
  carbs_kcal: number;
  carbs_pct: number;
  // Πρόβλεψη απώλειας/προσθήκης
  weight_change_kg_day: number;     // |deficit|/7700 (negative = loss)
  weight_change_kg_week: number;
  weight_change_kg_month: number;
  weight_loss: boolean;
}

const KCAL_PER_KG = 7700;

export function computeNutrition(i: NutritionInputs): NutritionResult {
  const intake = Math.max(0, i.intake_kcal);
  const exercise = Math.max(0, i.activity_kcal);
  const bmr = i.bmr_kcal;
  const tef = intake * 0.10;
  const tdee = bmr + tef + exercise;
  const deficit = intake - tdee;
  const isLoss = deficit < 0;

  const pct = (n: number) => (intake > 0 ? (n / intake) * 100 : 0);

  // Σύσταση σε kg
  const w = i.weight_kg;
  const fatPct = i.body_fat_pct ?? 0;
  const musclePct = i.muscle_pct ?? 0;
  const waterPct = i.water_pct ?? 0;
  const bonePct = i.bone_pct ?? 0;
  const fat_kg = (fatPct / 100) * w;
  const muscle_kg = (musclePct / 100) * w;
  const water_kg = (waterPct / 100) * w;
  const bone_kg = (bonePct / 100) * w;
  const lean_pct = 100 - fatPct;
  const lean_kg = (lean_pct / 100) * w;

  // Πρωτεΐνη
  const protein_baseline_g = 1.5 * lean_kg;
  const protein_exercise_g = 0.035 * Math.abs(deficit);
  const protein_total_g = protein_baseline_g + protein_exercise_g;
  const protein_kcal = protein_total_g * 4;

  // Λιπαρά (25% των kcal διατροφής)
  const fat_kcal = intake * 0.25;
  const fat_g = fat_kcal / 9;

  // Υδατάνθρακες — υπόλοιπες kcal / 4
  const carbs_kcal = Math.max(0, intake - protein_kcal - fat_kcal);
  const carbs_g = carbs_kcal / 4;

  const dayChange = deficit / KCAL_PER_KG; // αρνητικό = απώλεια
  return {
    intake_kcal: intake,
    bmr_kcal: bmr,
    tef_kcal: tef,
    exercise_kcal: exercise,
    tdee_kcal: tdee,
    deficit_kcal: deficit,
    bmrPctOfIntake: pct(bmr),
    tefPctOfIntake: pct(tef),
    exercisePctOfIntake: pct(exercise),
    deficitPctOfIntake: pct(Math.abs(deficit)),
    fat_kg, muscle_kg, water_kg, bone_kg,
    lean_mass_kg: lean_kg,
    lean_mass_pct: lean_pct,
    protein_baseline_g,
    protein_exercise_g,
    protein_total_g,
    protein_kcal,
    protein_pct: intake > 0 ? (protein_kcal / intake) * 100 : 0,
    fat_g,
    fat_kcal,
    fat_pct: intake > 0 ? (fat_kcal / intake) * 100 : 0,
    carbs_g,
    carbs_kcal,
    carbs_pct: intake > 0 ? (carbs_kcal / intake) * 100 : 0,
    weight_change_kg_day: dayChange,
    weight_change_kg_week: dayChange * 7,
    weight_change_kg_month: dayChange * 30,
    weight_loss: isLoss,
  };
}

// Format helpers
export const fmtNum = (n: number, d = 1) =>
  new Intl.NumberFormat("el-GR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
export const fmtKcal = (n: number) =>
  new Intl.NumberFormat("el-GR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
