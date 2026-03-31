import { useEffect, useState } from "react";
import { getDailyHadith } from "../api/hadithApi";
import type { Hadith } from "../types";

interface Props {
  onSelectHadith: (id: string) => void;
}

export default function DailyHadith({ onSelectHadith }: Props) {
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyHadith()
      .then(setHadith)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="daily-hadith">
        <h3 className="daily-title">📖 Hadis Hari Ini</h3>
        <div className="daily-loading">Memuat...</div>
      </div>
    );
  }

  if (!hadith) return null;

  return (
    <div className="daily-hadith">
      <h3 className="daily-title">📖 Hadis Hari Ini</h3>
      <button
        className="daily-card"
        onClick={() => onSelectHadith(hadith.id)}
        type="button"
      >
        {hadith.text_arabic && (
          <p className="arabic-text" dir="rtl" lang="ar">{hadith.text_arabic}</p>
        )}
        {hadith.text_indonesian && (
          <p className="daily-translation">{hadith.text_indonesian}</p>
        )}
        {!hadith.text_indonesian && hadith.text_english && (
          <p className="daily-translation">{hadith.text_english}</p>
        )}
        <div className="daily-meta">
          <span className="daily-source">{hadith.collection_name} #{hadith.hadith_number}</span>
          <span className={`meta-tag grade grade-${hadith.grade}`}>{hadith.grade}</span>
        </div>
      </button>
    </div>
  );
}
