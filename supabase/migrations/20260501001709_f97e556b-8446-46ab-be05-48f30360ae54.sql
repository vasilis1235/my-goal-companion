ALTER TABLE public.nutrition_targets
  ADD COLUMN IF NOT EXISTS saturated_fat_g numeric,
  ADD COLUMN IF NOT EXISTS sugars_g numeric,
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric,
  ADD COLUMN IF NOT EXISTS calcium_mg numeric,
  ADD COLUMN IF NOT EXISTS iron_mg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg numeric,
  ADD COLUMN IF NOT EXISTS vitamin_a_iu numeric;

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_targets_user_id_unique ON public.nutrition_targets(user_id);