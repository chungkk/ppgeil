// Redirect from /dashboard/settings to /profile/settings
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedPage from '../../components/ProtectedPage';

function SettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile/settings');
  }, [router]);

  return null;
}

export default function DashboardSettings() {
  return (
    <ProtectedPage>
      <SettingsRedirect />
    </ProtectedPage>
  );
}
