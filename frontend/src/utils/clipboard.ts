import type { Hadith } from "../types";

export function formatHadithText(hadith: Hadith): string {
  const parts: string[] = [];

  parts.push(`${hadith.collection_name} — Hadith #${hadith.hadith_number}`);

  if (hadith.text_arabic) {
    parts.push(hadith.text_arabic);
  }
  if (hadith.text_english) {
    parts.push(hadith.text_english);
  }
  if (hadith.text_indonesian) {
    parts.push(hadith.text_indonesian);
  }
  if (hadith.reference) {
    parts.push(`Ref: ${hadith.reference}`);
  }

  return parts.join("\n\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareHadith(hadith: Hadith): Promise<void> {
  const text = formatHadithText(hadith);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `${hadith.collection_name} — Hadith #${hadith.hadith_number}`,
        text,
      });
      return;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      // Fall through to clipboard fallback
    }
  }

  await copyToClipboard(text);
}
