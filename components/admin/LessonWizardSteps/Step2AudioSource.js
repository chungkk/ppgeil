import { useState } from 'react';
import Image from 'next/image';
import WizardStep from '../WizardStep';
import styles from '../../../styles/wizardStyles.module.css';

/**
 * Step 2: Nguồn Audio
 * 
 * Chọn nguồn:
 * - YouTube URL
 * - File upload
 * - Audio URL
 * 
 * Optional: Thumbnail upload
 */
const Step2AudioSource = ({ 
  formData,
  onChange,
  audioSource,
  onAudioSourceChange,
  audioFile,
  onAudioFileChange,
  audioUrl,
  onAudioUrlChange,
  youtubeUrl,
  onYoutubeUrlChange,
  thumbnailFile,
  onThumbnailFileChange,
  thumbnailPreview,
  onThumbnailPreviewChange,
  errors = {}
}) => {
  const handleSourceChange = (source) => {
    onAudioSourceChange(source);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    onAudioFileChange(file);
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    onThumbnailFileChange(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onThumbnailPreviewChange(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <WizardStep
      title="Chọn nguồn audio"
      description="Chọn nguồn âm thanh cho bài học của bạn"
      icon="🎵"
      stepNumber={2}
    >
      {/* Audio Source Selector */}
      <div className={styles.sourceSelector}>
        <button
          type="button"
          onClick={() => handleSourceChange('youtube')}
          className={`${styles.sourceButton} ${audioSource === 'youtube' ? styles.sourceButtonActive : ''}`}
        >
          <div className={styles.sourceIcon}>🎥</div>
          <div className={styles.sourceText}>
            <strong>YouTube</strong>
            <span>Nhập link video YouTube</span>
          </div>
          {audioSource === 'youtube' && (
            <div className={styles.sourceCheck}>✓</div>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSourceChange('file')}
          className={`${styles.sourceButton} ${audioSource === 'file' ? styles.sourceButtonActive : ''}`}
        >
          <div className={styles.sourceIcon}>📁</div>
          <div className={styles.sourceText}>
            <strong>Tải file lên</strong>
            <span>Upload file audio từ máy</span>
          </div>
          {audioSource === 'file' && (
            <div className={styles.sourceCheck}>✓</div>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSourceChange('url')}
          className={`${styles.sourceButton} ${audioSource === 'url' ? styles.sourceButtonActive : ''}`}
        >
          <div className={styles.sourceIcon}>🔗</div>
          <div className={styles.sourceText}>
            <strong>URL trực tiếp</strong>
            <span>Link audio từ internet</span>
          </div>
          {audioSource === 'url' && (
            <div className={styles.sourceCheck}>✓</div>
          )}
        </button>
      </div>

      {/* Source Input Fields */}
      <div className={styles.sourceContent}>
        {audioSource === 'youtube' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              YouTube URL <span className={styles.required}>*</span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`${styles.input} ${errors.audio ? styles.inputError : ''}`}
            />
            {errors.audio && (
              <span className={styles.errorText}>{errors.audio}</span>
            )}
            {formData.videoDuration > 0 && (
              <div className={styles.durationBadge}>
                ⏱️ Thời lượng: {formatDuration(formData.videoDuration)}
              </div>
            )}
          </div>
        )}

        {audioSource === 'file' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              File audio <span className={styles.required}>*</span>
            </label>
            <div className={styles.fileUpload}>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className={styles.fileInput}
                id="audioFile"
              />
              <label htmlFor="audioFile" className={styles.fileLabel}>
                <span className={styles.fileIcon}>📎</span>
                <span className={styles.fileText}>
                  {audioFile ? audioFile.name : 'Chọn file audio...'}
                </span>
              </label>
            </div>
            {errors.audio && (
              <span className={styles.errorText}>{errors.audio}</span>
            )}
            {audioFile && (
              <div className={styles.fileInfo}>
                <span className={styles.fileSize}>
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        )}

        {audioSource === 'url' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Audio URL <span className={styles.required}>*</span>
            </label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => onAudioUrlChange(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className={`${styles.input} ${errors.audio ? styles.inputError : ''}`}
            />
            {errors.audio && (
              <span className={styles.errorText}>{errors.audio}</span>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Upload (Optional) */}
      {audioSource !== 'youtube' && (
        <div className={styles.thumbnailSection}>
          <h3 className={styles.sectionTitle}>
            🖼️ Thumbnail <span className={styles.optional}>(Tùy chọn)</span>
          </h3>
          <div className={styles.formGroup}>
            <div className={styles.fileUpload}>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className={styles.fileInput}
                id="thumbnailFile"
              />
              <label htmlFor="thumbnailFile" className={styles.fileLabel}>
                <span className={styles.fileIcon}>🖼️</span>
                <span className={styles.fileText}>
                  {thumbnailFile ? thumbnailFile.name : 'Chọn ảnh thumbnail...'}
                </span>
              </label>
            </div>
            
            {thumbnailPreview && (
              <div className={styles.thumbnailPreview}>
                <Image
                  src={thumbnailPreview}
                  alt="Thumbnail Preview"
                  width={300}
                  height={200}
                  style={{ objectFit: 'cover', borderRadius: '8px' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <span className={styles.infoIcon}>💡</span>
        <div className={styles.infoContent}>
          <strong>Gợi ý:</strong>
          <ul>
            <li>YouTube: Tự động lấy thumbnail và thông tin video</li>
            <li>File audio: Hỗ trợ MP3, WAV, OGG (Max 50MB)</li>
            <li>URL: Đảm bảo link có thể truy cập công khai</li>
          </ul>
        </div>
      </div>
    </WizardStep>
  );
};

export default Step2AudioSource;
