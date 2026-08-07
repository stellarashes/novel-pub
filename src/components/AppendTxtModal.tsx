import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { parseTxtFile, ParsedTxtResult } from '../lib/txtParser';
import { fetchChapters, appendOrInsertChapter } from '../lib/storage';
import { X, Plus, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface AppendTxtModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onChapterAppended: () => void;
}

export const AppendTxtModal: React.FC<AppendTxtModalProps> = ({
  book,
  isOpen,
  onClose,
  onChapterAppended
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [targetPosition, setTargetPosition] = useState<number>(-1); // -1 = append at end
  const [existingChapterCount, setExistingChapterCount] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTxtResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch chapter count when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchChapters(book.id).then((chaps) => {
        setExistingChapterCount(chaps.length);
      });
    }
  }, [isOpen, book.id]);

  if (!isOpen) return null;

  const processFile = async (selected: File) => {
    if (!selected.name.endsWith('.txt') && !selected.name.endsWith('.text')) {
      setErrorMsg('Please select a valid .txt or .text file.');
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setIsParsing(true);

    // Auto default title from filename without extension
    const defaultTitle = selected.name.replace(/\.[^/.]+$/, '');
    setChapterTitle(defaultTitle);

    try {
      const result = await parseTxtFile(selected);
      setParsedData(result);
    } catch (err: any) {
      console.error('TXT Parsing Error:', err);
      setErrorMsg(err.message || 'Failed to parse text file.');
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedData || !chapterTitle.trim()) return;

    setIsSaving(true);
    try {
      const pos = targetPosition === -1 ? existingChapterCount + 1 : targetPosition + 1;
      await appendOrInsertChapter(book.id, {
        title: chapterTitle.trim(),
        content: parsedData.content,
        targetPosition: pos
      });

      onChapterAppended();
      onClose();
    } catch (err: any) {
      setErrorMsg('Failed to save chapter.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl">
            <FileText className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Append / Insert TXT Chapter</h2>
            <p className="text-xs text-slate-400">Add a text chapter to "{book.title}".</p>
          </div>
        </div>

        {/* File Dropzone */}
        <div className="space-y-4">
          <label
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-emerald-500 bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              accept=".txt,.text"
              onChange={handleFileChange}
              className="hidden"
            />
            <Plus className={`w-10 h-10 mx-auto mb-2 transition-colors ${isDragging ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-sm font-semibold text-slate-200 block">
              {file ? file.name : 'Click to select or drag .txt file here'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Plain text (.txt) files supported</span>
          </label>

          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Formatting text into paragraphs...</span>
            </div>
          )}

          {parsedData && !isParsing && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chapter Title</label>
                <input
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Insertion Position
                </label>
                <select
                  value={targetPosition}
                  onChange={(e) => setTargetPosition(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                >
                  <option value={-1}>Append at the End (Chapter {existingChapterCount + 1})</option>
                  {Array.from({ length: existingChapterCount }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      Insert as Chapter {idx + 1} (Shift remaining)
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold text-slate-400">TXT Formatting Preview</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Preview Ready
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto pr-2 text-xs text-slate-400 space-y-1">
                  {parsedData.content.split('</p>').slice(0, 3).map((p, idx) => (
                    <div key={idx} className="truncate">
                      {p.replace(/<[^>]*>/g, '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsedData || !chapterTitle.trim() || isSaving}
            onClick={handleConfirmSave}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save & Add Chapter
          </button>
        </div>

      </div>
    </div>
  );
};
