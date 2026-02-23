ALTER TABLE public.event_plan_slots ADD COLUMN IF NOT EXISTS slot_type text DEFAULT 'drill';
ALTER TABLE public.event_plan_slots ADD COLUMN IF NOT EXISTS custom_title text;
