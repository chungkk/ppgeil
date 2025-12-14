import WizardStep from '../WizardStep';
import styles from '../../../styles/wizardStyles.module.css';

/**
 * Step 4: Review & Publish
 * 
 * Tổng hợp tất cả thông tin:
 * - Thông tin cơ bản
 * - Nguồn audio
 * - Transcript stats
 * 
 * Final validation trước khi submit
 */
const Step4ReviewPublish = ({ 
  formData,
  audioSource,
  youtubeUrl,
  audioFile,
  audioUrl,
  srtText,
  thumbnailFile,
  categories = [],
  uploading = false,
  onSubmit
}) => {
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Không chọn danh mục';
    const category = categories.find(c => c._id === categoryId);
    return category ? category.name : 'Không xác định';
  };

  const getAudioSourceLabel = () => {
    switch (audioSource) {
      case 'youtube': return '🎥 YouTube';
      case 'file': return '📁 File upload';
      case 'url': return '🔗 URL';
      default: return 'Không xác định';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Chưa xác định';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} phút ${secs} giây`;
  };

  const getSrtStats = () => {
    if (!srtText) return { lines: 0, segments: 0 };
    const lines = srtText.split('\n');
    const segments = lines.filter(line => line.match(/^\d+$/)).length;
    return { lines: lines.length, segments };
  };

  const srtStats = getSrtStats();

  // Validation summary
  const validations = {
    basicInfo: formData.title && formData.description && formData.level,
    audioSource: (audioSource === 'youtube' && youtubeUrl) || 
                 (audioSource === 'file' && audioFile) || 
                 (audioSource === 'url' && audioUrl),
    transcript: srtText && srtText.trim().length > 0
  };

  const allValid = validations.basicInfo && validations.audioSource && validations.transcript;

  return (
    <WizardStep
      title="Xem trước & Xuất bản"
      description="Kiểm tra lại thông tin và xuất bản bài học"
      icon="✅"
      stepNumber={4}
    >
      {/* Validation Summary */}
      <div className={styles.validationSummary}>
        <div className={`${styles.validationItem} ${validations.basicInfo ? styles.valid : styles.invalid}`}>
          <span className={styles.validationIcon}>
            {validations.basicInfo ? '✓' : '✗'}
          </span>
          <span>Thông tin cơ bản</span>
        </div>
        <div className={`${styles.validationItem} ${validations.audioSource ? styles.valid : styles.invalid}`}>
          <span className={styles.validationIcon}>
            {validations.audioSource ? '✓' : '✗'}
          </span>
          <span>Nguồn audio</span>
        </div>
        <div className={`${styles.validationItem} ${validations.transcript ? styles.valid : styles.invalid}`}>
          <span className={styles.validationIcon}>
            {validations.transcript ? '✓' : '✗'}
          </span>
          <span>Transcript</span>
        </div>
      </div>

      {/* Review Cards */}
      <div className={styles.reviewSection}>
        {/* Basic Info Card */}
        <div className={styles.reviewCard}>
          <h3 className={styles.reviewCardTitle}>📝 Thông tin cơ bản</h3>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Tiêu đề:</span>
            <span className={styles.reviewValue}>{formData.title}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Mô tả:</span>
            <span className={styles.reviewValue}>{formData.description}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Cấp độ:</span>
            <span className={`${styles.reviewValue} ${styles.badge}`}>{formData.level}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Danh mục:</span>
            <span className={styles.reviewValue}>{getCategoryName(formData.category)}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>ID:</span>
            <span className={`${styles.reviewValue} ${styles.codeValue}`}>{formData.id}</span>
          </div>
        </div>

        {/* Audio Source Card */}
        <div className={styles.reviewCard}>
          <h3 className={styles.reviewCardTitle}>🎵 Nguồn audio</h3>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Loại:</span>
            <span className={styles.reviewValue}>{getAudioSourceLabel()}</span>
          </div>
          {audioSource === 'youtube' && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>URL:</span>
                <span className={`${styles.reviewValue} ${styles.urlValue}`}>
                  {youtubeUrl.substring(0, 50)}...
                </span>
              </div>
              {formData.videoDuration > 0 && (
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Thời lượng:</span>
                  <span className={styles.reviewValue}>
                    {formatDuration(formData.videoDuration)}
                  </span>
                </div>
              )}
            </>
          )}
          {audioSource === 'file' && audioFile && (
            <>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>File:</span>
                <span className={styles.reviewValue}>{audioFile.name}</span>
              </div>
              <div className={styles.reviewItem}>
                <span className={styles.reviewLabel}>Kích thước:</span>
                <span className={styles.reviewValue}>
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </>
          )}
          {audioSource === 'url' && (
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>URL:</span>
              <span className={`${styles.reviewValue} ${styles.urlValue}`}>
                {audioUrl.substring(0, 50)}...
              </span>
            </div>
          )}
          {thumbnailFile && (
            <div className={styles.reviewItem}>
              <span className={styles.reviewLabel}>Thumbnail:</span>
              <span className={styles.reviewValue}>✓ Đã tải lên</span>
            </div>
          )}
        </div>

        {/* Transcript Card */}
        <div className={styles.reviewCard}>
          <h3 className={styles.reviewCardTitle}>📄 Transcript</h3>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Số dòng:</span>
            <span className={styles.reviewValue}>{srtStats.lines}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Số phân đoạn:</span>
            <span className={styles.reviewValue}>{srtStats.segments}</span>
          </div>
          <div className={styles.reviewItem}>
            <span className={styles.reviewLabel}>Trạng thái:</span>
            <span className={`${styles.reviewValue} ${styles.successBadge}`}>
              ✓ Đã sẵn sàng
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {!allValid && (
        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningContent}>
            <strong>Chưa đủ thông tin</strong>
            <p>Vui lòng hoàn thành tất cả các bước trước khi xuất bản.</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {allValid && (
        <div className={styles.successBox}>
          <span className={styles.successIcon}>✓</span>
          <div className={styles.successContent}>
            <strong>Sẵn sàng xuất bản!</strong>
            <p>Tất cả thông tin đã hoàn chỉnh. Click &quot;Xuất bản bài học&quot; bên dưới để hoàn tất.</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <span className={styles.infoIcon}>💡</span>
        <div className={styles.infoContent}>
          <strong>Lưu ý:</strong>
          <ul>
            <li>Sau khi xuất bản, bài học sẽ hiển thị ngay cho người dùng</li>
            <li>Bạn có thể chỉnh sửa bài học sau khi xuất bản</li>
            <li>Quá trình upload có thể mất vài phút tùy kích thước file</li>
          </ul>
        </div>
      </div>
    </WizardStep>
  );
};

export default Step4ReviewPublish;
