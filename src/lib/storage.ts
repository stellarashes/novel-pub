import { Book, Chapter, ReadingProgress, NovelRating, NovelReview, LineComment, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { sanitizeHtml } from './sanitizer';

// Keys for LocalStorage
const STORAGE_KEYS = {
  USERS: 'novel_pub_users',
  CURRENT_USER: 'novel_pub_current_user',
  BOOKS: 'novel_pub_books',
  CHAPTERS: 'novel_pub_chapters',
  PROGRESS: 'novel_pub_progress',
  RATINGS: 'novel_pub_ratings',
  REVIEWS: 'novel_pub_reviews',
  LINE_COMMENTS: 'novel_pub_line_comments'
};

// Initial Seed Data for Out-of-the-Box Demo Mode
const INITIAL_DEMO_USERS: UserProfile[] = [
  { id: 'user-admin-1', email: 'admin@novelpub.dev', nickname: 'AdminUser', role: 'admin', dbRole: 'admin', created_at: new Date().toISOString() },
  { id: 'user-normal-1', email: 'reader@novelpub.dev', nickname: 'BookWorm', role: 'normal', dbRole: 'normal', created_at: new Date().toISOString() }
];

const INITIAL_DEMO_BOOKS: Book[] = [
  {
    id: 'book-shadow-monarch',
    title: "Shadow Monarch's Ascension",
    author: 'Jin Woo Sung',
    description: '<p>When a mysterious rift opened above Seoul, Sung Jin-woo was just an E-rank hunter known as the <strong>"Weakest Weapon of Mankind"</strong>. But inside a double dungeon, he unlocked an extraordinary system that gave him the power to level up infinitely.</p><p>Follow his epic journey as he rises from rock bottom to command an unstoppable shadow army and face primordial Monarchs!</p>',
    genre: 'Action',
    tags: ['System', 'Leveling', 'Necromancer', 'Overpowered', 'Urban Fantasy'],
    original_language: 'Korean',
    status: 'Ongoing',
    release_year: 2024,
    translator: 'SoloTrans Team',
    age_rating: 'Teen',
    cover_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    creator_id: 'user-admin-1',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
    average_rating: 4.9,
    rating_count: 128
  },
  {
    id: 'book-starlight-symphony',
    title: 'Starlight Symphony',
    author: 'Aoi Tachibana',
    description: '<p>A bittersweet tale of two prodigy musicians connected across space and time by an ancient celestial frequency. When Luna discovers a forgotten piano in the observatory attic, each key struck broadcasts her feelings into deep space, reaching an astronaut stranded near Jupiter.</p>',
    genre: 'Sci-Fi',
    tags: ['Music', 'Romance', 'Space', 'Emotional', 'Prodigy'],
    original_language: 'Japanese',
    status: 'Completed',
    release_year: 2023,
    translator: 'Aoi Translations',
    age_rating: 'All Ages',
    cover_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    creator_id: 'user-normal-1',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    average_rating: 4.7,
    rating_count: 84
  },
  {
    id: 'book-astral-gate',
    title: 'Chronicles of the Astral Gate',
    author: 'Li Wei Xian',
    description: '<p>Born with a defective spiritual root, Xiao Chen was cast out from the Celestial Sword Sect. Refusing to yield to destiny, he unearthed the forbidden <em>Astral Gate Sutra</em> and embarked on a perilous path of immortal cultivation.</p>',
    genre: 'Xianxia',
    tags: ['Cultivation', 'Martial Arts', 'Revenge', 'Artifacts', 'Immortality'],
    original_language: 'Chinese',
    status: 'Hiatus',
    release_year: 2022,
    translator: 'WuxiaReader',
    age_rating: 'Mature',
    cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    creator_id: 'user-admin-1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    average_rating: 4.5,
    rating_count: 42
  }
];

const INITIAL_DEMO_CHAPTERS: Chapter[] = [
  {
    id: 'chap-1-shadow',
    book_id: 'book-shadow-monarch',
    chapter_number: 1,
    title: 'Chapter 1: The E-Rank Hunter',
    content: `<p>The rain poured relentlessly against the cracked windows of the Seoul Hunters Association headquarters.</p>
<p>Jin-Woo pulled the hood of his worn jacket over his head, shivering slightly as the damp chill seeped through his boots.</p>
<p>"Hey, look over there. Isn't that Jin-Woo?" whispered a nearby hunter in a heavy iron breastplate.</p>
<p>"The Weakest Weapon? Yeah, that's him. If he shows up to a raid, it means it's a low-grade D or E rank gate."</p>
<p>Jin-Woo ignored the whispers. He had heard them a thousand times before. He wasn't hunting for glory or rank; he was hunting to pay his mother's medical bills and support his sister's school tuition.</p>
<p>He took a deep breath, checked his rusty iron dagger, and stepped through the blue shimmering portal into the abyss.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'chap-2-shadow',
    book_id: 'book-shadow-monarch',
    chapter_number: 2,
    title: 'Chapter 2: The Double Dungeon',
    content: `<p>The cavern was pitch black save for the flickering torches held by the vanguard team.</p>
<p>Expected to find goblins or low-tier kobolds, the party instead stumbled upon a colossal stone door inscribed with ancient runes.</p>
<p>"A dual dungeon..." Mr. Song muttered, his voice trembling as he traced the glowing red glyphs.</p>
<p>"Should we turn back?" asked Ju-Hee, her healing staff trembling in her hands.</p>
<p>"We took a vote," the raid leader declared. "We go inside."</p>
<p>As the heavy stone doors slammed shut behind them, towering stone statues with glowing crimson eyes turned their heads toward the terrified hunters.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'chap-3-shadow',
    book_id: 'book-shadow-monarch',
    chapter_number: 3,
    title: 'Chapter 3: The Secret Quest',
    content: `<p>Pain raged through Jin-Woo's body as he lay on the altar of the stone king statue.</p>
<p>[You have completed all requirements of the Secret Quest: "Courage of the Weak".]</p>
<p>A glowing neon blue window hovered directly in front of his eyes. None of the other hunters could see it.</p>
<p>[Congratulations! You have qualified to become a Player.]</p>
<p>[Your heart will stop in 3... 2... 1...]</p>
<p>Darkness swallowed his vision, but instead of death, a soft mechanical chime sounded in his soul.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'chap-1-starlight',
    book_id: 'book-starlight-symphony',
    chapter_number: 1,
    title: 'Chapter 1: Frequency 1420 MHz',
    content: `<p>The observatory in Hokkaido had been abandoned since the autumn of 1994.</p>
<p>Dust particles floated in the golden sunset rays as Luna wiped down the wooden keyboard of the upright piano.</p>
<p>She pressed middle C. A clear, resonated tone echoed off the brass radio telescope dish overhead.</p>
<p>Three hundred million kilometers away, inside the observation pod of the Hermes IV satellite, Commander Ren's audio monitor suddenly crackled to life with a melody.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'chap-1-astral',
    book_id: 'book-astral-gate',
    chapter_number: 1,
    title: 'Chapter 1: The Broken Meridian',
    content: `<p>Snow fell gently over the nine peaks of Mt. Shu.</p>
<p>Xiao Chen knelt before the Grand Hall, his white robes stained with blood from the punishment whip.</p>
<p>"Xiao Chen of the Outer Sect, your qi sea is shattered. You shall be stripped of your disciple token," announced Elder Mo with cold indifference.</p>
<p>Xiao Chen clenched his fists until his fingernails bit into his palms, his eyes blazing with unyielding determination.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_LINE_COMMENTS: LineComment[] = [
  {
    id: 'lc-1',
    book_id: 'book-shadow-monarch',
    chapter_id: 'chap-1-shadow',
    line_index: 3,
    user_id: 'user-normal-1',
    user_email: 'reader@novelpub.dev',
    content: 'Classic Jin-Woo! Love how humble he starts before becoming a god.',
    created_at: new Date().toISOString()
  },
  {
    id: 'lc-2',
    book_id: 'book-shadow-monarch',
    chapter_id: 'chap-1-shadow',
    line_index: 3,
    user_id: 'user-admin-1',
    user_email: 'admin@novelpub.dev',
    content: 'The disrespect from the heavy armor hunter is real though!',
    created_at: new Date().toISOString()
  }
];

// LocalStorage Helper Methods
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

const STORAGE_VERSION = 'v2_seed';

// Seed localStorage if empty or outdated
export function initLocalStorageSeed() {
  const currentVer = localStorage.getItem('novel_pub_seed_version');
  if (currentVer !== STORAGE_VERSION) {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(INITIAL_DEMO_BOOKS));
    localStorage.setItem(STORAGE_KEYS.CHAPTERS, JSON.stringify(INITIAL_DEMO_CHAPTERS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_DEMO_USERS));
    localStorage.setItem(STORAGE_KEYS.LINE_COMMENTS, JSON.stringify(INITIAL_LINE_COMMENTS));
    localStorage.setItem('novel_pub_seed_version', STORAGE_VERSION);
    return;
  }

  if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
    setLocalItem(STORAGE_KEYS.BOOKS, INITIAL_DEMO_BOOKS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CHAPTERS)) {
    setLocalItem(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    setLocalItem(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.LINE_COMMENTS)) {
    setLocalItem(STORAGE_KEYS.LINE_COMMENTS, INITIAL_LINE_COMMENTS);
  }
}

// Initialize seed data immediately
initLocalStorageSeed();

// ----------------------------------------------------
// BOOK DATA ACCESS API
// ----------------------------------------------------

export async function fetchBooks(): Promise<Book[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: booksData, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    if (!error && booksData) {
      // Query ratings table to compute average_rating and rating_count dynamically
      const { data: ratingsData } = await supabase.from('novel_ratings').select('book_id, rating');
      const ratingsMap: Record<string, number[]> = {};
      if (ratingsData) {
        for (const r of ratingsData) {
          if (!ratingsMap[r.book_id]) ratingsMap[r.book_id] = [];
          ratingsMap[r.book_id].push(r.rating);
        }
      }

      return booksData.map(b => {
        const rList = ratingsMap[b.id] || [];
        const avg = rList.length > 0 ? rList.reduce((sum, val) => sum + val, 0) / rList.length : undefined;
        return {
          ...b,
          average_rating: avg ? Number(avg.toFixed(1)) : undefined,
          rating_count: rList.length
        };
      });
    }
  }

  const books = getLocalItem<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_DEMO_BOOKS);
  const allRatings = getLocalItem<NovelRating[]>(STORAGE_KEYS.RATINGS, []);
  return books.map(b => {
    const rList = allRatings.filter(r => r.book_id === b.id);
    const avg = rList.length > 0 ? rList.reduce((sum, r) => sum + r.rating, 0) / rList.length : undefined;
    return {
      ...b,
      average_rating: avg ? Number(avg.toFixed(1)) : undefined,
      rating_count: rList.length
    };
  });
}

export async function fetchBookById(id: string): Promise<Book | null> {
  const books = await fetchBooks();
  return books.find(b => b.id === id) || null;
}

export async function createBook(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Promise<Book> {
  const sanitizedDescription = sanitizeHtml(book.description);

  if (isSupabaseConfigured && supabase) {
    // Only pass physical columns defined on the Supabase PostgreSQL 'books' table
    const payload = {
      title: book.title,
      author: book.author,
      description: sanitizedDescription,
      genre: book.genre,
      tags: book.tags || [],
      original_language: book.original_language,
      status: book.status,
      release_year: book.release_year,
      translator: book.translator,
      age_rating: book.age_rating,
      cover_url: book.cover_url,
      creator_id: book.creator_id || null
    };

    const { data, error } = await supabase.from('books').insert(payload).select().single();
    if (!error && data) {
      return {
        ...data,
        average_rating: 0,
        rating_count: 0
      };
    }
    if (error) {
      console.error('Failed to create book in Supabase:', error);
      throw new Error(error.message);
    }
  }

  // Fallback for LocalStorage Mock Engine
  const newBook: Book = {
    ...book,
    id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    description: sanitizedDescription,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    average_rating: 0,
    rating_count: 0
  };

  const books = getLocalItem<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_DEMO_BOOKS);
  const updated = [newBook, ...books];
  setLocalItem(STORAGE_KEYS.BOOKS, updated);
  return newBook;
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<Book | null> {
  if (updates.description) {
    updates.description = sanitizeHtml(updates.description);
  }
  updates.updated_at = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    // Omit computed properties before executing update on Supabase table
    const { average_rating, rating_count, ...dbUpdates } = updates;
    const { data, error } = await supabase.from('books').update(dbUpdates).eq('id', id).select().single();
    if (!error && data) return data;
    if (error) console.error('Failed to update book in Supabase:', error);
  }

  const books = getLocalItem<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_DEMO_BOOKS);
  const index = books.findIndex(b => b.id === id);
  if (index === -1) return null;

  books[index] = { ...books[index], ...updates };
  setLocalItem(STORAGE_KEYS.BOOKS, books);
  return books[index];
}

export async function deleteBook(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (!error) return true;
  }

  let books = getLocalItem<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_DEMO_BOOKS);
  books = books.filter(b => b.id !== id);
  setLocalItem(STORAGE_KEYS.BOOKS, books);

  // Clean up associated chapters
  let chapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  chapters = chapters.filter(c => c.book_id !== id);
  setLocalItem(STORAGE_KEYS.CHAPTERS, chapters);

  return true;
}

// ----------------------------------------------------
// CHAPTER DATA ACCESS API
// ----------------------------------------------------

export async function fetchChapters(bookId: string): Promise<Chapter[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('chapters').select('*').eq('book_id', bookId).order('chapter_number', { ascending: true });
    if (!error && data) return data;
  }

  const allChapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  return allChapters
    .filter(c => c.book_id === bookId)
    .sort((a, b) => a.chapter_number - b.chapter_number);
}

export async function replaceBookChapters(bookId: string, chapters: { title: string; content: string; chapter_number?: number }[]): Promise<Chapter[]> {
  if (isSupabaseConfigured && supabase) {
    // Delete old chapters for this book
    await supabase.from('chapters').delete().eq('book_id', bookId);

    // Prepare payload without mock ID so PostgreSQL generates UUIDs automatically
    const dbPayload = chapters.map((c, i) => ({
      book_id: bookId,
      chapter_number: i + 1,
      title: c.title || `Chapter ${i + 1}`,
      content: sanitizeHtml(c.content)
    }));

    const { data, error } = await supabase.from('chapters').insert(dbPayload).select();
    if (!error && data) return data.sort((a, b) => a.chapter_number - b.chapter_number);
    if (error) console.error('Failed to replace chapters in Supabase:', error);
  }

  // Fallback for local storage mock engine
  const newChapters: Chapter[] = chapters.map((c, i) => ({
    id: `chap-${Date.now()}-${i}`,
    book_id: bookId,
    chapter_number: i + 1,
    title: c.title || `Chapter ${i + 1}`,
    content: sanitizeHtml(c.content),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  let allChapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  allChapters = allChapters.filter(c => c.book_id !== bookId);
  allChapters = [...allChapters, ...newChapters];
  setLocalItem(STORAGE_KEYS.CHAPTERS, allChapters);

  return newChapters;
}

export async function appendOrInsertChapter(
  bookId: string,
  chapterData: { title: string; content: string; targetPosition?: number }
): Promise<Chapter> {
  const existingChapters = await fetchChapters(bookId);
  const position = chapterData.targetPosition || existingChapters.length + 1;

  if (isSupabaseConfigured && supabase) {
    // Shift chapter numbers for subsequent chapters if inserting in between
    for (const c of existingChapters) {
      if (c.chapter_number >= position) {
        await supabase
          .from('chapters')
          .update({ chapter_number: c.chapter_number + 1 })
          .eq('id', c.id);
      }
    }

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        chapter_number: position,
        title: chapterData.title,
        content: sanitizeHtml(chapterData.content)
      })
      .select()
      .single();

    if (!error && data) return data;
    if (error) console.error('Failed to insert chapter in Supabase:', error);
  }

  // Local storage fallback
  const newChapter: Chapter = {
    id: `chap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    book_id: bookId,
    chapter_number: position,
    title: chapterData.title,
    content: sanitizeHtml(chapterData.content),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updatedList = existingChapters.map(c => {
    if (c.chapter_number >= position) {
      return { ...c, chapter_number: c.chapter_number + 1 };
    }
    return c;
  });
  updatedList.splice(position - 1, 0, newChapter);

  let allChapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  allChapters = allChapters.filter(c => c.book_id !== bookId);
  allChapters = [...allChapters, ...updatedList];
  setLocalItem(STORAGE_KEYS.CHAPTERS, allChapters);

  return newChapter;
}

export async function saveReorderedChapters(bookId: string, chapters: Chapter[]): Promise<Chapter[]> {
  const existing = await fetchChapters(bookId);

  const reordered = chapters.map((chap, idx) => ({
    ...chap,
    chapter_number: idx + 1,
    content: sanitizeHtml(chap.content),
    updated_at: new Date().toISOString()
  }));

  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    // Optimization: Diff list and ONLY update chapters whose chapter_number, title, or content changed
    const changedChapters = reordered.filter((chap) => {
      const match = existing.find(e => e.id === chap.id);
      return !match || match.chapter_number !== chap.chapter_number || match.title !== chap.title || match.content !== chap.content;
    });

    if (changedChapters.length > 0) {
      await Promise.all(
        changedChapters.map(chap => {
          const match = existing.find(e => e.id === chap.id);
          const payload: Record<string, any> = {
            chapter_number: chap.chapter_number,
            title: chap.title,
            updated_at: chap.updated_at
          };
          if (!match || match.content !== chap.content) {
            payload.content = chap.content;
          }
          return client
            .from('chapters')
            .update(payload)
            .eq('id', chap.id);
        })
      );
    }
    return await fetchChapters(bookId);
  }

  let allChapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  allChapters = allChapters.filter(c => c.book_id !== bookId);
  allChapters = [...allChapters, ...reordered];
  setLocalItem(STORAGE_KEYS.CHAPTERS, allChapters);

  return reordered;
}

export async function deleteChapter(chapterId: string, bookId: string): Promise<Chapter[]> {
  const existingChapters = await fetchChapters(bookId);
  const targetChapter = existingChapters.find(c => c.id === chapterId);

  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    // 1. Delete target chapter from database
    await client.from('chapters').delete().eq('id', chapterId);

    // 2. Optimization: Only update subsequent chapters (chapter_number > deleted.chapter_number)
    if (targetChapter) {
      const subsequentChapters = existingChapters.filter(
        c => c.id !== chapterId && c.chapter_number > targetChapter.chapter_number
      );

      if (subsequentChapters.length > 0) {
        await Promise.all(
          subsequentChapters.map(chap =>
            client
              .from('chapters')
              .update({ chapter_number: chap.chapter_number - 1 })
              .eq('id', chap.id)
          )
        );
      }
    }

    return await fetchChapters(bookId);
  }

  let chapters = existingChapters.filter(c => c.id !== chapterId);
  chapters = chapters.map((c, i) => ({ ...c, chapter_number: i + 1 }));

  let allChapters = getLocalItem<Chapter[]>(STORAGE_KEYS.CHAPTERS, INITIAL_DEMO_CHAPTERS);
  allChapters = allChapters.filter(c => c.book_id !== bookId);
  allChapters = [...allChapters, ...chapters];
  setLocalItem(STORAGE_KEYS.CHAPTERS, allChapters);

  return chapters;
}

