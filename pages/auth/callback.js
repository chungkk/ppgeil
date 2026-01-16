import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function AuthCallback() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    // Check for errors in URL
    if (error) {
      console.error('❌ OAuth Error:', error);
      if (window.opener) {
        window.opener.postMessage({
          type: 'auth-failed',
          error: error
        }, window.location.origin);
        setTimeout(() => window.close(), 1000);
      }
      return;
    }

    if (status === 'authenticated' && session) {
      // Close the popup and notify parent window
      console.log('✅ Authentication successful, closing popup...');

      // Try to close popup
      if (window.opener) {
        // Notify parent window about successful login
        window.opener.postMessage({ type: 'auth-success', session }, window.location.origin);

        // Close after a short delay
        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        // If not in popup, redirect to homepage (stay on current page logic not applicable here)
        window.location.href = '/';
      }
    } else if (status === 'unauthenticated') {
      // Authentication failed
      console.log('❌ Authentication failed');
      if (window.opener) {
        window.opener.postMessage({ type: 'auth-failed' }, window.location.origin);
        setTimeout(() => window.close(), 1000);
      }
    }
  }, [session, status, error]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          <Image src="/logo.jpg" alt="Logo" width={80} height={80} style={{ borderRadius: '12px' }} />
        </div>
        {error && (
          <>
            <h2>❌ Đăng nhập thất bại</h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>Lỗi: {error}</p>
            <p style={{ fontSize: '12px', marginTop: '20px' }}>
              Vui lòng kiểm tra Google Cloud Console và đảm bảo redirect URI được cấu hình đúng.
            </p>
          </>
        )}
        {!error && status === 'loading' && <h2>Đang xác thực...</h2>}
        {!error && status === 'authenticated' && <h2>✅ Đăng nhập thành công!</h2>}
        {!error && status === 'unauthenticated' && <h2>❌ Đăng nhập thất bại</h2>}
      </div>
    </div>
  );
}
