-- Este script desconecta temporalmente la clave foránea entre profiles y auth.users
-- Esto permite que agreguemos "Entrenadores falsos" solo con nombre y rol para poblar app rápidamente sin que tengan que registrarse oficialmente en Auth.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
