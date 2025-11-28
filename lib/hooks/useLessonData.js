import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const progressFetcher = async (url) => {
  // Get token from localStorage (may be null for guests)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // For guest users (401), return empty progress instead of throwing
    if (res.status === 401) {
      return { progress: {}, studyTime: 0, isGuest: true };
    }
    throw new Error('Failed to fetch');
  }
  return res.json();
};

// Combined hook to fetch lesson + progress in parallel
export function useLessonData(lessonId, mode = 'shadowing') {
  const { data: lesson, error: lessonError, isLoading: lessonLoading } = useSWR(
    lessonId ? `/api/lessons/${lessonId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Lesson data rarely changes
    }
  );

  const { data: progressData, error: progressError, isLoading: progressLoading, mutate: mutateProgress } = useSWR(
    lessonId ? `/api/progress?lessonId=${lessonId}&mode=${mode}` : null,
    progressFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Refresh progress every 5s if needed
      shouldRetryOnError: false, // Don't retry if user not logged in
    }
  );

  return {
    lesson,
    progress: progressData?.progress,
    studyTime: progressData?.studyTime || 0,
    isGuest: progressData?.isGuest || false,
    isLoading: lessonLoading || progressLoading,
    isError: lessonError || progressError,
    mutateProgress
  };
}
