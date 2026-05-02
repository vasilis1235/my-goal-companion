// Macro target helpers
// Default split: 30% protein, 40% carbs, 30% fat (of AMR kcal)

import { NUTRIENT_META, NutrientKey } from "./nutrientInfo";
import { calculateNutritionTargets, EngineInput } from "./nutritionEngine";

export interface MacroTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
}

export interface ManualTargets {
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  water_ml?: number | null;
}

export function defaultTargetsFromAMR(amr: number | null): MacroTargets {
  const kcal = amr && amr > 0 ? Math.round(amr) : 2000;
  return {
    kcal,
    protein_g: Math.round((kcal * 0.30) / 4),
    carbs_g: Math.round((kcal * 0.40) / 4),
    fat_g: Math.round((kcal * 0.30) / 9),
    fiber_g: 25,
    water_ml: 2000,
  };
}

export function mergeTargets(amr: number | null, manual: ManualTargets | null): MacroTargets {
  const def = defaultTargetsFromAMR(amr);
  if (!manual) return def;
  return {
    kcal: manual.kcal ?? def.kcal,
    protein_g: manual.protein_g ?? def.protein_g,
    carbs_g: manual.carbs_g ?? def.carbs_g,
    fat_g: manual.fat_g ?? def.fat_g,
    fiber_g: manual.fiber_g ?? def.fiber_g,
    water_ml: manual.water_ml ?? def.water_ml,
  };
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Build the engine output (USDA DRI) from profile + AMR.
 * Returns null if engine can't run (missing profile fields).
 */
export function buildEngineFromAMR(
  amr: number | null,
  profile: { sex: "male" | "female" | null; age: number | null; height_cm: number | null; activity_level?: string | null; pregnancy?: boolean; lactation?: boolean } | null,
  weight_kg: number | null
) {
  if (!profile?.sex || !profile.age || !profile.height_cm || !weight_kg) return null;
  const macros = defaultTargetsFromAMR(amr);
  const ACT: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
  const input: EngineInput = {
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg,
    activity_level: ACT[profile.activity_level ?? "moderate"] ?? 1.55,
    pregnancy: !!profile.pregnancy,
    lactation: !!profile.lactation,
    energy_kcal: macros.kcal,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
  };
  return calculateNutritionTargets(input);
}

/**
 * Map a NutrientKey -> default target.
 * Order: manual override > USDA DRI engine (age/sex aware) > AMR-based macro split > FDA DV fallback.
 */
export function resolveTarget(
  key: NutrientKey,
  amr: number | null,
  manual: ManualTargets | null,
  profile?: { sex: "male" | "female" | null; age: number | null; height_cm: number | null; activity_level?: string | null; pregnancy?: boolean; lactation?: boolean } | null,
  weight_kg?: number | null
): number {
  // 1. Manual override
  const m = manual as any;
  if (m && m[key] != null && Number(m[key]) > 0) return Number(m[key]);

  // 2. AMR-driven macros (kcal / protein / carbs / fat)
  if (key === "kcal" || key === "protein_g" || key === "carbs_g" || key === "fat_g") {
    const def = defaultTargetsFromAMR(amr);
    return (def as any)[key];
  }

  // 3. USDA DRI engine for fiber + micros (when profile available)
  const engine = buildEngineFromAMR(amr, profile ?? null, weight_kg ?? null);
  if (engine) {
    switch (key) {
      case "fiber_g":         return Math.round(engine.carbohydrates.fiber_g);
      case "saturated_fat_g": return Math.round(engine.lipids.saturated_g);
      case "sugars_g":        return Math.round(engine.carbohydrates.sugar_max_g);
      case "cholesterol_mg":  return Math.round(engine.lipids.cholesterol_mg);
      case "sodium_mg":       return Math.round(engine.minerals.sodium_UL_mg as number); // limit = UL 2300
      case "potassium_mg":    return Math.round(engine.minerals.potassium_mg as number);
      case "calcium_mg":      return Math.round(engine.minerals.calcium_mg as number);
      case "iron_mg":         return Math.round(engine.minerals.iron_mg as number);
      case "vitamin_c_mg":    return Math.round(engine.vitamins.C_mg as number);
      case "vitamin_a_iu":    return Math.round((engine.vitamins.A_mcg as number) * 3.33); // mcg RAE → IU approx
    }
  }

  // 4. Fallback: FDA DV
  return NUTRIENT_META[key].defaultTarget;
}
