// Επιστημονικοί υπολογισμοί για το Fitness Tracker
// Πηγές: WHO, Mifflin-St Jeor, Deurenberg, Steve Reeves classic ratios

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface UserProfile {
  sex: Sex;
  age: number;
  height_cm: number;
  activity_level: ActivityLevel;
}

export interface Measurement {
  weight_kg: number;
  body_fat_pct?: number | null;
  water_pct?: number | null;
  muscle_pct?: number | null;
  bone_pct?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  shoulders_cm?: number | null;
  biceps_cm?: number | null;
  forearm_cm?: number | null;
  wrist_cm?: number | null;
  thigh_cm?: number | null;
  knee_cm?: number | null;
  calf_cm?: number | null;
  ankle_cm?: number | null;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Καθιστική",
  light: "Ελαφριά",
  moderate: "Μέτρια",
  active: "Έντονη",
  very_active: "Πολύ έντονη",
};

// ============ Ιδανικό Βάρος (BMI 22) ============
export function idealWeightKg(height_cm: number): number {
  const h = height_cm / 100;
  return 22 * h * h;
}

// ============ BMI ============
export function bmi(weight_kg: number, height_cm: number): number {
  const h = height_cm / 100;
  return weight_kg / (h * h);
}

export function bmiCategory(bmiValue: number): string {
  if (bmiValue < 18.5) return "Λιποβαρής";
  if (bmiValue < 25) return "Φυσιολογικός";
  if (bmiValue < 30) return "Υπέρβαρος";
  if (bmiValue < 35) return "Παχύσαρκος Τύπου 1";
  if (bmiValue < 40) return "Παχύσαρκος Τύπου 2";
  return "Παχύσαρκος Τύπου 3";
}

// ============ Λίπος % (Deurenberg formula για ιδανικό) ============
// Ιδανικό μέσο για healthy adults
export function idealBodyFatPct(sex: Sex, age: number): number {
  // Με βάση American Council on Exercise (ACE) "Fitness" range, μέσος όρος
  if (sex === "male") {
    if (age < 30) return 14;
    if (age < 50) return 17;
    return 19;
  } else {
    if (age < 30) return 21;
    if (age < 50) return 24;
    return 26;
  }
}

// ============ Νερό % ============
export function idealWaterPct(sex: Sex): number {
  return sex === "male" ? 60 : 55;
}

// ============ Μύες % ============
export function idealMusclePct(sex: Sex): number {
  return sex === "male" ? 42 : 36;
}

// ============ Κόκαλα % ============
export function idealBonePct(weight_kg: number): number {
  // Μέσος όρος ~15% του βάρους
  return 15;
}

// ============ BMR (Mifflin-St Jeor) ============
export function bmr(sex: Sex, weight_kg: number, height_cm: number, age: number): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

// ============ AMR / TDEE ============
export function amr(bmrValue: number, activity: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[activity];
}

// ============ Ιδανικές Περιφέρειες (Steve Reeves classic + WHO) ============
export interface IdealMeasurements {
  waist_cm: number;
  hip_cm: number;
  chest_cm: number;
  shoulders_cm: number;
  biceps_cm: number;
  forearm_cm: number;
  wrist_cm: number;
  thigh_cm: number;
  knee_cm: number;
  calf_cm: number;
  ankle_cm: number;
}

