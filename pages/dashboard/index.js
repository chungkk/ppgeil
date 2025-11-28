// Redirect from /dashboard to /profile
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedPage from '../../components/ProtectedPage';

function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return null;
}

export default function Dashboard() {
  return (
    <ProtectedPage>
      <DashboardRedirect />
    </ProtectedPage>
  );
}
