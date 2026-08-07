# 📚 NovelPub — Web Novel Publishing & Reading Platform

NovelPub is a full-featured web application for uploading, reading, editing, and managing web novels. It features browser-side ePub parsing, TXT chapter uploads/inserts, customizable reading themes, real-time scroll progress tracking, paragraph-level inline comments, and role-based permissions.

---

## 🛠️ Tech Stack

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS
- **Icons**: Lucide React
- **Parsers**: JSZip + DOMParser (XHTML/ePub & TXT parsing)
- **Backend / Database**: Supabase (PostgreSQL + Auth + Storage)
- **Fallback Engine**: LocalStorage Mock Database (for offline / keyless testing)
- **Containerization**: Docker + Docker Compose + Nginx

---

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note**: If Supabase environment variables are not configured, NovelPub automatically runs in **Hybrid Demo Mode** using local storage seeded with sample novels.

---

## 🗄️ Setting Up Live Supabase PostgreSQL & Auth

Follow these step-by-step instructions to connect NovelPub to your live Supabase project:

### Step 1: Create a Supabase Project
1. Go to [Supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New Project**, select an organization, name your project (e.g. `novel-pub`), set a database password, and choose a region.

### Step 2: Get API Credentials
1. In your Supabase project dashboard, navigate to **Project Settings** -> **API**.
2. Locate the following two values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key** (`eyJhbGci...`)

### Step 3: Configure Environment Variables
Create a `.env` file in the root of the project directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Execute Database Schema Migration
1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar -> **New Query**.
2. Copy the entire contents of the migration file [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql).
3. Paste the SQL code into the SQL editor and click **Run**.

This SQL script creates:
- `profiles` (User role permissions: `admin` vs `normal`)
- `books` (Novel metadata: Title, Author, Description, Genre, Tags, Language, Status, Age Rating, Cover URL)
- `chapters` (Individual chapter contents)
- `novel_ratings` & `novel_reviews` (1–5 Star rating and reviews)
- `line_comments` (Paragraph-level inline comments)
- `reading_progress` (User scroll percentage & position)
- **Row Level Security (RLS)** policies for secure multi-user data access.

### Step 5: Storage Architecture Note
- **Cover Images**: Stored directly as Base64 Data URLs (or external image URLs) inside the `books.cover_url` column in PostgreSQL.
- **ePub & TXT Files**: Parsed directly in the browser via `JSZip` & `DOMParser`. The extracted chapter titles and HTML text payloads are stored directly in the `chapters.content` PostgreSQL table.
- **No Supabase Storage Buckets Required**: No object storage buckets need to be created in Supabase for the application to function fully!

---

## ▲ Deploying to Vercel

Since NovelPub is a 100% client-side Vite React application with direct Supabase SDK integration, it can be deployed to **Vercel** in seconds:

### Step 1: Set Up Supabase Database (Prerequisite)
If you haven't already set up Supabase:
1. Create a Supabase project and run the SQL migration `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL Editor (see [Setting Up Live Supabase PostgreSQL](#-setting-up-live-supabase-postgresql--auth) above).
2. Copy your **Project URL** (`VITE_SUPABASE_URL`) and **anon / public key** (`VITE_SUPABASE_ANON_KEY`) from **Project Settings** -> **API**.

### Step 2: Push Code to Git
Push your repository to GitHub, GitLab, or Bitbucket.

### Step 3: Import into Vercel
1. Log in to [Vercel.com](https://vercel.com) and click **Add New** -> **Project**.
2. Select your `novel-pub` repository.
3. Vercel automatically detects the **Vite** framework preset:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 4: Configure Environment Variables
Before clicking Deploy, expand **Environment Variables** in Vercel and add:
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`

### Step 5: Deploy!
Click **Deploy**. Vercel will compile the Vite production bundle and host NovelPub globally on high-speed edge CDN with free automatic SSL.

---

## 🐳 Running with Docker

You can build and run NovelPub using Docker and Docker Compose:

### 1. Build and Start Container
```bash
docker compose up --build -d
```
Access the application at [http://localhost:8080](http://localhost:8080).

### 2. Stop Container
```bash
docker compose down
```

---

## 🔑 Key Features Overview

- 📖 **ePub & TXT Uploads**: Upload `.epub` files to overwrite full novel contents or `.txt` files to append/insert chapters.
- 🎨 **Themed Reader UI**: Supports Light, Dark, Sepia, and Slate themes, custom font sizes, and line height adjustments.
- 💬 **Line-Level Inline Comments**: Hover over any paragraph on desktop (or tap on mobile) to leave inline comments and view discussion threads.
- ⌨️ **Desktop Arrow Key Navigation**: Press `←` or `→` on your keyboard to navigate between chapters.
- 📊 **Fine Scroll Progress**: Automatically tracks and restores your exact reading percentage per book.
- 🛡️ **HTML Sanitization**: All HTML descriptions, ePub chapters, and user comments are sanitized against XSS attacks.
- 👤 **Role-Based Permissions**: Admin users or book creators can manage, edit, or delete novels; all registered users can read and rate.
