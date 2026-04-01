import { useState, useCallback, useEffect, useRef } from "react";
import SearchForm from "./components/SearchForm";
import SearchResults from "./components/SearchResults";
import HadithDetail from "./components/HadithDetail";
import BookmarksView from "./components/BookmarksView";
import DailyHadith from "./components/DailyHadith";
import StatsBar from "./components/StatsBar";
import ThemeExplorer from "./components/ThemeExplorer";
import AiChat from "./components/AiChat";
import { searchHadith, aiSearchHadith } from "./api/hadithApi";
import { getBookmarks, addBookmark, removeBookmark, isBookmarked } from "./utils/bookmarks";
import { formatHadithText, copyToClipboard, shareHadith } from "./utils/clipboard";
import type { SearchFilters, SearchResponse, Hadith } from "./types";
import type { BookmarkEntry } from "./utils/bookmarks";
import "./App.css";

type View = "search" | "detail" | "bookmarks" | "chat";

const LIMIT = 20;

function App() {
  const [view, setView] = useState<View>("search");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [selectedHadithId, setSelectedHadithId] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastFilters, setLastFilters] = useState<SearchFilters>({
    collections: [],
    language: "en",
    grades: [],
  });
  const [lastUseAi, setLastUseAi] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Track the selected hadith object for detail view actions
  const selectedHadithRef = useRef<Hadith | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  const doSearch = useCallback(
    async (query: string, filters: SearchFilters, page: number, useAi: boolean) => {
      setLoading(true);
      setError("");
      setAiExplanations({});
      try {
        const params = {
          query,
          language: filters.language,
          collections: filters.collections,
          grade_filter: filters.grades,
          limit: LIMIT,
          offset: (page - 1) * LIMIT,
          min_score: 0.15,
        };

        if (useAi) {
          const data = await aiSearchHadith(params);
          setResponse(data);
          setAiExplanations(data.ai_explanations || {});
        } else {
          const data = await searchHadith(params);
          setResponse(data);
        }
        setCurrentPage(page);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleSearch(query: string, filters: SearchFilters, useAi: boolean) {
    setLastQuery(query);
    setLastFilters(filters);
    setLastUseAi(useAi);
    setView("search");
    doSearch(query, filters, 1, useAi);
  }

  function handleLookupResult(hadith: Hadith) {
    selectedHadithRef.current = hadith;
    setSelectedHadithId(hadith.id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePageChange(page: number) {
    doSearch(lastQuery, lastFilters, page, lastUseAi);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelectHadith(id: string) {
    // Try to find the hadith in current results
    const found = response?.results.find((r) => r.hadith.id === id);
    selectedHadithRef.current = found?.hadith ?? null;
    setSelectedHadithId(id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBackToResults() {
    setView("search");
  }

  function handleToggleBookmark(hadith: Hadith) {
    try {
      if (isBookmarked(hadith.id)) {
        removeBookmark(hadith.id);
      } else {
        const preview = (hadith.text_english || hadith.text_indonesian || "").slice(0, 150);
        const entry: BookmarkEntry = {
          hadithId: hadith.id,
          collectionName: hadith.collection_name,
          hadithNumber: hadith.hadith_number,
          textPreview: preview,
          savedAt: new Date().toISOString(),
        };
        addBookmark(entry);
      }
      setBookmarks(getBookmarks());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update bookmark";
      setError(msg);
    }
  }

  function handleRemoveBookmark(hadithId: string) {
    try {
      removeBookmark(hadithId);
      setBookmarks(getBookmarks());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove bookmark";
      setError(msg);
    }
  }

  function handleCopyHadith(hadith: Hadith) {
    const text = formatHadithText(hadith);
    copyToClipboard(text).then((ok) => {
      if (!ok) setError("Gagal menyalin teks. Coba lagi.");
    });
  }

  function handleShareHadith(hadith: Hadith) {
    shareHadith(hadith).catch(() => {
      setError("Gagal berbagi hadis. Coba lagi.");
    });
  }

  // Callbacks for detail view (work with the ref'd hadith)
  function handleDetailToggleBookmark() {
    if (selectedHadithRef.current) {
      handleToggleBookmark(selectedHadithRef.current);
    }
  }

  function handleDetailCopy() {
    if (selectedHadithRef.current) {
      handleCopyHadith(selectedHadithRef.current);
    }
  }

  function handleDetailShare() {
    if (selectedHadithRef.current) {
      handleShareHadith(selectedHadithRef.current);
    }
  }

  const detailIsBookmarked = bookmarks.some((b) => b.hadithId === selectedHadithId);

  return (
    <div className="app">
      <header className="app-header">
        <h1
          onClick={() => {
            setView("search");
            setResponse(null);
            setError("");
          }}
          style={{ cursor: "pointer" }}
        >
          HadithQ
        </h1>
        <p className="app-header-arabic">اسأل الحديث</p>
        <p className="app-subtitle">Cari hadis berdasarkan makna, didukung AI dan 7 koleksi kitab utama</p>
        <nav className="header-nav">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            className={`header-nav-btn${view === "chat" ? " active" : ""}`}
            onClick={() => setView("chat")}
            type="button"
            title="AI Chat"
          >
            🤖 Tanya AI
          </button>
          <button
            className={`header-nav-btn${view === "bookmarks" ? " active" : ""}`}
            onClick={() => setView("bookmarks")}
            type="button"
            title="Bookmarks"
          >
            🔖 Bookmarks{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
          </button>
        </nav>
      </header>

      <main className="app-main">
        {error && <div className="error-banner" role="alert">{error}</div>}

        {view === "detail" && selectedHadithId ? (
          <HadithDetail
            hadithId={selectedHadithId}
            onBack={handleBackToResults}
            isBookmarked={detailIsBookmarked}
            onToggleBookmark={handleDetailToggleBookmark}
            onCopyHadith={handleDetailCopy}
            onShareHadith={handleDetailShare}
          />
        ) : view === "bookmarks" ? (
          <BookmarksView
            bookmarks={bookmarks}
            onRemoveBookmark={handleRemoveBookmark}
            onSelectHadith={handleSelectHadith}
          />
        ) : view === "chat" ? (
          <AiChat
            onBack={() => setView("search")}
            onOpenHadith={(hadithId) => {
              setSelectedHadithId(hadithId);
              setView("detail");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <>
            <SearchForm onSearch={handleSearch} onLookupResult={handleLookupResult} loading={loading} />

            {!loading && !response && (
              <>
                <StatsBar />
                <ThemeExplorer onThemeClick={(query) => {
                  handleSearch(query, { collections: [], language: "id", grades: [] }, true);
                }} />
                <DailyHadith onSelectHadith={handleSelectHadith} />
              </>
            )}

            {loading && <div className="loading-spinner">Mencari...</div>}

            {!loading && response && (
              <SearchResults
                response={response}
                onPageChange={handlePageChange}
                onSelectHadith={handleSelectHadith}
                currentPage={currentPage}
                bookmarks={bookmarks}
                onToggleBookmark={handleToggleBookmark}
                onCopyHadith={handleCopyHadith}
                onShareHadith={handleShareHadith}
                aiExplanations={aiExplanations}
              />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Semantic Search & AI · Crafted by Arief · 2026</p>
      </footer>

      {showScrollTop && (
        <button
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}

export default App;
