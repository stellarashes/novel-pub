export type UserRole = 'admin' | 'normal';

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  role: UserRole; // Active mode for UI permissions
  dbRole: UserRole; // Actual permanent role stored in database
  created_at: string;
}

export type NovelStatus = 'Ongoing' | 'Completed' | 'Hiatus';
export type AgeRating = 'All Ages' | 'Teen' | 'Mature';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string; // Rich HTML content (sanitized)
  genre: string;
  tags: string[];
  original_language: string;
  status: NovelStatus;
  release_year?: number;
  translator?: string;
  age_rating: AgeRating;
  cover_url?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  average_rating?: number;
  rating_count?: number;
}

export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string; // HTML / Rich Text (sanitized)
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  chapter_number: number;
  scroll_percent: number;
  scroll_y: number;
  updated_at: string;
}

export interface NovelRating {
  id: string;
  book_id: string;
  user_id: string;
  rating: number; // 1-5
  created_at: string;
}

export interface NovelReview {
  id: string;
  book_id: string;
  user_id: string;
  user_email: string;
  user_nickname?: string;
  content: string;
  rating?: number;
  created_at: string;
}

export interface LineComment {
  id: string;
  book_id: string;
  chapter_id: string;
  line_index: number;
  line_hash?: string;
  user_id: string;
  user_email: string;
  user_nickname?: string;
  content: string;
  created_at: string;
}

export type ReaderTheme = 'light' | 'dark' | 'sepia' | 'slate';
export type ReaderFontFamily = 'serif-lora' | 'serif-merriweather' | 'sans-inter' | 'mono-code';

export interface ReaderPrefs {
  theme: ReaderTheme;
  fontSize: number; // in px e.g. 18
  lineHeight: number; // e.g. 1.8
  fontFamily: ReaderFontFamily;
  maxWidth: string; // e.g. 'max-w-3xl'
}
