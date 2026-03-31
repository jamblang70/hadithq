const THEMES = [
  { id: "sabar", label: "Sabar", arabic: "الصبر", emoji: "🤲", query: "kesabaran menghadapi cobaan" },
  { id: "sholat", label: "Sholat", arabic: "الصلاة", emoji: "🕌", query: "keutamaan sholat dan tata cara" },
  { id: "puasa", label: "Puasa", arabic: "الصيام", emoji: "🌙", query: "puasa dan keutamaannya" },
  { id: "sedekah", label: "Sedekah", arabic: "الصدقة", emoji: "💝", query: "sedekah dan keutamaan memberi" },
  { id: "akhlak", label: "Akhlak", arabic: "الأخلاق", emoji: "✨", query: "akhlak mulia dan budi pekerti" },
  { id: "doa", label: "Doa", arabic: "الدعاء", emoji: "🤲", query: "doa dan dzikir kepada Allah" },
  { id: "ilmu", label: "Ilmu", arabic: "العلم", emoji: "📚", query: "menuntut ilmu dan keutamaannya" },
  { id: "taubat", label: "Taubat", arabic: "التوبة", emoji: "💫", query: "taubat dan ampunan Allah" },
  { id: "jujur", label: "Kejujuran", arabic: "الصدق", emoji: "⚖️", query: "kejujuran dan larangan berbohong" },
  { id: "orangtua", label: "Birrul Walidain", arabic: "بر الوالدين", emoji: "👨‍👩‍👧", query: "berbakti kepada orang tua" },
  { id: "rezeki", label: "Rezeki", arabic: "الرزق", emoji: "🌾", query: "rezeki dan mencari nafkah halal" },
  { id: "akhirat", label: "Akhirat", arabic: "الآخرة", emoji: "🌅", query: "hari akhir dan kehidupan setelah mati" },
];

interface Props {
  onThemeClick: (query: string) => void;
}

export default function ThemeExplorer({ onThemeClick }: Props) {
  return (
    <div className="theme-explorer">
      <h3 className="theme-explorer-title">🔍 Jelajahi Tema</h3>
      <div className="theme-grid">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            className="theme-chip"
            onClick={() => onThemeClick(theme.query)}
            type="button"
          >
            <span className="theme-emoji">{theme.emoji}</span>
            <span className="theme-label">{theme.label}</span>
            <span className="theme-arabic">{theme.arabic}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
