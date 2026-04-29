CREATE TABLE public.training_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  injuries TEXT[] NOT NULL DEFAULT '{}',
  injury_notes TEXT,
  location TEXT NOT NULL DEFAULT 'home',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  goal TEXT NOT NULL DEFAULT 'strength',
  experience TEXT NOT NULL DEFAULT 'beginner',
  minutes_per_week INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own training profile" ON public.training_profile
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own training profile" ON public.training_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own training profile" ON public.training_profile
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own training profile" ON public.training_profile
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER training_profile_set_updated_at
  BEFORE UPDATE ON public.training_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();