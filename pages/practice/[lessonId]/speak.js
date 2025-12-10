import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/practice.module.css';

const SpeakPracticePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/dictation/${lessonId}?login=true`);
    }
  }, [user, authLoading, router, lessonId]);

  if (isLoading || authLoading || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>{t('practice.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SEO 
        title={`${t('practice.speak.title')}: ${lesson?.title || ''}`}
        description={t('practice.speak.description')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← {t('practice.backTo')}
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>🎤</span>
            <h1 className={styles.practiceTitle}>{t('practice.speak.title')}</h1>
          </div>
          <p className={styles.practiceSubtitle}>{lesson?.title}</p>
        </div>

        {/* Coming Soon */}
        <div className={styles.comingSoonPage}>
          <div className={styles.comingSoonContent}>
            <span className={styles.comingSoonIcon}>🚧</span>
            <h2 className={styles.comingSoonTitle}>{t('practice.speak.comingSoon')}</h2>
            <p className={styles.comingSoonDescription}>
              {t('practice.speak.comingSoonDesc')}
            </p>
            <ul className={styles.featureList}>
              <li>🎧 {t('practice.speak.features.listen')}</li>
              <li>🎤 {t('practice.speak.features.record')}</li>
              <li>📊 {t('practice.speak.features.compare')}</li>
              <li>💡 {t('practice.speak.features.tips')}</li>
            </ul>
            <p className={styles.comingSoonNote}>
              {t('practice.speak.note')}
            </p>
          </div>
          
          <Link href={`/practice/${lessonId}`} className={styles.primaryBtn}>
            ← {t('practice.backTo')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SpeakPracticePage;
