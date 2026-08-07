import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Book, ReadingProgress } from './types';
import { fetchBooks, getReadingProgress } from './lib/storage';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { LibraryView } from './components/LibraryView';
import { BookDetailView } from './components/BookDetailView';
import { ChapterEditorView } from './components/ChapterEditorView';
import { ReaderView } from './components/ReaderView';
import { CreateBookModal } from './components/CreateBookModal';
import { EditBookModal } from './components/EditBookModal';
import { UploadEpubModal } from './components/UploadEpubModal';
import { AppendTxtModal } from './components/AppendTxtModal';

export const App: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Routing / View State
  const [activeView, setActiveView] = useState<'library' | 'book_detail' | 'chapter_editor' | 'reader'>('library');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadEpubModalOpen, setIsUploadEpubModalOpen] = useState(false);
  const [isAppendTxtModalOpen, setIsAppendTxtModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadLibraryData();
    }
  }, [isAuthenticated, currentUser]);

  const loadLibraryData = async () => {
    const fetchedBooks = await fetchBooks();
    setBooks(fetchedBooks);

    if (currentUser) {
      const map: Record<string, ReadingProgress> = {};
      for (const book of fetchedBooks) {
        const prog = await getReadingProgress(currentUser.id, book.id);
        if (prog) map[book.id] = prog;
      }
      setProgressMap(map);
    }
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setActiveView('book_detail');
  };

  const handleStartReading = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setActiveView('reader');
  };

  const handleNavigateHome = () => {
    setActiveView('library');
    setSelectedBook(null);
    setSelectedChapterId(null);
    loadLibraryData();
  };

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Navbar (visible unless in reader mode) */}
      {activeView !== 'reader' && (
        <Navbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onNavigateHome={handleNavigateHome}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'library' && (
          <LibraryView
            books={books}
            progressMap={progressMap}
            searchTerm={searchTerm}
            onSelectBook={handleSelectBook}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeView === 'book_detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            onBack={handleNavigateHome}
            onStartReading={handleStartReading}
            onOpenEditModal={() => setIsEditModalOpen(true)}
            onOpenUploadEpubModal={() => setIsUploadEpubModalOpen(true)}
            onOpenAppendTxtModal={() => setIsAppendTxtModalOpen(true)}
            onOpenChapterEditor={() => setActiveView('chapter_editor')}
            onBookUpdated={loadLibraryData}
          />
        )}

        {activeView === 'chapter_editor' && selectedBook && (
          <ChapterEditorView
            book={selectedBook}
            onBack={() => setActiveView('book_detail')}
            onChaptersSaved={loadLibraryData}
          />
        )}

        {activeView === 'reader' && selectedBook && selectedChapterId && (
          <ReaderView
            book={selectedBook}
            initialChapterId={selectedChapterId}
            onBack={() => setActiveView('book_detail')}
          />
        )}
      </main>

      {/* Modals */}
      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBookCreated={(newBook) => {
          loadLibraryData();
          handleSelectBook(newBook);
        }}
      />

      {selectedBook && (
        <>
          <EditBookModal
            book={selectedBook}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onBookUpdated={() => {
              loadLibraryData();
            }}
          />

          <UploadEpubModal
            book={selectedBook}
            isOpen={isUploadEpubModalOpen}
            onClose={() => setIsUploadEpubModalOpen(false)}
            onChaptersReplaced={loadLibraryData}
          />

          <AppendTxtModal
            book={selectedBook}
            isOpen={isAppendTxtModalOpen}
            onClose={() => setIsAppendTxtModalOpen(false)}
            onChapterAppended={loadLibraryData}
          />
        </>
      )}

    </div>
  );
};
