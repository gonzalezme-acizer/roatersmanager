-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  image_url text,
  phone text,
  sports_role text check (sports_role in ('Head Coach', 'Entrenador', 'Preparador Físico', 'Manager'))
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- TEAMS
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null
);
alter table public.teams enable row level security;
create policy "Teams are viewable by everyone." on teams for select using (true);
create policy "Only authenticated users can insert teams." on teams for insert with check (auth.role() = 'authenticated');
create policy "Only authenticated users can update teams." on teams for update using (auth.role() = 'authenticated');

-- PLAYERS
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams on delete set null,
  first_name text not null,
  last_name text not null,
  nickname text,
  dni text,
  blood_type text,
  birth_date date,
  age integer,
  father_name text,
  mother_name text,
  has_whatsapp boolean default false,
  whatsapp_number text,
  status text check (status in ('Activo', 'Suspendido', 'Lesionado')) default 'Activo',
  height decimal(5,2),
  weight decimal(5,2),
  dominant_foot text check (dominant_foot in ('Izquierdo', 'Derecho', 'Ambidiestro')),
  dominant_hand text check (dominant_hand in ('Izquierda', 'Derecha', 'Ambidiestro')),
  grade_history text,
  category text check (category in ('Forwards', 'Backs')),
  position text
);

-- Unique index to prevent duplicate players based on first_name, last_name, and nickname
create unique index unique_player_name on public.players (first_name, last_name, coalesce(nickname, ''));
alter table public.players enable row level security;
create policy "Players are viewable by everyone." on players for select using (true);
create policy "Only authenticated users can insert players." on players for insert with check (auth.role() = 'authenticated');
create policy "Only authenticated users can update players." on players for update using (auth.role() = 'authenticated');

-- SKILLS
create table public.skills (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players on delete cascade not null,
  passing_receiving integer check (passing_receiving between 1 and 5),
  ruck integer check (ruck between 1 and 5),
  tackle integer check (tackle between 1 and 5),
  contact integer check (contact between 1 and 5),
  speed integer check (speed between 1 and 5),
  endurance integer check (endurance between 1 and 5),
  strength integer check (strength between 1 and 5),
  tactical_positioning integer check (tactical_positioning between 1 and 5),
  decision_making integer check (decision_making between 1 and 5),
  line_out integer check (line_out between 1 and 5),
  scrum integer check (scrum between 1 and 5),
  attack integer check (attack between 1 and 5),
  defense integer check (defense between 1 and 5),
  mentality integer check (mentality between 1 and 5),
  date_logged timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.skills enable row level security;
create policy "Skills are viewable by everyone." on skills for select using (true);
create policy "Only authenticated users can insert skills." on skills for insert with check (auth.role() = 'authenticated');
create policy "Only authenticated users can update skills." on skills for update using (auth.role() = 'authenticated');

-- EVENTS
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('Entrenamiento', 'Partido')) not null,
  event_date timestamp with time zone not null
);
alter table public.events enable row level security;
create policy "Events are viewable by everyone." on events for select using (true);
create policy "Only authenticated users can insert events." on events for insert with check (auth.role() = 'authenticated');
create policy "Only authenticated users can update events." on events for update using (auth.role() = 'authenticated');

-- ATTENDANCE
create table public.attendance (
  player_id uuid references public.players on delete cascade,
  event_id uuid references public.events on delete cascade,
  present boolean default false,
  primary key (player_id, event_id)
);
alter table public.attendance enable row level security;
create policy "Attendance is viewable by everyone." on attendance for select using (true);
create policy "Only authenticated users can insert attendance." on attendance for insert with check (auth.role() = 'authenticated');
create policy "Only authenticated users can update attendance." on attendance for update using (auth.role() = 'authenticated');

-- Function to handle new user signup and create a profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, image_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function after a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
ALTER TABLE players ADD COLUMN medical_clearance boolean default false;
-- Storage Policies for 'avatars' bucket
CREATE POLICY "Avatar Images Upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Avatar Images Update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'avatars');
CREATE POLICY "Avatar Images Delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'avatars');
ALTER TABLE skills ADD COLUMN kicking integer default 1;
ALTER TABLE skills ADD COLUMN duel integer default 1;
ALTER TABLE skills ADD COLUMN patada integer default 1;
ALTER TABLE skills ADD COLUMN duelo integer default 1;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS patada integer default 1;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS duelo integer default 1;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_count integer default 15;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS substitutes_count integer default 8;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS lineup jsonb default '{}'::jsonb;
