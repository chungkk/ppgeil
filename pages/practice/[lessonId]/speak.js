import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import styles from '../../../styles/practice.module.css';

const SpeakPracticePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SEO 
        title={`Luyện nói: ${lesson?.title || 'Bài học'}`}
        description="Luyện nói tiếng Đức"
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← Quay lại
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>🎤</span>
            <h1 className={styles.practiceTitle}>Luyện nói</h1>
          </div>
          <p className={styles.practiceSubtitle}>{lesson?.title}</p>
        </div>

        {/* Coming Soon */}
        <div className={styles.comingSoonPage}>
          <div className={styles.comingSoonContent}>
            <span className={styles.comingSoonIcon}>🚧</span>
            <h2 className={styles.comingSoonTitle}>Tính năng đang phát triển</h2>
            <p className={styles.comingSoonDescription}>
              Chức năng luyện nói sẽ bao gồm:
            </p>
            <ul className={styles.featureList}>
              <li>🎧 Nghe mẫu câu tiếng Đức</li>
              <li>🎤 Ghi âm giọng nói của bạn</li>
              <li>📊 So sánh phát âm với mẫu</li>
              <li>💡 Gợi ý cải thiện phát âm</li>
            </ul>
            <p className={styles.comingSoonNote}>
              Tính năng sẽ sớm được ra mắt. Hãy theo dõi nhé!
            </p>
          </div>
          
          <Link href={`/practice/${lessonId}`} className={styles.primaryBtn}>
            ← Quay lại trang luyện tập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SpeakPracticePage;
