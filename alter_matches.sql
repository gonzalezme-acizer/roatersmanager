-- TABLA PARA CLUBS OPONENTES
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  website_url text,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clubs are viewable by everyone." ON clubs FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert clubs." ON clubs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update clubs." ON clubs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete clubs." ON clubs FOR DELETE USING (auth.role() = 'authenticated');

-- AGREGAR CAMPOS DE PARTIDOS A EVENTOS EXISTENTES
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type text CHECK (event_type IN ('Entrenamiento', 'Partido')) DEFAULT 'Entrenamiento';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS opponent_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS match_opponents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS call_time time without time zone;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS match_teams jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS match_coaches jsonb DEFAULT '[]'::jsonb;

-- Storage Policy for Club Logos
insert into storage.buckets (id, name, public) values ('clubs', 'clubs', true) on conflict do nothing;
CREATE POLICY "Club Images Upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'clubs');
CREATE POLICY "Club Images Update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'clubs');
CREATE POLICY "Club Images Delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'clubs');
CREATE POLICY "Club Images View" ON storage.objects FOR SELECT TO public USING (bucket_id = 'clubs');

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
