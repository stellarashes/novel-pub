import React, { useState } from 'react';
import { Book } from '../types';
import { parseEpubFile, ParsedEpubResult } from '../lib/epubParser';
import { replaceBookChapters, updateBook } from '../lib/storage';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface UploadEpubModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onChaptersReplaced: () => void;
}

export const UploadEpubModal: React.FC<UploadEpubModalProps> = ({
  book,
  isOpen,
  onClose,
  onChaptersReplaced
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEpubResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFile = async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith('.epub')) {
      setErrorMsg('Please select a valid .epub archive file.');
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setIsParsing(true);

    try {
      const result = await parseEpubFile(selected);
      setParsedData(result);
    } catch (err: any) {
      console.error('ePub Parsing Error:', err);
      setErrorMsg(err.message || 'Failed to parse ePub file.');
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

  const handleConfirmReplace = async () => {
    if (!parsedData) return;

    setIsSaving(true);
    try {
      // Replace all chapter records for this book
      await replaceBookChapters(book.id, parsedData.chapters);

      // Optionally update cover image if extracted and book lacks one
      if (parsedData.coverUrl && !book.cover_url) {
        await updateBook(book.id, { cover_url: parsedData.coverUrl });
      }

      onChaptersReplaced();
      onClose();
    } catch (err: any) {
      setErrorMsg('Failed to save replaced chapters.');
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
          <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-2xl">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Overwrite Book via ePub</h2>
            <p className="text-xs text-slate-400">Replace the entire chapter contents of "{book.title}".</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <p>
            <strong>Warning:</strong> Uploading an ePub file will completely replace all existing chapters of this novel with the newly parsed chapters.
          </p>
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
                ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-violet-500 bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              accept=".epub"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileText className={`w-10 h-10 mx-auto mb-2 transition-colors ${isDragging ? 'text-violet-400' : 'text-slate-500'}`} />
            <span className="text-sm font-semibold text-slate-200 block">
              {file ? file.name : 'Click to select or drag .epub file here'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Standard EPUB 2/3 files supported</span>
          </label>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-violet-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Unzipping and parsing ePub chapters & metadata...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Parsed Preview Card */}
          {parsedData && !isParsing && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-400">Parsed ePub Preview</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Import
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Extracted Title:</span>
                  <span className="font-semibold text-white">{parsedData.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Chapters Found:</span>
                  <span className="font-bold text-indigo-400">{parsedData.chapters.length} Chapters</span>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto pr-2 space-y-1 text-xs text-slate-300">
                {parsedData.chapters.slice(0, 5).map((chap, idx) => (
                  <div key={idx} className="truncate bg-slate-900 px-2 py-1 rounded-md">
                    {idx + 1}. {chap.title}
                  </div>
                ))}
                {parsedData.chapters.length > 5 && (
                  <div className="text-[11px] text-slate-500 italic pl-1">
                    ...and {parsedData.chapters.length - 5} more chapters
                  </div>
                )}
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
            disabled={!parsedData || isSaving}
            onClick={handleConfirmReplace}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm & Overwrite All Chapters
          </button>
        </div>

      </div>
    </div>
  );
};