// ----------------------------------------------------
// READING PROGRESS ACCESS API
// ----------------------------------------------------

export async function getReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null> {
  const allProgress = getLocalItem<ReadingProgress[]>(STORAGE_KEYS.PROGRESS, []);
  const localRecord = allProgress.find(p => p.user_id === userId && p.book_id === bookId) || null;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle();

    if (!error && data) {
      // Sync local storage cache with latest cloud record
      const index = allProgress.findIndex(p => p.user_id === userId && p.book_id === bookId);
      if (index !== -1) {
        allProgress[index] = data;
      } else {
        allProgress.push(data);
      }
      setLocalItem(STORAGE_KEYS.PROGRESS, allProgress);
      return data;
    }
  }

  return localRecord;
}

export async function saveReadingProgress(progress: Omit<ReadingProgress, 'id' | 'updated_at'>): Promise<ReadingProgress> {
  const allProgress = getLocalItem<ReadingProgress[]>(STORAGE_KEYS.PROGRESS, []);
  const index = allProgress.findIndex(p => p.user_id === progress.user_id && p.book_id === progress.book_id);

  const updatedRecord: ReadingProgress = {
    id: index !== -1 ? allProgress[index].id : `prog-${Date.now()}`,
    ...progress,
    updated_at: new Date().toISOString()
  };

  if (index !== -1) {
    allProgress[index] = updatedRecord;
  } else {
    allProgress.push(updatedRecord);
  }
  setLocalItem(STORAGE_KEYS.PROGRESS, allProgress);

  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    const { data, error } = await client.from('reading_progress').upsert(
      {
        user_id: progress.user_id,
        book_id: progress.book_id,
        chapter_id: progress.chapter_id,
        chapter_number: progress.chapter_number,
        scroll_percent: progress.scroll_percent,
        scroll_y: progress.scroll_y,
        updated_at: updatedRecord.updated_at
      },
      { onConflict: 'user_id,book_id' }
    ).select().single();

    if (!error && data) return data;
    if (error) console.error('Failed to save reading progress in Supabase:', error);
  }

  return updatedRecord;
}

