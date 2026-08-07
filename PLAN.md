# NovelPub - Architecture & Implementation Plan

## 1. Overview & Goals
NovelPub is a modern web application for uploading, reading, editing, and managing novels. The system allows users to create books from scratch, upload ePub files to replace book contents, upload `.txt` files to append/insert chapters, edit chapters individually, and customize their reading experience.

---

## 2. Technical Stack
- **Frontend Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage)
- **Fallback Engine**: Hybrid Mock Database + LocalStorage (for out-of-the-box local development without API keys)
- **Parser Tools**: JSZip + DOMParser for ePub parsing

---

## 3. Confirmed Requirements & Rules

### A. Authentication & Authorization
- **Registration Gate**: Only authenticated users can view or upload books.
- **User Roles**:
  - `admin`: Full management rights across all books (edit chapters, reorder, overwrite ePub, delete books, change user roles).
  - `normal`: Can create books, view all books in the library, edit/manage their own created books, and track their personal reading progress.
- **Global Book Visibility**: All books created or uploaded are visible and readable by any registered user.

### B. Book & Chapter Management
1. **Create Book**: Form for Title, Author, Description (rich-text / HTML enabled, sanitized), Genre, Tags (e.g. Fantasy, Sci-Fi, Magic), Original Language (e.g. English, Japanese, Chinese, Korean), Status (Ongoing, Completed, Hiatus), Release Year, Translator credit, Age Rating (All Ages, Teen, Mature), and optional Cover Image.
2. **Metadata Filtering**: Filter and search novels by Tags, Genre, Original Language, Status, and Age Rating in the Library view.
3. **ePub Upload & Replace**: Upload `.epub` files to overwrite a target book's contents. Parses chapters directly into database records and extracts cover image/metadata (including language/description if available).
4. **TXT Chapter Upload**: Upload `.txt` files to append or insert as a new chapter at a specific index.
5. **Chapter Editor**: Rich/Markdown text editor to modify chapter titles and content, delete chapters, and reorder chapters.

### C. Reading Experience, Progress & Paragraph-Line Comments
- **Themed Reader UI**: Themes (Light, Dark, Sepia, Slate), font size controls, line spacing, font family selection, and page width bounds.
- **Desktop Keyboard Navigation**: Left arrow (`←`) key navigates to the previous chapter, Right arrow (`→`) key navigates to the next chapter (bypassed when focused in text inputs/comment boxes).
- **Security & HTML Sanitization**:
  - All parsed ePub chapter HTML, rich-text book descriptions, rich-text chapter editor inputs, user reviews, and line comments are strictly sanitized before rendering.
  - Strips all `<script>`, `<iframe>`, `<object>`, `<embed>`, `javascript:` protocols, and inline `on*` event attributes to prevent XSS.
- **Client Preference Persistence**: Reader UI preferences stored in `localStorage` (`novel_pub_reader_prefs`).
- **Reading Progress Engine**:
  - Real-time scroll position (`scroll_y`) and scroll percentage (`0-100%`) tracking per `user_id` + `book_id`.
  - Automatic scroll restoration upon opening a chapter.
  - Visual completion badges (*"Chapter 3 of 12 — 45% Read"*) and progress bars across Library cards and detail pages.
- **Paragraph / Line-Level Inline Comment System**:
  - Hovering a paragraph/line on Desktop reveals a `+` comment trigger. Long-pressing / tapping on mobile opens line comment action.
  - Lines with existing comments render a sleek badge at the line end (e.g. `Sentence content... 💬 3`).
  - Clicking the badge expands a inline thread / side panel showing comments for that exact line.
- **Novel Rating & Review System**:
  - 1–5 Star Rating system per novel with aggregated average calculation.
  - Novel-level review section on Book Details page allowing users to leave detailed feedback.

---

## 4. Database Schema & Supabase Setup

### Schema Definitions (`supabase/migrations/0001_initial_schema.sql`)

```sql
-- Profiles / User Roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('admin', 'normal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books Table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  genre TEXT,
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

-- Chapters Table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Novel Ratings Table
CREATE TABLE novel_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- Novel Reviews Table
CREATE TABLE novel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line / Paragraph Inline Comments Table
CREATE TABLE line_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  line_index INT NOT NULL,
  line_hash TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading Progress Table
CREATE TABLE reading_progress (
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
```

---

## 5. Implementation Roadmap

1. **Project Setup**:
   - Initialize Vite React TS app in root.
   - Install dependencies (`tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `jszip`, `@supabase/supabase-js`).
   - Configure Tailwind CSS.

2. **Core Types & Storage Engine**:
   - Define TypeScript types (`Book`, `Chapter`, `User`, `ReadingProgress`, `ReaderPrefs`).
   - Implement `storage.ts` supporting both live Supabase API and LocalStorage Mock Provider.

3. **Auth & State Management**:
   - Auth Context (`AuthContext.tsx`) managing current user, login, signup, role toggle, and session persistence.

4. **UI Components & Layout**:
   - `Navbar`: App brand, Library search, User Profile / Role Badge, Theme switch, Logout.
   - `Library`: Grid of book cards with covers, reading progress bars, badges, and filter options.
   - `BookDetail`: Book metadata, action buttons (Read, Edit, Upload ePub, Append TXT), and Table of Contents.
   - `CreateBookModal` & `UploadEpubModal` & `AppendTxtModal`.
   - `ChapterEditor`: Reordering, title & body rich text editor with live preview.
   - `ReaderView`: Customizable typography toolbar, TOC drawer, smooth scroll tracker, and scroll-to-progress restoration.

5. **ePub & TXT Parsers**:
   - Browser-side ePub extractor (`src/lib/epubParser.ts`) using `JSZip` to unzip `.epub`, parse `container.xml`, `content.opf`, HTML/XHTML chapters, and extract cover images.
   - TXT parser to break uploaded files into chapter titles and body text.

6. **Verification & Testing**:
   - Seed sample demo books with multiple chapters.
   - Verify build and preview functionality.
