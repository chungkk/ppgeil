import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/adminDashboard.module.css';

/**
 * LessonFilters Component
 * 
 * Bộ lọc nâng cao cho danh sách bài học:
 * - Lọc theo cấp độ (A1-C2)
 * - Lọc theo danh mục
 * - Lọc theo nguồn (YouTube/File/URL)
 * - Sắp xếp (Mới nhất, Cũ nhất, A-Z, Z-A)
 * - Lưu và tải filter presets
 */
const LessonFilters = ({
  onFilterChange,
  categories = [],
  totalCount = 0,
  filteredCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    levels: [],
    categories: [],
    sources: [],
    sortBy: 'newest'
  });

  // Các cấp độ có sẵn
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Các loại nguồn
  const sources = [
    { value: 'youtube', label: '🎥 YouTube' },
    { value: 'file', label: '📁 File tải lên' },
    { value: 'url', label: '🔗 URL' }
  ];

  // Các tùy chọn sắp xếp
  const sortOptions = [
    { value: 'newest', label: '🆕 Mới nhất' },
    { value: 'oldest', label: '📅 Cũ nhất' },
    { value: 'title-asc', label: '🔤 Tiêu đề A-Z' },
    { value: 'title-desc', label: '🔤 Tiêu đề Z-A' },
    { value: 'level-asc', label: '📊 Cấp độ tăng dần' },
    { value: 'level-desc', label: '📊 Cấp độ giảm dần' },
    { value: 'category', label: '🏷️ Theo danh mục' }
  ];

  // Filter presets
  const presets = [
    {
      id: 'all',
      name: '📚 Tất cả',
      filters: { levels: [], categories: [], sources: [], sortBy: 'newest' }
    },
    {
      id: 'beginner',
      name: '🌱 Cơ bản (A1-A2)',
      filters: { levels: ['A1', 'A2'], categories: [], sources: [], sortBy: 'newest' }
    },
    {
      id: 'intermediate',
      name: '📈 Trung cấp (B1-B2)',
      filters: { levels: ['B1', 'B2'], categories: [], sources: [], sortBy: 'newest' }
    },
    {
      id: 'advanced',
      name: '🎓 Nâng cao (C1-C2)',
      filters: { levels: ['C1', 'C2'], categories: [], sources: [], sortBy: 'newest' }
    },
    {
      id: 'youtube',
      name: '🎥 YouTube only',
      filters: { levels: [], categories: [], sources: ['youtube'], sortBy: 'newest' }
    }
  ];

  // Store callback in ref to avoid infinite loop when parent doesn't memoize
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  // Áp dụng filter khi có thay đổi
  useEffect(() => {
    onFilterChangeRef.current(filters);
  }, [filters]);

  // Toggle level filter
  const toggleLevel = (level) => {
    setFilters(prev => ({
      ...prev,
      levels: prev.levels.includes(level)
        ? prev.levels.filter(l => l !== level)
        : [...prev.levels, level]
    }));
  };

  // Toggle category filter
  const toggleCategory = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  // Toggle source filter
  const toggleSource = (source) => {
    setFilters(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source]
    }));
  };

  // Change sort
  const handleSortChange = (sortBy) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  // Apply preset
  const applyPreset = (preset) => {
    setFilters(preset.filters);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      levels: [],
      categories: [],
      sources: [],
      sortBy: 'newest'
    });
  };

  // Check if any filter is active
  const hasActiveFilters = filters.levels.length > 0 ||
    filters.categories.length > 0 ||
    filters.sources.length > 0;

  return (
    <div className={styles.filterContainer}>
      {/* Filter Header */}
      <div className={styles.filterHeader}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.filterToggleButton}
        >
          <span className={styles.filterIcon}>🎛️</span>
          <span className={styles.filterTitle}>Bộ lọc & Sắp xếp</span>
          {hasActiveFilters && (
            <span className={styles.filterBadge}>
              {filters.levels.length + filters.categories.length + filters.sources.length}
            </span>
          )}
          <span className={styles.filterArrow}>{isExpanded ? '▲' : '▼'}</span>
        </button>

        {/* Sort Dropdown - Always visible */}
        <div className={styles.sortDropdown}>
          <label className={styles.sortLabel}>Sắp xếp:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className={styles.sortSelect}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className={styles.filterResults}>
          <span className={styles.resultText}>
            Hiển thị <strong>{filteredCount}</strong> / {totalCount} bài học
          </span>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {isExpanded && (
        <div className={styles.filterPanel}>
          {/* Quick Presets */}
          <div className={styles.filterSection}>
            <h4 className={styles.filterSectionTitle}>⚡ Bộ lọc nhanh</h4>
            <div className={styles.presetButtons}>
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={styles.presetButton}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGrid}>
            {/* Level Filter */}
            <div className={styles.filterSection}>
              <h4 className={styles.filterSectionTitle}>📊 Cấp độ</h4>
              <div className={styles.filterCheckboxGroup}>
                {levels.map(level => (
                  <label key={level} className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={filters.levels.includes(level)}
                      onChange={() => toggleLevel(level)}
                    />
                    <span className={styles.checkboxLabel}>{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className={styles.filterSection}>
                <h4 className={styles.filterSectionTitle}>🏷️ Danh mục</h4>
                <div className={styles.filterCheckboxGroup}>
                  {categories.map(category => (
                    <label key={category._id} className={styles.filterCheckbox}>
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category._id)}
                        onChange={() => toggleCategory(category._id)}
                      />
                      <span className={styles.checkboxLabel}>
                        {category.name}
                        {category.articleCount > 0 && (
                          <span className={styles.categoryCount}>
                            ({category.articleCount})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Source Filter */}
            <div className={styles.filterSection}>
              <h4 className={styles.filterSectionTitle}>📂 Nguồn</h4>
              <div className={styles.filterCheckboxGroup}>
                {sources.map(source => (
                  <label key={source.value} className={styles.filterCheckbox}>
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source.value)}
                      onChange={() => toggleSource(source.value)}
                    />
                    <span className={styles.checkboxLabel}>{source.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters && (
            <div className={styles.filterActions}>
              <button
                onClick={resetFilters}
                className={styles.resetButton}
              >
                🔄 Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonFilters;
