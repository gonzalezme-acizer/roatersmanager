ALTER TABLE public.events ADD COLUMN IF NOT EXISTS match_opponents jsonb DEFAULT '[]'::jsonb;
