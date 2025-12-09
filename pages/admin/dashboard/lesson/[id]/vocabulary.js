import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../../../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../../../../styles/adminDashboard.module.css';

function VocabularyManagementPage() {
  const router = useRouter();
  const { id: lessonId } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [vocabData, setVocabData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [lessonInfo, setLessonInfo] = useState(null);

  const loadVocabulary = useCallback(async () => {
    if (!lessonId) return;
    
    setLoading(true);
    try {
      // Load vocab file
      const vocabRes = await fetch(`/text/${lessonId}.vocab.json`);
      if (vocabRes.ok) {
        const data = await vocabRes.json();
        setVocabData(data);
      } else {
        setVocabData(null);
      }

      // Load lesson info
      const lessonRes = await fetch('/api/lessons');
      if (lessonRes.ok) {
        const lessonsData = await lessonRes.json();
        const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);
        const lesson = lessons.find(l => l.id === lessonId);
        setLessonInfo(lesson);
      }
    } catch (error) {
      console.error('Load vocabulary error:', error);
      toast.error('Lỗi khi tải từ vựng');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  const handleExtract = async () => {
    if (!lessonId) return;
    
    setExtracting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/extract-lesson-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          level: lessonInfo?.level || 'B1',
          targetLang: 'vi',
          save: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVocabData(data.data);
        toast.success(`Đã trích xuất ${data.data?.totalWords || 0} từ vựng!`);
      } else {
        const error = await res.json();
        toast.error('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Lỗi khi trích xuất từ vựng');
    } finally {
      setExtracting(false);
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...vocabData.vocabulary[index] });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    const newVocabulary = [...vocabData.vocabulary];
    newVocabulary[editingIndex] = editForm;

    const newVocabData = {
      ...vocabData,
      vocabulary: newVocabulary
    };

    await saveVocabData(newVocabData);
    setEditingIndex(null);
    setEditForm({});
  };

  const handleDelete = async (index) => {
    if (!confirm('Xóa từ này?')) return;

    const newVocabulary = vocabData.vocabulary.filter((_, i) => i !== index);
    const newVocabData = {
      ...vocabData,
      vocabulary: newVocabulary,
      totalWords: newVocabulary.length
    };

    await saveVocabData(newVocabData);
  };

  const handleAddNew = () => {
    setEditingIndex(-1); // -1 indicates new word
    setEditForm({
      word: '',
      baseForm: '',
      translation: '',
      partOfSpeech: 'Nomen',
      level: lessonInfo?.level || 'B1',
      note: '',
      sentences: []
    });
  };

  const handleSaveNew = async () => {
    if (!editForm.word || !editForm.translation) {
      toast.error('Từ và nghĩa là bắt buộc');
      return;
    }

    const newVocabulary = [...(vocabData?.vocabulary || []), editForm];
    const newVocabData = {
      ...vocabData,
      lessonId,
      vocabulary: newVocabulary,
      totalWords: newVocabulary.length
    };

    await saveVocabData(newVocabData);
    setEditingIndex(null);
    setEditForm({});
  };

  const saveVocabData = async (data) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/save-lesson-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          vocabData: data
        })
      });

      if (res.ok) {
        setVocabData(data);
        toast.success('Đã lưu!');
      } else {
        const error = await res.json();
        toast.error('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className={styles.loadingState}>Đang tải...</div>
      </AdminDashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Quản lý từ vựng - {lessonInfo?.title || lessonId}</title>
      </Head>

      <AdminDashboardLayout>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>📚 Quản lý từ vựng</h1>
            <p className={styles.pageSubtitle}>
              {lessonInfo?.title || lessonId} • {vocabData?.totalWords || 0} từ
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => router.push(`/admin/dashboard/lesson/${lessonId}`)}
              className={styles.secondaryButton}
            >
              ← Quay lại
            </button>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className={styles.actionButton}
              style={{ background: '#10b981' }}
            >
              {extracting ? '⏳ Đang trích xuất...' : '🔄 Trích xuất lại'}
            </button>
            <button
              onClick={handleAddNew}
              className={styles.submitButton}
            >
              ➕ Thêm từ
            </button>
          </div>
        </div>

        {/* Add new word form */}
        {editingIndex === -1 && (
          <div className={styles.formSection} style={{ marginBottom: '20px', background: '#f0fdf4', border: '1px solid #10b981' }}>
            <h3 style={{ marginBottom: '15px' }}>➕ Thêm từ mới</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <input
                type="text"
                placeholder="Từ *"
                value={editForm.word || ''}
                onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Dạng gốc"
                value={editForm.baseForm || ''}
                onChange={(e) => setEditForm({ ...editForm, baseForm: e.target.value })}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="Nghĩa *"
                value={editForm.translation || ''}
                onChange={(e) => setEditForm({ ...editForm, translation: e.target.value })}
                className={styles.input}
              />
              <select
                value={editForm.partOfSpeech || 'Nomen'}
                onChange={(e) => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                className={styles.select}
              >
                <option value="Nomen">Nomen</option>
                <option value="Verb">Verb</option>
                <option value="Adjektiv">Adjektiv</option>
                <option value="Adverb">Adverb</option>
                <option value="Präposition">Präposition</option>
                <option value="Konjunktion">Konjunktion</option>
                <option value="Phrase">Phrase</option>
              </select>
              <select
                value={editForm.level || 'B1'}
                onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                className={styles.select}
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
              <input
                type="text"
                placeholder="Ghi chú"
                value={editForm.note || ''}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                className={styles.input}
              />
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button onClick={handleSaveNew} disabled={saving} className={styles.submitButton}>
                {saving ? '⏳...' : '💾 Lưu'}
              </button>
              <button onClick={handleCancelEdit} className={styles.cancelButton}>
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Vocabulary list */}
        {!vocabData || vocabData.vocabulary?.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Chưa có từ vựng cho bài này</p>
            <button onClick={handleExtract} disabled={extracting} className={styles.submitButton}>
              {extracting ? '⏳ Đang trích xuất...' : '🔄 Trích xuất từ vựng'}
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Từ</th>
                  <th>Dạng gốc</th>
                  <th>Nghĩa</th>
                  <th>Loại từ</th>
                  <th>Level</th>
                  <th>Ghi chú</th>
                  <th style={{ width: '120px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vocabData.vocabulary.map((vocab, index) => (
                  <tr key={index}>
                    {editingIndex === index ? (
                      <>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={editForm.word || ''}
                            onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                            className={styles.input}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editForm.baseForm || ''}
                            onChange={(e) => setEditForm({ ...editForm, baseForm: e.target.value })}
                            className={styles.input}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editForm.translation || ''}
                            onChange={(e) => setEditForm({ ...editForm, translation: e.target.value })}
                            className={styles.input}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <select
                            value={editForm.partOfSpeech || ''}
                            onChange={(e) => setEditForm({ ...editForm, partOfSpeech: e.target.value })}
                            className={styles.select}
                          >
                            <option value="Nomen">Nomen</option>
                            <option value="Verb">Verb</option>
                            <option value="Adjektiv">Adjektiv</option>
                            <option value="Adverb">Adverb</option>
                            <option value="Präposition">Präposition</option>
                            <option value="Konjunktion">Konjunktion</option>
                            <option value="Phrase">Phrase</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={editForm.level || ''}
                            onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                            className={styles.select}
                          >
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="C1">C1</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editForm.note || ''}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            className={styles.input}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            style={{ marginRight: '5px', padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            💾
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{ padding: '4px 8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{index + 1}</td>
                        <td><strong>{vocab.word}</strong></td>
                        <td style={{ color: '#6b7280' }}>{vocab.baseForm}</td>
                        <td>{vocab.translation}</td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: vocab.partOfSpeech === 'Verb' ? '#dbeafe' :
                                       vocab.partOfSpeech === 'Nomen' ? '#fef3c7' :
                                       vocab.partOfSpeech === 'Adjektiv' ? '#d1fae5' : '#f3f4f6'
                          }}>
                            {vocab.partOfSpeech}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background: vocab.level === 'A1' ? '#dcfce7' :
                                       vocab.level === 'A2' ? '#fef9c3' :
                                       vocab.level === 'B1' ? '#fed7aa' :
                                       vocab.level === 'B2' ? '#fecaca' : '#e9d5ff'
                          }}>
                            {vocab.level}
                          </span>
                        </td>
                        <td style={{ color: '#6b7280', fontSize: '13px' }}>{vocab.note}</td>
                        <td>
                          <button
                            onClick={() => handleEdit(index)}
                            style={{ marginRight: '5px', padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            🗑️
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

        {/* Info */}
        {vocabData && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
            <p>📅 Trích xuất lúc: {new Date(vocabData.extractedAt).toLocaleString('vi-VN')}</p>
            <p>🌐 Ngôn ngữ: {vocabData.targetLang === 'vi' ? 'Tiếng Việt' : vocabData.targetLang}</p>
            <p>📊 Level bài: {vocabData.level}</p>
          </div>
        )}
      </AdminDashboardLayout>
    </>
  );
}

export default function VocabularyManagement() {
  return (
    <ProtectedPage requireAdmin={true}>
      <VocabularyManagementPage />
    </ProtectedPage>
  );
}
