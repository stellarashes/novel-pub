import React, { useState, useEffect } from 'react';
import { Book, Chapter, ReadingProgress, NovelReview } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchChapters,
  getReadingProgress,
  getNovelReviews,
  addNovelReview,
  saveNovelRating,
  getUserBookRating,
  deleteBook
} from '../lib/storage';
import { sanitizeHtml } from '../lib/sanitizer';
import {
  BookOpen, Play, Edit3, Upload, FileText, ListOrdered, Trash2,
  Star, Clock, Globe, Shield, User, ArrowLeft, Tag, Calendar, UserCheck
} from 'lucide-react';

interface BookDetailViewProps {
  book: Book;
  onBack: () => void;
  onStartReading: (chapterId: string) => void;
  onOpenEditModal: () => void;
  onOpenUploadEpubModal: () => void;
  onOpenAppendTxtModal: () => void;
  onOpenChapterEditor: () => void;
  onBookUpdated: () => void;
  refreshTrigger?: number;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onBack,
  onStartReading,
  onOpenEditModal,
  onOpenUploadEpubModal,
  onOpenAppendTxtModal,
  onOpenChapterEditor,
  onBookUpdated,
  refreshTrigger
}) => {
  const { currentUser } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [reviews, setReviews] = useState<NovelReview[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [newReviewContent, setNewReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Authorization check: Admin or Original Creator can edit/manage
  const canEdit = Boolean(currentUser && (currentUser.role === 'admin' || book.creator_id === currentUser.id));

  useEffect(() => {
    loadData();
  }, [book.id, currentUser, refreshTrigger]);

  const loadData = async () => {
    const chaps = await fetchChapters(book.id);
    setChapters(chaps);

    if (currentUser) {
      const prog = await getReadingProgress(currentUser.id, book.id);
      setProgress(prog);
      const userR = await getUserBookRating(book.id, currentUser.id);
      setUserRating(userR);
    }

    const revs = await getNovelReviews(book.id);
    setReviews(revs);
  };

  const handleRateBook = async (rating: number) => {
    if (!currentUser) return;
    setUserRating(rating);
    await saveNovelRating(book.id, currentUser.id, rating);
    onBookUpdated();
    loadData();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newReviewContent.trim()) return;

    setIsSubmittingReview(true);
    await addNovelReview({
      book_id: book.id,
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_nickname: currentUser.nickname,
      content: newReviewContent.trim(),
      rating: userRating || 5
    });

    setNewReviewContent('');
    setIsSubmittingReview(false);
    onBookUpdated();
    loadData();
  };

  const handleDeleteBook = async () => {
    if (!canEdit) return;
    if (confirm(`Are you sure you want to delete "${book.title}"? This cannot be undone.`)) {
      setIsDeleting(true);
      await deleteBook(book.id);
      onBookUpdated();
      onBack();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Back Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {/* Book Banner & Details Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Cover Art Column */}
        <div className="md:col-span-1 flex flex-col items-center md:items-start">
          <div className="w-48 sm:w-full aspect-[3/4] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-6 flex flex-col justify-between">
                <BookOpen className="w-12 h-12 text-indigo-400 opacity-50" />
                <div>
                  <span className="text-xs font-bold uppercase text-indigo-400">{book.genre}</span>
                  <h2 className="text-lg font-bold text-white mt-1">{book.title}</h2>
                </div>
              </div>
            )}
          </div>

          {/* Additional Rating Display Below Cover Image */}
          <div className="mt-3 w-48 sm:w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-center gap-2 shadow-md">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(book.average_rating || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-extrabold text-white">
              {book.average_rating ? Number(book.average_rating).toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Info & Action Controls Column */}
        <div className="md:col-span-3 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {book.genre
                ? book.genre.split(',').map(g => g.trim()).filter(Boolean).map(g => (
                    <span key={g} className="text-xs font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full">
                      {g}
                    </span>
                  ))
                : null}
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                book.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                book.status === 'Ongoing' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {book.status}
              </span>
              <span className="text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                {book.original_language}
              </span>
              <span className="text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
                {book.age_rating}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {book.title}
            </h1>
            <p className="text-sm font-medium text-indigo-300 mt-1">
              by <span className="text-white font-semibold">{book.author}</span>
              {book.translator && <span className="text-slate-400 ml-2">(Translated by {book.translator})</span>}
            </p>

            {/* Tags */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {book.tags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      window.location.hash = `#/tag/${encodeURIComponent(t)}`;
                    }}
                    className="text-xs font-semibold bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title={`View all novels tagged #${t}`}
                  >
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span>#{t}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Rich Text Description */}
            <div
              className="mt-4 text-sm text-slate-300 leading-relaxed prose prose-invert prose-indigo max-w-none bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(book.description) }}
            />
          </div>

          {/* Primary Action Toolbar */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            
            {/* Read / Continue Reading Button */}
            <button
              onClick={() => {
                if (chapters.length > 0) {
                  const targetChapter = progress
                    ? chapters.find(c => c.id === progress.chapter_id) || chapters[0]
                    : chapters[0];
                  onStartReading(targetChapter.id);
                } else {
                  alert('This novel has no chapters yet. Upload an ePub or append a TXT chapter to start reading.');
                }
              }}
              disabled={chapters.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-base px-8 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-98 transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              {progress ? `Continue Chapter ${progress.chapter_number} (${Math.round(progress.scroll_percent)}%)` : 'Start Reading Chapter 1'}
            </button>

            {/* Management Buttons (If Creator or Admin) */}
            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={onOpenEditModal}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  Edit Novel Info
                </button>

                <button
                  onClick={onOpenUploadEpubModal}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-violet-400" />
                  Overwrite via ePub
                </button>

                <button
                  onClick={onOpenAppendTxtModal}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Append / Insert TXT
                </button>

                <button
                  onClick={onOpenChapterEditor}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                  Edit / Reorder Chapters ({chapters.length})
                </button>

                <button
                  onClick={handleDeleteBook}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Novel
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Table of Contents Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Table of Contents ({chapters.length} Chapters)
          </h2>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No chapters uploaded yet. Click "Append / Insert TXT" or "Overwrite via ePub" to add chapters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {chapters.map(chap => {
              const isCurrentReading = progress?.chapter_id === chap.id;

              return (
                <div
                  key={chap.id}
                  onClick={() => onStartReading(chap.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isCurrentReading
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-md'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-indigo-400 flex items-center justify-center">
                      {chap.chapter_number}
                    </span>
                    <span className="text-sm font-semibold line-clamp-1">{chap.title}</span>
                  </div>

                  {isCurrentReading && (
                    <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                      Reading ({Math.round(progress.scroll_percent)}%)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ratings & Novel Reviews Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          Reader Reviews & Ratings
        </h2>

        {/* Rate Novel Widget */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Rate this novel</span>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRateBook(star)}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  <Star className={`w-6 h-6 ${
                    star <= (userRating || Math.round(book.average_rating || 0))
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700 hover:text-amber-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-white">{book.average_rating || 'N/A'}</span>
            <span className="text-xs text-slate-400 block">({book.rating_count || 0} ratings)</span>
          </div>
        </div>

        {/* Write Review Form */}
        <form onSubmit={handleSubmitReview} className="space-y-3">
          <textarea
            required
            rows={3}
            value={newReviewContent}
            onChange={(e) => setNewReviewContent(e.target.value)}
            placeholder="Write your thoughts about this novel..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingReview || !newReviewContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Post Review
            </button>
          </div>
        </form>

        {/* Reviews List */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          {reviews.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No reviews yet. Be the first to leave feedback!</p>
          ) : (
            reviews.map(rev => (
              <div key={rev.id} className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">@{rev.user_nickname || rev.user_email}</span>
                    {Boolean(rev.rating && rev.rating > 0) && (
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-300">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{rev.rating} / 5</span>
                      </div>
                    )}
                  </div>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{rev.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
