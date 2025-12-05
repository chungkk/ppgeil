import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { navigateWithLocale } from '../lib/navigation';
import styles from '../styles/LoginModal.module.css';

const LoginModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  // Listen for messages from popup
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'auth-success') {
        console.log('✅ Received auth success from popup');
        setLoading(false);
        onClose();
        window.location.reload();
      } else if (event.data.type === 'auth-failed') {
        console.log('❌ Received auth failed from popup');
        setLoading(false);
        setError(t('loginModal.errors.googleFailed'));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose, t]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Calculate popup position - centered on screen
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Build Google OAuth URL directly - bypass NextAuth redirect
      const baseUrl = window.location.origin;
      const clientId = '755356867011-atqs1b998cmiivtr7jql3e0cahq6kmqe.apps.googleusercontent.com';

      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('oauth_state', state);

      // Construct direct Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.append('client_id', clientId);
      googleAuthUrl.searchParams.append('redirect_uri', `${baseUrl}/api/auth/callback/google`);
      googleAuthUrl.searchParams.append('response_type', 'code');
      googleAuthUrl.searchParams.append('scope', 'openid email profile');
      googleAuthUrl.searchParams.append('state', state);
      googleAuthUrl.searchParams.append('prompt', 'select_account'); // Always show account chooser

      const popup = window.open(
        googleAuthUrl.toString(),
        'googleAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        setError(t('loginModal.errors.popupBlocked'));
        setLoading(false);
        return;
      }

      // Monitor popup for closure
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          setLoading(false);

          // Check if login was successful
          setTimeout(async () => {
            try {
              const response = await fetch('/api/auth/session');

              if (!response.ok) {
                console.log('ℹ️ Login cancelled or incomplete');
                return;
              }

              const contentType = response.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.log('ℹ️ Response is not JSON');
                return;
              }

              const session = await response.json();

              if (session && session.user) {
                console.log('✅ Google login successful!');
                onClose();
                window.location.reload();
              } else {
                console.log('ℹ️ Login cancelled or incomplete');
              }
            } catch (error) {
              console.error('Error checking session:', error);
            }
          }, 1000);
        }
      }, 500);

      // Auto-close timeout (5 minutes)
      setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
          clearInterval(checkInterval);
          setLoading(false);
          setError(t('loginModal.errors.timeout'));
        }
      }, 300000);

    } catch (error) {
      console.error('Google login error:', error);
      setError(t('loginModal.errors.googleFailed'));
      setLoading(false);
    }
  };

  const handleCheckEmail = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError(t('loginModal.errors.checkEmailFailed'));
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError(t('loginModal.errors.invalidResponse'));
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.exists) {
        setEmailExists(true);
        setEmailChecked(true);

        if (data.isGoogleUser) {
          setError(t('loginModal.errors.emailRegisteredWithGoogle'));
          setLoading(false);
        } else {
          setLoading(false);
        }
      } else {
        // Email chưa đăng ký -> Tự động chuyển sang form đăng ký
        setIsRegistering(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Email check error:', err);
      setError(t('loginModal.errors.generalError'));
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        onClose();
        // Ở lại trang hiện tại - không redirect
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!name.trim()) {
      setError(t('loginModal.errors.nameRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('loginModal.errors.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('loginModal.errors.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase(),
          password,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError(t('loginModal.errors.invalidResponse'));
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        // Auto login after register
        const loginResult = await login(email, password);
        if (loginResult.success) {
          onClose();
          // Ở lại trang hiện tại - không redirect
        } else {
          setError(t('loginModal.errors.registerSuccess'));
          setIsRegistering(false);
          setEmailChecked(false);
          setEmailExists(false);
          setPassword('');
          setConfirmPassword('');
          setName('');
        }
      } else {
        setError(data.error || t('loginModal.errors.registerFailed'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t('loginModal.errors.generalError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        <div className={styles.modalLeft}>
          <div className={styles.welcomeContent}>
            <div className={styles.parrotIcon}>🦜</div>
            <h2 className={styles.welcomeTitle}>
              {t('loginModal.welcome')}
            </h2>
            <p className={styles.welcomeSubtitle}>
              {t('loginModal.subtitle')}
            </p>
            <div className={styles.mascot}>
              <div className={styles.mascotBubble}>Hi...</div>
            </div>
          </div>
        </div>

        <div className={styles.modalRight}>
          {!showEmailForm ? (
            <div className={styles.authOptions}>
              {isRegistering ? (
                <>
                  <button
                    className={styles.backButton}
                    onClick={() => {
                      setIsRegistering(false);
                      setName('');
                      setPassword('');
                      setConfirmPassword('');
                      setError('');
                    }}
                    disabled={loading}
                  >
                    {t('loginModal.backToLogin')}
                  </button>

                  <div className={styles.registerHeader}>
                    <div className={styles.registerIcon}>✨</div>
                    <h3 className={styles.registerTitle}>
                      {t('loginModal.createAccount')}
                    </h3>
                    <p className={styles.registerSubtitle}>
                      {t('loginModal.createAccountSubtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleRegister}>
                    <input
                      type="text"
                      placeholder={t('loginModal.fullName')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.input}
                      required
                      disabled={loading}
                      autoComplete="name"
                      autoFocus
                    />

                    <input
                      type="email"
                      placeholder={t('loginModal.email')}
                      value={email}
                      className={styles.input}
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />

                    <div className={styles.passwordContainer}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('loginModal.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={t('loginModal.togglePassword')}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>

                    <div className={styles.passwordContainer}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('loginModal.confirmPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.input}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={t('loginModal.togglePassword')}
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>

                    {error && (
                      <div className={styles.errorMessage}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={loading || !name || !password || !confirmPassword}
                    >
                      {loading ? t('loginModal.registering') : t('loginModal.register')}
                    </button>
                  </form>

                  <p className={styles.terms} style={{ marginTop: '8px', fontSize: '12px' }}>
                    {t('loginModal.termsRegister')}
                  </p>
                </>
              ) : (
                <>
              <button
                className={styles.googleButton}
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40681 3.78409 7.82999 3.96409 7.28999V4.95818H0.957275C0.347727 6.17318 0 7.54772 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M9 3.57954C10.3214 3.57954 11.5077 4.03363 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01681 0.957275 4.95818L3.96409 7.28999C4.67182 5.16272 6.65591 3.57954 9 3.57954Z" fill="#EA4335"/>
                </svg>
                <span>
                  {loading ? t('loginModal.processing') : t('loginModal.continueWithGoogle')}
                </span>
              </button>

              <div className={styles.divider}>
                <span>{t('loginModal.orContinueWith')}</span>
              </div>

              <input
                type="email"
                placeholder={t('loginModal.enterEmail')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailChecked(false);
                  setEmailExists(false);
                  setError('');
                }}
                className={styles.input}
                disabled={loading || emailChecked}
                autoComplete="email"
              />

              {emailChecked && emailExists ? (
                <form onSubmit={handleEmailLogin}>
                  <div className={styles.passwordContainer}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('loginModal.enterPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.input}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={t('loginModal.togglePassword')}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading || !password}
                  >
                    {loading ? t('loginModal.processing') : t('loginModal.login')}
                  </button>

                  <button
                    type="button"
                    className={styles.changeEmailButton}
                    onClick={() => {
                      setEmailChecked(false);
                      setEmailExists(false);
                      setPassword('');
                      setError('');
                    }}
                    disabled={loading}
                  >
                    {t('loginModal.changeEmail')}
                  </button>
                </form>
              ) : (
                <button
                  className={styles.emailButton}
                  onClick={handleCheckEmail}
                  disabled={!email || loading}
                >
                  {loading ? t('loginModal.checking') : t('loginModal.continueWithEmail')}
                </button>
              )}

              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              <p className={styles.disclaimer}>
                {t('loginModal.googleDisclaimer')}
              </p>

              <p className={styles.terms}>
                {t('loginModal.termsLogin')}
              </p>
              </>
              )}
            </div>
          ) : (
            <div className={styles.emailForm}>
              <button
                className={styles.backButton}
                onClick={() => setShowEmailForm(false)}
              >
                {t('loginModal.backButton')}
              </button>

              <h3 className={styles.formTitle}>
                {t('loginModal.emailLoginTitle')}
              </h3>

              <form onSubmit={handleEmailLogin}>
                <input
                  type="email"
                  placeholder={t('loginModal.enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  required
                  disabled={loading}
                  autoComplete="email"
                />

                <div className={styles.passwordContainer}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('loginModal.enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={t('loginModal.togglePassword')}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? t('loginModal.processing') : t('loginModal.login')}
                </button>
              </form>

              <p className={styles.registerLink}>
                {t('loginModal.noAccount')}{' '}
                <Link href="/auth/register">
                  {t('loginModal.registerNow')}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
