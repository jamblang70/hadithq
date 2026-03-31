import { useState } from "react";
import type { SearchResponse, Hadith } from "../types";
import type { BookmarkEntry } from "../utils/bookmarks";

interface Props {
  response: SearchResponse;
  onPageChange: (page: number) => void;
  onSelectHadith: (id: string) => void;
  currentPage: number;
  bookmarks: BookmarkEntry[];
  onToggleBookmark: (hadith: Hadith) => void;
  onCopyHadith: (hadith: Hadith) => void;
  onShareHadith: (hadith: Hadith) => void;
  aiExplanations?: Record<string, string>;
}

const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

export default function SearchResults({
  response,
  onPageChange,
  onSelectHadith,
  currentPage,
  bookmarks,
  onToggleBookmark,
  onCopyHadith,
  onShareHadith,
  aiExplanations = {},
}: Props) {
  const { results, total_count, total_pages, processing_time_ms } = response;
  const [copiedMap, setCopiedMap] = useState<Map<string, boolean>>(new Map());

  function handleCopy(hadith: Hadith) {
    onCopyHadith(hadith);
    setCopiedMap((prev) => new Map(prev).set(hadith.id, true));
    setTimeout(() => {
      setCopiedMap((prev) => {
        const next = new Map(prev);
        next.delete(hadith.id);
        return next;
      });
    }, 2000);
  }

  if (results.length === 0) {
    return <p className="no-results">No hadith found for your query. Try different keywords.</p>;
  }

  return (
    <div className="search-results">
      <p className="results-meta">
        Found {total_count} result{total_count !== 1 ? "s" : ""} in {processing_time_ms}ms
      </p>

      <ul className="results-list">
        {results.map((r) => {
          const isMarked = bookmarks.some((b) => b.hadithId === r.hadith.id);
          const isCopied = copiedMap.get(r.hadith.id);

          return (
            <li key={r.hadith.id} className="result-card" data-collection={r.hadith.collection_id}>
              <button
                className="result-card-btn"
                onClick={() => onSelectHadith(r.hadith.id)}
                type="button"
              >
                {r.hadith.text_arabic && (
                  <p className="arabic-text" dir="rtl" lang="ar">
                    {r.hadith.text_arabic}
                  </p>
                )}
                {r.hadith.text_english && (
                  <p className="translation-text">{r.hadith.text_english}</p>
                )}
                {r.hadith.text_indonesian && (
                  <p className="translation-text translation-id">{r.hadith.text_indonesian}</p>
                )}
                <div className="result-meta">
                  <span className="meta-tag collection">{r.hadith.collection_name}</span>
                  <span className="meta-tag">#{r.hadith.hadith_number}</span>
                  {r.hadith.narrator && <span className="meta-tag narrator">{r.hadith.narrator}</span>}
                  <span className={`meta-tag grade grade-${r.hadith.grade}`}>{r.hadith.grade}</span>
                  <span className="meta-tag score">Score: {(r.similarity_score * 100).toFixed(1)}%</span>
                </div>
                {aiExplanations[r.hadith.id] && (
                  <p className="ai-explanation">🤖 {aiExplanations[r.hadith.id]}</p>
                )}
              </button>
              <div className="action-buttons">
                <button
                  className={`action-btn bookmark-btn${isMarked ? " active" : ""}`}
                  onClick={() => onToggleBookmark(r.hadith)}
                  type="button"
                  title={isMarked ? "Remove bookmark" : "Bookmark"}
                >
                  {isMarked ? "📑" : "🔖"}
                </button>
                <button
                  className="action-btn copy-btn"
                  onClick={() => handleCopy(r.hadith)}
                  type="button"
                  title="Copy hadith text"
                >
                  {isCopied ? <span className="copy-confirm">✓ Copied</span> : "📋"}
                </button>
                {canShare && (
                  <button
                    className="action-btn share-btn"
                    onClick={() => onShareHadith(r.hadith)}
                    type="button"
                    title="Share hadith"
                  >
                    📤
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {total_pages > 1 && (
        <nav className="pagination" aria-label="Search results pagination">
          <button
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="page-btn"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {total_pages}
          </span>
          <button
            disabled={currentPage >= total_pages}
            onClick={() => onPageChange(currentPage + 1)}
            className="page-btn"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