// ----------------------------------------------------
// NOVEL RATINGS & REVIEWS ACCESS API
// ----------------------------------------------------

export async function getNovelRatings(bookId: string): Promise<NovelRating[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('novel_ratings').select('*').eq('book_id', bookId);
    if (!error && data) return data;
  }
  const allRatings = getLocalItem<NovelRating[]>(STORAGE_KEYS.RATINGS, []);
  return allRatings.filter(r => r.book_id === bookId);
}

export async function getUserBookRating(bookId: string, userId: string): Promise<number> {
  const ratings = await getNovelRatings(bookId);
  const found = ratings.find(r => r.user_id === userId);
  return found ? found.rating : 0;
}

export async function saveNovelRating(bookId: string, userId: string, rating: number): Promise<Book | null> {
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    // Upsert single rating per user per book (PostgreSQL UNIQUE(book_id, user_id))
    const { error } = await client.from('novel_ratings').upsert(
      { book_id: bookId, user_id: userId, rating, updated_at: new Date().toISOString() },
      { onConflict: 'book_id,user_id' }
    );
    if (error) console.error('Failed to upsert novel rating in Supabase:', error);

    const books = await fetchBooks();
    return books.find(b => b.id === bookId) || null;
  }

  // Local Storage Fallback: Enforce 1 rating per user per book
  let allRatings = getLocalItem<NovelRating[]>(STORAGE_KEYS.RATINGS, []);
  const index = allRatings.findIndex(r => r.book_id === bookId && r.user_id === userId);

  if (index !== -1) {
    allRatings[index] = { ...allRatings[index], rating, created_at: new Date().toISOString() };
  } else {
    allRatings.push({
      id: `rate-${Date.now()}`,
      book_id: bookId,
      user_id: userId,
      rating,
      created_at: new Date().toISOString()
    });
  }

  setLocalItem(STORAGE_KEYS.RATINGS, allRatings);

  const books = await fetchBooks();
  return books.find(b => b.id === bookId) || null;
}

