import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import styles from '../styles/404.module.css';

export default function Custom404() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <SEO
        title="404 - Seite nicht gefunden | PapaGeil"
        description="Die gesuchte Seite konnte nicht gefunden werden. Kehren Sie zur Startseite zurück, um weiter Deutsch zu lernen."
        noindex={true}
      />

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorNumber}>404</div>
          <div className={styles.errorIcon}>🔍</div>
          <h1 className={styles.title}>{t('404.title')}</h1>
          <p className={styles.description}>
            {t('404.subtitle')}
            <br />
            {t('404.description')}
          </p>

          <div className={styles.buttonGroup}>
            <Link href="/" className={styles.primaryButton}>
              🏠 {t('404.goHome')}
            </Link>
            <button onClick={() => router.back()} className={styles.secondaryButton}>
              ← {t('404.goBack')}
            </button>
          </div>

          <div className={styles.suggestionsSection}>
            <p className={styles.suggestionsText}>{t('404.suggestions')}</p>
            <div className={styles.linksGroup}>
              <Link href="/profile" className={styles.suggestionLink}>
                {t('404.links.dashboard')}
              </Link>
              <Link href="/auth/login" className={styles.suggestionLink}>
                {t('404.links.login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
