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
import { ChangePasswordModal } from './components/ChangePasswordModal';

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Load Library Books & Reading Progress
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

  const handleRefreshData = async () => {
    await loadLibraryData();
    setDataVersion(v => v + 1);
  };

  // ----------------------------------------------------
  // URL HASH ROUTER ENGINE
  // ----------------------------------------------------
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;

      // Handle Password Recovery Token Hash
      if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        setIsChangePasswordOpen(true);
        return;
      }

      const allBooks = books.length > 0 ? books : await fetchBooks();

      // Route 1: Reader View -> #/book/:bookId/chapter/:chapterId
      const readerMatch = hash.match(/^#\/book\/([^/]+)\/chapter\/([^/]+)$/);
      if (readerMatch) {
        const [, bId, cId] = readerMatch;
        const targetBook = allBooks.find(b => b.id === bId);
        if (targetBook) {
          setSelectedBook(targetBook);
          setSelectedChapterId(cId);
          setActiveView('reader');
          return;
        }
      }

      // Route 2: Chapter Manager -> #/book/:bookId/edit
      const editorMatch = hash.match(/^#\/book\/([^/]+)\/edit$/);
      if (editorMatch) {
        const [, bId] = editorMatch;
        const targetBook = allBooks.find(b => b.id === bId);
        if (targetBook) {
          setSelectedBook(targetBook);
          setActiveView('chapter_editor');
          return;
        }
      }

      // Route 3: Book Detail -> #/book/:bookId
      const bookMatch = hash.match(/^#\/book\/([^/]+)$/);
      if (bookMatch) {
        const [, bId] = bookMatch;
        const targetBook = allBooks.find(b => b.id === bId);
        if (targetBook) {
          setSelectedBook(targetBook);
          setActiveView('book_detail');
          return;
        }
      }

      // Default Route: Library Shelf -> #/
      setActiveView('library');
      setSelectedBook(null);
      setSelectedChapterId(null);
    };

    window.addEventListener('hashchange', handleHashChange);
    if (isAuthenticated) {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, books]);

  // Navigation Trigger Functions
  const navigateToLibrary = () => {
    window.location.hash = '#/';
  };

  const navigateToBook = (book: Book) => {
    setSelectedBook(book);
    window.location.hash = `#/book/${book.id}`;
  };

  const navigateToReader = (chapterId: string) => {
    if (!selectedBook) return;
    setSelectedChapterId(chapterId);
    window.location.hash = `#/book/${selectedBook.id}/chapter/${chapterId}`;
  };

  const navigateToChapterEditor = () => {
    if (!selectedBook) return;
    window.location.hash = `#/book/${selectedBook.id}/edit`;
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
          onNavigateHome={navigateToLibrary}
          onOpenChangePasswordModal={() => setIsChangePasswordOpen(true)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'library' && (
          <LibraryView
            books={books}
            progressMap={progressMap}
            searchTerm={searchTerm}
            onSelectBook={navigateToBook}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeView === 'book_detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            refreshTrigger={dataVersion}
            onBack={navigateToLibrary}
            onStartReading={navigateToReader}
            onOpenEditModal={() => setIsEditModalOpen(true)}
            onOpenUploadEpubModal={() => setIsUploadEpubModalOpen(true)}
            onOpenAppendTxtModal={() => setIsAppendTxtModalOpen(true)}
            onOpenChapterEditor={navigateToChapterEditor}
            onBookUpdated={handleRefreshData}
          />
        )}

        {activeView === 'chapter_editor' && selectedBook && (
          <ChapterEditorView
            book={selectedBook}
            onBack={() => navigateToBook(selectedBook)}
            onChaptersSaved={handleRefreshData}
          />
        )}

        {activeView === 'reader' && selectedBook && selectedChapterId && (
          <ReaderView
            book={selectedBook}
            initialChapterId={selectedChapterId}
            onBack={() => navigateToBook(selectedBook)}
          />
        )}
      </main>

      {/* Modals */}
      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onBookCreated={(newBook) => {
          handleRefreshData();
          navigateToBook(newBook);
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {selectedBook && (
        <>
          <EditBookModal
            book={selectedBook}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onBookUpdated={handleRefreshData}
          />

          <UploadEpubModal
            book={selectedBook}
            isOpen={isUploadEpubModalOpen}
            onClose={() => setIsUploadEpubModalOpen(false)}
            onChaptersReplaced={handleRefreshData}
          />

          <AppendTxtModal
            book={selectedBook}
            isOpen={isAppendTxtModalOpen}
            onClose={() => setIsAppendTxtModalOpen(false)}
            onChapterAppended={handleRefreshData}
          />
        </>
      )}

    </div>
  );
};
