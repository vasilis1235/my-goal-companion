/**
 * Nutrition Calculation Engine — USDA / National Academies DRI 2023.
 *
 * Pure module. Takes a user profile + already-computed macros (kcal/protein/carbs/fat)
 * and returns a structured object with vitamins, minerals, amino acids, balance ratios,
 * PRAL score, and flags.
 *
 * Sections follow the spec provided by the user. All values rounded to 1 decimal.
 */

export type Sex = "male" | "female";

export interface EngineInput {
  age: number;
  sex: Sex;
  weight_kg: number;
  height_cm: number;
  activity_level: number; // 1.2 / 1.375 / 1.55 / 1.725 / 1.9
  goal?: "maintain" | "lose" | "gain";
  pregnancy?: boolean;
  lactation?: boolean;

  // Already-calculated macros (from existing app logic)
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface BalanceRatio {
  value: number;
  target_range: string;
  flag: boolean;
  message?: string;
}

export interface EngineFlag {
  nutrient: string;
  value: number;
  limit: number;
  message: string;
}

export interface EngineOutput {
  user_profile: {
    age: number; sex: Sex; weight: number; height: number;
    activity_level: number; goal?: string; pregnancy?: boolean; lactation?: boolean;
  };
  macros: { energy_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  carbohydrates: {
    total_g: number; fiber_g: number; net_carbs_g: number;
    sugar_max_g: number; starch_g: number;
  };
  lipids: {
    total_fat_g: number; saturated_g: number; monounsaturated_g: number;
    polyunsaturated_g: number; trans_fat_g: number; cholesterol_mg: number;
    omega3: { total_g: number; ALA_g: number; DHA_g: number; EPA_g: number };
    omega6: { total_g: number; LA_g: number };
  };
  amino_acids: Record<string, number>;
  vitamins: Record<string, number | null>;
  minerals: Record<string, number | null>;
  balance_ratios: {
    omega6_to_omega3: BalanceRatio;
    zinc_to_copper: BalanceRatio;
    calcium_to_magnesium: BalanceRatio;
    potassium_to_sodium: BalanceRatio;
    calcium_to_phosphorus: BalanceRatio;
    PRAL_score: BalanceRatio & { interpretation: string };
  };
  flags: EngineFlag[];
}

// ------- helpers -------
const r1 = (n: number) => Math.round(n * 10) / 10;
const max = Math.max;
const min = Math.min;

// ============= Section 6 — VITAMINS =============
function vitamins(input: EngineInput): Record<string, number | null> {
  const { age, sex, pregnancy = false, lactation = false } = input;

  // B1 thiamine
  let B1: number;
  if (age >= 4 && age <= 8) B1 = 0.6;
  else if (age >= 9 && age <= 13) B1 = 0.9;
  else if (sex === "male") B1 = 1.2;
  else B1 = age >= 14 && age <= 18 ? 1.0 : 1.1;
  if (pregnancy || lactation) B1 = 1.4;

  // B2 riboflavin
  let B2: number;
  if (sex === "male") B2 = 1.3;
  else B2 = age >= 14 && age <= 18 ? 1.0 : 1.1;
  if (pregnancy) B2 = 1.4;
  if (lactation) B2 = 1.6;

  // B3 niacin
  let B3 = sex === "male" ? 16 : 14;
  if (pregnancy) B3 = 18;
  if (lactation) B3 = 17;

  // B5 pantothenic
  let B5 = 5;
  if (pregnancy) B5 = 6;
  if (lactation) B5 = 7;

  // B6
  let B6: number;
  if (age >= 19 && age <= 50) B6 = 1.3;
  else if (age >= 51) B6 = sex === "male" ? 1.7 : 1.5;
  else B6 = 1.3;
  if (pregnancy) B6 = 1.9;
  if (lactation) B6 = 2.0;

  // B12
  let B12 = 2.4;
  if (pregnancy) B12 = 2.6;
  if (lactation) B12 = 2.8;

  // Folate
  let folate = 400;
  if (pregnancy) folate = 600;
  if (lactation) folate = 500;

  // Vitamin A (mcg RAE)
  let A = sex === "male" ? 900 : 700;
  if (pregnancy) A = 770;
  if (lactation) A = 1300;

  // Vitamin C
  let C: number;
  if (age >= 14 && age <= 18) C = sex === "male" ? 75 : 65;
  else C = sex === "male" ? 90 : 75;
  if (pregnancy) C = 85;
  if (lactation) C = 120;

  // Vitamin D (IU)
  const D = age >= 71 ? 800 : 600;

  // Vitamin E
  let E = 15;
  if (lactation) E = 19;

  // Vitamin K (AI)
  const K = sex === "male" ? 120 : 90;

  return {
    B1_mg: r1(B1),
    B2_mg: r1(B2),
    B3_mg: r1(B3),
    B3_UL_mg: 35,
    B5_mg: r1(B5),
    B6_mg: r1(B6),
    B6_UL_mg: 100,
    B12_mcg: r1(B12),
    folate_mcg: r1(folate),
    folate_UL_mcg: 1000,
    A_mcg: r1(A),
    A_UL_mcg: 3000,
    C_mg: r1(C),
    C_UL_mg: 2000,
    D_IU: r1(D),
    D_UL_IU: 4000,
    E_mg: r1(E),
    E_UL_mg: 1000,
    K_mcg: r1(K),
  };
}

// ============= Section 7 — MINERALS =============
function minerals(input: EngineInput): Record<string, number | null> {
  const { age, sex, weight_kg, pregnancy = false, lactation = false } = input;

  // Calcium
  let calcium: number;
  if (age >= 14 && age <= 18) calcium = 1300;
  else if (age >= 19 && age <= 50) calcium = 1000;
  else if (sex === "female" && age >= 51) calcium = 1200;
  else if (sex === "male" && age >= 51 && age <= 70) calcium = 1000;
  else calcium = 1200; // male 71+
  if (pregnancy) calcium = age >= 14 && age <= 18 ? 1300 : 1000;

  // Iron
  let iron: number;
  if (age >= 14 && age <= 18) iron = sex === "male" ? 11 : 15;
  else if (sex === "male") iron = 8;
  else iron = age >= 51 ? 8 : 18;
  if (pregnancy) iron = 27;
  if (lactation) iron = 9;

  // Magnesium
  let magnesium: number;
  if (sex === "male") magnesium = age >= 31 ? 420 : 400;
  else magnesium = age >= 31 ? 320 : 310;
  if (pregnancy) magnesium = age >= 31 ? 360 : 350;

  // Zinc
  let zinc: number;
  if (sex === "male") zinc = 11;
  else zinc = age >= 14 && age <= 18 ? 9 : 8;
  if (pregnancy) zinc = 11;
  if (lactation) zinc = 12;

  // Potassium (AI)
  let potassium = sex === "male" ? 3400 : 2600;
  if (pregnancy) potassium = 2900;
  if (lactation) potassium = 2800;

  // Sodium (AI)
  let sodium: number;
  if (age >= 14 && age <= 50) sodium = 1500;
  else if (age >= 51 && age <= 70) sodium = 1300;
  else sodium = 1200;

  // Phosphorus
  let phosphorus = age >= 9 && age <= 18 ? 1250 : 700;
  if (pregnancy && age >= 14 && age <= 18) phosphorus = 1250;
  else if (pregnancy) phosphorus = 700;

  // Selenium (mcg)
  let selenium = 55;
  if (pregnancy) selenium = 60;
  if (lactation) selenium = 70;

  // Copper (mcg)
  let copper = 900;
  if (pregnancy) copper = 1000;
  if (lactation) copper = 1300;

  // Manganese (AI)
  let manganese = sex === "male" ? 2.3 : 1.8;
  if (pregnancy) manganese = 2.0;
  if (lactation) manganese = 2.6;

  // Water (L)
  const water_L_AI = sex === "male" ? 3.7 : (pregnancy ? 3.0 : (lactation ? 3.8 : 2.7));
  const water_L_estimate = weight_kg * 0.035; // secondary
  const water_L = max(water_L_AI, water_L_estimate);

  return {
    calcium_mg: r1(calcium),
    calcium_UL_mg: 2500,
    iron_mg: r1(iron),
    iron_UL_mg: 45,
    magnesium_mg: r1(magnesium),
    magnesium_UL_supplement_mg: 350,
    zinc_mg: r1(zinc),
    zinc_UL_mg: 40,
    potassium_mg: r1(potassium),
    sodium_mg: r1(sodium),
    sodium_UL_mg: 2300,
    phosphorus_mg: r1(phosphorus),
    phosphorus_UL_mg: 4000,
    selenium_mcg: r1(selenium),
    selenium_UL_mcg: 400,
    copper_mcg: r1(copper),
    copper_UL_mcg: 10000,
    manganese_mg: r1(manganese),
    manganese_UL_mg: 11,
    water_L: r1(water_L),
  };
}

// ============= MAIN =============
export function calculateNutritionTargets(input: EngineInput): EngineOutput {
  const { energy_kcal, protein_g, carbs_g, fat_g, sex } = input;

  // ---- Section 3: carbohydrates ----
  const fiber_g = max(21, min(38, (energy_kcal / 1000) * 14));
  const net_carbs_g = carbs_g - fiber_g;
  const sugar_max_g = (energy_kcal * 0.10) / 4;
  const starch_g = net_carbs_g * 0.55;

  // ---- Section 4: lipids ----
  const saturated_fat_g = (energy_kcal * 0.10) / 9;
  const mono = fat_g * 0.35;
  const poly = fat_g * 0.20;
  // Omega-3: take HIGHER of (5% of fat) and AI floor (1.6 male / 1.1 female)
  const omega3_floor = sex === "male" ? 1.6 : 1.1;
  const omega3_g = max(fat_g * 0.05, omega3_floor);
  const omega3_ALA_g = omega3_g * 0.8;
  const omega3_DHA_g = 0.25;
  const omega3_EPA_g = 0.25;
  const omega6_floor = sex === "male" ? 17 : 12;
  const omega6_g = max(fat_g * 0.12, omega6_floor);
  const omega6_LA_g = omega6_g * 0.90;

  // ---- Section 5: amino acids ----
  const amino_acids: Record<string, number> = {
    histidine_g: r1(protein_g * 0.018),
    isoleucine_g: r1(protein_g * 0.025),
    leucine_g: r1(protein_g * 0.055),
    lysine_g: r1(protein_g * 0.051),
    methionine_g: r1(protein_g * 0.025),
    cystine_g: r1(protein_g * 0.013),
    phenylalanine_g: r1(protein_g * 0.047),
    tyrosine_g: r1(protein_g * 0.018),
    threonine_g: r1(protein_g * 0.027),
    tryptophan_g: r1(protein_g * 0.007),
    valine_g: r1(protein_g * 0.032),
  };

  const vits = vitamins(input);
  const mins = minerals(input);

  // ---- Section 8: balance ratios ----
  const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

  const r_o6_o3 = ratio(omega6_g, omega3_g);
  const r_zn_cu = ratio(mins.zinc_mg as number, (mins.copper_mcg as number) / 1000);
  const r_ca_mg = ratio(mins.calcium_mg as number, mins.magnesium_mg as number);
  const r_k_na = ratio(mins.potassium_mg as number, mins.sodium_mg as number);
  const r_ca_p = ratio(mins.calcium_mg as number, mins.phosphorus_mg as number);

  const PRAL =
    0.49 * protein_g +
    0.037 * (mins.phosphorus_mg as number) -
    0.021 * (mins.potassium_mg as number) -
    0.026 * (mins.magnesium_mg as number) -
    0.013 * (mins.calcium_mg as number);

  const flags: EngineFlag[] = [];

  if (r_o6_o3 > 15) {
    flags.push({
      nutrient: "omega6_to_omega3",
      value: r1(r_o6_o3),
      limit: 15,
      message: "Ω6:Ω3 ratio too high (target 4:1 to 10:1)",
    });
  }
  if (PRAL > 10) {
    flags.push({
      nutrient: "PRAL_score",
      value: r1(PRAL),
      limit: 10,
      message: "Diet too acidic (PRAL > +10). Increase plant foods.",
    });
  }
  if (saturated_fat_g > fat_g) {
    flags.push({
      nutrient: "saturated_fat_g",
      value: r1(saturated_fat_g),
      limit: r1(fat_g),
      message: "Saturated fat exceeds total fat target.",
    });
  }

  return {
    user_profile: {
      age: input.age,
      sex: input.sex,
      weight: input.weight_kg,
      height: input.height_cm,
      activity_level: input.activity_level,
      goal: input.goal,
      pregnancy: input.pregnancy,
      lactation: input.lactation,
    },
    macros: {
      energy_kcal: r1(energy_kcal),
      protein_g: r1(protein_g),
      carbs_g: r1(carbs_g),
      fat_g: r1(fat_g),
    },
    carbohydrates: {
      total_g: r1(carbs_g),
      fiber_g: r1(fiber_g),
      net_carbs_g: r1(net_carbs_g),
      sugar_max_g: r1(sugar_max_g),
      starch_g: r1(starch_g),
    },
    lipids: {
      total_fat_g: r1(fat_g),
      saturated_g: r1(saturated_fat_g),
      monounsaturated_g: r1(mono),
      polyunsaturated_g: r1(poly),
      trans_fat_g: 0,
      cholesterol_mg: 300,
      omega3: {
        total_g: r1(omega3_g),
        ALA_g: r1(omega3_ALA_g),
        DHA_g: r1(omega3_DHA_g),
        EPA_g: r1(omega3_EPA_g),
      },
      omega6: {
        total_g: r1(omega6_g),
        LA_g: r1(omega6_LA_g),
      },
    },
    amino_acids,
    vitamins: vits,
    minerals: mins,
    balance_ratios: {
      omega6_to_omega3: {
        value: r1(r_o6_o3),
        target_range: "4:1 to 10:1",
        flag: r_o6_o3 > 15,
      },
      zinc_to_copper: {
        value: r1(r_zn_cu),
        target_range: "8:1 to 12:1",
        flag: r_zn_cu < 8 || r_zn_cu > 12,
      },
      calcium_to_magnesium: {
        value: r1(r_ca_mg),
        target_range: "≈ 2:1",
        flag: r_ca_mg < 1.5 || r_ca_mg > 3,
      },
      potassium_to_sodium: {
        value: r1(r_k_na),
        target_range: "≥ 3:1",
        flag: r_k_na < 3,
      },
      calcium_to_phosphorus: {
        value: r1(r_ca_p),
        target_range: "1:1 to 2:1",
        flag: r_ca_p < 1 || r_ca_p > 2,
      },
      PRAL_score: {
        value: r1(PRAL),
        target_range: "≤ 0 (alkaline preferred)",
        flag: PRAL > 10,
        interpretation: PRAL <= 0 ? "alkaline" : PRAL <= 10 ? "neutral" : "acidic",
      },
    },
    flags,
  };
}

/** Convenience: build EngineInput from app's user profile + macros (kcal/protein/carbs/fat). */
export interface ProfileLike {
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  activity_level?: string | null; // "sedentary" | "light" | "moderate" | "active" | "athlete"
  pregnancy?: boolean;
  lactation?: boolean;
}

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function buildEngineInput(opts: {
  profile: ProfileLike | null;
  weight_kg: number | null;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal?: "maintain" | "lose" | "gain";
}): EngineInput | null {
  const { profile, weight_kg, energy_kcal, protein_g, carbs_g, fat_g, goal } = opts;
  if (!profile?.sex || !profile.age || !profile.height_cm || !weight_kg) return null;
  const factor = ACTIVITY_FACTOR[profile.activity_level ?? "moderate"] ?? 1.55;
  return {
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg,
    activity_level: factor,
    pregnancy: !!profile.pregnancy,
    lactation: !!profile.lactation,
    energy_kcal,
    protein_g,
    carbs_g,
    fat_g,
    goal,
  };
}
