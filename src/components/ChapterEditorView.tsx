import React, { useState, useEffect } from 'react';
import { Book, Chapter } from '../types';
import { fetchChapters, saveReorderedChapters, deleteChapter } from '../lib/storage';
import { sanitizeHtml } from '../lib/sanitizer';
import { ArrowLeft, ArrowUp, ArrowDown, Save, Trash2, Edit, ListOrdered, Bold, Italic, Heading2, List } from 'lucide-react';

interface ChapterEditorViewProps {
  book: Book;
  onBack: () => void;
  onChaptersSaved: () => void;
}

export const ChapterEditorView: React.FC<ChapterEditorViewProps> = ({
  book,
  onBack,
  onChaptersSaved
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadChapters();
  }, [book.id]);

  const loadChapters = async () => {
    const chaps = await fetchChapters(book.id);
    setChapters(chaps);
    if (chaps.length > 0 && !selectedChapterId) {
      setSelectedChapterId(chaps[0].id);
      setEditTitle(chaps[0].title);
      setEditContent(chaps[0].content);
    }
  };

  const handleSelectChapter = (chap: Chapter) => {
    setSelectedChapterId(chap.id);
    setEditTitle(chap.title);
    setEditContent(chap.content);
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= chapters.length) return;

    const list = [...chapters];
    const [moved] = list.splice(index, 1);
    list.splice(newIndex, 0, moved);

    setChapters(list);
  };

  const handleUpdateCurrentChapter = () => {
    if (!selectedChapterId) return;

    setChapters(prev => prev.map(c => {
      if (c.id === selectedChapterId) {
        return {
          ...c,
          title: editTitle.trim(),
          content: sanitizeHtml(editContent)
        };
      }
      return c;
    }));
  };

  const handleDeleteCurrentChapter = async (chapId: string) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      const updated = await deleteChapter(chapId, book.id);
      setChapters(updated);
      if (updated.length > 0) {
        handleSelectChapter(updated[0]);
      } else {
        setSelectedChapterId(null);
        setEditTitle('');
        setEditContent('');
      }
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Apply current edits first
    const listToSave = chapters.map(c => {
      if (c.id === selectedChapterId) {
        return { ...c, title: editTitle.trim(), content: sanitizeHtml(editContent) };
      }
      return c;
    });

    await saveReorderedChapters(book.id, listToSave);
    setIsSaving(false);
    onChaptersSaved();
    onBack();
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Book Details
        </button>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          Save All Chapter Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Reorderable Chapter List */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[700px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-indigo-400" />
              Chapter List ({chapters.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {chapters.map((chap, idx) => {
              const isSelected = chap.id === selectedChapterId;

              return (
                <div
                  key={chap.id}
                  onClick={() => handleSelectChapter(chap)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/60 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-xs font-bold text-indigo-400 flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold truncate">{chap.title}</span>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      disabled={idx === 0}
                      onClick={() => moveChapter(idx, 'up')}
                      className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === chapters.length - 1}
                      onClick={() => moveChapter(idx, 'down')}
                      className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chapter Title & Rich Text Content Editor */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[700px]">
          {selectedChapter ? (
            <div className="flex flex-col h-full space-y-4">
              
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-indigo-400" />
                  Editing Chapter #{selectedChapter.chapter_number}
                </h3>
                <button
                  onClick={() => handleDeleteCurrentChapter(selectedChapter.id)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Chapter
                </button>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Chapter Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    handleUpdateCurrentChapter();
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              {/* Body Text Editor */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Chapter Content (HTML / Paragraphs formatted)
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    handleUpdateCurrentChapter();
                  }}
                  className="w-full flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none resize-none leading-relaxed"
                />
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Select a chapter from the list to edit its content.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
