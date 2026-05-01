-- Food log items: ένα row ανά τρόφιμο
CREATE TABLE public.food_log_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  logged_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meal_type TEXT NOT NULL DEFAULT 'snack',
  -- food identity
  name TEXT NOT NULL,
  brand TEXT,
  source TEXT,
  external_id TEXT,
  -- portion
  grams NUMERIC NOT NULL,
  -- energy & macros (totals for the portion)
  kcal NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  saturated_fat_g NUMERIC,
  sugars_g NUMERIC,
  fiber_g NUMERIC,
  -- micros
  sodium_mg NUMERIC,
  potassium_mg NUMERIC,
  calcium_mg NUMERIC,
  iron_mg NUMERIC,
  vitamin_c_mg NUMERIC,
  vitamin_a_iu NUMERIC,
  cholesterol_mg NUMERIC,
  -- meta
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_log_items_user_date ON public.food_log_items(user_id, logged_date DESC);

ALTER TABLE public.food_log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own food log" ON public.food_log_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own food log" ON public.food_log_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own food log" ON public.food_log_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own food log" ON public.food_log_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_food_log_items_updated_at
  BEFORE UPDATE ON public.food_log_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Manual nutrition targets (overrides)
CREATE TABLE public.nutrition_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  water_ml NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own targets" ON public.nutrition_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own targets" ON public.nutrition_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own targets" ON public.nutrition_targets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own targets" ON public.nutrition_targets
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_nutrition_targets_updated_at
  BEFORE UPDATE ON public.nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();