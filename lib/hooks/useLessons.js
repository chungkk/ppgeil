import useSWR from 'swr';
import { useEffect, useRef } from 'react';

// Fetcher that bypasses HTTP cache if invalidation flag is set
const fetcher = (url) => {
  if (typeof window !== 'undefined') {
    const invalidatedAt = sessionStorage.getItem('lessons_cache_invalidated');
    if (invalidatedAt) {
      // Clear the flag after using it
      sessionStorage.removeItem('lessons_cache_invalidated');
      const separator = url.includes('?') ? '&' : '?';
      return fetch(`${url}${separator}_t=${invalidatedAt}`, {
        cache: 'no-store'
      }).then((res) => res.json());
    }
  }
  return fetch(url).then((res) => res.json());
};

// Fetcher that always bypasses HTTP cache
const fetcherNoCache = (url) => {
  const separator = url.includes('?') ? '&' : '?';
  return fetch(`${url}${separator}_t=${Date.now()}`, {
    cache: 'no-store'
  }).then((res) => res.json());
};

// Create broadcast channel for cross-tab communication
let lessonChannel;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  lessonChannel = new BroadcastChannel('lessons_update');
}

export function useLessons({ page = 1, limit = 15, difficulty = 'all' } = {}) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  if (difficulty && difficulty !== 'all') {
    queryParams.set('difficulty', difficulty);
  }

  const { data, error, isLoading, mutate } = useSWR(
    `/api/lessons?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true, // Auto refresh when user focuses tab
      revalidateOnReconnect: true, // Auto refresh on reconnect
      dedupingInterval: 2000, // Dedupe requests within 2s
      keepPreviousData: true, // Keep previous data while loading new page
      refreshInterval: 30000, // Auto refresh every 30 seconds
    }
  );

  // Listen for cross-tab updates
  useEffect(() => {
    if (!lessonChannel) return;

    const handleMessage = async (event) => {
      if (event.data === 'lessons_updated') {
        // Force revalidate bypassing HTTP cache
        const freshData = await fetcherNoCache(`/api/lessons?${queryParams.toString()}`);
        mutate(freshData, false); // Update cache with fresh data without revalidation
      }
    };

    lessonChannel.addEventListener('message', handleMessage);
    return () => lessonChannel.removeEventListener('message', handleMessage);
  }, [mutate, queryParams]);

  return {
    lessons: data?.lessons || [],
    totalPages: data?.totalPages || 1,
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate
  };
}

// Broadcast lesson updates to all tabs
export function broadcastLessonUpdate() {
  if (lessonChannel) {
    lessonChannel.postMessage('lessons_updated');
  }
}

// Force invalidate all lessons cache (bypassing HTTP cache)
export async function invalidateLessonsCache() {
  const { mutate } = await import('swr');
  // Set flag to force bypass HTTP cache on next fetch
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('lessons_cache_invalidated', Date.now().toString());
  }
  // Clear all SWR cache entries that match /api/lessons
  mutate(
    key => typeof key === 'string' && key.startsWith('/api/lessons'),
    undefined,
    { revalidate: false }
  );
}

export function useLesson(lessonId) {
  const { data, error, isLoading, mutate } = useSWR(
    lessonId ? `/api/lessons/${lessonId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Lesson data rarely changes, cache for 1 min
    }
  );

  return {
    lesson: data,
    isLoading,
    isError: error,
    mutate
  };
}

// Prefetch next page for better UX
export function prefetchLessons({ page, limit = 15, difficulty = 'all' }) {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });

  if (difficulty && difficulty !== 'all') {
    queryParams.set('difficulty', difficulty);
  }

  // This will prefetch and cache the data
  if (typeof window !== 'undefined') {
    fetch(`/api/lessons?${queryParams.toString()}`)
      .then(res => res.json())
      .catch(err => console.error('Prefetch error:', err));
  }
}
