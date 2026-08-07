-- Migration 0001: NovelPub Complete Initial Database Schema
-- Includes Profiles (Roles), Books, Chapters, Line Comments, Novel Reviews, Novel Ratings, Reading Progress & RLS Policies.

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (User Roles: admin, normal)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('admin', 'normal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Books Table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL DEFAULT 'Fantasy',
  tags TEXT[] DEFAULT '{}',
  original_language TEXT DEFAULT 'English',
  status TEXT DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Completed', 'Hiatus')),
  release_year INT,
  translator TEXT,
  age_rating TEXT DEFAULT 'All Ages' CHECK (age_rating IN ('All Ages', 'Teen', 'Mature')),
  cover_url TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chapters Table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering chapters
CREATE INDEX IF NOT EXISTS idx_chapters_book_num ON chapters(book_id, chapter_number);

-- 4. Novel Ratings Table
CREATE TABLE IF NOT EXISTS novel_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- 5. Novel Reviews Table
CREATE TABLE IF NOT EXISTS novel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Paragraph / Line Comments Table
CREATE TABLE IF NOT EXISTS line_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  line_hash TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_comments_chap_line ON line_comments(chapter_id, line_index);

-- 7. Reading Progress Table
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  scroll_percent REAL DEFAULT 0,
  scroll_y INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can view all books & chapters
CREATE POLICY "Registered users can view books" ON books FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Registered users can view chapters" ON chapters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Registered users can view reviews" ON novel_reviews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Registered users can view ratings" ON novel_ratings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Registered users can view line comments" ON line_comments FOR SELECT USING (auth.role() = 'authenticated');

-- Reading progress is private per user
CREATE POLICY "Users manage their own reading progress" ON reading_progress
  FOR ALL USING (auth.uid() = user_id);

-- Book Creation / Editing: Creator or Admin can insert/update/delete
CREATE POLICY "Creators and Admins can manage books" ON books
  FOR ALL USING (
    auth.uid() = creator_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Creators and Admins can manage chapters" ON chapters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM books WHERE id = chapters.book_id AND (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')))
  );
