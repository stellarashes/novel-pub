import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Book, Chapter, ReaderPrefs, LineComment } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchChapters,
  saveReadingProgress,
  getReadingProgress,
  getLineComments,
  addLineComment
} from '../lib/storage';
import { sanitizeHtml } from '../lib/sanitizer';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Settings, BookOpen,
  MessageSquare, Plus, X, Send, Sun, Moon, Type, Layout, Sparkles
} from 'lucide-react';

interface ReaderViewProps {
  book: Book;
  initialChapterId: string;
  onBack: () => void;
}

const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'dark',
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif-lora',
  maxWidth: 'max-w-3xl'
};

const PREFS_STORAGE_KEY = 'novel_pub_reader_prefs';

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  initialChapterId,
  onBack
}) => {
  const { currentUser } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PREFS;
  });

  // Settings & Navigation Drawers
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  // Line Comment System State
  const [chapterComments, setChapterComments] = useState<LineComment[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Save Prefs
  useEffect(() => {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // Load Chapters
  useEffect(() => {
    fetchChapters(book.id).then(chaps => {
      setChapters(chaps);
      const idx = chaps.findIndex(c => c.id === initialChapterId);
      setCurrentChapterIndex(idx !== -1 ? idx : 0);
    });
  }, [book.id, initialChapterId]);

  const currentChapter = chapters[currentChapterIndex];

  // Load Line Comments for current chapter
  useEffect(() => {
    if (currentChapter) {
      getLineComments(currentChapter.id).then(setChapterComments);
    }
  }, [currentChapter?.id]);

  // Load & Restore Saved Scroll Progress
  useEffect(() => {
    if (!currentChapter || !currentUser) return;

    isRestoringScroll.current = true;
    getReadingProgress(currentUser.id, book.id).then(prog => {
      if (prog && prog.chapter_id === currentChapter.id && prog.scroll_y > 0) {
        setTimeout(() => {
          window.scrollTo({ top: prog.scroll_y, behavior: 'smooth' });
          isRestoringScroll.current = false;
        }, 150);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
        isRestoringScroll.current = false;
      }
    });
  }, [currentChapterIndex, currentChapter?.id, book.id, currentUser]);

  // Real-time Scroll Listener with Debounced Cloud Sync
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentChapter || !currentUser) return;

    const handleScroll = () => {
      if (isRestoringScroll.current) return;

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;

      const payload = {
        user_id: currentUser.id,
        book_id: book.id,
        chapter_id: currentChapter.id,
        chapter_number: currentChapter.chapter_number,
        scroll_percent: Number(scrollPercent.toFixed(1)),
        scroll_y: Math.round(scrollTop)
      };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveReadingProgress(payload);
      }, 10000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentChapter, book.id, currentUser]);

  // Desktop Keyboard Arrow Navigation (← / →)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger chapter switch if typing in input fields or textareas
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevChapter();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, chapters.length]);

  const changeToChapter = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < chapters.length) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setCurrentChapterIndex(newIndex);
      setActiveLineIndex(null);
      const targetChap = chapters[newIndex];
      if (targetChap) {
        if (currentUser) {
          saveReadingProgress({
            user_id: currentUser.id,
            book_id: book.id,
            chapter_id: targetChap.id,
            chapter_number: targetChap.chapter_number,
            scroll_percent: 0,
            scroll_y: 0
          });
        }
        window.location.hash = `#/book/${book.id}/chapter/${targetChap.id}`;
      }
    }
  };

  const goToPrevChapter = () => {
    changeToChapter(currentChapterIndex - 1);
  };

  const goToNextChapter = () => {
    changeToChapter(currentChapterIndex + 1);
  };

  // Group line comments by line index
  const commentsByLine = useMemo(() => {
    const map: Record<number, LineComment[]> = {};
    chapterComments.forEach(c => {
      if (!map[c.line_index]) map[c.line_index] = [];
      map[c.line_index].push(c);
    });
    return map;
  }, [chapterComments]);

  // Split chapter HTML into individual paragraph blocks for line-level commenting
  const paragraphs = useMemo(() => {
    if (!currentChapter) return [];
    const content = sanitizeHtml(currentChapter.content);

    // Parse HTML string into DOM nodes
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // Query all block/paragraph elements regardless of outer <div> or <section> wrappers
    const blockElements = Array.from(doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, li'));

    if (blockElements.length > 0) {
      return blockElements
        .map(el => el.outerHTML)
        .filter(html => html.replace(/<[^>]*>/g, '').trim().length > 0);
    }

    // Fallback: split raw text by double line breaks (\n\n) or <br><br>
    const textLines = content
      .split(/(?:<br\s*\/?>\s*<br\s*\/?>|\r?\n\r?\n)/i)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (textLines.length > 0) {
      return textLines.map(line => line.startsWith('<') ? line : `<p>${line}</p>`);
    }

    return [`<p>${content}</p>`];
  }, [currentChapter?.content]);

  const handlePostLineComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeLineIndex === null || !newCommentText.trim() || !currentUser || !currentChapter) return;

    setIsSubmittingComment(true);
    const added = await addLineComment({
      book_id: book.id,
      chapter_id: currentChapter.id,
      line_index: activeLineIndex,
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_nickname: currentUser.nickname,
      content: newCommentText.trim()
    });

    setChapterComments(prev => [...prev, added]);
    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  if (!currentChapter) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-400">
        <p className="mb-4">Loading chapter content...</p>
        <button onClick={onBack} className="text-xs text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
          Return to Book Details
        </button>
      </div>
    );
  }

  // Determine active theme CSS class
  const themeClass = `reader-theme-${prefs.theme}`;

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-200 flex flex-col`}>
      
      {/* Sticky Top Reader Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back to Book Details"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="hidden sm:block truncate">
              <span className="text-xs text-indigo-400 font-semibold truncate block">{book.title}</span>
              <span className="text-xs text-slate-300 font-bold truncate block">{currentChapter.title}</span>
            </div>
          </div>

          {/* Controls: TOC Drawer + Reader Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTocOpen(!isTocOpen)}
              className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Contents</span> ({currentChapterIndex + 1}/{chapters.length})
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all"
              title="Reader Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Reader Customization Toolbar Modal */}
      {isSettingsOpen && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl w-80 text-white space-y-4 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-4 h-4" />
              Typography & Themes
            </span>
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Background Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'dark', label: 'Dark', bg: '#0f172a', text: '#e2e8f0' },
                { key: 'sepia', label: 'Sepia', bg: '#fbf0d9', text: '#433422' },
                { key: 'slate', label: 'Slate', bg: '#18181b', text: '#d4d4d8' },
                { key: 'light', label: 'Light', bg: '#ffffff', text: '#1e293b' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setPrefs({ ...prefs, theme: t.key as any })}
                  style={{ backgroundColor: t.bg, color: t.text }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    prefs.theme === t.key ? 'ring-2 ring-indigo-500 border-transparent shadow-lg' : 'border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Font Style</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'serif-lora', label: 'Lora Serif' },
                { key: 'serif-merriweather', label: 'Merriweather' },
                { key: 'sans-inter', label: 'Inter Sans' },
                { key: 'mono-code', label: 'Monospace' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setPrefs({ ...prefs, fontFamily: f.key as any })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-xl border transition-all ${
                    prefs.fontFamily === f.key
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size & Container Width */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Font Size: {prefs.fontSize}px</label>
              <input
                type="range"
                min={14}
                max={28}
                value={prefs.fontSize}
                onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Reading Width</label>
              <select
                value={prefs.maxWidth}
                onChange={(e) => setPrefs({ ...prefs, maxWidth: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="max-w-2xl">Compact (2XL)</option>
                <option value="max-w-3xl">Standard (3XL)</option>
                <option value="max-w-4xl">Wide (4XL)</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic text-center pt-1 border-t border-slate-800">
            💡 Tip: Use Left (←) & Right (→) arrow keys to switch chapters.
          </p>
        </div>
      )}

      {/* Table of Contents Drawer */}
      {isTocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start">
          <div className="w-80 bg-slate-900 border-r border-slate-800 h-full p-6 space-y-4 text-white overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Table of Contents
              </h3>
              <button onClick={() => setIsTocOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  onClick={() => {
                    changeToChapter(idx);
                    setIsTocOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    idx === currentChapterIndex
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="opacity-60">{idx + 1}.</span>
                  <span className="truncate">{chap.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chapter Content Container */}
      <main className="flex-1 w-full max-auto py-12 px-4 sm:px-6">
        <div className={`${prefs.maxWidth} mx-auto space-y-8`}>
          
          {/* Chapter Heading */}
          <div className="border-b border-current/15 pb-6 text-center space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest opacity-60">
              Chapter {currentChapter.chapter_number} of {chapters.length}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {currentChapter.title}
            </h1>
          </div>

          {/* Paragraphs with Line-Level Commenting */}
          <div
            ref={containerRef}
            className={`font-${prefs.fontFamily} space-y-6 leading-relaxed`}
            style={{
              fontSize: `${prefs.fontSize}px`,
              lineHeight: prefs.lineHeight
            }}
          >
            {paragraphs.map((pContent, lineIdx) => {
              const lineComments = commentsByLine[lineIdx] || [];
              const commentCount = lineComments.length;
              const isActive = activeLineIndex === lineIdx;

              return (
                <div
                  key={lineIdx}
                  className={`relative group rounded-xl p-2 pr-16 sm:pr-20 transition-all duration-200 ${
                    isActive ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'hover:bg-current/5'
                  }`}
                >
                  {/* Paragraph HTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: pContent }}
                    className="prose prose-neutral max-w-none select-text"
                  />

                  {/* Desktop Hover / Mobile Trigger Button & Comment Badge */}
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    
                    {/* Inline Comment Count Badge */}
                    {commentCount > 0 && (
                      <button
                        onClick={() => setActiveLineIndex(isActive ? null : lineIdx)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-md flex items-center gap-1 transition-transform hover:scale-105"
                        title={`${commentCount} comments on this paragraph`}
                      >
                        <MessageSquare className="w-3 h-3 fill-white" />
                        <span>+{commentCount}</span>
                      </button>
                    )}

                    {/* Desktop '+' Comment Trigger Button */}
                    <button
                      onClick={() => setActiveLineIndex(isActive ? null : lineIdx)}
                      className={`p-1 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white opacity-100'
                          : 'bg-slate-900/80 border border-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white'
                      }`}
                      title="Add line comment"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Comments Discussion Drawer / Box */}
                  {isActive && (
                    <div className="mt-3 p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl space-y-3 text-xs font-sans animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Line Comments ({commentCount})
                        </span>
                        <button onClick={() => setActiveLineIndex(null)} className="text-slate-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Existing Line Comments */}
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {commentCount === 0 ? (
                          <p className="text-slate-500 italic py-2">No comments on this line yet. Start the discussion!</p>
                        ) : (
                          lineComments.map(lc => (
                            <div key={lc.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-semibold text-slate-200">@{lc.user_nickname || lc.user_email}</span>
                                <span>{new Date(lc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-slate-300 text-xs">{lc.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment Input */}
                      <form onSubmit={handlePostLineComment} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write a comment on this line..."
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingComment || !newCommentText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Bottom Chapter Navigation Bar */}
          <div className="pt-8 border-t border-current/15 flex items-center justify-between gap-4 font-sans">
            <button
              onClick={goToPrevChapter}
              disabled={currentChapterIndex === 0}
              className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 text-white disabled:opacity-30 hover:border-indigo-500/50 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Chapter
            </button>

            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>

            <button
              onClick={goToNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-30 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              Next Chapter
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </main>

    </div>
  );
};
