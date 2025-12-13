import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData } from '../components/SEO';
import ProtectedPage from '../components/ProtectedPage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';
import { speakText } from '../lib/textToSpeech';
import { SkeletonGrid } from '../components/SkeletonLoader';
import styles from '../styles/dashboard.module.css';



function UserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, themeOptions, setTheme, currentTheme } = useTheme();
  const [progress, setProgress] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLesson, setFilterLesson] = useState('all');
  const [allLessons, setAllLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('all-lessons');

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sync tab state with URL query parameter
  useEffect(() => {
    if (!router.isReady) return;

    const queryTab = Array.isArray(router.query.tab)
      ? router.query.tab[0]
      : router.query.tab;

    if (
      queryTab &&
      ['all-lessons', 'vocabulary', 'settings'].includes(queryTab) &&
      queryTab !== activeTab
    ) {
      setActiveTab(queryTab);
    }
  }, [router.isReady, router.query.tab, activeTab]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      setProgress(Array.isArray(progressData) ? progressData : []);

      // Load ALL lessons (sorted by order)
      const lessonsRes = await fetch('/api/lessons');
      const lessonsData = await lessonsRes.json();

      // Handle both old array format and new object format
      const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);

      if (lessons && lessons.length > 0) {
        // Sort by newest first (createdAt descending)
        const sortedLessons = [...lessons].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // Newest first
        });
        setAllLessons(sortedLessons);
      } else {
        setAllLessons([]);
      }

      // Load vocabulary
      const vocabRes = await fetchWithAuth('/api/vocabulary');
      const vocabData = await vocabRes.json();
      setVocabulary(Array.isArray(vocabData) ? vocabData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateProgress = (lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 0;

    // Get max completion percent across all modes (shadowing/dictation)
    const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));

    return Math.min(100, maxProgress);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Neue Passwörter stimmen nicht überein!');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Neues Passwort muss mindestens 6 Zeichen lang sein!');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast.success('Passwort erfolgreich geändert!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.message || 'Fehler beim Ändern des Passworts');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Fehler beim Ändern des Passworts');
    } finally {
      setPasswordLoading(false);
    }
  };


  // Filter vocabulary by search term and lesson
  const getFilteredVocabulary = () => {
    let filtered = vocabulary;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(vocab =>
        vocab.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vocab.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vocab.context && vocab.context.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by lesson
    if (filterLesson !== 'all') {
      filtered = filtered.filter(vocab => vocab.lessonId === filterLesson);
    }

    return filtered;
  };

  // Get unique lessons from vocabulary
  const getUniqueLessons = () => {
    const lessons = [...new Set(vocabulary.map(v => v.lessonId))].filter(Boolean);
    return lessons.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });
  };

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;

    setActiveTab(tabId);

    if (!router.isReady) return;

    const nextQuery = { ...router.query };
    if (tabId === 'all-lessons') {
      delete nextQuery.tab;
    } else {
      nextQuery.tab = tabId;
    }

    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true }
    );
  };

  // Export vocabulary to CSV
  const exportToCSV = () => {
    const filtered = getFilteredVocabulary();
    const csvContent = [
      ['Wort', 'Übersetzung', 'Kontext', 'Lektion'].join(','),
      ...filtered.map(v => [
        v.word,
        v.translation,
        v.context || '',
        v.lessonId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wortschatz_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Speak word pronunciation
  const speakWord = (word) => {
    speakText(word, 'de-DE', 0.9, 1);
  };

  // Navigate to lesson
  const goToLesson = (lessonId) => {
    if (lessonId) {
      router.push(`/shadowing/${lessonId}`);
    }
  };

  const deleteVocabulary = async (id) => {
    if (!confirm('Dieses Wort löschen?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
        return;
      }

      const res = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setVocabulary(vocabulary.filter(v => v._id !== id));
        toast.success('Wort erfolgreich gelöscht!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Fehler beim Löschen des Wortes');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('Ein Fehler ist aufgetreten beim Löschen');
    }
  };



  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Lädt...</p>
          </div>
        </div>
        <SkeletonGrid count={6} columns={3} />
      </div>
    );
  }

  // Structured data for dashboard
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' }
  ]);

  return (
    <>
      <SEO
        title="Mein Dashboard - PapaGeil"
        description="Verfolgen Sie Ihren Deutsch-Lernfortschritt, verwalten Sie Ihren persönlichen Wortschatz und überprüfen Sie Ihre abgeschlossenen Lektionen."
        keywords="Deutsch Dashboard, Lernfortschritt, Wortschatz, Vokabeln speichern, Deutsch Übungsverlauf"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <div className={styles.container}>
        {/* Simplified Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              Hallo, {user?.name}! 👋
            </h1>
            <p className={styles.subtitle}>
              Verfolgen Sie Ihren Lernfortschritt und verwalten Sie Ihren Wortschatz
            </p>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{allLessons.length}</div>
              <div className={styles.statLabel}>Lektionen gesamt</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {allLessons.filter(l => calculateProgress(l.id) === 100).length}
              </div>
              <div className={styles.statLabel}>Abgeschlossen</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {allLessons.filter(l => {
                  const p = calculateProgress(l.id);
                  return p > 0 && p < 100;
                }).length}
              </div>
              <div className={styles.statLabel}>In Bearbeitung</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📝</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{vocabulary.length}</div>
              <div className={styles.statLabel}>Wortschatz</div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => handleTabChange('all-lessons')}
            className={`${styles.tab} ${activeTab === 'all-lessons' ? styles.tabActive : ''}`}
          >
            📚 Alle Lektionen
          </button>
           <button
             onClick={() => handleTabChange('vocabulary')}
             className={`${styles.tab} ${activeTab === 'vocabulary' ? styles.tabActive : ''}`}
           >
             📝 Wortschatz ({vocabulary.length})
           </button>
           <button
             onClick={() => handleTabChange('settings')}
             className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
           >
             ⚙️ Einstellungen
           </button>
        </div>

        {/* All Lessons Tab */}
        {activeTab === 'all-lessons' && (
          <div>
            <div className={styles.lessonsContainer}>
            {allLessons.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Keine Lektionen vorhanden</h3>
                <p className={styles.emptyText}>
                  Noch keine Lektionen im System
                </p>
              </div>
            ) : (
              <div className={styles.progressGrid}>
                {allLessons.map((lesson) => {
                  const progressPercent = calculateProgress(lesson.id);
                  return (
                    <div key={lesson.id} className={styles.lessonCard}>
                      {/* Status Badge */}
                      {progressPercent === 100 && (
                        <div className={`${styles.statusBadge} ${styles.completed}`}>
                          ✅
                        </div>
                      )}
                      {progressPercent > 0 && progressPercent < 100 && (
                        <div className={`${styles.statusBadge} ${styles.inProgress}`}>
                          📊
                        </div>
                      )}
                      {progressPercent === 0 && (
                        <div className={`${styles.statusBadge} ${styles.notStarted}`}>
                          🆕
                        </div>
                      )}

                      {/* Card Header */}
                      <div className={styles.cardHeader}>
                        <h3 className={styles.lessonTitle}>
                          {lesson.displayTitle || lesson.title}
                        </h3>
                        <p className={styles.lessonDescription}>
                          {lesson.description || 'Keine Beschreibung'}
                        </p>
                      </div>

                      {/* Progress Section */}
                      <div className={styles.progressSection}>
                        <div className={styles.progressInfo}>
                          <span className={styles.progressLabel}>Fortschritt</span>
                          <span className={styles.progressPercent}>{progressPercent}%</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className={styles.cardActions}>
                        <button
                          onClick={() => router.push(`/shadowing/${lesson.id}`)}
                          className={`${styles.actionBtn} ${styles.shadowing}`}
                        >
                          🎤 Shadowing
                        </button>
                        <button
                          onClick={() => router.push(`/${lesson.id}`)}
                          className={`${styles.actionBtn} ${styles.dictation}`}
                        >
                          ✍️ Dictation
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div>
            <div className={styles.lessonsContainer}>
              {/* Compact Search & Filter Section */}
              <div className={styles.vocabControls}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className={styles.clearBtn}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={filterLesson}
                  onChange={(e) => setFilterLesson(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">Alle Lektionen</option>
                  {getUniqueLessons().map(lesson => (
                    <option key={lesson} value={lesson}>{lesson}</option>
                  ))}
                </select>

                <button onClick={exportToCSV} className={styles.exportBtn}>
                  📥 Exportieren
                </button>
              </div>

              {vocabulary.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📝</div>
                  <h3 className={styles.emptyTitle}>Noch kein Wortschatz vorhanden</h3>
                  <p className={styles.emptyText}>
                    Speichern Sie Wortschatz beim Lernen für spätere Wiederholung
                  </p>
                </div>
              ) : getFilteredVocabulary().length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <h3 className={styles.emptyTitle}>Keine Ergebnisse gefunden</h3>
                  <p className={styles.emptyText}>
                    Versuchen Sie andere Suchbegriffe oder Filter
                  </p>
                </div>
              ) : (
                <>
                  {/* Table View (Desktop) */}
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Wortschatz</th>
                          <th>Bedeutung</th>
                          <th>Kontext</th>
                          <th>Lektion</th>
                          <th className={styles.tableActionsHeader}>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredVocabulary().map((vocab) => (
                          <tr key={vocab._id}>
                          <td>
                            <div
                              className={styles.wordCell}
                              onClick={() => speakWord(vocab.word)}
                              title="Klicken Sie, um die Aussprache zu hören"
                            >
                              🔊 {vocab.word}
                            </div>
                          </td>
                          <td className={styles.tableTranslation}>
                            {vocab.translation}
                          </td>
                          <td className={styles.tableContext}>
                            {vocab.context || '-'}
                          </td>
                          <td>
                            <button
                              className={styles.lessonLink}
                              onClick={() => goToLesson(vocab.lessonId)}
                              title="Zur Lektion gehen"
                            >
                              📖 {vocab.lessonId || 'Unbekannt'}
                            </button>
                          </td>
                          <td className={styles.tableActions}>
                            <button
                              onClick={() => deleteVocabulary(vocab._id)}
                              className={styles.deleteBtn}
                            >
                              🗑️ Löschen
                            </button>
                          </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className={styles.vocabCards}>
                    {getFilteredVocabulary().map((vocab) => (
                      <div key={vocab._id} className={styles.vocabCard}>
                        <div
                          className={styles.vocabCardWord}
                          onClick={() => speakWord(vocab.word)}
                          title="Klicken Sie, um die Aussprache zu hören"
                        >
                          🔊 {vocab.word}
                        </div>
                        <div className={styles.vocabCardTranslation}>
                          {vocab.translation}
                        </div>
                        {vocab.context && (
                          <div className={styles.vocabCardContext}>
                            &ldquo;{vocab.context}&rdquo;
                          </div>
                        )}
                        <button
                          className={styles.vocabCardLessonBtn}
                          onClick={() => goToLesson(vocab.lessonId)}
                          title="Zur Lektion gehen"
                        >
                          📖 Lektion: {vocab.lessonId || 'Unbekannt'}
                        </button>
                        <div className={styles.vocabCardActions}>
                          <button
                            onClick={() => deleteVocabulary(vocab._id)}
                            className={styles.deleteBtn}
                          >
                            🗑️ Löschen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

         {/* Settings Tab */}
         {activeTab === 'settings' && (
           <div className={styles.settingsGrid}>
             {/* Theme Setting Card */}
             <div className={styles.settingCard}>
               <div className={styles.settingCardHeader}>
                 <div className={styles.settingCardIcon}>🎨</div>
                 <h3 className={styles.settingCardTitle}>Darstellung</h3>
               </div>
               <div className={styles.settingCardBody}>
                 <div className={styles.themeOptions}>
                   {themeOptions.map((option) => (
                     <button
                       key={option.id}
                       type="button"
                       className={`${styles.themeOption} ${theme === option.id ? styles.themeOptionActive : ''}`}
                       onClick={() => setTheme(option.id)}
                       aria-pressed={theme === option.id}
                     >
                       <span className={styles.themeOptionEmoji} aria-hidden="true">
                         {option.emoji}
                       </span>
                       <span className={styles.themeOptionContent}>
                         <span className={styles.themeOptionLabel}>{option.label}</span>
                         <span className={styles.themeOptionDescription}>{option.description}</span>
                       </span>
                     </button>
                   ))}
                 </div>
                 <p className={styles.settingHint}>
                   Aktuell: <strong>{currentTheme?.label}</strong>
                 </p>
               </div>
             </div>

             {/* Language Setting Card */}
             <div className={styles.settingCard}>
               <div className={styles.settingCardHeader}>
                 <div className={styles.settingCardIcon}>🌐</div>
                 <h3 className={styles.settingCardTitle}>Sprache</h3>
               </div>
               <div className={styles.settingCardBody}>
                 <select
                   value={user?.nativeLanguage || 'vi'}
                   onChange={async (e) => {
                     try {
                       const response = await fetch('/api/auth/update-profile', {
                         method: 'PUT',
                         headers: {
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${localStorage.getItem('token')}`
                         },
                         body: JSON.stringify({
                           nativeLanguage: e.target.value
                         })
                       });

                       if (response.ok) {
                         toast.success('Sprache aktualisiert!');
                         window.location.reload();
                       } else {
                         toast.error('Fehler beim Aktualisieren');
                       }
                     } catch (error) {
                       console.error('Update error:', error);
                       toast.error('Fehler beim Aktualisieren');
                     }
                   }}
                   className={styles.settingSelect}
                 >
                   <option value="vi">Tiếng Việt</option>
                   <option value="en">English</option>
                   <option value="es">Español</option>
                   <option value="fr">Français</option>
                   <option value="de">Deutsch</option>
                   <option value="it">Italiano</option>
                   <option value="pt">Português</option>
                   <option value="ru">Русский</option>
                   <option value="ja">日本語</option>
                   <option value="ko">한국어</option>
                   <option value="zh">中文</option>
                 </select>
                 <p className={styles.settingHint}>
                   Muttersprache für Übersetzungen
                 </p>
               </div>
             </div>

             {/* Level Setting Card */}
             <div className={styles.settingCard}>
               <div className={styles.settingCardHeader}>
                 <div className={styles.settingCardIcon}>📊</div>
                 <h3 className={styles.settingCardTitle}>Dein Deutsch-Niveau</h3>
               </div>
               <div className={styles.settingCardBody}>
                 <select
                   value={user?.level || 'beginner'}
                   onChange={async (e) => {
                     try {
                       const response = await fetch('/api/auth/update-profile', {
                         method: 'PUT',
                         headers: {
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${localStorage.getItem('token')}`
                         },
                         body: JSON.stringify({
                           level: e.target.value
                         })
                       });

                       if (response.ok) {
                         toast.success('Niveau aktualisiert!');
                         window.location.reload();
                       } else {
                         toast.error('Fehler beim Aktualisieren');
                       }
                     } catch (error) {
                       console.error('Update error:', error);
                       toast.error('Fehler beim Aktualisieren');
                     }
                   }}
                   className={styles.settingSelect}
                 >
                   <option value="beginner">🌱 Anfänger (A1-A2)</option>
                   <option value="experienced">🚀 Fortgeschritten (B1+)</option>
                   <option value="all">🎯 Alle Niveaus</option>
                 </select>
                 <p className={styles.settingHint}>
                   Lektionen auf der Startseite werden automatisch nach deinem gewählten Niveau gefiltert
                 </p>
               </div>
             </div>

              {/* Profile Card */}
              <div className={styles.settingCard}>
                <div className={styles.settingCardHeader}>
                  <div className={styles.settingCardIcon}>👤</div>
                  <h3 className={styles.settingCardTitle}>Profil</h3>
                </div>
                <div className={styles.settingCardBody}>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>Name:</span>
                      <span className={styles.profileValue}>{user?.name}</span>
                    </div>
                    <div className={styles.profileItem}>
                      <span className={styles.profileLabel}>E-Mail:</span>
                      <span className={styles.profileValue}>{user?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Card */}
              <div className={styles.settingCard}>
                <div className={styles.settingCardHeader}>
                  <div className={styles.settingCardIcon}>🔒</div>
                  <h3 className={styles.settingCardTitle}>Passwort ändern</h3>
                </div>
                <div className={styles.settingCardBody}>
                  <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                    <div className={styles.passwordField}>
                      <label className={styles.passwordLabel}>Aktuelles Passwort</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        className={styles.passwordInput}
                        required
                      />
                    </div>
                    <div className={styles.passwordField}>
                      <label className={styles.passwordLabel}>Neues Passwort</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        className={styles.passwordInput}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className={styles.passwordField}>
                      <label className={styles.passwordLabel}>Neues Passwort bestätigen</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        className={styles.passwordInput}
                        required
                        minLength={6}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className={styles.passwordSubmitBtn}
                    >
                      {passwordLoading ? '🔄 Ändern...' : '🔒 Passwort ändern'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
         )}


       </div>
    </>
  );
}

function Dashboard() {
  return (
    <ProtectedPage>
      <UserDashboard />
    </ProtectedPage>
  );
}

export default Dashboard;
