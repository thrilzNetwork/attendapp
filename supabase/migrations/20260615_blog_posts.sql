CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  num TEXT,
  category TEXT NOT NULL DEFAULT 'Industry',
  category_color TEXT DEFAULT '#6B7280',
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  problem TEXT DEFAULT '',
  reading_time TEXT DEFAULT '5 min',
  content JSONB DEFAULT '[]'::jsonb,
  author TEXT DEFAULT 'Alejandro Soria',
  published_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow anon read (for the public blog)
CREATE POLICY blog_posts_select ON public.blog_posts
  FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY blog_posts_all ON public.blog_posts
  FOR ALL USING (auth.role() = 'service_role');
