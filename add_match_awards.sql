-- add_match_awards.sql
-- Add match_awards column to events table to store Man of the Match and Tryman for each team

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS match_awards jsonb DEFAULT '{}'::jsonb;

-- Example JSON structure for match_awards:
-- {
--   "team_id_1": { "motm": "player_id_A", "tryman": "player_id_B" },
--   "team_id_2": { "motm": "player_id_C" }
-- }

-- Update cache
NOTIFY pgrst, 'reload schema';
