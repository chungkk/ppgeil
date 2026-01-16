import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { AdminDashboardPageSkeleton } from '../../../components/SkeletonLoader';
import LessonFilters from '../../../components/admin/LessonFilters';
import { toast } from 'react-toastify';
import { broadcastLessonUpdate, invalidateLessonsCache } from '../../../lib/hooks/useLessons';
import styles from '../../../styles/adminDashboard.module.css';


function AdminLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    levels: [],
    categories: [],
    sources: [],
    sortBy: 'newest'
  });
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLessons();
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/lessons?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        }
      });
      const responseData = await res.json();
      const data = Array.isArray(responseData)
        ? responseData.filter(l => l && l._id)
        : (responseData.lessons || []).filter(l => l && l._id);
      setLessons(data);
      setSelectedLessons(new Set());
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Không thể tải danh sách bài học');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/article-categories?activeOnly=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleEdit = (lesson) => {
    // Use custom id field if available, otherwise use MongoDB _id
    const lessonId = lesson.id || lesson._id;
    router.push(`/admin/dashboard/lesson/${lessonId}`);
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

      // Invalidate all SWR cache for lessons
      invalidateLessonsCache();

      // Broadcast update to all open tabs
      broadcastLessonUpdate();

      fetchLessons();
    } catch (error) {
      toast.error('Fehler: ' + error.message);
    }
  };

  const handleToggleFreeLesson = async (lesson) => {
    const newValue = !lesson.isFreeLesson;
    const confirmMsg = newValue
      ? `Đặt "${lesson.title}" làm bài FREE? (Bài Free cũ sẽ bị bỏ)`
      : `Bỏ bài FREE cho "${lesson.title}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/lessons/${lesson.id}/set-free`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isFreeLesson: newValue })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Không thể cập nhật');
      }

      toast.success(newValue ? 'Đã đặt làm bài FREE!' : 'Đã bỏ bài FREE!');

      // Invalidate cache and refetch
      invalidateLessonsCache();
      broadcastLessonUpdate();
      fetchLessons();
    } catch (error) {
      toast.error('Lỗi: ' + error.message);
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

      // Invalidate all SWR cache for lessons
      invalidateLessonsCache();

      // Broadcast update to all open tabs
      broadcastLessonUpdate();

      setSelectedLessons(new Set());
      fetchLessons();
    } catch (error) {
      toast.error('Fehler: ' + error.message);
    }
  };

  // Determine source of lesson
  const getLessonSource = (lesson) => {
    if (lesson.youtubeUrl) return 'youtube';
    if (lesson.audio && lesson.audio.startsWith('http')) return 'url';
    if (lesson.audio && lesson.audio !== 'youtube') return 'file';
    return 'youtube'; // default
  };

  // Filter and sort logic
  const getFilteredAndSortedLessons = () => {
    let result = [...lessons];

    // Apply text search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(lesson =>
        lesson.id?.toLowerCase().includes(search) ||
        lesson.title?.toLowerCase().includes(search) ||
        lesson.displayTitle?.toLowerCase().includes(search) ||
        lesson.description?.toLowerCase().includes(search) ||
        lesson.level?.toLowerCase().includes(search)
      );
    }

    // Apply level filter
    if (filters.levels.length > 0) {
      result = result.filter(lesson =>
        filters.levels.includes(lesson.level)
      );
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      result = result.filter(lesson => {
        const categoryId = lesson.category?._id || lesson.category;
        return filters.categories.includes(categoryId);
      });
    }

    // Apply source filter
    if (filters.sources.length > 0) {
      result = result.filter(lesson =>
        filters.sources.includes(getLessonSource(lesson))
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'title-asc':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'level-asc':
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        result.sort((a, b) => {
          const aIndex = levelOrder.indexOf(a.level || 'A1');
          const bIndex = levelOrder.indexOf(b.level || 'A1');
          return aIndex - bIndex;
        });
        break;
      case 'level-desc':
        const levelOrderDesc = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        result.sort((a, b) => {
          const aIndex = levelOrderDesc.indexOf(a.level || 'A1');
          const bIndex = levelOrderDesc.indexOf(b.level || 'A1');
          return bIndex - aIndex;
        });
        break;
      case 'category':
        // Sắp xếp theo tên category (alphabetically), sau đó theo title
        result.sort((a, b) => {
          const aCatName = a.category?.name || '';
          const bCatName = b.category?.name || '';
          const catCompare = aCatName.localeCompare(bCatName);
          if (catCompare !== 0) return catCompare;
          return (a.title || '').localeCompare(b.title || '');
        });
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  };

  const filteredLessons = getFilteredAndSortedLessons();
  const totalPages = Math.ceil(filteredLessons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLessons = filteredLessons.slice(startIndex, startIndex + itemsPerPage);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

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

        {/* Quick Links */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/admin/dashboard/article-categories"
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🏷️ Quản lý danh mục bài viết
          </Link>
          <Link
            href="/admin/dashboard/pages"
            style={{
              padding: '8px 16px',
              background: '#8b5cf6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📄 Quản lý trang
          </Link>
          <Link
            href="/admin/dashboard/files"
            style={{
              padding: '8px 16px',
              background: '#f59e0b',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📁 File Manager
          </Link>
          <Link
            href="/admin/settings"
            style={{
              padding: '8px 16px',
              background: '#64748b',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚙️ Cài đặt
          </Link>
        </div>

        {/* Lesson Filters */}
        <LessonFilters
          onFilterChange={handleFilterChange}
          categories={categories}
          totalCount={lessons.length}
          filteredCount={filteredLessons.length}
        />

        {/* Search & Actions */}
        <div className={styles.actions}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo ID, tiêu đề, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {selectedLessons.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className={styles.dangerButton}
            >
              🗑️ Xóa {selectedLessons.size} bài
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
                    <th>KP</th>
                    <th>FREE</th>
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
                        {lesson.karaokePro && (
                          <span
                            title="Karaoke Pro"
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}
                          >
                            ⭐ PRO
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleFreeLesson(lesson)}
                          title={lesson.isFreeLesson ? 'Bỏ bài FREE' : 'Đặt làm bài FREE'}
                          style={{
                            background: lesson.isFreeLesson ? '#10b981' : '#e5e7eb',
                            color: lesson.isFreeLesson ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {lesson.isFreeLesson ? '✓ FREE' : 'Set FREE'}
                        </button>
                      </td>
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
