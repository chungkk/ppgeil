import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../../styles/adminDashboard.module.css';

function CategoriesManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/vocabulary/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Fehler beim Laden der Kategorien');
      
      const data = await res.json();
      setCategories(data.categories || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Fehler beim Laden der Kategorien');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Kategoriename darf nicht leer sein');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/vocabulary/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: newCategory.trim() })
      });

      if (!res.ok) throw new Error('Fehler beim Hinzufügen');

      toast.success('Kategorie erfolgreich hinzugefügt!');
      setNewCategory('');
      await fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = (oldCategory) => {
    setEditingId(oldCategory);
    setEditForm(oldCategory);
  };

  const handleSaveEdit = async () => {
    if (!editForm.trim()) {
      toast.error('Kategoriename darf nicht leer sein');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/vocabulary/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldCategory: editingId,
          newCategory: editForm.trim()
        })
      });

      if (!res.ok) throw new Error('Fehler beim Aktualisieren');

      toast.success('Kategorie erfolgreich aktualisiert!');
      setEditingId(null);
      setEditForm('');
      await fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    const count = stats[category] || 0;
    if (count > 0) {
      if (!confirm(`Diese Kategorie hat ${count} Wörter. Alle Wörter werden auf "Allgemein" zurückgesetzt. Fortfahren?`)) {
        return;
      }
    } else {
      if (!confirm(`Kategorie "${category}" wirklich löschen?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/vocabulary/categories?category=${encodeURIComponent(category)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Fehler beim Löschen');

      toast.success('Kategorie erfolgreich gelöscht!');
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Vokabelkategorien verwalten - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        <div className={styles.breadcrumbHeader}>
          <nav className={styles.breadcrumb}>
            <Link href="/admin/dashboard" className={styles.breadcrumbLink}>Admin</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Vokabelkategorien</span>
          </nav>
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🏷️ Vokabelkategorien verwalten</h1>
            <p className={styles.pageSubtitle}>
              Organisieren Sie Vokabeln in Kategorien für bessere Übersicht
            </p>
          </div>
        </div>

        {/* Add New Category */}
        <div className={styles.formSection} style={{ marginBottom: '20px', background: '#f0fdf4', border: '1px solid #10b981' }}>
          <h3 style={{ marginBottom: '15px' }}>➕ Neue Kategorie hinzufügen</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="z.B. Essen & Trinken, Reisen, Arbeit..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              className={styles.input}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleAddCategory}
              disabled={saving || !newCategory.trim()}
              className={styles.submitButton}
            >
              {saving ? '⏳...' : '➕ Hinzufügen'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className={styles.loadingState}>Lädt...</div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏷️</div>
            <h3 className={styles.emptyTitle}>Keine Kategorien vorhanden</h3>
            <p className={styles.emptyText}>
              Fügen Sie oben eine neue Kategorie hinzu, um Vokabeln zu organisieren
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Kategoriename</th>
                  <th style={{ width: '120px' }}>Anzahl Wörter</th>
                  <th style={{ width: '150px' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category}>
                    {editingId === category ? (
                      <>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={editForm}
                            onChange={(e) => setEditForm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className={styles.input}
                            style={{ width: '100%' }}
                            autoFocus
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            background: '#e5e7eb',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            {stats[category] || 0}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            style={{
                              marginRight: '5px',
                              padding: '6px 12px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            💾 Speichern
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm('');
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Abbrechen
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{index + 1}</td>
                        <td>
                          <strong style={{ fontSize: '15px' }}>{category}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            background: stats[category] > 0 ? '#dbeafe' : '#e5e7eb',
                            color: stats[category] > 0 ? '#1e40af' : '#6b7280',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}>
                            {stats[category] || 0} Wörter
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleEditCategory(category)}
                            style={{
                              marginRight: '5px',
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Löschen
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <p>💡 <strong>Hinweis:</strong> Kategorien helfen Ihnen, Vokabeln thematisch zu organisieren.</p>
          <p>• Standard-Kategorie ist &quot;Allgemein&quot;</p>
          <p>• Beim Löschen einer Kategorie werden alle Wörter auf &quot;Allgemein&quot; zurückgesetzt</p>
          <p>• Kategorien können nachträglich bearbeitet werden</p>
        </div>
      </AdminDashboardLayout>
    </>
  );
}

export default function Categories() {
  return (
    <ProtectedPage requireAdmin={true}>
      <CategoriesManagement />
    </ProtectedPage>
  );
}
