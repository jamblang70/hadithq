/**
 * cleanText - Pembersihan dan normalisasi teks hadis
 *
 * Algoritma:
 * 1. Hapus tag HTML
 * 2. Normalisasi karakter Arab (harakat/diakritik, hamzah, alif)
 * 3. Normalisasi whitespace (collapse multiple spaces, trim)
 * 4. Hapus karakter khusus yang tidak relevan
 *
 * Postcondition: output tidak kosong jika input tidak kosong
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

/**
 * Arabic Unicode ranges for diacritics (harakat):
 * U+0610–U+061A  (various marks)
 * U+064B–U+065F  (fathah, dammah, kasrah, tanwin, shadda, sukun, etc.)
 * U+0670         (superscript alef)
 * U+06D6–U+06DC  (Quranic annotation marks)
 * U+06DF–U+06E4  (more Quranic marks)
 * U+06E7–U+06E8  (more marks)
 * U+06EA–U+06ED  (more marks)
 * U+08D3–U+08FF  (extended Arabic marks)
 */
const ARABIC_DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D3-\u08FF]/g;

/**
 * Normalisasi huruf Arab:
 * - Berbagai bentuk alif → alif biasa (ا)
 * - Berbagai bentuk hamzah di atas/bawah alif → alif biasa
 * - Taa marbuta (ة) → haa (ه)
 * - Alif maqsura (ى) → yaa (ي)
 */
const ARABIC_LETTER_NORMALIZATIONS: [RegExp, string][] = [
  [/[\u0622\u0623\u0625\u0671]/g, '\u0627'], // آ أ إ ٱ → ا (alif)
  [/\u0624/g, '\u0648'],                       // ؤ → و (waw)
  [/\u0626/g, '\u064A'],                       // ئ → ي (yaa)
  [/\u0629/g, '\u0647'],                       // ة → ه (haa)
  [/\u0649/g, '\u064A'],                       // ى → ي (yaa)
];

const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Deteksi apakah teks mengandung karakter Arab.
 * Range utama Arabic: U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF
 */
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Karakter khusus yang tidak relevan untuk pencarian semantik.
 * Mempertahankan: huruf (semua bahasa), angka, spasi, tanda baca dasar (.,;:!?-), dan karakter Arab.
 */
const SPECIAL_CHARS_REGEX = /[^\p{L}\p{N}\p{M}\s.,;:!?\-()'"]/gu;

function containsArabic(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
}

function removeHTMLTags(text: string): string {
  return text.replace(HTML_TAG_REGEX, ' ');
}

function normalizeArabicDiacritics(text: string): string {
  return text.replace(ARABIC_DIACRITICS_REGEX, '');
}

function normalizeArabicLetters(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ARABIC_LETTER_NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function removeSpecialCharacters(text: string): string {
  return text.replace(SPECIAL_CHARS_REGEX, '');
}

/**
 * Membersihkan dan menormalisasi teks hadis.
 *
 * @param rawText - Teks mentah yang akan dibersihkan
 * @returns Teks yang sudah dibersihkan dan dinormalisasi
 */
export function cleanText(rawText: string): string {
  if (!rawText) {
    return '';
  }

  let text = rawText;

  // Langkah 1: Hapus tag HTML
  text = removeHTMLTags(text);

  // Langkah 2: Normalisasi karakter Arab (jika teks Arab)
  if (containsArabic(text)) {
    text = normalizeArabicDiacritics(text);
    text = normalizeArabicLetters(text);
  }

  // Langkah 3: Normalisasi whitespace
  text = collapseWhitespace(text);
  text = text.trim();

  // Langkah 4: Hapus karakter khusus yang tidak relevan
  text = removeSpecialCharacters(text);

  // Normalisasi whitespace lagi setelah penghapusan karakter khusus
  text = collapseWhitespace(text);
  text = text.trim();

  // Postcondition: jika input tidak kosong, output juga tidak boleh kosong
  // Jika semua karakter terhapus (misal input hanya HTML/special chars),
  // kembalikan versi stripped minimal dari input asli
  if (text.length === 0 && rawText.length > 0) {
    const stripped = rawText.replace(HTML_TAG_REGEX, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > 0 ? stripped : rawText.substring(0, 1);
  }

  return text;
}
