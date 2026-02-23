-- ========================================================================================
-- MODULO DE ENTRENAMIENTOS Y EVENTOS
-- ========================================================================================

-- DROP OLD TABLES FIRST TO AVOID RELATION EXISTS ERRORS
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
-- ========================================================================================

-- 1. DRILLS (Biblioteca de Ejercicios)
CREATE TABLE public.drills (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 15,
  focus_level_1 text,
  focus_level_2 text,
  youtube_link text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drills are viewable by everyone." ON drills FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert drills." ON drills FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update drills." ON drills FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete drills." ON drills FOR DELETE USING (auth.role() = 'authenticated');

-- 2. EVENTS (Entrenamientos / Eventos)
CREATE TABLE public.events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  event_date date NOT NULL,
  event_time time without time zone NOT NULL,
  location text,
  objectives text,
  status text CHECK (status IN ('Planeado', 'Completado', 'Cancelado')) DEFAULT 'Planeado',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone." ON events FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert events." ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update events." ON events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete events." ON events FOR DELETE USING (auth.role() = 'authenticated');

-- 3. EVENT_PLAN_SLOTS (Bloques de planificación del entrenamiento)
CREATE TABLE public.event_plan_slots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  drill_id uuid REFERENCES public.drills(id) ON DELETE SET NULL,
  order_index integer NOT NULL,
  duration_minutes integer,
  division_criteria text,
  coaches_assigned jsonb DEFAULT '[]'::jsonb, -- Array de IDs de usuarios o nombres
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_plan_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event plan slots are viewable by everyone." ON event_plan_slots FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert event plan slots." ON event_plan_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update event plan slots." ON event_plan_slots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete event plan slots." ON event_plan_slots FOR DELETE USING (auth.role() = 'authenticated');

-- 4. EVENT_ATTENDANCE (Asistencias al evento)
CREATE TABLE public.event_attendance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('Presente', 'Ausente', 'Tarde', 'Justificado')) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, player_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event attendance viewable by everyone." ON event_attendance FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert event attendance." ON event_attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update event attendance." ON event_attendance FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete event attendance." ON event_attendance FOR DELETE USING (auth.role() = 'authenticated');

-- 5. EVENT_NOTES (Libreta de Notas del Evento)
CREATE TABLE public.event_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  note_type text CHECK (note_type IN ('manual', 'ai_summary', 'evaluation')) DEFAULT 'manual',
  audio_url text, -- Por si luego subimos a storage de Supabase
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event notes viewable by everyone." ON event_notes FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can insert event notes." ON event_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can update event notes." ON event_notes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only authenticated users can delete event notes." ON event_notes FOR DELETE USING (auth.role() = 'authenticated');
