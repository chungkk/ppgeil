import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import { speakText } from '../../lib/textToSpeech';
import styles from '../../styles/dashboard.module.css';


function VocabularyPage() {
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLesson, setFilterLesson] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    try {
      setLoading(true);
      const vocabRes = await fetchWithAuth('/api/vocabulary');
      const vocabData = await vocabRes.json();
      setVocabulary(Array.isArray(vocabData) ? vocabData : []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      toast.error('Fehler beim Laden des Wortschatzes');
    } finally {
      setLoading(false);
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
    toast.success('Wortschatz erfolgreich exportiert!');
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

  const filteredVocabulary = getFilteredVocabulary();

  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Wortschatz', url: '/dashboard/vocabulary' }
  ]);

  return (
    <>
      <SEO
        title="Mein Wortschatz - PapaGeil"
        description="Verwalten Sie Ihren persönlichen deutschen Wortschatz. Speichern, überprüfen und üben Sie Ihre gelernten Vokabeln."
        keywords="Deutsch Wortschatz, Vokabeln speichern, Vokabeltrainer, Deutsch lernen Wortschatz"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <DashboardLayout>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>📝 Mein Wortschatz</h1>
              <p className={styles.pageSubtitle}>
                Verwalten und üben Sie Ihre gespeicherten Wörter
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsOverview}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📝</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{vocabulary.length}</div>
                <div className={styles.statLabel}>Gespeicherte Wörter</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📚</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{getUniqueLessons().length}</div>
                <div className={styles.statLabel}>Lektionen</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🔍</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{filteredVocabulary.length}</div>
                <div className={styles.statLabel}>Gefilterte Ergebnisse</div>
              </div>
            </div>
          </div>

          {/* Vocabulary Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Wortliste</h2>
            </div>

            {/* Search & Filter Controls */}
            <div className={styles.vocabControls}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  placeholder="Suchen Sie nach Wörtern, Übersetzungen oder Kontext..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className={styles.clearBtn}
                    title="Suche löschen"
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

              <button
                onClick={exportToCSV}
                className={styles.exportBtn}
                disabled={filteredVocabulary.length === 0}
              >
                📥 Exportieren
              </button>
            </div>

            {/* Vocabulary Content */}
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Lädt Wortschatz...</p>
              </div>
            ) : vocabulary.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <h3 className={styles.emptyTitle}>Noch kein Wortschatz vorhanden</h3>
                <p className={styles.emptyText}>
                  Speichern Sie Wortschatz beim Lernen für spätere Wiederholung
                </p>
              </div>
            ) : filteredVocabulary.length === 0 ? (
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
                  <table className={styles.vocabTable}>
                    <thead>
                      <tr>
                        <th>Wortschatz</th>
                        <th>Bedeutung</th>
                        <th>Kontext</th>
                        <th>Lektion</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVocabulary.map((vocab) => (
                        <tr key={vocab._id}>
                          <td>
                            <div
                              className={styles.wordCell}
                              onClick={() => speakWord(vocab.word)}
                              title="Klicken Sie, um die Aussprache zu hören"
                            >
                              🔊 <strong>{vocab.word}</strong>
                            </div>
                          </td>
                          <td className={styles.translationCell}>
                            {vocab.translation}
                          </td>
                          <td className={styles.contextCell}>
                            {vocab.context ? `"${vocab.context}"` : '-'}
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
                          <td>
                            <button
                              onClick={() => deleteVocabulary(vocab._id)}
                              className={styles.deleteBtn}
                              title="Wort löschen"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className={styles.vocabCards}>
                  {filteredVocabulary.map((vocab) => (
                    <div key={vocab._id} className={styles.vocabCard}>
                      <div
                        className={styles.vocabCardWord}
                        onClick={() => speakWord(vocab.word)}
                        title="Klicken Sie, um die Aussprache zu hören"
                      >
                        🔊 <strong>{vocab.word}</strong>
                      </div>
                      <div className={styles.vocabCardTranslation}>
                        {vocab.translation}
                      </div>
                      {vocab.context && (
                        <div className={styles.vocabCardContext}>
                          &ldquo;{vocab.context}&rdquo;
                        </div>
                      )}
                      <div className={styles.vocabCardFooter}>
                        <button
                          className={styles.vocabCardLessonBtn}
                          onClick={() => goToLesson(vocab.lessonId)}
                          title="Zur Lektion gehen"
                        >
                          📖 {vocab.lessonId || 'Unbekannt'}
                        </button>
                        <button
                          onClick={() => deleteVocabulary(vocab._id)}
                          className={styles.deleteBtn}
                          title="Wort löschen"
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
      </DashboardLayout>
    </>
  );
}

export default function Vocabulary() {
  return (
    <ProtectedPage>
      <VocabularyPage />
    </ProtectedPage>
  );
}