export async function getNovelReviews(bookId: string): Promise<NovelReview[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('novel_reviews')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  }
  const allReviews = getLocalItem<NovelReview[]>(STORAGE_KEYS.REVIEWS, []);
  return allReviews.filter(r => r.book_id === bookId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addNovelReview(review: Omit<NovelReview, 'id' | 'created_at'>): Promise<NovelReview> {
  // 1. If a star rating was selected, update/save the user's single rating entry
  if (review.rating && review.rating > 0) {
    await saveNovelRating(review.book_id, review.user_id, review.rating);
  }

  // 2. Save review comment (users can leave multiple review comments)
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    const { data, error } = await client.from('novel_reviews').insert({
      book_id: review.book_id,
      user_id: review.user_id,
      user_email: review.user_email,
      user_nickname: review.user_nickname,
      content: sanitizeHtml(review.content),
      rating: review.rating
    }).select().single();

    if (!error && data) return data;
    if (error) console.error('Failed to add novel review in Supabase:', error);
  }

  const allReviews = getLocalItem<NovelReview[]>(STORAGE_KEYS.REVIEWS, []);
  const newReview: NovelReview = {
    id: `rev-${Date.now()}`,
    ...review,
    content: sanitizeHtml(review.content),
    created_at: new Date().toISOString()
  };

  allReviews.unshift(newReview);
  setLocalItem(STORAGE_KEYS.REVIEWS, allReviews);
  return newReview;
}

