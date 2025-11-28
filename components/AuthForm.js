import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { navigateWithLocale } from '../lib/navigation';
import styles from '../styles/authForm.module.css';

const AuthForm = ({ mode = 'login' }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error(t('auth.form.errors.passwordMismatch'));
        }
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        navigateWithLocale(router, '/profile');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <form onSubmit={handleSubmit} className={styles.authForm}>
      {!isLogin && (
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="name">
            {t('auth.form.name')}
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder={t('auth.form.namePlaceholder')}
            value={formData.name}
            onChange={handleChange}
            required={!isLogin}
            className={styles.formInput}
            disabled={loading}
          />
        </div>
      )}

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="email">
          {t('auth.form.email')}
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder={t('auth.form.emailPlaceholder')}
          value={formData.email}
          onChange={handleChange}
          required
          className={styles.formInput}
          disabled={loading}
          autoComplete="email"
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="password">
          {t('auth.form.password')}
        </label>
        <div className={styles.passwordContainer}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder={t('auth.form.passwordPlaceholder')}
            value={formData.password}
            onChange={handleChange}
            required
            className={styles.formInput}
            disabled={loading}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={t('auth.form.togglePassword')}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {isLogin && (
          <div className={styles.forgotPassword}>
            <a href="#" className={styles.forgotPasswordLink} onClick={(e) => e.preventDefault()}>
              {t('auth.form.forgotPassword')}
            </a>
          </div>
        )}
      </div>

      {!isLogin && (
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="confirmPassword">
            {t('auth.form.confirmPassword')}
          </label>
          <div className={styles.passwordContainer}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder={t('auth.form.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              onChange={handleChange}
              required={!isLogin}
              className={styles.formInput}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              aria-label={t('auth.form.togglePassword')}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={styles.submitButton}
      >
        {loading && <span className={styles.loadingSpinner} />}
        {loading ? t('auth.form.loading') : isLogin ? t('auth.form.loginButton') : t('auth.form.registerButton')}
      </button>
    </form>
  );
};

export default AuthForm;
