// Redirect from /dashboard/vocabulary to /profile/vocabulary
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedPage from '../../components/ProtectedPage';

function VocabularyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/vocabulary');
  }, [router]);

  return null;
}

export default function DashboardVocabulary() {
  return (
    <ProtectedPage>
      <VocabularyRedirect />
    </ProtectedPage>
  );
}
