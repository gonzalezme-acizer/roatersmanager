-- Este script agrega una política RLS que permite al 'Head Coach' insertar nuevos perfiles (staff).
-- Esto soluciona el bloqueo secreto de base de datos que devuelve un error vacío '{}'
-- al intentar agregar staff desde la aplicación web.

CREATE POLICY "Head Coaches can insert any profile"
ON public.profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS current_user_profile
    WHERE current_user_profile.id = auth.uid() AND current_user_profile.sports_role = 'Head Coach'
  )
);
