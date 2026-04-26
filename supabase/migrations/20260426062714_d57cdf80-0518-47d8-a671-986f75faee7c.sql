ALTER TABLE public.weight_entries
  ADD COLUMN IF NOT EXISTS bmr_kcal numeric,
  ADD COLUMN IF NOT EXISTS amr_kcal numeric;