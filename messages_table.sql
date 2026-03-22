-- Tabla de Mensajes Directos a Jugadores
CREATE TABLE IF NOT EXISTS public.player_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos (Row Level Security)
ALTER TABLE public.player_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los padres pueden leer mensajes de sus hijos vinculados"
    ON public.player_messages FOR SELECT
    USING (
        player_id IN (
            SELECT player_id FROM public.player_parents 
            WHERE parent_profile_id = auth.uid()
        )
    );

CREATE POLICY "El staff puede leer todos los mensajes"
    ON public.player_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Admin', 'Manager', 'Staff', 'Entrenador')
        )
    );

CREATE POLICY "El staff puede insertar mensajes"
    ON public.player_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('Admin', 'Manager', 'Staff', 'Entrenador')
        )
    );

CREATE POLICY "Los padres pueden marcar como leído"
    ON public.player_messages FOR UPDATE
    USING (
        player_id IN (
            SELECT player_id FROM public.player_parents 
            WHERE parent_profile_id = auth.uid()
        )
    )
    WITH CHECK (
        player_id IN (
            SELECT player_id FROM public.player_parents 
            WHERE parent_profile_id = auth.uid()
        )
    );
