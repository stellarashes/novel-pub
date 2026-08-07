import React, { useState, useEffect } from 'react';
import { Book, Chapter } from '../types';
import { parseTxtFile, ParsedTxtResult } from '../lib/txtParser';
import { fetchChapters, appendOrInsertChapter } from '../lib/storage';
import { X, FileText, Plus, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTxtResult | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [targetPosition, setTargetPosition] = useState<number>(1);
  const [existingChapters, setExistingChapters] = useState<Chapter[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChapters(book.id).then(chaps => {
        setExistingChapters(chaps);
        setTargetPosition(chaps.length + 1);
      });
    }
  }, [book.id, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsParsing(true);

    try {
      const result = await parseTxtFile(selected);
      setParsedData(result);
      setChapterTitle(result.title);
    } catch (err) {
      console.error('TXT parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!parsedData || !chapterTitle.trim()) return;

    setIsSaving(true);
    try {
      await appendOrInsertChapter(book.id, {
        title: chapterTitle.trim(),
        content: parsedData.content,
        targetPosition: Number(targetPosition)
      });

      onChapterAppended();
      onClose();
    } catch (err) {
      console.error('Failed to append chapter:', err);
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
            <h2 className="text-xl font-bold text-white">Append or Insert TXT Chapter</h2>
            <p className="text-xs text-slate-400">Add a new chapter to "{book.title}" from a .txt file.</p>
          </div>
        </div>

        {/* File Dropzone */}
        <div className="space-y-4">
          <label className="block border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950/70 rounded-2xl p-6 text-center cursor-pointer transition-colors">
            <input
              type="file"
              accept=".txt,.text"
              onChange={handleFileChange}
              className="hidden"
            />
            <Plus className="w-10 h-10 text-slate-500 mx-auto mb-2" />
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={existingChapters.length + 1}>
                    Append at end (Chapter {existingChapters.length + 1})
                  </option>
                  {existingChapters.map((c, idx) => (
                    <option key={c.id} value={idx + 1}>
                      Insert as Chapter {idx + 1} (shifts existing chapters down)
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Text Preview</span>
                <div
                  className="text-xs text-slate-300 max-h-28 overflow-y-auto font-mono leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parsedData.content }}
                />
              </div>
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
            onClick={handleConfirmAdd}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add Chapter to Novel
          </button>
        </div>

      </div>
    </div>
  );
};
