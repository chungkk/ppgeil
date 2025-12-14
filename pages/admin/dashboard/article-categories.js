import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ProtectedPage from '../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../../styles/adminDashboard.module.css';

/**
 * Article Categories Management Page
 * 
 * Features:
 * - List all article categories with article counts
 * - Create new categories
 * - Edit category names and descriptions
 * - Delete categories (with article reassignment)
 * - Toggle active/inactive status
 * - System category protection (cannot delete "Chưa phân loại")
 */
function ArticleCategoriesManagement() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', isActive: true });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  // ===================================================================
  // Fetch Categories
  // ===================================================================

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/article-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) {
        throw new Error('Lỗi khi tải danh sách danh mục');
      }
      
      const data = await res.json();
      setCategories(data.categories || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Lỗi khi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  // ===================================================================
  // Create New Category
  // ===================================================================

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/article-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi thêm danh mục');
      }

      toast.success('Danh mục đã được tạo thành công!');
      setNewCategory({ name: '', description: '' });
      await fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ===================================================================
  // Edit Category
  // ===================================================================

  const handleEditCategory = (category) => {
    setEditingId(category._id);
    setEditForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', description: '', isActive: true });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/article-categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingId,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          isActive: editForm.isActive
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi cập nhật danh mục');
      }

      toast.success('Danh mục đã được cập nhật!');
      setEditingId(null);
      setEditForm({ name: '', description: '', isActive: true });
      await fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ===================================================================
  // Delete Category
  // ===================================================================

  const handleDeleteCategory = async (category) => {
    // System category protection
    if (category.isSystem) {
      toast.error('Không thể xóa danh mục hệ thống "Chưa phân loại"');
      return;
    }

    const count = category.articleCount || stats[category.slug] || 0;
    
    let confirmMessage;
    if (count > 0) {
      confirmMessage = `Danh mục "${category.name}" có ${count} bài viết.\n\nTất cả bài viết sẽ được chuyển sang danh mục "Chưa phân loại".\n\nBạn có chắc chắn muốn xóa?`;
    } else {
      confirmMessage = `Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/article-categories?id=${category._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi xóa danh mục');
      }

      toast.success(data.message || 'Danh mục đã được xóa!');
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ===================================================================
  // Toggle Active Status
  // ===================================================================

  const handleToggleActive = async (category) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/article-categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: category._id,
          isActive: !category.isActive
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi cập nhật trạng thái');
      }

      toast.success(`Danh mục đã được ${!category.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`);
      await fetchCategories();
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <>
      <Head>
        <title>Quản lý danh mục bài viết - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        <div className={styles.breadcrumbHeader}>
          <nav className={styles.breadcrumb}>
            <Link href="/admin/dashboard" className={styles.breadcrumbLink}>
              Admin
            </Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Danh mục bài viết</span>
          </nav>
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🏷️ Quản lý danh mục bài viết</h1>
            <p className={styles.pageSubtitle}>
              Tạo và quản lý danh mục để phân loại bài học
            </p>
          </div>
        </div>

        {/* Add New Category */}
        <div
          className={styles.formSection}
          style={{ marginBottom: '20px', background: '#f0fdf4', border: '1px solid #10b981' }}
        >
          <h3 style={{ marginBottom: '15px' }}>➕ Thêm danh mục mới</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Tên danh mục (VD: Ngữ pháp, Từ vựng, Luyện nghe...)"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              className={styles.input}
              disabled={saving}
            />
            <input
              type="text"
              placeholder="Mô tả (không bắt buộc)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              className={styles.input}
              disabled={saving}
            />
            <button
              onClick={handleAddCategory}
              disabled={saving || !newCategory.name.trim()}
              className={styles.submitButton}
            >
              {saving ? '⏳ Đang thêm...' : '➕ Thêm danh mục'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className={styles.loadingState}>Đang tải...</div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏷️</div>
            <h3 className={styles.emptyTitle}>Chưa có danh mục nào</h3>
            <p className={styles.emptyText}>
              Thêm danh mục đầu tiên để bắt đầu phân loại bài học
            </p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th style={{ width: '80px' }}>Slug</th>
                  <th style={{ width: '100px' }}>Số bài viết</th>
                  <th style={{ width: '80px' }}>Trạng thái</th>
                  <th style={{ width: '200px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category._id}>
                    {editingId === category._id ? (
                      // Edit Mode
                      <>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className={styles.input}
                            style={{ width: '100%' }}
                            autoFocus
                            disabled={saving}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className={styles.input}
                            style={{ width: '100%' }}
                            disabled={saving}
                          />
                        </td>
                        <td>
                          <code style={{ fontSize: '12px' }}>{category.slug}</code>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              background: '#e5e7eb',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            {category.articleCount || 0}
                          </span>
                        </td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              disabled={saving}
                            />
                            <span style={{ fontSize: '12px' }}>
                              {editForm.isActive ? 'Hoạt động' : 'Ẩn'}
                            </span>
                          </label>
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
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.6 : 1
                            }}
                          >
                            💾 Lưu
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            style={{
                              padding: '6px 12px',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.6 : 1
                            }}
                          >
                            ✖ Hủy
                          </button>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '15px' }}>{category.name}</strong>
                            {category.isSystem && (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}
                              >
                                HỆ THỐNG
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#6b7280' }}>
                          {category.description || <em>Không có mô tả</em>}
                        </td>
                        <td>
                          <code style={{ fontSize: '11px', color: '#059669' }}>
                            {category.slug}
                          </code>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              background: (category.articleCount || 0) > 0 ? '#dbeafe' : '#e5e7eb',
                              color: (category.articleCount || 0) > 0 ? '#1e40af' : '#6b7280',
                              fontSize: '13px',
                              fontWeight: '500'
                            }}
                          >
                            {category.articleCount || 0}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleToggleActive(category)}
                            disabled={saving}
                            style={{
                              padding: '4px 10px',
                              background: category.isActive ? '#10b981' : '#9ca3af',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.6 : 1
                            }}
                          >
                            {category.isActive ? '✓ Hiện' : '○ Ẩn'}
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => handleEditCategory(category)}
                            disabled={saving}
                            style={{
                              marginRight: '5px',
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.6 : 1
                            }}
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            disabled={saving || category.isSystem}
                            style={{
                              padding: '6px 12px',
                              background: category.isSystem ? '#d1d5db' : '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving || category.isSystem ? 'not-allowed' : 'pointer',
                              opacity: saving || category.isSystem ? 0.6 : 1
                            }}
                            title={category.isSystem ? 'Không thể xóa danh mục hệ thống' : 'Xóa danh mục'}
                          >
                            🗑️ Xóa
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

        {/* Info Box */}
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#6b7280'
          }}
        >
          <p>
            <strong>💡 Hướng dẫn:</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Danh mục giúp phân loại bài học theo chủ đề (Ngữ pháp, Từ vựng, Luyện nghe...)</li>
            <li>
              Danh mục <strong>&quot;Chưa phân loại&quot;</strong> là danh mục mặc định và không thể xóa
            </li>
            <li>Khi xóa danh mục, tất cả bài học trong đó sẽ được chuyển sang &quot;Chưa phân loại&quot;</li>
            <li>Danh mục &quot;Ẩn&quot; sẽ không hiển thị cho người dùng nhưng vẫn giữ nguyên các bài học</li>
            <li>Slug được tạo tự động từ tên danh mục (hỗ trợ tiếng Việt)</li>
          </ul>
        </div>
      </AdminDashboardLayout>
    </>
  );
}

export default function ArticleCategories() {
  return (
    <ProtectedPage requireAdmin={true}>
      <ArticleCategoriesManagement />
    </ProtectedPage>
  );
}
