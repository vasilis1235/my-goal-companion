-- 1. Επέκταση profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'el',
  ADD COLUMN IF NOT EXISTS units text NOT NULL DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. nutrition_entries
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  intake_kcal numeric NOT NULL,
  activity_kcal numeric NOT NULL DEFAULT 0,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_pct numeric,
  water_pct numeric,
  bone_pct numeric,
  bmr_kcal numeric,
  amr_kcal numeric,
  target_weight_kg numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nutrition" ON public.nutrition_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own nutrition" ON public.nutrition_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nutrition" ON public.nutrition_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own nutrition" ON public.nutrition_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS nutrition_user_date_idx
  ON public.nutrition_entries (user_id, recorded_at DESC);

-- 3. Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);