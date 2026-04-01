import { useState } from "react";
import type { SearchFilters, SupportedLanguage } from "../types";
import { lookupHadith } from "../api/hadithApi";
import type { Hadith } from "../types";

const COLLECTIONS = [
  { id: "bukhari", name: "Sahih al-Bukhari", arabic: "صحيح البخاري" },
  { id: "muslim", name: "Sahih Muslim", arabic: "صحيح مسلم" },
  { id: "abudawud", name: "Sunan Abu Dawud", arabic: "سنن أبي داود" },
  { id: "tirmidhi", name: "Jami at-Tirmidzi", arabic: "جامع الترمذي" },
  { id: "nasai", name: "Sunan an-Nasa'i", arabic: "سنن النسائي" },
  { id: "ibnmajah", name: "Sunan Ibnu Majah", arabic: "سنن ابن ماجه" },
  { id: "malik", name: "Muwatta Malik", arabic: "موطأ مالك" },
] as const;

const LANGUAGES: { value: SupportedLanguage; label: string; icon: string }[] = [
  { value: "en", label: "English", icon: "🇬🇧" },
  { value: "ar", label: "العربية", icon: "🇸🇦" },
  { value: "id", label: "Indonesia", icon: "🇮🇩" },
];

const GRADES = [
  { id: "sahih", label: "Sahih", arabic: "صحيح" },
  { id: "hasan", label: "Hasan", arabic: "حسن" },
  { id: "dhaif", label: "Dhaif", arabic: "ضعيف" },
] as const;

interface Props {
  onSearch: (query: string, filters: SearchFilters, useAi: boolean) => void;
  onLookupResult: (hadith: Hadith) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, onLookupResult, loading }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [searchMode, setSearchMode] = useState<"semantic" | "number">("semantic");
  const [lookupCollection, setLookupCollection] = useState("");
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  function toggleCollection(id: string) {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleGrade(id: string) {
    setSelectedGrades((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim(), {
      collections: selectedCollections,
      language,
      grades: selectedGrades,
    }, useAi);
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCollection || !lookupNumber.trim()) return;
    const num = parseFloat(lookupNumber);
    if (isNaN(num) || num <= 0) {
      setLookupError("Nomor hadis tidak valid");
      return;
    }
    setLookupError("");
    setLookupLoading(true);
    try {
      const hadith = await lookupHadith(lookupCollection, num);
      onLookupResult(hadith);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Hadis tidak ditemukan";
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <form onSubmit={searchMode === "number" ? handleLookup : handleSubmit} className="search-form">
      {/* Mode toggle */}
      <div className="search-mode-tabs">
        <button
          type="button"
          className={`search-mode-tab${searchMode === "semantic" ? " active" : ""}`}
          onClick={() => setSearchMode("semantic")}
        >
          🔍 Cari Makna
        </button>
        <button
          type="button"
          className={`search-mode-tab${searchMode === "number" ? " active" : ""}`}
          onClick={() => setSearchMode("number")}
        >
          🔢 Cari Nomor
        </button>
      </div>

      {searchMode === "number" ? (
        <div className="lookup-row">
          <select
            className="lookup-collection-select"
            value={lookupCollection}
            onChange={(e) => setLookupCollection(e.target.value)}
            aria-label="Pilih kitab"
            required
          >
            <option value="">Pilih Kitab...</option>
            {COLLECTIONS.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
          <input
            type="number"
            className="lookup-number-input"
            value={lookupNumber}
            onChange={(e) => setLookupNumber(e.target.value)}
            placeholder="Nomor hadis"
            min={1}
            aria-label="Nomor hadis"
            required
          />
          <button type="submit" className="search-btn" disabled={lookupLoading || !lookupCollection || !lookupNumber}>
            {lookupLoading ? "Mencari..." : "Cari"}
          </button>
        </div>
      ) : (
        <>
          <div className="search-input-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={useAi ? "Tanya AI tentang hadis..." : "Cari hadis berdasarkan makna..."}
              className="search-input"
              maxLength={500}
              aria-label="Search query"
            />
            <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
              {loading ? (useAi ? "AI Thinking..." : "Mencari...") : (useAi ? "🤖 AI Search" : "Cari")}
            </button>
          </div>

          <div className="search-mode-row">
            <label className="ai-toggle-label">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
              />
              <span className="ai-toggle-text">🤖 AI Search</span>
              <span className="ai-toggle-hint">{useAi ? "Lebih akurat, lebih lambat" : "Pencarian cepat"}</span>
            </label>
            <button
              type="button"
              className="filters-toggle"
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "▲ Sembunyikan Filter" : "▼ Tampilkan Filter"}
            </button>
          </div>

          {filtersOpen && (
            <div className="filters-panel">
              {/* Collection Cards */}
              <div className="filter-section">
                <h3 className="filter-section-title">Kitab Hadis</h3>
                <div className="collection-grid">
                  {COLLECTIONS.map((col) => {
                    const isSelected = selectedCollections.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        className={`collection-card${isSelected ? " selected" : ""}`}
                        data-collection={col.id}
                        onClick={() => toggleCollection(col.id)}
                        aria-pressed={isSelected}
                      >
                        <span className="collection-card-name">{col.name}</span>
                        <span className="collection-card-arabic">{col.arabic}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grade Pills */}
              <div className="filter-section">
                <h3 className="filter-section-title">Derajat Hadis</h3>
                <div className="grade-pills">
                  {GRADES.map((grade) => {
                    const isSelected = selectedGrades.includes(grade.id);
                    return (
                      <button
                        key={grade.id}
                        type="button"
                        className={`grade-pill grade-pill-${grade.id}${isSelected ? " selected" : ""}`}
                        onClick={() => toggleGrade(grade.id)}
                        aria-pressed={isSelected}
                      >
                        <span>{grade.label}</span>
                        <span className="grade-pill-arabic">{grade.arabic}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector */}
              <div className="filter-section">
                <h3 className="filter-section-title">Bahasa Pencarian</h3>
                <div className="language-chips">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      className={`language-chip${language === lang.value ? " selected" : ""}`}
                      onClick={() => setLanguage(lang.value)}
                    >
                      <span className="language-chip-icon">{lang.icon}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {lookupError && <p className="lookup-error" role="alert">{lookupError}</p>}
    </form>
  );
}
