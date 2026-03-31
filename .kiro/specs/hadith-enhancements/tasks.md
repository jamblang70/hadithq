# Implementation Plan: Hadith Enhancements

## Overview

Enhance the existing hadith search application with multi-language indexing (Arabic & Indonesian), client-side bookmarks via localStorage, hadith sharing (Web Share API + clipboard fallback), and quick-copy functionality. All changes build on the existing TypeScript codebase.

## Tasks

- [x] 1. Add multi-language indexing to backend
  - [x] 1.1 Add `updateLanguageText` method to `HadithRepository`
    - Add a new method to `backend/src/repositories/hadithRepository.ts` that updates a single language field (`text_arabic` or `text_indonesian`) on a hadith matched by `collection_id` and `hadith_number`
    - Method signature: `updateLanguageText(collectionId: string, hadithNumber: number, fieldName: "text_arabic" | "text_indonesian", text: string): Promise<boolean>`
    - Use parameterized SQL; validate `fieldName` is one of the two allowed values
    - Return `true` if a row was updated, `false` otherwise
    - _Requirements: 1.2, 1.4, 2.2, 2.4_

  - [x] 1.2 Add `indexLanguageEdition` method to `IndexingService`
    - Add a private method to `backend/src/services/indexingService.ts` that fetches a language edition (`ara-{collection}` or `ind-{collection}`) from the Hadith API and updates the corresponding field via `HadithRepository.updateLanguageText`
    - Method signature: `private async indexLanguageEdition(collectionId: string, languagePrefix: "ara" | "ind", fieldName: "text_arabic" | "text_indonesian"): Promise<number>`
    - On fetch failure (404/network), log a warning and return 0 — do not throw
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

  - [x] 1.3 Integrate language edition indexing into `indexAllCollections`
    - Modify `indexAllCollections()` in `backend/src/services/indexingService.ts` to call `indexLanguageEdition` for both Arabic and Indonesian after each collection's English indexing completes
    - Add optional fields `arabic_indexed` and `indonesian_indexed` to `IndexingReport` in `backend/src/types/indexing.ts`
    - Errors from language editions are logged and added to `IndexingReport.errors` but do not stop processing
    - _Requirements: 1.1, 1.3, 1.5, 2.1, 2.3, 2.5_

  - [ ]* 1.4 Write unit tests for `updateLanguageText`
    - Add tests in `backend/src/repositories/hadithRepository.test.ts`
    - Test: successful update returns true, no matching row returns false, invalid fieldName is rejected
    - _Requirements: 1.2, 1.4, 2.2, 2.4_

  - [ ]* 1.5 Write unit tests for `indexLanguageEdition`
    - Add tests in `backend/src/services/indexingService.test.ts`
    - Test: successful fetch and update, 404 response logs warning and returns 0, network error logs warning and returns 0
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

  - [ ]* 1.6 Write property test for idempotent language indexing
    - **Property 3: Idempoten Indexing Bahasa**
    - **Validates: Requirements 1.5, 2.5**
    - In `backend/src/services/indexingService.test.ts`, use fast-check to verify that running `indexLanguageEdition` twice with the same data produces the same update count

  - [ ]* 1.7 Write property test for correct field storage
    - **Property 2: Penyimpanan Teks Bahasa yang Benar**
    - **Validates: Requirements 1.2, 1.4, 2.2, 2.4**
    - In `backend/src/repositories/hadithRepository.test.ts`, use fast-check to verify that for random hadith number, collection, and language prefix, the correct field is updated

