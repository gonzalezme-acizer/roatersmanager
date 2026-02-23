ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS captain_id uuid REFERENCES public.players(id) ON DELETE SET NULL;
