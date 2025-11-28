import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { AdminPagesEditorSkeleton } from '../../../components/SkeletonLoader';
import { toast } from 'react-toastify';
import styles from '../../../styles/adminDashboard.module.css';

function AdminPagesManagement() {
  const router = useRouter();
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    metaDescription: '',
    isPublished: true
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/page-content', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) throw new Error('Fehler beim Laden der Seiten');
      
      const data = await res.json();
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Fehler beim Laden der Seiten');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setFormData({
      title: page.title || '',
      content: page.content || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished !== false
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!selectedPage) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/page-content/${selectedPage.pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');

      toast.success('Seiteninhalt erfolgreich aktualisiert!');
      await fetchPages();
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewPage = () => {
    if (!selectedPage) return;
    window.open(`/${selectedPage.pageId}`, '_blank');
  };

  const getPageIcon = (pageId) => {
    const icons = {
      privacy: '🔒',
      about: 'ℹ️',
      terms: '📜',
      contact: '📧'
    };
    return icons[pageId] || '📄';
  };

  const getPageLabel = (pageId) => {
    const labels = {
      privacy: 'Datenschutzerklärung',
      about: 'Über uns',
      terms: 'Nutzungsbedingungen',
      contact: 'Kontakt'
    };
    return labels[pageId] || pageId;
  };

  return (
    <>
      <Head>
        <title>Seiteninhalte verwalten - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        {/* Breadcrumb Header */}
        <div className={styles.breadcrumbHeader}>
          <nav className={styles.breadcrumb}>
            <Link href="/admin/dashboard" className={styles.breadcrumbLink}>Admin</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Seiteninhalte</span>
          </nav>
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>📄 Seiteninhalte verwalten</h1>
            <p className={styles.pageSubtitle}>
              Bearbeiten Sie die Inhalte für Privacy, About, Terms und Contact Seiten
            </p>
          </div>
        </div>

        {loading ? (
          <AdminPagesEditorSkeleton />
        ) : (
          <div className={styles.pagesEditorLayout}>
            {/* Pages List Sidebar */}
            <div className={styles.pagesList}>
              <h3 className={styles.sectionTitle}>Verfügbare Seiten</h3>
              {pages.map((page) => (
                <div
                  key={page.pageId}
                  className={`${styles.pageItem} ${selectedPage?.pageId === page.pageId ? styles.pageItemActive : ''}`}
                  onClick={() => handleSelectPage(page)}
                >
                  <div className={styles.pageItemIcon}>{getPageIcon(page.pageId)}</div>
                  <div className={styles.pageItemContent}>
                    <div className={styles.pageItemTitle}>
                      {getPageLabel(page.pageId)}
                    </div>
                    <div className={styles.pageItemStatus}>
                      {page.isPublished ? (
                        <span className={styles.statusPublished}>✓ Veröffentlicht</span>
                      ) : (
                        <span className={styles.statusDraft}>Entwurf</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Editor Panel */}
            <div className={styles.editorPanel}>
              {selectedPage ? (
                <>
                  <div className={styles.editorHeader}>
                    <h2 className={styles.editorTitle}>
                      {getPageIcon(selectedPage.pageId)} {getPageLabel(selectedPage.pageId)}
                    </h2>
                    <div className={styles.editorActions}>
                      <button
                        onClick={handleViewPage}
                        className={styles.secondaryButton}
                      >
                        👁️ Vorschau
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={styles.primaryButton}
                      >
                        {saving ? 'Speichern...' : '💾 Speichern'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Seitentitel</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="z.B. Datenschutzerklärung"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Meta-Beschreibung (SEO)</label>
                    <input
                      type="text"
                      name="metaDescription"
                      value={formData.metaDescription}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Kurze Beschreibung für Suchmaschinen"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Seiteninhalt (Markdown-Format)
                      <span className={styles.labelHint}>
                        Verwenden Sie # für Überschriften, ## für Unterüberschriften, - für Listen
                      </span>
                    </label>
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      className={styles.textarea}
                      rows={20}
                      placeholder="# Überschrift&#10;&#10;Ihr Inhalt hier..."
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="isPublished"
                        checked={formData.isPublished}
                        onChange={handleInputChange}
                      />
                      <span>Seite veröffentlichen</span>
                    </label>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className={styles.primaryButton}
                    >
                      {saving ? 'Speichern...' : '💾 Änderungen speichern'}
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📄</div>
                  <h3 className={styles.emptyTitle}>Keine Seite ausgewählt</h3>
                  <p className={styles.emptyText}>
                    Wählen Sie eine Seite aus der Liste links aus, um den Inhalt zu bearbeiten
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDashboardLayout>
    </>
  );
}

export default function AdminPages() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminPagesManagement />
    </ProtectedPage>
  );
}
