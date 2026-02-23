CREATE POLICY "Only authenticated users can delete teams" ON teams FOR DELETE USING (auth.role() = 'authenticated');