- [x] 2. Checkpoint — Backend indexing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create frontend utility modules
  - [x] 3.1 Create `frontend/src/utils/bookmarks.ts`
    - Define `BookmarkEntry` interface: `{ hadithId: string, collectionName: string, hadithNumber: number, textPreview: string, savedAt: string }`
    - Implement: `getBookmarks()`, `addBookmark(entry)`, `removeBookmark(hadithId)`, `isBookmarked(hadithId)`
    - Use localStorage key `"hadith-bookmarks"`; handle JSON parse errors by resetting to empty array
    - Handle `QuotaExceededError` by throwing a descriptive error the UI can catch
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Create `frontend/src/utils/clipboard.ts`
    - Implement `formatHadithText(hadith: Hadith): string` — format: `"{collection_name} — Hadith #{number}\n\n{arabic}\n\n{english}\n\n{indonesian}\n\nRef: {reference}"`, omitting empty sections
    - Implement `copyToClipboard(text: string): Promise<boolean>` — wrapper around `navigator.clipboard.writeText`
    - Implement `shareHadith(hadith: Hadith): Promise<void>` — uses `navigator.share` if available, falls back to `copyToClipboard`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.3_

  - [ ]* 3.3 Write property test for bookmark round-trip
    - **Property 4: Bookmark Round-Trip**
    - **Validates: Requirements 3.1, 3.3, 3.5**
    - In `frontend/src/utils/bookmarks.test.ts`, use fast-check to verify add then remove returns list to original state

  - [ ]* 3.4 Write property test for bookmark query consistency
    - **Property 5: Konsistensi Query Bookmark**
    - **Validates: Requirements 3.2, 3.4**
    - In `frontend/src/utils/bookmarks.test.ts`, use fast-check with random add/remove sequences to verify `isBookmarked` consistency

  - [ ]* 3.5 Write property test for bookmark serialization round-trip
    - **Property 6: Serialisasi Bookmark Round-Trip**
    - **Validates: Requirements 3.7**
    - In `frontend/src/utils/bookmarks.test.ts`, verify saving to localStorage and loading back produces identical data

  - [ ]* 3.6 Write property test for format text completeness
    - **Property 7: Kelengkapan Format Teks Hadis**
    - **Validates: Requirements 4.2, 4.3, 5.3**
    - In `frontend/src/utils/clipboard.test.ts`, verify `formatHadithText` output contains all non-empty fields

- [x] 4. Checkpoint — Frontend utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add bookmark state management and UI to App
  - [x] 5.1 Add bookmark state and handlers to `App.tsx`
    - Add `bookmarks` state initialized from `getBookmarks()` on mount
    - Add `"bookmarks"` to the `View` type union
    - Implement `handleToggleBookmark(hadithId, metadata)` and `handleRemoveBookmark(hadithId)` callbacks
    - Add a bookmark navigation button in the header
    - Wrap localStorage errors with user-facing error messages
    - Pass bookmark props down to `SearchResults`, `HadithDetail`, and `BookmarksView`
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [x] 5.2 Create `BookmarksView` component (`frontend/src/components/BookmarksView.tsx`)
    - Props: `bookmarks: BookmarkEntry[]`, `onRemoveBookmark(hadithId)`, `onSelectHadith(hadithId)`
    - Render list of bookmarked hadiths with collection name, hadith number, text preview, and remove button
    - Show empty state message when no bookmarks exist
    - _Requirements: 3.4, 3.5_

- [x] 6. Add bookmark, copy, and share buttons to SearchResults
  - [x] 6.1 Update `SearchResults` component
    - Add new props: `bookmarks`, `onToggleBookmark`, `onCopyHadith`, `onShareHadith`
    - Add bookmark toggle button per result card (filled/unfilled icon based on status)
    - Add quick-copy button with 2-second confirmation state
    - Add share button; hide if `navigator.share` is not available
    - Handle clipboard errors with temporary error message
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.4, 4.5, 4.6, 5.1, 5.3, 5.4, 5.5_

- [x] 7. Add bookmark, copy, and share buttons to HadithDetail
  - [x] 7.1 Update `HadithDetail` component
    - Add new props: `isBookmarked`, `onToggleBookmark`, `onCopyHadith`, `onShareHadith`
    - Add bookmark, quick-copy, and share buttons in the detail header
    - Quick-copy shows 2-second visual confirmation
    - Share button hidden when `navigator.share` is not available
    - Handle clipboard errors with temporary error message
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.4, 4.5, 4.6, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Add styles for new UI elements
  - [x] 8.1 Update `App.css` with styles for new components
    - Styles for `.action-btn`, `.bookmark-btn`, `.copy-btn`, `.share-btn` with hover/active states
    - Styles for `.copy-confirm` temporary confirmation indicator
    - Styles for `.bookmarks-view`, `.bookmark-item`, `.bookmark-empty`
    - Styles for `.header-nav` bookmark navigation button
    - Responsive behavior for action buttons on mobile
    - _Requirements: 3.2, 5.4_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Implementation language is TypeScript throughout (backend and frontend)
- Property tests validate universal correctness properties from the design document
- No database schema changes needed — `text_arabic` and `text_indonesian` fields already exist
- Backend changes are limited to `IndexingService` and `HadithRepository`; no changes to search or API routes
