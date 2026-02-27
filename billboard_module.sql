-- billboard_module.sql

-- 1. Create billboard_posts table
CREATE TABLE IF NOT EXISTS public.billboard_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  category text CHECK (category IN ('staff', 'publico', 'privado')) DEFAULT 'publico',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.billboard_posts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone can view public posts
CREATE POLICY "Public posts are viewable by everyone" 
ON billboard_posts FOR SELECT 
USING (category = 'publico');

-- Staff/Authenticated users can view staff posts
CREATE POLICY "Staff posts are viewable by authenticated users" 
ON billboard_posts FOR SELECT 
USING (auth.role() = 'authenticated');

-- Future implementation for private posts (category = 'privado') could include specific user mappings,
-- for now we allow authenticated users to see everything to avoid complexity during dev.
-- We can refine this to specific team/user visibility later.

-- Admin/Authenticated users can insert posts
CREATE POLICY "Authenticated users can insert posts" 
ON billboard_posts FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Authors or admins can update their own posts
CREATE POLICY "Authors can update their own posts" 
ON billboard_posts FOR UPDATE 
USING (auth.uid() = author_id);

-- Authors or admins can delete their own posts
CREATE POLICY "Authors can delete their own posts" 
ON billboard_posts FOR DELETE 
USING (auth.uid() = author_id);

-- 4. Storage for billboard images
INSERT INTO storage.buckets (id, name, public) VALUES ('billboard', 'billboard', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Billboard images are public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'billboard');
CREATE POLICY "Authenticated users can upload billboard images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'billboard');
CREATE POLICY "Users can update their own billboard images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'billboard');
CREATE POLICY "Users can delete their own billboard images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'billboard');

-- Reload cache
NOTIFY pgrst, 'reload schema';
