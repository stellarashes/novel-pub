import React, { useState, useEffect } from 'react';
import { Book, Chapter } from '../types';
import { fetchChapters, saveReorderedChapters, deleteChapter } from '../lib/storage';
import { sanitizeHtml } from '../lib/sanitizer';
import { ArrowLeft, ArrowUp, ArrowDown, Save, Trash2, Edit, ListOrdered, Bold, Italic, Heading2, List, GripVertical } from 'lucide-react';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    // First commit current edits to local state before switching chapters
    if (selectedChapterId) {
      syncCurrentEditToState();
    }
    setSelectedChapterId(chap.id);
    setEditTitle(chap.title);
    setEditContent(chap.content);
  };

  const syncCurrentEditToState = () => {
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

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    syncCurrentEditToState();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= chapters.length) return;

    const list = [...chapters];
    const [moved] = list.splice(index, 1);
    list.splice(newIndex, 0, moved);

    setChapters(list);
  };

  const handleDropReorder = (fromIndex: number | null, toIndex: number) => {
    if (fromIndex === null || fromIndex === toIndex) return;
    syncCurrentEditToState();

    const list = [...chapters];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    setChapters(list);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteCurrentChapter = (chapId: string) => {
    if (confirm('Remove this chapter from the editor? (Changes will be finalized when you click "Save All Chapter Changes")')) {
      const updated = chapters.filter(c => c.id !== chapId);
      setChapters(updated);
      if (updated.length > 0) {
        const nextSelected = updated[0];
        setSelectedChapterId(nextSelected.id);
        setEditTitle(nextSelected.title);
        setEditContent(nextSelected.content);
      } else {
        setSelectedChapterId(null);
        setEditTitle('');
        setEditContent('');
      }
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);

    // Apply active chapter edits to draft list
    const finalDraft = chapters.map(c => {
      if (c.id === selectedChapterId) {
        return { ...c, title: editTitle.trim(), content: sanitizeHtml(editContent) };
      }
      return c;
    });

    try {
      // 1. Identify and delete chapters removed during this session
      const originalChapters = await fetchChapters(book.id);
      const removedChapters = originalChapters.filter(orig => !finalDraft.some(c => c.id === orig.id));
      for (const removed of removedChapters) {
        await deleteChapter(removed.id, book.id);
      }

      // 2. Save re-ordered and updated chapters (including title/content updates)
      await saveReorderedChapters(book.id, finalDraft);

      setIsSaving(false);
      onChaptersSaved();
      onBack();
    } catch (err) {
      console.error('Failed to save chapter edits:', err);
      setIsSaving(false);
    }
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-indigo-400" />
              Chapter Manager & Editor
            </h1>
            <p className="text-xs text-slate-400">Drag handle or use arrows to reorder. Click "Save All Chapter Changes" to apply.</p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save All Chapter Changes'}</span>
        </button>
      </div>

      {/* Editor Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chapter List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col max-h-[calc(100vh-220px)]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chapters ({chapters.length})
            </span>
            <span className="text-[11px] text-slate-500">Draft Mode</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No chapters remaining in draft.
              </div>
            ) : (
              chapters.map((chap, idx) => {
                const isSelected = chap.id === selectedChapterId;
                const isBeingDragged = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={chap.id || idx}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropReorder(draggedIndex, idx);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onClick={() => handleSelectChapter(chap)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-indigo-500 bg-indigo-500/10'
                        : isDragOver
                        ? 'border-indigo-400 bg-indigo-500/20 scale-[1.01]'
                        : isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {/* Drag Handle Icon */}
                      <div 
                        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-indigo-400 transition-colors p-0.5 flex-shrink-0"
                        title="Drag to reorder chapter position"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="text-xs font-mono text-indigo-400 font-bold flex-shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium truncate">
                        {chap.id === selectedChapterId ? editTitle || chap.title : chap.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveChapter(idx, 'up'); }}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveChapter(idx, 'down'); }}
                        disabled={idx === chapters.length - 1}
                        title="Move Down"
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCurrentChapter(chap.id); }}
                        title="Remove Chapter"
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chapter Content Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          {selectedChapter ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={syncCurrentEditToState}
                  placeholder="e.g. Chapter 1: The Beginning"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Chapter Content (HTML supported)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Paragraphs wrapped in &lt;p&gt; tags enable line commenting
                  </span>
                </div>

                {/* Quick Editor Toolbar */}
                <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-t-xl border border-slate-800 border-b-0 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setEditContent(prev => prev + '<p><strong>Bold text</strong></p>')}
                    className="p-1.5 hover:bg-slate-900 rounded text-slate-300 hover:text-white text-xs font-bold"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditContent(prev => prev + '<p><em>Italic text</em></p>')}
                    className="p-1.5 hover:bg-slate-900 rounded text-slate-300 hover:text-white text-xs italic"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditContent(prev => prev + '<h2>Section Heading</h2>')}
                    className="p-1.5 hover:bg-slate-900 rounded text-slate-300 hover:text-white"
                    title="Heading"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditContent(prev => prev + '<p>New paragraph here...</p>')}
                    className="p-1.5 hover:bg-slate-900 rounded text-slate-300 hover:text-white text-xs font-mono"
                    title="Add Paragraph <p>"
                  >
                    + &lt;p&gt;
                  </button>
                </div>

                <textarea
                  rows={16}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onBlur={syncCurrentEditToState}
                  placeholder="<p>Chapter body text goes here...</p>"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-b-xl p-4 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Select a chapter from the left panel to edit its title and content.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
