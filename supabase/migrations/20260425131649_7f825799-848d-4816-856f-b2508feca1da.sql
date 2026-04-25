-- Profiles: activity level
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate';

-- Weight entries: body composition + measurements (all optional)
ALTER TABLE public.weight_entries
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS water_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS muscle_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS bone_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS waist_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS hip_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS chest_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS shoulders_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS biceps_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS forearm_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS wrist_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS knee_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS calf_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS ankle_cm NUMERIC;

CREATE INDEX IF NOT EXISTS idx_weight_entries_user_recorded
  ON public.weight_entries (user_id, recorded_at DESC);