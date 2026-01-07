import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import UserProfileSidebar from '../../components/UserProfileSidebar';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';
import styles from '../../styles/vocabulary.module.css';

// Vocabulary status constants
const VOCAB_STATUS = {
    NEW: 'new',
    LEARNING: 'learning',
    MASTERED: 'mastered',
};

function VocabularyPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user, userPoints } = useAuth();

    // State
    const [vocabulary, setVocabulary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [flashcardIndex, setFlashcardIndex] = useState(0);
    const [flashcardFlipped, setFlashcardFlipped] = useState(false);
    const [newWord, setNewWord] = useState({
        word: '',
        translation: '',
        example: '',
        notes: '',
    });
    const [lookupResult, setLookupResult] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Load vocabulary from API
    const loadVocabulary = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/vocabulary');
            if (response.ok) {
                const data = await response.json();
                setVocabulary(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to load vocabulary:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadVocabulary();
        }
    }, [user, loadVocabulary]);

    // Lookup word using dictionary API
    const handleLookupWord = async (word) => {
        if (!word.trim()) return;

        setLookupLoading(true);
        try {
            const response = await fetch('/api/dictionary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word.trim(), targetLang: user?.nativeLanguage || 'vi' }),
            });

            if (response.ok) {
                const data = await response.json();
                setLookupResult(data);
                // Auto-fill translation if available
                if (data.translations && data.translations.length > 0) {
                    setNewWord(prev => ({
                        ...prev,
                        translation: data.translations[0],
                        word: word.trim(),
                    }));
                }
                if (data.examples && data.examples.length > 0) {
                    setNewWord(prev => ({
                        ...prev,
                        example: data.examples[0],
                    }));
                }
            }
        } catch (error) {
            console.error('Dictionary lookup failed:', error);
        } finally {
            setLookupLoading(false);
        }
    };

    // Add new word
    const handleAddWord = useCallback(async () => {
        if (!newWord.word.trim()) return;

        try {
            const response = await fetchWithAuth('/api/vocabulary', {
                method: 'POST',
                body: JSON.stringify({
                    word: newWord.word.trim(),
                    translation: newWord.translation.trim(),
                    example: newWord.example.trim(),
                    notes: newWord.notes.trim(),
                    status: VOCAB_STATUS.NEW,
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.vocabulary) {
                    setVocabulary(prev => [data.vocabulary, ...prev]);
                }
                // Reset form
                setNewWord({ word: '', translation: '', example: '', notes: '' });
                setLookupResult(null);
                setShowAddModal(false);
            } else {
                const error = await response.json();
                alert(error.message || 'Không thể lưu từ vựng');
            }
        } catch (error) {
            console.error('Failed to add word:', error);
            alert('Có lỗi xảy ra');
        }
    }, [newWord]);

    // Update word status
    const updateWordStatus = useCallback(async (wordId, newStatus) => {
        const vocab = vocabulary.find(v => v.id === wordId);
        if (!vocab) return;

        try {
            const response = await fetchWithAuth('/api/vocabulary', {
                method: 'PUT',
                body: JSON.stringify({
                    id: wordId,
                    status: newStatus,
                    reviewCount: vocab.reviewCount + 1
                })
            });

            if (response.ok) {
                setVocabulary(prev => prev.map(v =>
                    v.id === wordId
                        ? { ...v, status: newStatus, lastReviewAt: new Date().toISOString(), reviewCount: v.reviewCount + 1 }
                        : v
                ));
            }
        } catch (error) {
            console.error('Failed to update word status:', error);
        }
    }, [vocabulary]);

    // Delete word
    const deleteWord = useCallback(async (wordId) => {
        try {
            const response = await fetchWithAuth(`/api/vocabulary?id=${wordId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setVocabulary(prev => prev.filter(v => v.id !== wordId));
            }
        } catch (error) {
            console.error('Failed to delete word:', error);
        }
    }, []);

    // Filter vocabulary based on tab and search
    const filteredVocabulary = useMemo(() => {
        let filtered = vocabulary;

        // Filter by tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(v => v.status === activeTab);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(v =>
                v.word.toLowerCase().includes(query) ||
                v.translation.toLowerCase().includes(query) ||
                (v.example && v.example.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [vocabulary, activeTab, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredVocabulary.length / ITEMS_PER_PAGE);
    const paginatedVocabulary = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredVocabulary.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredVocabulary, currentPage]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    // Flashcard vocabulary (only new and learning words)
    const flashcardVocabulary = useMemo(() => {
        return vocabulary.filter(v => v.status !== VOCAB_STATUS.MASTERED);
    }, [vocabulary]);

    // Stats
    const stats = useMemo(() => ({
        total: vocabulary.length,
        new: vocabulary.filter(v => v.status === VOCAB_STATUS.NEW).length,
        learning: vocabulary.filter(v => v.status === VOCAB_STATUS.LEARNING).length,
        mastered: vocabulary.filter(v => v.status === VOCAB_STATUS.MASTERED).length,
    }), [vocabulary]);

    // Flashcard handlers
    const nextFlashcard = () => {
        setFlashcardFlipped(false);
        setFlashcardIndex(prev => (prev + 1) % flashcardVocabulary.length);
    };

    const prevFlashcard = () => {
        setFlashcardFlipped(false);
        setFlashcardIndex(prev => (prev - 1 + flashcardVocabulary.length) % flashcardVocabulary.length);
    };

    const handleFlashcardAction = (action) => {
        const currentWord = flashcardVocabulary[flashcardIndex];
        if (!currentWord) return;

        if (action === 'know') {
            updateWordStatus(currentWord.id,
                currentWord.status === VOCAB_STATUS.NEW ? VOCAB_STATUS.LEARNING : VOCAB_STATUS.MASTERED
            );
        }
        nextFlashcard();
    };

    // Structured data
    const breadcrumbData = generateBreadcrumbStructuredData([
        { name: 'Home', url: '/' },
        { name: 'Profile', url: '/profile' },
        { name: 'Vocabulary', url: '/profile/vocabulary' },
    ]);

    return (
        <>
            <SEO
                title="Từ Vựng Của Tôi | PapaGeil - Deutsch Lernen"
                description="Quản lý và học từ vựng tiếng Đức của bạn với flashcards và spaced repetition."
                keywords="German vocabulary, Deutsch Wortschatz, vocabulary learning, flashcards"
                canonicalUrl="/profile/vocabulary"
                locale="de_DE"
                structuredData={breadcrumbData}
                noindex={true}
            />

            <div className={styles.vocabularyPage}>
                <div className={styles.vocabularyContainer}>
                    <div className={styles.vocabularyGrid}>
                        {/* Left Sidebar */}
                        <UserProfileSidebar
                            stats={{
                                totalLessons: stats.total,
                                completedLessons: stats.mastered,
                                inProgressLessons: stats.learning,
                            }}
                            userPoints={userPoints}
                        />

                        {/* Main Content */}
                        <div className={styles.mainContent}>
                            {/* Header */}
                            <div className={styles.pageHeader}>
                                <div className={styles.headerLeft}>
                                    <h1 className={styles.pageTitle}>
                                        <span className={styles.titleIcon}>📚</span>
                                        Từ Vựng Của Tôi
                                    </h1>
                                    <p className={styles.pageSubtitle}>
                                        Lưu trữ và ôn tập từ vựng tiếng Đức của bạn
                                    </p>
                                </div>
                                <div className={styles.headerActions}>
                                    {flashcardVocabulary.length > 0 && (
                                        <button
                                            className={styles.flashcardBtn}
                                            onClick={() => {
                                                setFlashcardIndex(0);
                                                setFlashcardFlipped(false);
                                                setShowFlashcards(true);
                                            }}
                                        >
                                            <span>🎴</span> Flashcards ({flashcardVocabulary.length})
                                        </button>
                                    )}
                                    <button
                                        className={styles.addWordBtn}
                                        onClick={() => setShowAddModal(true)}
                                    >
                                        <span>+</span> Thêm từ mới
                                    </button>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className={styles.statsGrid}>
                                <div className={`${styles.statCard} ${styles.statTotal}`}>
                                    <div className={styles.statIcon}>📖</div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statValue}>{stats.total}</div>
                                        <div className={styles.statLabel}>Tổng từ vựng</div>
                                    </div>
                                </div>
                                <div className={`${styles.statCard} ${styles.statNew}`}>
                                    <div className={styles.statIcon}>🆕</div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statValue}>{stats.new}</div>
                                        <div className={styles.statLabel}>Từ mới</div>
                                    </div>
                                </div>
                                <div className={`${styles.statCard} ${styles.statLearning}`}>
                                    <div className={styles.statIcon}>📝</div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statValue}>{stats.learning}</div>
                                        <div className={styles.statLabel}>Đang học</div>
                                    </div>
                                </div>
                                <div className={`${styles.statCard} ${styles.statMastered}`}>
                                    <div className={styles.statIcon}>✅</div>
                                    <div className={styles.statInfo}>
                                        <div className={styles.statValue}>{stats.mastered}</div>
                                        <div className={styles.statLabel}>Đã thuộc</div>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Filter */}
                            <div className={styles.filterSection}>
                                <div className={styles.searchBox}>
                                    <span className={styles.searchIcon}>🔍</span>
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm từ vựng..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                    {searchQuery && (
                                        <button
                                            className={styles.clearSearch}
                                            onClick={() => setSearchQuery('')}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className={styles.tabsContainer}>
                                    {[
                                        { key: 'all', label: 'Tất cả', count: stats.total },
                                        { key: VOCAB_STATUS.NEW, label: 'Mới', count: stats.new },
                                        { key: VOCAB_STATUS.LEARNING, label: 'Đang học', count: stats.learning },
                                        { key: VOCAB_STATUS.MASTERED, label: 'Đã thuộc', count: stats.mastered },
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
                                            onClick={() => setActiveTab(tab.key)}
                                        >
                                            {tab.label}
                                            <span className={styles.tabCount}>{tab.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vocabulary List */}
                            <div className={styles.vocabularyList}>
                                {loading ? (
                                    <div className={styles.loadingState}>
                                        <div className={styles.loadingSpinner}></div>
                                        <p>Đang tải từ vựng...</p>
                                    </div>
                                ) : filteredVocabulary.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>📚</div>
                                        <h3 className={styles.emptyTitle}>
                                            {searchQuery ? 'Không tìm thấy từ vựng' : 'Chưa có từ vựng nào'}
                                        </h3>
                                        <p className={styles.emptyText}>
                                            {searchQuery
                                                ? 'Thử tìm kiếm với từ khóa khác'
                                                : 'Bắt đầu thêm từ vựng mới để xây dựng kho từ của bạn!'
                                            }
                                        </p>
                                        {!searchQuery && (
                                            <button
                                                className={styles.addFirstWordBtn}
                                                onClick={() => setShowAddModal(true)}
                                            >
                                                <span>+</span> Thêm từ đầu tiên
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.wordList}>
                                            {paginatedVocabulary.map(vocab => (
                                                <div key={vocab.id} className={`${styles.wordRow} ${styles[vocab.status]}`}>
                                                    <div className={styles.wordInfo}>
                                                        <div className={styles.wordText}>{vocab.word}</div>
                                                        <div className={styles.wordTranslation}>{vocab.translation}</div>
                                                    </div>
                                                    <span className={`${styles.statusBadge} ${styles[vocab.status]}`}>
                                                        {vocab.status === VOCAB_STATUS.NEW && '🆕'}
                                                        {vocab.status === VOCAB_STATUS.LEARNING && '📝'}
                                                        {vocab.status === VOCAB_STATUS.MASTERED && '✅'}
                                                    </span>
                                                    <div className={styles.wordActions}>
                                                        {vocab.status !== VOCAB_STATUS.MASTERED ? (
                                                            <button
                                                                className={styles.actionBtn}
                                                                onClick={() => updateWordStatus(vocab.id,
                                                                    vocab.status === VOCAB_STATUS.NEW ? VOCAB_STATUS.LEARNING : VOCAB_STATUS.MASTERED
                                                                )}
                                                                title={vocab.status === VOCAB_STATUS.NEW ? 'Đang học' : 'Đã thuộc'}
                                                            >
                                                                {vocab.status === VOCAB_STATUS.NEW ? '📝' : '✅'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={styles.actionBtn}
                                                                onClick={() => updateWordStatus(vocab.id, VOCAB_STATUS.LEARNING)}
                                                                title="Ôn lại"
                                                            >
                                                                🔄
                                                            </button>
                                                        )}
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => deleteWord(vocab.id)}
                                                            title="Xóa"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className={styles.pagination}>
                                                <button
                                                    className={styles.pageBtn}
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    ←
                                                </button>
                                                <span className={styles.pageInfo}>
                                                    {currentPage} / {totalPages}
                                                </span>
                                                <button
                                                    className={styles.pageBtn}
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    →
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Word Modal */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                <span>➕</span> Thêm từ vựng mới
                            </h2>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Từ tiếng Đức *</label>
                                <div className={styles.inputWithAction}>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="z.B. Schmetterling"
                                        value={newWord.word}
                                        onChange={(e) => setNewWord(prev => ({ ...prev, word: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleLookupWord(newWord.word);
                                            }
                                        }}
                                    />
                                    <button
                                        className={styles.lookupBtn}
                                        onClick={() => handleLookupWord(newWord.word)}
                                        disabled={lookupLoading || !newWord.word.trim()}
                                    >
                                        {lookupLoading ? '⏳' : '🔍'} Tra từ điển
                                    </button>
                                </div>
                            </div>

                            {lookupResult && (
                                <div className={styles.lookupResult}>
                                    <div className={styles.lookupWord}>
                                        <strong>{lookupResult.word}</strong>
                                        {lookupResult.pronunciation && (
                                            <span className={styles.pronunciation}>[{lookupResult.pronunciation}]</span>
                                        )}
                                    </div>
                                    {lookupResult.partOfSpeech && (
                                        <span className={styles.partOfSpeech}>{lookupResult.partOfSpeech}</span>
                                    )}
                                    {lookupResult.translations && lookupResult.translations.length > 0 && (
                                        <div className={styles.lookupTranslations}>
                                            <strong>Nghĩa:</strong> {lookupResult.translations.join(', ')}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nghĩa / Dịch *</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="z.B. con bướm"
                                    value={newWord.translation}
                                    onChange={(e) => setNewWord(prev => ({ ...prev, translation: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ví dụ</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="z.B. Der Schmetterling fliegt über die Blumen."
                                    value={newWord.example}
                                    onChange={(e) => setNewWord(prev => ({ ...prev, example: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ghi chú</label>
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder="Ghi chú thêm (cách nhớ, ngữ pháp...)"
                                    value={newWord.notes}
                                    onChange={(e) => setNewWord(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewWord({ word: '', translation: '', example: '', notes: '' });
                                    setLookupResult(null);
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                className={styles.saveBtn}
                                onClick={handleAddWord}
                                disabled={!newWord.word.trim() || !newWord.translation.trim()}
                            >
                                <span>💾</span> Lưu từ vựng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Flashcard Modal */}
            {showFlashcards && flashcardVocabulary.length > 0 && (
                <div className={styles.modalOverlay} onClick={() => setShowFlashcards(false)}>
                    <div className={styles.flashcardModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.flashcardHeader}>
                            <h2>🎴 Flashcards</h2>
                            <div className={styles.flashcardProgress}>
                                {flashcardIndex + 1} / {flashcardVocabulary.length}
                            </div>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowFlashcards(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.flashcardContainer}>
                            <button
                                className={styles.flashcardNav}
                                onClick={prevFlashcard}
                                disabled={flashcardVocabulary.length <= 1}
                            >
                                ←
                            </button>

                            <div
                                className={`${styles.flashcard} ${flashcardFlipped ? styles.flipped : ''}`}
                                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                            >
                                <div className={styles.flashcardInner}>
                                    <div className={styles.flashcardFront}>
                                        <div className={styles.flashcardWord}>
                                            {flashcardVocabulary[flashcardIndex]?.word}
                                        </div>
                                        <div className={styles.flashcardHint}>
                                            Nhấn để xem nghĩa
                                        </div>
                                    </div>
                                    <div className={styles.flashcardBack}>
                                        <div className={styles.flashcardTranslation}>
                                            {flashcardVocabulary[flashcardIndex]?.translation}
                                        </div>
                                        {flashcardVocabulary[flashcardIndex]?.example && (
                                            <div className={styles.flashcardExample}>
                                                &ldquo;{flashcardVocabulary[flashcardIndex]?.example}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                className={styles.flashcardNav}
                                onClick={nextFlashcard}
                                disabled={flashcardVocabulary.length <= 1}
                            >
                                →
                            </button>
                        </div>

                        <div className={styles.flashcardActions}>
                            <button
                                className={`${styles.flashcardActionBtn} ${styles.dontKnow}`}
                                onClick={() => handleFlashcardAction('dont_know')}
                            >
                                <span>❌</span> Chưa nhớ
                            </button>
                            <button
                                className={`${styles.flashcardActionBtn} ${styles.know}`}
                                onClick={() => handleFlashcardAction('know')}
                            >
                                <span>✅</span> Đã nhớ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function VocabularyPageWrapper() {
    return (
        <ProtectedPage>
            <VocabularyPage />
        </ProtectedPage>
    );
}