// ----------------------------------------------------
// PARAGRAPH / LINE COMMENTS ACCESS API
// ----------------------------------------------------

export async function getLineComments(chapterId: string): Promise<LineComment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('line_comments')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });
    if (!error && data) return data;
  }
  const allComments = getLocalItem<LineComment[]>(STORAGE_KEYS.LINE_COMMENTS, INITIAL_LINE_COMMENTS);
  return allComments.filter(c => c.chapter_id === chapterId);
}

export async function addLineComment(comment: Omit<LineComment, 'id' | 'created_at'>): Promise<LineComment> {
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    const { data, error } = await client.from('line_comments').insert({
      book_id: comment.book_id,
      chapter_id: comment.chapter_id,
      line_index: comment.line_index,
      line_hash: comment.line_hash,
      user_id: comment.user_id,
      user_email: comment.user_email,
      user_nickname: comment.user_nickname,
      content: sanitizeHtml(comment.content)
    }).select().single();

    if (!error && data) return data;
    if (error) console.error('Failed to add line comment in Supabase:', error);
  }

  const allComments = getLocalItem<LineComment[]>(STORAGE_KEYS.LINE_COMMENTS, INITIAL_LINE_COMMENTS);
  const newComment: LineComment = {
    id: `lc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...comment,
    content: sanitizeHtml(comment.content),
    created_at: new Date().toISOString()
  };

  allComments.push(newComment);
  setLocalItem(STORAGE_KEYS.LINE_COMMENTS, allComments);
  return newComment;
}
