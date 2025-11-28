import useSWR from 'swr';
import { useEffect } from 'react';

const fetcher = (url) => fetch(url).then((res) => res.json());

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

    const handleMessage = (event) => {
      if (event.data === 'lessons_updated') {
        mutate(); // Revalidate data when another tab updates lessons
      }
    };

    lessonChannel.addEventListener('message', handleMessage);
    return () => lessonChannel.removeEventListener('message', handleMessage);
  }, [mutate]);

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
