import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { AdminDashboardPageSkeleton } from '../../../components/SkeletonLoader';
import { toast } from 'react-toastify';
import { mutate } from 'swr';
import { broadcastLessonUpdate } from '../../../lib/hooks/useLessons';
import styles from '../../../styles/adminDashboard.module.css';


function AdminLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLessons();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lessons?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const responseData = await res.json();
      const data = Array.isArray(responseData)
        ? responseData.filter(l => l && l._id)
        : (responseData.lessons || []).filter(l => l && l._id);
      setLessons(data);
      setSelectedLessons(new Set());
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Kann Lektionsliste nicht laden');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lesson) => {
    router.push(`/admin/dashboard/lesson/${lesson.id}`);
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Lektion löschen möchten?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Lektion konnte nicht gelöscht werden');
      toast.success('Erfolgreich gelöscht!');
      
      // Invalidate all SWR cache for lessons to update homepage
      mutate(key => typeof key === 'string' && key.startsWith('/api/lessons'), undefined, { revalidate: true });
      
      // Broadcast update to all open tabs
      broadcastLessonUpdate();
      
      fetchLessons();
    } catch (error) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedLessons.size === paginatedLessons.length) {
      const newSelected = new Set(selectedLessons);
      paginatedLessons.forEach(lesson => newSelected.delete(lesson._id));
      setSelectedLessons(newSelected);
    } else {
      const newSelected = new Set(selectedLessons);
      paginatedLessons.forEach(lesson => newSelected.add(lesson._id));
      setSelectedLessons(newSelected);
    }
  };

  const handleSelectLesson = (lessonId) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLessons.size === 0) {
      toast.error('Bitte wählen Sie mindestens eine Lektion aus');
      return;
    }

    if (!confirm(`Sind Sie sicher, dass Sie ${selectedLessons.size} Lektion(en) löschen möchten?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/lessons', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: Array.from(selectedLessons) })
      });

      if (!res.ok) throw new Error('Lektionen konnten nicht gelöscht werden');
      toast.success(`${selectedLessons.size} Lektion(en) erfolgreich gelöscht!`);
      
      // Invalidate all SWR cache for lessons to update homepage
      mutate(key => typeof key === 'string' && key.startsWith('/api/lessons'), undefined, { revalidate: true });
      
      // Broadcast update to all open tabs
      broadcastLessonUpdate();
      
      setSelectedLessons(new Set());
      fetchLessons();
    } catch (error) {
      toast.error('Fehler: ' + error.message);
    }
  };

  // Filter and pagination
  const filteredLessons = lessons.filter(lesson =>
    lesson.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.level && lesson.level.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredLessons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLessons = filteredLessons.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Head>
        <title>Lektionen verwalten - Admin Dashboard</title>
      </Head>

       <AdminDashboardLayout>
         {/* Breadcrumb Header */}
         <div className={styles.breadcrumbHeader}>
           <nav className={styles.breadcrumb}>
             <Link href="/admin/dashboard" className={styles.breadcrumbLink}>Admin</Link>
             <span className={styles.breadcrumbSeparator}>›</span>
             <span className={styles.breadcrumbCurrent}>Dashboard</span>
           </nav>
         </div>

         <div className={styles.pageHeader}>
           <div>
             <h1 className={styles.pageTitle}>📚 Lektionen verwalten</h1>
           </div>
           <button
             onClick={() => router.push('/admin/dashboard/lesson/new')}
             className={styles.primaryButton}
           >
             + Neu
           </button>
         </div>

        {/* Stats - Inline compact */}
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{lessons.length}</div>
              <div className={styles.statLabel}>Gesamt</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📄</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{filteredLessons.length}</div>
              <div className={styles.statLabel}>Gefiltert</div>
            </div>
          </div>
          {selectedLessons.size > 0 && (
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✓</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{selectedLessons.size}</div>
                <div className={styles.statLabel}>Ausgewählt</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <input
            type="text"
            placeholder="🔍 Nach ID, Titel, Beschreibung oder Niveau suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {selectedLessons.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className={styles.dangerButton}
            >
              🗑️ {selectedLessons.size} löschen
            </button>
          )}
        </div>

        {/* Lessons Table */}
        {loading ? (
          <AdminDashboardPageSkeleton />
        ) : filteredLessons.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <h3 className={styles.emptyTitle}>
              {searchTerm ? 'Keine passenden Lektionen gefunden' : 'Noch keine Lektionen vorhanden'}
            </h3>
            <p className={styles.emptyText}>
              {searchTerm ? 'Versuchen Sie es mit einem anderen Suchbegriff' : 'Fügen Sie Ihre erste Lektion hinzu!'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}>
                      <input
                        type="checkbox"
                        checked={paginatedLessons.length > 0 && paginatedLessons.every(lesson => selectedLessons.has(lesson._id))}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Tiêu đề</th>
                    <th>Niveau</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLessons.map((lesson) => (
                    <tr key={lesson._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLessons.has(lesson._id)}
                          onChange={() => handleSelectLesson(lesson._id)}
                        />
                      </td>
                      <td className={styles.lessonTitle}>{lesson.title}</td>
                      <td><span className={styles.levelBadge}>{lesson.level || 'A1'}</span></td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleEdit(lesson)}
                            className={styles.editButton}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(lesson._id)}
                            className={styles.deleteButton}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageButton}
                >
                  ‹ Vorherige
                </button>
                <span className={styles.pageInfo}>
                  Seite {currentPage} von {totalPages} ({filteredLessons.length} Lektionen)
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageButton}
                >
                  Nächste ›
                </button>
              </div>
            )}
          </>
        )}
      </AdminDashboardLayout>
    </>
  );
}

export default function AdminLessons() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminLessonsPage />
    </ProtectedPage>
  );
}