export function idealMeasurements(profile: UserProfile): IdealMeasurements {
  const h = profile.height_cm;
  const isMale = profile.sex === "male";

  // Waist/Height ratio = 0.45 (υγιές)
  const waist = h * 0.45;

  // WHR target: άντρες 0.90, γυναίκες 0.80
  const hip = waist / (isMale ? 0.9 : 0.8);

  // Chest/Waist: V-shape για άντρες ~1.4, γυναίκες ~1.25
  const chest = waist * (isMale ? 1.4 : 1.25);

  // Shoulders/Waist: Golden Ratio 1.618 για άντρες
  const shoulders = waist * (isMale ? 1.618 : 1.4);

  // Steve Reeves: Wrist baseline για κλασική αναλογία (από καρπό)
  // Ιδανικός καρπός: άντρες ~17cm @ 175cm, γυναίκες ~14cm @ 165cm
  const wrist = isMale ? 0.097 * h : 0.085 * h;

  // Biceps = wrist × 2.33 (Reeves)
  const biceps = wrist * (isMale ? 2.33 : 2.0);

  // Forearm = biceps × 0.81
  const forearm = biceps * 0.81;

  // Calf = biceps (Reeves)
  const calf = biceps * (isMale ? 1.0 : 0.95);

  // Ankle = wrist × 1.16
  const ankle = wrist * 1.16;

  // Thigh = 1.75 × knee
  const knee = h * (isMale ? 0.21 : 0.22);
  const thigh = knee * 1.75;

  return {
    waist_cm: r(waist),
    hip_cm: r(hip),
    chest_cm: r(chest),
    shoulders_cm: r(shoulders),
    biceps_cm: r(biceps),
    forearm_cm: r(forearm),
    wrist_cm: r(wrist),
    thigh_cm: r(thigh),
    knee_cm: r(knee),
    calf_cm: r(calf),
    ankle_cm: r(ankle),
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

// ============ Αναλογίες ============
export interface Ratios {
  waist_hip?: number;
  waist_height?: number;
  chest_waist?: number;
  shoulders_waist?: number;
  hip_thigh?: number;
  thigh_calf?: number;
  wrist_biceps?: number;
  thigh_knee?: number;
  ankle_calf?: number;
}

export function computeRatios(m: Measurement, height_cm: number): Ratios {
  const out: Ratios = {};
  if (m.waist_cm && m.hip_cm) out.waist_hip = m.waist_cm / m.hip_cm;
  if (m.waist_cm && height_cm) out.waist_height = m.waist_cm / height_cm;
  if (m.chest_cm && m.waist_cm) out.chest_waist = m.chest_cm / m.waist_cm;
  if (m.shoulders_cm && m.waist_cm) out.shoulders_waist = m.shoulders_cm / m.waist_cm;
  if (m.hip_cm && m.thigh_cm) out.hip_thigh = m.hip_cm / m.thigh_cm;
  if (m.thigh_cm && m.calf_cm) out.thigh_calf = m.thigh_cm / m.calf_cm;
  if (m.wrist_cm && m.biceps_cm) out.wrist_biceps = m.biceps_cm / m.wrist_cm;
  if (m.thigh_cm && m.knee_cm) out.thigh_knee = m.thigh_cm / m.knee_cm;
  if (m.ankle_cm && m.calf_cm) out.ankle_calf = m.calf_cm / m.ankle_cm;
  return out;
}

export function idealRatios(sex: Sex): Ratios {
  const isMale = sex === "male";
  return {
    waist_hip: isMale ? 0.9 : 0.8,
    waist_height: 0.45,
    chest_waist: isMale ? 1.4 : 1.25,
    shoulders_waist: isMale ? 1.618 : 1.4,
    hip_thigh: 1.5,
    thigh_calf: 1.5,
    wrist_biceps: 2.33,
    thigh_knee: 1.75,
    ankle_calf: 1.87,
  };
}

// ============ Helper: Διαφορά ============
export interface Diff {
  current: number;
  target: number;
  deltaAbs: number;
  deltaPct: number;
  direction: "up" | "down" | "ok"; // πρέπει να ανέβει / κατέβει / στόχος
}

export function diff(current: number, target: number, tolerancePct = 3): Diff {
  const deltaAbs = target - current;
  const deltaPct = current === 0 ? 0 : (deltaAbs / current) * 100;
  let direction: "up" | "down" | "ok" = "ok";
  if (Math.abs(deltaPct) <= tolerancePct) direction = "ok";
  else if (deltaAbs > 0) direction = "up";
  else direction = "down";
  return { current, target, deltaAbs, deltaPct, direction };
}

// ============ Πλήρης Αναφορά ============
export interface FullReport {
  weight: Diff;
  bmi: Diff;
  bmiCategory: string;
  bodyFat?: Diff;
  water?: Diff;
  muscle?: Diff;
  bone?: Diff;
  bmr: { current: number; target: number };
  amr: { current: number; target: number };
  measurements: Partial<Record<keyof IdealMeasurements, Diff>>;
  ratios: Partial<Record<keyof Ratios, { current: number; target: number; deltaAbs: number; deltaPct: number }>>;
  idealMeasurements: IdealMeasurements;
  idealWeight: number;
}

export function buildReport(profile: UserProfile, m: Measurement): FullReport {
  const idealW = idealWeightKg(profile.height_cm);
  const currentBmi = bmi(m.weight_kg, profile.height_cm);
  const targetBmi = 22;

  // BMR/AMR με τρέχον vs ιδανικό βάρος
  const currentBmr = bmr(profile.sex, m.weight_kg, profile.height_cm, profile.age);
  const targetBmr = bmr(profile.sex, idealW, profile.height_cm, profile.age);

  const ideals = idealMeasurements(profile);

  const report: FullReport = {
    weight: diff(m.weight_kg, idealW),
    bmi: diff(currentBmi, targetBmi),
    bmiCategory: bmiCategory(currentBmi),
    bmr: { current: Math.round(currentBmr), target: Math.round(targetBmr) },
    amr: {
      current: Math.round(amr(currentBmr, profile.activity_level)),
      target: Math.round(amr(targetBmr, profile.activity_level)),
    },
    measurements: {},
    ratios: {},
    idealMeasurements: ideals,
    idealWeight: idealW,
  };

  if (m.body_fat_pct != null) report.bodyFat = diff(m.body_fat_pct, idealBodyFatPct(profile.sex, profile.age));
  if (m.water_pct != null) report.water = diff(m.water_pct, idealWaterPct(profile.sex));
  if (m.muscle_pct != null) report.muscle = diff(m.muscle_pct, idealMusclePct(profile.sex));
  if (m.bone_pct != null) report.bone = diff(m.bone_pct, idealBonePct(m.weight_kg));

  const measureKeys: (keyof IdealMeasurements)[] = [
    "waist_cm", "hip_cm", "chest_cm", "shoulders_cm",
    "biceps_cm", "forearm_cm", "wrist_cm",
    "thigh_cm", "knee_cm", "calf_cm", "ankle_cm",
  ];
  for (const k of measureKeys) {
    const v = m[k];
    if (v != null) report.measurements[k] = diff(v, ideals[k]);
  }

  const currentRatios = computeRatios(m, profile.height_cm);
  const idealR = idealRatios(profile.sex);
  for (const k of Object.keys(currentRatios) as (keyof Ratios)[]) {
    const c = currentRatios[k];
    const t = idealR[k];
    if (c != null && t != null) {
      const dAbs = t - c;
      const dPct = c === 0 ? 0 : (dAbs / c) * 100;
      report.ratios[k] = { current: c, target: t, deltaAbs: dAbs, deltaPct: dPct };
    }
  }

  return report;
}

// ============ Labels ============
export const MEASUREMENT_LABELS: Record<keyof IdealMeasurements, string> = {
  waist_cm: "Περιφέρεια Μέσης",
  hip_cm: "Περιφέρεια Ισχίου",
  chest_cm: "Περιφέρεια Στήθους",
  shoulders_cm: "Περιφέρεια Ώμων",
  biceps_cm: "Περιφέρεια Δικεφάλων",
  forearm_cm: "Περιφέρεια Πήχη",
  wrist_cm: "Περιφέρεια Καρπού",
  thigh_cm: "Περιφέρεια Τετρακεφάλων",
  knee_cm: "Περιφέρεια Γόνατος",
  calf_cm: "Περιφέρεια Γάμπας",
  ankle_cm: "Περιφέρεια Αστραγάλου",
};

export const RATIO_LABELS: Record<keyof Ratios, string> = {
  waist_hip: "Αναλογία Μέσης / Ισχίου",
  waist_height: "Αναλογία Μέσης / Ύψους",
  chest_waist: "Αναλογία Στήθους / Μέσης",
  shoulders_waist: "Αναλογία Ώμων / Μέσης",
  hip_thigh: "Αναλογία Ισχίου / Μηρού",
  thigh_calf: "Αναλογία Μηρού / Γάμπας",
  wrist_biceps: "Αναλογία Δικεφάλου / Καρπού",
  thigh_knee: "Αναλογία Μηρού / Γόνατος",
  ankle_calf: "Αναλογία Γάμπας / Αστραγάλου",
};
