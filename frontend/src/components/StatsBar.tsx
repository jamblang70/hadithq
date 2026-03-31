import { useEffect, useState } from "react";
import { getStats } from "../api/hadithApi";

export default function StatsBar() {
  const [stats, setStats] = useState<{ totalHadith: number; totalCollections: number } | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-number">{stats.totalHadith.toLocaleString()}</span>
        <span className="stat-label">Hadis</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-number">{stats.totalCollections}</span>
        <span className="stat-label">Kitab</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-number">3</span>
        <span className="stat-label">Bahasa</span>
      </div>
    </div>
  );
}
