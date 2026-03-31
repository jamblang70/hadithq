export interface BookmarkEntry {
  hadithId: string;
  collectionName: string;
  hadithNumber: number;
  textPreview: string;
  savedAt: string;
}

const STORAGE_KEY = "hadith-bookmarks";

function readFromStorage(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BookmarkEntry[];
  } catch {
    console.warn("[bookmarks] Corrupt data in localStorage, resetting to empty array");
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeToStorage(bookmarks: BookmarkEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error("Penyimpanan lokal penuh. Hapus beberapa bookmark untuk menambah yang baru.");
    }
    throw err;
  }
}

export function getBookmarks(): BookmarkEntry[] {
  return readFromStorage();
}

export function addBookmark(entry: BookmarkEntry): void {
  const bookmarks = readFromStorage();
  const exists = bookmarks.some((b) => b.hadithId === entry.hadithId);
  if (exists) return;
  bookmarks.push(entry);
  writeToStorage(bookmarks);
}

export function removeBookmark(hadithId: string): void {
  const bookmarks = readFromStorage().filter((b) => b.hadithId !== hadithId);
  writeToStorage(bookmarks);
}

export function isBookmarked(hadithId: string): boolean {
  return readFromStorage().some((b) => b.hadithId === hadithId);
}
