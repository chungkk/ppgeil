import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { bundeslaender } from '../../lib/data/lebenInDeutschland';
import SEO from '../../components/SEO';
import styles from '../../styles/LebenInDeutschland.module.css';

const LebenInDeutschlandPage = () => {
  const router = useRouter();
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
        title="Leben in Deutschland Test - Einbürgerungstest Vorbereitung"
        description="Bereite dich auf den Leben in Deutschland Test vor. 300 offizielle Fragen + 10 Fragen für dein Bundesland. Kostenlos üben!"
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.flag}>🇩🇪</span>
            Leben in Deutschland
          </h1>
          <p className={styles.subtitle}>
            Vorbereitung auf den Einbürgerungstest - 300 Fragen + 10 Bundesland-Fragen
          </p>
        </div>

        <div className={styles.content}>
          {/* Bundesland Selection */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📍</span>
              Wähle dein Bundesland
            </h2>
            <p className={styles.sectionDesc}>
              Der Test enthält 3 spezifische Fragen zu deinem Bundesland
            </p>
            
            <div className={styles.selectWrapper}>
              <select
                className={styles.bundeslandSelect}
                value={selectedBundesland}
                onChange={(e) => handleBundeslandChange(e.target.value)}
                disabled={saving}
              >
                <option value="">-- Bundesland auswählen --</option>
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
            <h3>📋 Über den Test</h3>
            <ul>
              <li><strong>33 Fragen</strong> - 30 allgemeine + 3 zu deinem Bundesland</li>
              <li><strong>60 Minuten</strong> Zeit</li>
              <li><strong>17 richtige Antworten</strong> zum Bestehen (50%)</li>
              <li>Multiple Choice mit 4 Antwortmöglichkeiten</li>
            </ul>
          </div>

          {/* Progress Card - Only for logged in users */}
          {user && (
            <div className={styles.progressCard}>
              <h3>📊 Dein Fortschritt</h3>
              <div className={styles.progressStats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.completedQuestions?.length || 0}</span>
                  <span className={styles.statLabel}>Fragen gelernt</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.testsTaken || 0}</span>
                  <span className={styles.statLabel}>Tests gemacht</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{lidProgress.bestScore || 0}/33</span>
                  <span className={styles.statLabel}>Beste Punktzahl</span>
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
                <strong>Học</strong>
                <small>Xem câu hỏi kèm đáp án</small>
              </span>
            </Link>

            <Link 
              href={`/leben-in-deutschland/practice${selectedBundesland ? `?state=${selectedBundesland}` : ''}`}
              className={styles.actionBtn}
            >
              <span className={styles.actionIcon}>📚</span>
              <span className={styles.actionText}>
                <strong>Luyện tập</strong>
                <small>Tự trả lời rồi xem đáp án</small>
              </span>
            </Link>

            <Link 
              href={`/leben-in-deutschland/test${selectedBundesland ? `?state=${selectedBundesland}` : ''}`}
              className={`${styles.actionBtn} ${styles.testBtn}`}
            >
              <span className={styles.actionIcon}>✍️</span>
              <span className={styles.actionText}>
                <strong>Thi thử</strong>
                <small>33 câu như thi thật</small>
              </span>
            </Link>
          </div>

          {!selectedBundesland && (
            <p className={styles.hint}>
              💡 Wähle ein Bundesland aus, um bundeslandspezifische Fragen zu erhalten
            </p>
          )}

          {!user && (
            <p className={styles.loginHint}>
              🔐 Melde dich an, um deinen Fortschritt zu speichern
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LebenInDeutschlandPage;
