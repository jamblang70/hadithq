import { useEffect, useState } from "react";
import { getHadithById } from "../api/hadithApi";
import type { Hadith } from "../types";

interface Props {
  hadithId: string;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onCopyHadith: () => void;
  onShareHadith: () => void;
}

const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

export default function HadithDetail({
  hadithId,
  onBack,
  isBookmarked,
  onToggleBookmark,
  onCopyHadith,
  onShareHadith,
}: Props) {
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [readingMode, setReadingMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getHadithById(hadithId)
      .then((data) => {
        if (!cancelled) setHadith(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load hadith");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hadithId]);

  function handleCopy() {
    onCopyHadith();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="detail-loading">Loading hadith...</div>;
  }

  if (error) {
    return (
      <div className="detail-error">
        <p>{error}</p>
        <button onClick={onBack} className="back-btn">← Back to results</button>
      </div>
    );
  }

  if (!hadith) return null;

  return (
    <article className={`hadith-detail${readingMode ? " reading-mode" : ""}`}>
      <button onClick={onBack} className="back-btn" type="button">
        ← Back to results
      </button>

      <header className="detail-header">
        <h2>{hadith.collection_name} — Hadith #{hadith.hadith_number}</h2>
        <div className="detail-tags">
          <span className={`meta-tag grade grade-${hadith.grade}`}>{hadith.grade}</span>
          {hadith.narrator && <span className="meta-tag narrator">{hadith.narrator}</span>}
        </div>
        <div className="action-buttons" style={{ marginTop: 12 }}>
          <button
            className={`action-btn bookmark-btn${isBookmarked ? " active" : ""}`}
            onClick={onToggleBookmark}
            type="button"
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? "📑" : "🔖"}
          </button>
          <button
            className="action-btn copy-btn"
            onClick={handleCopy}
            type="button"
            title="Copy hadith text"
          >
            {copied ? <span className="copy-confirm">✓ Copied</span> : "📋"}
          </button>
          {canShare && (
            <button
              className="action-btn share-btn"
              onClick={onShareHadith}
              type="button"
              title="Share hadith"
            >
              📤
            </button>
          )}
          <button
            className={`action-btn reading-btn${readingMode ? " active" : ""}`}
            onClick={() => setReadingMode(!readingMode)}
            type="button"
            title={readingMode ? "Exit reading mode" : "Reading mode"}
          >
            📖
          </button>
        </div>
      </header>

      {hadith.text_arabic && (
        <section className="detail-section">
          <h3>Arabic Text</h3>
          <p className="arabic-text" dir="rtl" lang="ar">{hadith.text_arabic}</p>
        </section>
      )}

      {hadith.text_english && (
        <section className="detail-section">
          <h3>English Translation</h3>
          <p>{hadith.text_english}</p>
        </section>
      )}

      {hadith.text_indonesian && (
        <section className="detail-section">
          <h3>Indonesian Translation</h3>
          <p>{hadith.text_indonesian}</p>
        </section>
      )}

      <section className="detail-section">
        <h3>Reference</h3>
        <dl className="detail-dl">
          <dt>Collection</dt>
          <dd>{hadith.collection_name}</dd>
          {hadith.book_name && (
            <>
              <dt>Book</dt>
              <dd>{hadith.book_name} (#{hadith.book_number})</dd>
            </>
          )}
          <dt>Hadith Number</dt>
          <dd>{hadith.hadith_number}</dd>
          {hadith.reference && (
            <>
              <dt>Reference</dt>
              <dd>{hadith.reference}</dd>
            </>
          )}
          <dt>Grade</dt>
          <dd>{hadith.grade}</dd>
        </dl>
      </section>
    </article>
  );
}
