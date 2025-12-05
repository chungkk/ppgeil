import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { bundeslaender } from '../../lib/data/lebenInDeutschland';
import SEO from '../../components/SEO';
import styles from '../../styles/LebenInDeutschland.module.css';

const LebenInDeutschlandPage = () => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [selectedBundesland, setSelectedBundesland] = useState('');
  const [lidProgress, setLidProgress] = useState({ completedQuestions: [], testsTaken: 0, bestScore: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/bundesland', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBundesland(data.bundesland || '');
        setLidProgress(data.lidProgress || { completedQuestions: [], testsTaken: 0, bestScore: 0 });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBundeslandChange = async (code) => {
    if (!user) {
      setSelectedBundesland(code);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/bundesland', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bundesland: code })
      });
      if (res.ok) {
        setSelectedBundesland(code);
      }
    } catch (error) {
      console.error('Error saving bundesland:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedBundeslandInfo = bundeslaender.find(b => b.code === selectedBundesland);

  return (
    <>
      <SEO
        title={`${t('lid.title')} - ${t('lid.subtitle')}`}
        description={t('lid.subtitle')}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.flag}>🇩🇪</span>
            {t('lid.title')}
          </h1>
          <p className={styles.subtitle}>
            {t('lid.subtitle')}
          </p>
        </div>

        <div className={styles.content}>
          {/* Bundesland Selection */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📍</span>
              {t('lid.selectState')}
            </h2>
            <p className={styles.sectionDesc}>
              {t('lid.selectStateDesc')}
            </p>
            
            <div className={styles.selectWrapper}>
              <select
                className={styles.bundeslandSelect}
                value={selectedBundesland}
                onChange={(e) => handleBundeslandChange(e.target.value)}
                disabled={saving}
              >
                <option value="">{t('lid.selectPlaceholder')}</option>
                {bundeslaender.map((land) => (
                  <option key={land.code} value={land.code}>
                    {land.name} ({land.capital})
                  </option>
                ))}
              </select>
              {selectedBundeslandInfo && (
                <div className={styles.selectedInfo}>
                  <span className={styles.checkmark}>✓</span>
                  <span>{selectedBundeslandInfo.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Test Info */}
          <div className={styles.infoCard}>
            <h3>📋 {t('lid.aboutTest')}</h3>
            <ul>
              <li>{t('lid.aboutTestInfo.questions')}</li>
              <li>{t('lid.aboutTestInfo.time')}</li>
              <li>{t('lid.aboutTestInfo.pass')}</li>
              <li>{t('lid.aboutTestInfo.format')}</li>
            </ul>
          </div>

          {/* Progress Card - Only for logged in users */}
          {user && (
            <div className={styles.progressCard}>
              <h3>📊 {t('lid.progress')}</h3>
              <div className={styles.progressStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.completedQuestions?.length || 0}</span>
                  <span className={styles.statLabel}>{t('lid.questionsLearned')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.testsTaken || 0}</span>
                  <span className={styles.statLabel}>{t('lid.testsTaken')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.bestScore || 0}/33</span>
                  <span className={styles.statLabel}>{t('lid.bestScore')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link 
              href={`/leben-in-deutschland/learn${selectedBundesland ? `?state=${selectedBundesland}` : ''}`}
              className={styles.actionBtn}
            >
              <span className={styles.actionIcon}>📖</span>
              <span className={styles.actionText}>
                <strong>{t('lid.learn')}</strong>
                <small>{t('lid.learnDesc')}</small>
              </span>
            </Link>

            <Link 
              href={`/leben-in-deutschland/practice${selectedBundesland ? `?state=${selectedBundesland}` : ''}`}
              className={styles.actionBtn}
            >
              <span className={styles.actionIcon}>📚</span>
              <span className={styles.actionText}>
                <strong>{t('lid.practice')}</strong>
                <small>{t('lid.practiceDesc')}</small>
              </span>
            </Link>

            <Link 
              href={`/leben-in-deutschland/test${selectedBundesland ? `?state=${selectedBundesland}` : ''}`}
              className={`${styles.actionBtn} ${styles.testBtn}`}
            >
              <span className={styles.actionIcon}>✍️</span>
              <span className={styles.actionText}>
                <strong>{t('lid.test')}</strong>
                <small>{t('lid.testDesc')}</small>
              </span>
            </Link>
          </div>

          {!selectedBundesland && (
            <p className={styles.hint}>
              💡 {t('lid.hint')}
            </p>
          )}

          {!user && (
            <p className={styles.loginHint}>
              🔐 {t('lid.loginHint')}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LebenInDeutschlandPage;
