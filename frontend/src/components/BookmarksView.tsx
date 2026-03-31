import type { BookmarkEntry } from "../utils/bookmarks";

interface Props {
  bookmarks: BookmarkEntry[];
  onRemoveBookmark: (hadithId: string) => void;
  onSelectHadith: (hadithId: string) => void;
}

export default function BookmarksView({ bookmarks, onRemoveBookmark, onSelectHadith }: Props) {
  if (bookmarks.length === 0) {
    return (
      <div className="bookmarks-view">
        <h2>Bookmarks</h2>
        <p className="bookmark-empty">No bookmarks yet. Tap the 🔖 button on any hadith to save it here.</p>
      </div>
    );
  }

  return (
    <div className="bookmarks-view">
      <h2>Bookmarks</h2>
      <ul className="results-list">
        {bookmarks.map((b) => (
          <li key={b.hadithId} className="bookmark-item result-card">
            <button
              className="result-card-btn"
              onClick={() => onSelectHadith(b.hadithId)}
              type="button"
            >
              <p className="translation-text">{b.textPreview}</p>
              <div className="result-meta">
                <span className="meta-tag collection">{b.collectionName}</span>
                <span className="meta-tag">#{b.hadithNumber}</span>
              </div>
            </button>
            <div className="action-buttons">
              <button
                className="action-btn remove-btn"
                onClick={() => onRemoveBookmark(b.hadithId)}
                type="button"
                title="Remove bookmark"
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
