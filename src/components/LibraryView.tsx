import React, { useState, useMemo } from 'react';
import { Book, ReadingProgress, NovelStatus, AgeRating } from '../types';
import { AVAILABLE_GENRES } from './CreateBookModal';
import { Star, BookOpen, Clock, Tag, Globe, CheckCircle2, AlertCircle, Filter, RotateCcw, X, ChevronDown } from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  progressMap: Record<string, ReadingProgress>;
  searchTerm: string;
  activeUrlGenre?: string;
  activeUrlTag?: string | null;
  onSelectBook: (book: Book) => void;
  onOpenCreateModal: () => void;
}

const GENRES = ['All', ...AVAILABLE_GENRES];
const LANGUAGES = ['All', 'English', 'Korean', 'Japanese', 'Chinese', 'Spanish', 'French'];
const STATUSES: ('All' | NovelStatus)[] = ['All', 'Ongoing', 'Completed', 'Hiatus'];
const AGE_RATINGS: ('All' | AgeRating)[] = ['All', 'All Ages', 'Teen', 'Mature'];

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  progressMap,
  searchTerm,
  activeUrlGenre,
  activeUrlTag,
  onSelectBook,
  onOpenCreateModal
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | NovelStatus>('All');
  const [selectedAgeRating, setSelectedAgeRating] = useState<'All' | AgeRating>('All');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('novelpub_hero_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem('novelpub_hero_banner_dismissed', 'true');
    } catch (e) {
      console.error('Failed to save banner dismiss state:', e);
    }
  };
  
  const selectedGenre = activeUrlGenre || 'All';
  const selectedTag = activeUrlTag || null;

  const updateUrlFilters = (genre: string, tag: string | null) => {
    const parts: string[] = [];
    if (genre && genre !== 'All') {
      parts.push(`genre/${encodeURIComponent(genre)}`);
    }
    if (tag) {
      parts.push(`tag/${encodeURIComponent(tag)}`);
    }

    if (parts.length === 0) {
      window.location.hash = '#/';
    } else {
      window.location.hash = `#/${parts.join('/')}`;
    }
  };

  const handleToggleTag = (tag: string) => {
    updateUrlFilters(selectedGenre, selectedTag === tag ? null : tag);
  };

  // Extract top 8 most frequent tags across books
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    books.forEach(b => {
      b.tags?.forEach(t => {
        const cleanTag = t.trim();
        if (cleanTag) {
          counts.set(cleanTag, (counts.get(cleanTag) || 0) + 1);
        }
      });
    });

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 8);

    if (selectedTag && !sorted.includes(selectedTag)) {
      return [...sorted, selectedTag];
    }
    return sorted;
  }, [books, selectedTag]);

  // Filter books based on search & active filter criteria
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Search text query
      const matchesSearch = !searchTerm.trim() || [
        book.title,
        book.author,
        book.description,
        book.genre,
        ...(book.tags || [])
      ].some(val => val.toLowerCase().includes(searchTerm.toLowerCase()));

      // Dropdown filters
      const matchesGenre = selectedGenre === 'All' || (book.genre && book.genre.split(',').map(g => g.trim()).includes(selectedGenre));
      const matchesLanguage = selectedLanguage === 'All' || book.original_language === selectedLanguage;
      const matchesStatus = selectedStatus === 'All' || book.status === selectedStatus;
      const matchesAgeRating = selectedAgeRating === 'All' || book.age_rating === selectedAgeRating;
      const matchesTag = !selectedTag || book.tags?.includes(selectedTag);

      return matchesSearch && matchesGenre && matchesLanguage && matchesStatus && matchesAgeRating && matchesTag;
    });
  }, [books, searchTerm, selectedGenre, selectedLanguage, selectedStatus, selectedAgeRating, selectedTag]);

  const resetFilters = () => {
    setSelectedLanguage('All');
    setSelectedStatus('All');
    setSelectedAgeRating('All');
    updateUrlFilters('All', null);
  };

  const hasActiveFilters = selectedGenre !== 'All' || selectedLanguage !== 'All' || selectedStatus !== 'All' || selectedAgeRating !== 'All' || selectedTag !== null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Library Hero Banner */}
      {!isBannerDismissed && (
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-violet-900/40 border border-slate-800/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <button
            onClick={handleDismissBanner}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              Global Novel Library
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
              Discover & Publish Web Novels
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Upload ePubs, append TXT chapters, reorder chapters, and track your reading scroll progress across devices.
            </p>
          </div>
        </div>
      )}

      {/* Filter Controls Toolbar (Compact when collapsed with no active filters) */}
      {!isFiltersOpen && !hasActiveFilters ? (
        <div className="flex items-center justify-start">
          <button
            onClick={() => setIsFiltersOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md group"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Filter Novels ({filteredBooks.length})</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors ml-0.5" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
          <div
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>Filter Novels ({filteredBooks.length})</span>
              {hasActiveFilters && (
                <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full ml-1">
                  Active Filters
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                  }}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

        {/* Collapsible Content */}
        {isFiltersOpen && (
          <div className="space-y-4 pt-3 border-t border-slate-800/80">
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => updateUrlFilters(e.target.value, selectedTag)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Age Rating</label>
                <select
                  value={selectedAgeRating}
                  onChange={(e) => setSelectedAgeRating(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {AGE_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Top 8 Popular Tags List */}
            {topTags.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400 mr-1">Top Tags:</span>
                {topTags.map(tag => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Book Cards Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No novels match your filters</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search criteria or create a new novel to get started.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          >
            Create New Novel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map(book => {
            const progress = progressMap[book.id];
            const hasProgress = Boolean(progress);

            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer transition-all duration-300 flex flex-col"
              >
                {/* Book Cover Image */}
                <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-6 flex flex-col justify-between">
                      <BookOpen className="w-10 h-10 text-indigo-400 opacity-40" />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-semibold">
                          {selectedGenre !== 'All' && book.genre && book.genre.split(',').map(g => g.trim()).includes(selectedGenre)
                            ? selectedGenre
                            : (book.genre ? book.genre.split(',')[0] : 'Novel')}
                        </span>
                        <h3 className="text-lg font-bold text-white line-clamp-3 mt-1">{book.title}</h3>
                      </div>
                    </div>
                  )}

                  {/* Status & Language Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur-md ${
                      book.status === 'Completed' ? 'bg-emerald-500/80 text-white' :
                      book.status === 'Ongoing' ? 'bg-indigo-500/80 text-white' :
                      'bg-amber-500/80 text-white'
                    }`}>
                      {book.status}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 text-slate-200 border border-slate-700 backdrop-blur-md flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      {book.original_language}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  {book.average_rating ? (
                    <div className="absolute top-3 right-3 bg-slate-950/85 border border-slate-700/80 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1 shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{book.average_rating}</span>
                    </div>
                  ) : null}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
                      by {book.author}
                    </p>

                    {/* Multi-Genre Badges */}
                    {book.genre && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {book.genre.split(',').map(g => g.trim()).filter(Boolean).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateUrlFilters(selectedGenre === g ? 'All' : g, selectedTag);
                            }}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              selectedGenre === g
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                            }`}
                            title={`Filter by genre: ${g}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {book.tags && book.tags.length > 0 && (() => {
                      const activeMatch = selectedTag && book.tags.includes(selectedTag);
                      const displayTags = activeMatch
                        ? [selectedTag, ...book.tags.filter(t => t !== selectedTag)].slice(0, 3)
                        : book.tags.slice(0, 3);

                      return (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {displayTags.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTag(t);
                              }}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-all ${
                                selectedTag === t
                                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Reading Progress Indicator */}
                  {hasProgress ? (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300 mb-1">
                        <span className="flex items-center gap-1 text-indigo-400">
                          <Clock className="w-3 h-3" />
                          Ch. {progress.chapter_number}
                        </span>
                        <span>{Math.round(progress.scroll_percent)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(5, progress.scroll_percent)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Unread</span>
                      <span className="group-hover:text-indigo-400 transition-colors">Start Reading →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
