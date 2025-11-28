import { useState, useEffect, useCallback } from 'react';

/**
 * useBookmarks - Hook to manage sentence bookmarks
 * Stores bookmarks in localStorage, keyed by lessonId
 */
export const useBookmarks = (lessonId) => {
  const [bookmarkedSentences, setBookmarkedSentences] = useState(new Set());
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    if (!lessonId) return;

    try {
      const storageKey = `shadowing_bookmarks_${lessonId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBookmarkedSentences(new Set(parsed));
      }
    } catch (err) {
      console.error('Error loading bookmarks:', err);
    }
  }, [lessonId]);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    if (!lessonId) return;

    try {
      const storageKey = `shadowing_bookmarks_${lessonId}`;
      const toStore = Array.from(bookmarkedSentences);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (err) {
      console.error('Error saving bookmarks:', err);
    }
  }, [lessonId, bookmarkedSentences]);

  // Toggle bookmark for a sentence
  const toggleBookmark = useCallback((sentenceIndex) => {
    setBookmarkedSentences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sentenceIndex)) {
        newSet.delete(sentenceIndex);
      } else {
        newSet.add(sentenceIndex);
      }
      return newSet;
    });
  }, []);

  // Check if a sentence is bookmarked
  const isBookmarked = useCallback((sentenceIndex) => {
    return bookmarkedSentences.has(sentenceIndex);
  }, [bookmarkedSentences]);

  // Clear all bookmarks for this lesson
  const clearAllBookmarks = useCallback(() => {
    setBookmarkedSentences(new Set());
  }, []);

  // Get count of bookmarked sentences
  const bookmarkCount = bookmarkedSentences.size;

  // Get array of bookmarked indices
  const bookmarkedIndices = Array.from(bookmarkedSentences).sort((a, b) => a - b);

  return {
    bookmarkedSentences,
    bookmarkedIndices,
    bookmarkCount,
    showOnlyBookmarked,
    setShowOnlyBookmarked,
    toggleBookmark,
    isBookmarked,
    clearAllBookmarks,
  };
};

export default useBookmarks;
