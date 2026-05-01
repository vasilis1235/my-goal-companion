// Macro target helpers
// Default split: 30% protein, 40% carbs, 30% fat (of AMR kcal)
// 1g protein = 4 kcal, 1g carbs = 4 kcal, 1g fat = 9 kcal

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
