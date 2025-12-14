import { useState, useEffect } from 'react';
import WizardStep from '../WizardStep';
import styles from '../../../styles/wizardStyles.module.css';

/**
 * Step 1: Thông Tin Cơ Bản
 * 
 * Thu thập:
 * - Tiêu đề bài học
 * - Mô tả
 * - Cấp độ (A1-C2)
 * - Danh mục
 * 
 * Auto-generate ID từ title
 */
const Step1BasicInfo = ({ 
  formData, 
  onChange, 
  errors = {},
  categories = [],
  loadingCategories = false 
}) => {
  const [titleTouched, setTitleTouched] = useState(false);

  const generateIdFromTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    const newId = generateIdFromTitle(newTitle);
    
    onChange({
      ...formData,
      title: newTitle,
      id: newId
    });
    
    if (!titleTouched && newTitle) {
      setTitleTouched(true);
    }
  };

  const handleFieldChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <WizardStep
      title="Thông tin cơ bản"
      description="Nhập thông tin chính về bài học của bạn"
      icon="📝"
      stepNumber={1}
    >
      <div className={styles.formGrid}>
        {/* Title */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Tiêu đề bài học <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="VD: Học tiếng Đức cơ bản - Bài 1"
            className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
            autoFocus
          />
          {errors.title && (
            <span className={styles.errorText}>{errors.title}</span>
          )}
          {titleTouched && formData.id && (
            <span className={styles.helperText}>
              ID tự động: <code className={styles.idPreview}>{formData.id}</code>
            </span>
          )}
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Mô tả <span className={styles.required}>*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Mô tả ngắn gọn về nội dung bài học..."
            className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
            rows={3}
          />
          {errors.description && (
            <span className={styles.errorText}>{errors.description}</span>
          )}
          <span className={styles.charCount}>
            {formData.description?.length || 0} ký tự
          </span>
        </div>

        {/* Level & Category Row */}
        <div className={styles.formRow}>
          {/* Level */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Cấp độ <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleFieldChange('level', e.target.value)}
              className={`${styles.select} ${errors.level ? styles.inputError : ''}`}
            >
              <option value="A1">A1 - Sơ cấp</option>
              <option value="A2">A2 - Cơ bản</option>
              <option value="B1">B1 - Trung cấp thấp</option>
              <option value="B2">B2 - Trung cấp cao</option>
              <option value="C1">C1 - Nâng cao</option>
              <option value="C2">C2 - Thành thạo</option>
            </select>
            {errors.level && (
              <span className={styles.errorText}>{errors.level}</span>
            )}
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Danh mục <span className={styles.optional}>(Tùy chọn)</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className={styles.select}
              disabled={loadingCategories}
            >
              {loadingCategories ? (
                <option value="">Đang tải...</option>
              ) : (
                <>
                  <option value="">-- Không chọn danh mục --</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name} {cat.isSystem ? '(Mặc định)' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.category && (
              <span className={styles.errorText}>{errors.category}</span>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <span className={styles.infoIcon}>💡</span>
        <div className={styles.infoContent}>
          <strong>Lưu ý:</strong> ID bài học sẽ được tạo tự động từ tiêu đề. 
          Bạn có thể chỉnh sửa các trường này sau khi tạo bài.
        </div>
      </div>
    </WizardStep>
  );
};

export default Step1BasicInfo;
