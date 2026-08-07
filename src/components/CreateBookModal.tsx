import React, { useState } from 'react';
import { Book, NovelStatus, AgeRating } from '../types';
import { createBook } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Image, Bold, Italic, List, Heading2, Check } from 'lucide-react';

export const AVAILABLE_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Harem', 'Historical', 'Horror', 'Isekai', 'Martial Arts',
  'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Supernatural', 'System', 'Urban Fantasy', 'Wuxia', 'Xianxia', 'Other'
];

interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookCreated: (book: Book) => void;
}

export const CreateBookModal: React.FC<CreateBookModalProps> = ({
  isOpen,
  onClose,
  onBookCreated
}) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('English');
  const [status, setStatus] = useState<NovelStatus>('Ongoing');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [translator, setTranslator] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating>('All Ages');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(prev => prev.filter(item => item !== g));
    } else {
      setSelectedGenres(prev => [...prev, g]);
    }
  };

  const insertRichTag = (tagOpen: string, tagClose: string) => {
    setDescription(prev => `${prev}${tagOpen}${tagClose}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !currentUser) return;

    setIsSubmitting(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const genreString = selectedGenres.join(', ');

    const newBook = await createBook({
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || '<p>No description provided.</p>',
      genre: genreString,
      tags,
      original_language: originalLanguage,
      status,
      release_year: releaseYear,
      translator: translator.trim() || undefined,
      age_rating: ageRating,
      cover_url: coverUrl.trim() || undefined,
      creator_id: currentUser.id
    });

    setIsSubmitting(false);
    onBookCreated(newBook);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create New Novel</h2>
            <p className="text-xs text-slate-400">Fill in novel details to add it to the global library.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Novel Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lord of the Astral Realm"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Author Name *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Author Pen Name"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Rich Text HTML Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Rich HTML Synopsis / Description</label>
              <div className="flex gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button type="button" onClick={() => insertRichTag('<strong>', '</strong>')} className="p-1 text-slate-400 hover:text-white" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => insertRichTag('<em>', '</em>')} className="p-1 text-slate-400 hover:text-white" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => insertRichTag('<h2>', '</h2>')} className="p-1 text-slate-400 hover:text-white" title="Heading"><Heading2 className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => insertRichTag('<p>', '</p>')} className="p-1 text-slate-400 hover:text-white" title="Paragraph"><List className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="<p>Write an engaging synopsis for your novel...</p>"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm text-slate-200 font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Multi-Select Genres */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Genres (Select one or more)
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-36 overflow-y-auto">
              {AVAILABLE_GENRES.map(g => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
              <select
                value={originalLanguage}
                onChange={(e) => setOriginalLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {['English', 'Korean', 'Japanese', 'Chinese', 'Spanish', 'French', 'German'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NovelStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Age Rating</label>
              <select
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value as AgeRating)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="All Ages">All Ages</option>
                <option value="Teen">Teen</option>
                <option value="Mature">Mature</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. System, Magic, Overpowered"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Translator Credit (Optional)</label>
              <input
                type="text"
                value={translator}
                onChange={(e) => setTranslator(e.target.value)}
                placeholder="e.g. SoloTrans Team"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL (Optional)</label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
            >
              Create Novel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
