import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { AdminFilesPageSkeleton } from '../../../components/SkeletonLoader';
import { toast } from 'react-toastify';
import styles from '../../../styles/adminDashboard.module.css';


function AdminFilesPage() {
  const [unusedFiles, setUnusedFiles] = useState({ audio: [], json: [] });
  const [oldFiles, setOldFiles] = useState({ audio: [], json: [] });
  const [deletingFiles, setDeletingFiles] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadUnusedFiles(), loadOldFiles()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadUnusedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnusedFiles(data);
      }
    } catch (error) {
      console.error('Error loading unused files:', error);
    }
  };

  const loadOldFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/old-files?days=3', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOldFiles(data);
      }
    } catch (error) {
      console.error('Error loading old files:', error);
    }
  };

  const deleteUnusedFiles = async (files) => {
    if (!confirm(`Sind Sie sicher, dass Sie ${files.length} ungenutzte Dateien löschen möchten?`)) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted.length} Dateien gelöscht`);
        if (data.errors.length > 0) {
          toast.warning(`Löschfehler: ${data.errors.join(', ')}`);
        }
        loadData();
      } else {
        toast.error('Dateilöschfehler');
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Dateilöschfehler');
    } finally {
      setDeletingFiles(false);
    }
  };

  const deleteOldFiles = async () => {
    if (!confirm('Sind Sie sicher, dass Sie alle Dateien älter als 3 Tage löschen möchten?')) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const allOldFiles = [...oldFiles.audio, ...oldFiles.json];
      if (allOldFiles.length === 0) {
        toast.info('Keine alten Dateien zum Löschen gefunden.');
        return;
      }

      const res = await fetch('/api/unused-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files: allOldFiles })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted.length} alte Dateien gelöscht`);
        if (data.errors.length > 0) {
          toast.warning(`Löschfehler: ${data.errors.join(', ')}`);
        }
        loadData();
      } else {
        toast.error('Fehler beim Löschen alter Dateien');
      }
    } catch (error) {
      console.error('Error deleting old files:', error);
      toast.error('Fehler beim Löschen alter Dateien');
    } finally {
      setDeletingFiles(false);
    }
  };

  const runScheduledCleanup = async () => {
    if (!confirm('Möchten Sie die geplante Bereinigung jetzt ausführen?')) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/run-cleanup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Bereinigung abgeschlossen: ${data.deletedCount} Dateien gelöscht`);
        loadData();
      } else {
        toast.error('Fehler bei der Bereinigung');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Fehler bei der Bereinigung');
    } finally {
      setDeletingFiles(false);
    }
  };

  const totalUnused = unusedFiles.audio.length + unusedFiles.json.length;
  const totalOld = oldFiles.audio.length + oldFiles.json.length;

  return (
    <>
      <Head>
        <title>Dateien verwalten - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        {loading ? (
          <AdminFilesPageSkeleton />
        ) : (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>🗂️ Dateien verwalten</h1>
                <p className={styles.pageSubtitle}>
                  Verwalten und löschen Sie ungenutzte Dateien
                </p>
              </div>
              <button
                onClick={() => loadData()}
                className={styles.secondaryButton}
                disabled={loading}
              >
                🔄 Aktualisieren
              </button>
            </div>

        {/* Stats */}
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🗂️</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{totalUnused}</div>
              <div className={styles.statLabel}>Ungenutzte Dateien</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⏰</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{totalOld}</div>
              <div className={styles.statLabel}>Alte Dateien (3+ Tage)</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎵</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{unusedFiles.audio.length}</div>
              <div className={styles.statLabel}>Audio-Dateien</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📄</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{unusedFiles.json.length}</div>
              <div className={styles.statLabel}>JSON-Dateien</div>
            </div>
          </div>
        </div>

        {/* Auto-delete Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>⏰ Automatische Bereinigung</h2>
          </div>
          <div className={styles.cleanupCard}>
            <p className={styles.cleanupText}>
              Dateien werden automatisch nach 3 Tagen gelöscht, wenn sie nicht verwendet werden.
              Sie können auch manuell alle alten Dateien löschen.
            </p>
            <div className={styles.cleanupActions}>
              <button
                onClick={deleteOldFiles}
                disabled={deletingFiles || totalOld === 0}
                className={styles.warningButton}
              >
                {deletingFiles ? '⏳ Wird gelöscht...' : `🗑️ Alte Dateien löschen (${totalOld})`}
              </button>
              <button
                onClick={runScheduledCleanup}
                disabled={deletingFiles}
                className={styles.infoButton}
              >
                🔄 Jetzt bereinigen
              </button>
            </div>
          </div>
        </div>

        {/* Audio Files Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🎵 Audio-Dateien ({unusedFiles.audio.length})</h2>
            {unusedFiles.audio.length > 0 && (
              <button
                onClick={() => deleteUnusedFiles(unusedFiles.audio)}
                disabled={deletingFiles}
                className={styles.dangerButton}
              >
                🗑️ Alle löschen
              </button>
            )}
          </div>

          {unusedFiles.audio.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎵</div>
              <h3 className={styles.emptyTitle}>Keine ungenutzten Audio-Dateien</h3>
            </div>
          ) : (
            <div className={styles.filesList}>
              {unusedFiles.audio.map(file => (
                <div key={file} className={styles.fileItem}>
                  <span className={styles.fileName}>{file}</span>
                  <button
                    onClick={() => deleteUnusedFiles([file])}
                    disabled={deletingFiles}
                    className={styles.fileDeleteBtn}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* JSON Files Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📄 JSON-Dateien ({unusedFiles.json.length})</h2>
            {unusedFiles.json.length > 0 && (
              <button
                onClick={() => deleteUnusedFiles(unusedFiles.json)}
                disabled={deletingFiles}
                className={styles.dangerButton}
              >
                🗑️ Alle löschen
              </button>
            )}
          </div>

          {unusedFiles.json.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📄</div>
              <h3 className={styles.emptyTitle}>Keine ungenutzten JSON-Dateien</h3>
            </div>
          ) : (
            <div className={styles.filesList}>
              {unusedFiles.json.map(file => (
                <div key={file} className={styles.fileItem}>
                  <span className={styles.fileName}>{file}</span>
                  <button
                    onClick={() => deleteUnusedFiles([file])}
                    disabled={deletingFiles}
                    className={styles.fileDeleteBtn}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </AdminDashboardLayout>
    </>
  );
}

export default function AdminFiles() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminFilesPage />
    </ProtectedPage>
  );
}
