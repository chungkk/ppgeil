import { useState } from 'react';
import WizardStep from '../WizardStep';
import styles from '../../../styles/wizardStyles.module.css';

/**
 * Step 3: Generate Transcript (SRT)
 * 
 * Options:
 * - Auto-generate từ YouTube
 * - Auto-generate từ Whisper AI
 * - Nhập thủ công
 * 
 * Real-time validation
 */
const Step3Transcript = ({ 
  srtText,
  onSrtTextChange,
  audioSource,
  youtubeUrl,
  audioFile,
  audioUrl,
  transcribing,
  onTranscribe,
  fetchingYouTubeSRT,
  onGetYouTubeSRT,
  fetchingWhisperSRT,
  onGetWhisperSRT,
  fetchingWhisperV3,
  onGetWhisperV3,
  errors = {}
}) => {
  const [showManualInput, setShowManualInput] = useState(false);

  const hasAudioSource = () => {
    if (audioSource === 'youtube' && youtubeUrl) return true;
    if (audioSource === 'file' && audioFile) return true;
    if (audioSource === 'url' && audioUrl) return true;
    return false;
  };

  const validateSRT = (text) => {
    if (!text.trim()) return true;
    const lines = text.trim().split('\n');
    const timeRegex = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (timeRegex.test(lines[i])) return true;
    }
    return false;
  };

  const isValidSRT = validateSRT(srtText);
  const srtLineCount = srtText ? srtText.split('\n').filter(line => line.trim()).length : 0;

  return (
    <WizardStep
      title="Tạo transcript (SRT)"
      description="Tạo phụ đề tự động hoặc nhập thủ công"
      icon="📄"
      stepNumber={3}
    >
      {!hasAudioSource() ? (
        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <div className={styles.warningContent}>
            <strong>Chưa có nguồn audio</strong>
            <p>Vui lòng quay lại bước 2 để chọn nguồn audio trước.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Auto-generate Options */}
          {!showManualInput && (
            <div className={styles.generateOptions}>
              <h3 className={styles.sectionTitle}>⚡ Tạo tự động</h3>
              
              <div className={styles.generateGrid}>
                {audioSource === 'youtube' && (
                  <>
                    {/* Whisper V3 (Word-level) - Recommended */}
                    <button
                      type="button"
                      onClick={onGetWhisperV3}
                      disabled={fetchingWhisperV3 || !youtubeUrl.trim()}
                      className={styles.generateButton}
                    >
                      <div className={styles.generateIcon}>🎙️</div>
                      <div className={styles.generateText}>
                        <strong>Whisper V3</strong>
                        <span>Chính xác cao, word-level sync</span>
                        <span className={styles.badge}>Đề xuất</span>
                      </div>
                      {fetchingWhisperV3 && (
                        <div className={styles.spinner}>⏳</div>
                      )}
                    </button>

                    {/* Whisper Standard */}
                    <button
                      type="button"
                      onClick={onGetWhisperSRT}
                      disabled={fetchingWhisperSRT || !youtubeUrl.trim()}
                      className={styles.generateButton}
                    >
                      <div className={styles.generateIcon}>🎤</div>
                      <div className={styles.generateText}>
                        <strong>Whisper Standard</strong>
                        <span>AI transcription chuẩn</span>
                      </div>
                      {fetchingWhisperSRT && (
                        <div className={styles.spinner}>⏳</div>
                      )}
                    </button>

                    {/* YouTube Auto Captions */}
                    <button
                      type="button"
                      onClick={onGetYouTubeSRT}
                      disabled={fetchingYouTubeSRT || !youtubeUrl.trim()}
                      className={styles.generateButton}
                    >
                      <div className={styles.generateIcon}>🎥</div>
                      <div className={styles.generateText}>
                        <strong>YouTube Captions</strong>
                        <span>Phụ đề có sẵn từ YouTube</span>
                      </div>
                      {fetchingYouTubeSRT && (
                        <div className={styles.spinner}>⏳</div>
                      )}
                    </button>
                  </>
                )}

                {(audioSource === 'file' || audioSource === 'url') && (
                  <button
                    type="button"
                    onClick={onTranscribe}
                    disabled={transcribing || (!audioFile && !audioUrl.trim())}
                    className={styles.generateButton}
                  >
                    <div className={styles.generateIcon}>🎙️</div>
                    <div className={styles.generateText}>
                      <strong>Whisper AI</strong>
                      <span>Tạo transcript từ audio</span>
                    </div>
                    {transcribing && (
                      <div className={styles.spinner}>⏳</div>
                    )}
                  </button>
                )}
              </div>

              {/* Manual Input Toggle */}
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className={styles.manualToggle}
              >
                ✏️ Hoặc nhập SRT thủ công
              </button>
            </div>
          )}

          {/* SRT Editor */}
          {(showManualInput || srtText) && (
            <div className={styles.srtEditor}>
              <div className={styles.editorHeader}>
                <h3 className={styles.sectionTitle}>
                  📝 Nội dung SRT
                  {srtLineCount > 0 && (
                    <span className={styles.lineCount}>({srtLineCount} dòng)</span>
                  )}
                </h3>
                {!showManualInput && (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className={styles.editButton}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                )}
              </div>

              <textarea
                value={srtText}
                onChange={(e) => onSrtTextChange(e.target.value)}
                className={`${styles.srtTextarea} ${errors.srt ? styles.inputError : ''}`}
                placeholder={`1
00:00:03,200 --> 00:00:04,766
DW Deutsch lernen

2
00:00:04,766 --> 00:00:06,933
Wie geht es dir heute?`}
                rows={12}
                readOnly={!showManualInput && !srtText}
              />

              {errors.srt && (
                <span className={styles.errorText}>{errors.srt}</span>
              )}

              {/* SRT Validation */}
              {srtText && (
                <div className={styles.validationStatus}>
                  {isValidSRT ? (
                    <span className={styles.validBadge}>
                      ✓ Format SRT hợp lệ
                    </span>
                  ) : (
                    <span className={styles.invalidBadge}>
                      ⚠️ Format không hợp lệ
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className={styles.infoBox}>
            <span className={styles.infoIcon}>💡</span>
            <div className={styles.infoContent}>
              <strong>Hướng dẫn:</strong>
              <ul>
                <li><strong>Whisper V3</strong>: Tốt nhất cho video YouTube, hỗ trợ word-level timing</li>
                <li><strong>Whisper Standard</strong>: Phù hợp cho hầu hết các loại audio</li>
                <li><strong>YouTube Captions</strong>: Nhanh nhất nhưng chỉ khả dụng nếu video có sẵn phụ đề</li>
                <li>Bạn có thể chỉnh sửa SRT sau khi tạo tự động</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </WizardStep>
  );
};

export default Step3Transcript;
