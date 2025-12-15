import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { toast } from 'react-toastify';
import styles from '../../styles/compactForm.module.css';

/**
 * CompactLessonForm - Single Page Lesson Creation
 * 
 * Tất cả trong 1 trang, nhưng được organize tốt:
 * - Thông tin cơ bản
 * - Nguồn audio với các nút get SRT
 * - Transcript editor
 */
const CompactLessonForm = ({ categories = [], loadingCategories = false }) => {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    level: 'A1',
    category: '',
    videoDuration: 0
  });

  // Audio Source
  const [audioSource, setAudioSource] = useState('youtube');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Transcript
  const [srtText, setSrtText] = useState('');
  const [whisperV3Segments, setWhisperV3Segments] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [fetchingYouTubeSRT, setFetchingYouTubeSRT] = useState(false);
  const [fetchingWhisperSRT, setFetchingWhisperSRT] = useState(false);
  const [fetchingWhisperV3, setFetchingWhisperV3] = useState(false);

  // Thumbnail
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Errors
  const [errors, setErrors] = useState({});

  // Auto-generate ID
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
    setFormData({
      ...formData,
      title: newTitle,
      description: newTitle, // Auto-fill description
      id: newId
    });
  };

  // Transcript Generation
  const handleGetYouTubeSRT = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Vui lòng nhập YouTube URL');
      return;
    }

    setFetchingYouTubeSRT(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/get-youtube-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get SRT from YouTube');
      }

      const data = await res.json();
      setSrtText(data.srt);
      setWhisperV3Segments(null);
      
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle && !formData.title) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success('✅ Đã lấy SRT từ YouTube!');
    } catch (error) {
      console.error('YouTube SRT error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setFetchingYouTubeSRT(false);
    }
  };

  const handleGetWhisperSRT = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Vui lòng nhập YouTube URL');
      return;
    }

    setFetchingWhisperSRT(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whisper-youtube-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim(), maxWords: 10 })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get Whisper SRT');
      }

      const data = await res.json();
      setSrtText(data.srt);
      setWhisperV3Segments(null);
      
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle && !formData.title) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success('✅ Đã tạo SRT từ Whisper AI!');
    } catch (error) {
      console.error('Whisper SRT error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setFetchingWhisperSRT(false);
    }
  };

  const handleGetWhisperV3 = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Vui lòng nhập YouTube URL');
      return;
    }

    setFetchingWhisperV3(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whisper-youtube-srt-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get Whisper v3 SRT');
      }

      const data = await res.json();
      setSrtText(data.srt);
      setWhisperV3Segments(data.segments || null);
      
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle && !formData.title) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success('✅ Đã tạo SRT từ Whisper V3 (word-level)!');
    } catch (error) {
      console.error('Whisper v3 error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setFetchingWhisperV3(false);
    }
  };

  const handleTranscribe = async () => {
    if (audioSource === 'file' && !audioFile) {
      toast.error('Vui lòng chọn file audio');
      return;
    }
    if (audioSource === 'url' && !audioUrl.trim()) {
      toast.error('Vui lòng nhập Audio URL');
      return;
    }

    setTranscribing(true);
    try {
      const formDataUpload = new FormData();
      if (audioSource === 'url') {
        formDataUpload.append('url', audioUrl);
      } else {
        formDataUpload.append('audio', audioFile);
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Transcription failed');
      }

      const data = await res.json();
      setSrtText(data.srt);
      setWhisperV3Segments(null);
      toast.success('✅ Đã tạo SRT từ audio!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

  // Submit
  // Auto Create & Save - One click to do everything
  const handleAutoCreateAndSave = async (e) => {
    e.preventDefault();

    const newErrors = {};
    // Only validate essential fields for auto mode
    if (audioSource === 'youtube' && !youtubeUrl.trim()) {
      newErrors.audio = 'Vui lòng nhập YouTube URL';
    }
    if (!formData.level) newErrors.level = 'Vui lòng chọn cấp độ';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng điền YouTube URL và chọn cấp độ');
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get transcript from Whisper V3 (Karaoke)
      toast.info('⏳ Đang tạo transcript từ YouTube...');
      const token = localStorage.getItem('token');
      const whisperRes = await fetch('/api/whisper-youtube-srt-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!whisperRes.ok) {
        const errorData = await whisperRes.json();
        throw new Error(errorData.message || 'Không thể tạo transcript');
      }

      const whisperData = await whisperRes.json();
      const generatedSrt = whisperData.srt;
      const segments = whisperData.segments || null;
      const videoDuration = whisperData.videoDuration || 0;
      const videoTitle = whisperData.videoTitle || 'Untitled';

      // Auto-generate title and ID if not set
      const finalTitle = formData.title || videoTitle;
      const finalId = formData.id || generateIdFromTitle(finalTitle);
      
      toast.success('✅ Đã tạo transcript! Đang lưu bài học...');

      // Step 2: Convert SRT to JSON
      const srtRes = await fetch('/api/convert-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          srtText: generatedSrt, 
          lessonId: finalId,
          segments: segments
        })
      });

      if (!srtRes.ok) {
        const errorData = await srtRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Convert SRT failed: ${errorData.message || srtRes.statusText}`);
      }
      const srtData = await srtRes.json();

      // Step 3: Create lesson
      const lessonData = {
        ...formData,
        id: finalId,
        title: finalTitle,
        description: finalTitle,
        videoDuration: videoDuration,
        audio: 'youtube',
        json: srtData.url,
        youtubeUrl: youtubeUrl.trim()
      };

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lessonData)
      });

      if (!res.ok) throw new Error('Không thể tạo bài học');

      toast.success('✅ Bài học đã được tạo thành công!');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Auto create error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Tiêu đề không được để trống';
    if (!formData.description.trim()) newErrors.description = 'Mô tả không được để trống';
    if (!formData.level) newErrors.level = 'Vui lòng chọn cấp độ';
    
    if (audioSource === 'youtube' && !youtubeUrl.trim()) {
      newErrors.audio = 'Vui lòng nhập YouTube URL';
    }
    if (audioSource === 'file' && !audioFile) {
      newErrors.audio = 'Vui lòng chọn file audio';
    }
    if (audioSource === 'url' && !audioUrl.trim()) {
      newErrors.audio = 'Vui lòng nhập Audio URL';
    }
    if (!srtText.trim()) newErrors.srt = 'Vui lòng tạo hoặc nhập SRT';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng hoàn thành tất cả thông tin bắt buộc');
      return;
    }

    setUploading(true);
    try {
      let finalAudioPath = '';
      let finalJsonPath = '';
      let finalYoutubeUrl = '';
      let finalThumbnailPath = '';

      // Upload audio
      if (audioSource === 'youtube') {
        finalYoutubeUrl = youtubeUrl.trim();
      } else {
        const uploadFormData = new FormData();
        if (audioSource === 'url') {
          uploadFormData.append('type', 'url');
          uploadFormData.append('url', audioUrl);
          uploadFormData.append('audioType', 'audio');
        } else {
          uploadFormData.append('file', audioFile);
          uploadFormData.append('type', 'audio');
        }

        const audioRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: uploadFormData
        });

        if (!audioRes.ok) throw new Error('Upload audio failed');
        const audioData = await audioRes.json();
        finalAudioPath = audioData.url;

        // Upload thumbnail
        if (thumbnailFile) {
          const thumbnailFormData = new FormData();
          thumbnailFormData.append('file', thumbnailFile);
          thumbnailFormData.append('type', 'thumbnail');

          const thumbnailRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: thumbnailFormData
          });

          if (thumbnailRes.ok) {
            const thumbnailData = await thumbnailRes.json();
            finalThumbnailPath = thumbnailData.url;
          }
        }
      }

      // Convert SRT to JSON
      const srtRes = await fetch('/api/convert-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          srtText, 
          lessonId: formData.id,
          segments: whisperV3Segments
        })
      });

      if (!srtRes.ok) {
        const errorData = await srtRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Convert SRT failed: ${errorData.message || srtRes.statusText}`);
      }
      const srtData = await srtRes.json();
      finalJsonPath = srtData.url;

      // Create lesson
      const lessonData = {
        ...formData,
        audio: finalAudioPath || 'youtube',
        json: finalJsonPath,
        youtubeUrl: finalYoutubeUrl || undefined,
        thumbnail: finalThumbnailPath || undefined,
        videoDuration: formData.videoDuration || undefined
      };

      const token = localStorage.getItem('token');
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lessonData)
      });

      if (!res.ok) throw new Error('Không thể tạo bài học');

      toast.success('✅ Bài học đã được tạo thành công!');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('❌ Lỗi: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const srtLineCount = srtText ? srtText.split('\n').filter(line => line.trim()).length : 0;

  return (
    <form onSubmit={handleSubmit} className={styles.compactForm}>
      {/* Cấp độ và Danh mục */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 Phân loại</h2>
        
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Cấp độ <span className={styles.required}>*</span>
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className={styles.select}
            >
              <option value="A1">A1 - Sơ cấp</option>
              <option value="A2">A2 - Cơ bản</option>
              <option value="B1">B1 - Trung cấp thấp</option>
              <option value="B2">B2 - Trung cấp cao</option>
              <option value="C1">C1 - Nâng cao</option>
              <option value="C2">C2 - Thành thạo</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Danh mục</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={styles.select}
              disabled={loadingCategories}
            >
              {loadingCategories ? (
                <option value="">Đang tải...</option>
              ) : (
                <>
                  <option value="">-- Không chọn --</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Nguồn Audio */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎵 Nguồn Audio</h2>
        
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="youtube"
              checked={audioSource === 'youtube'}
              onChange={(e) => setAudioSource(e.target.value)}
            />
            <span>🎥 YouTube</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="file"
              checked={audioSource === 'file'}
              onChange={(e) => setAudioSource(e.target.value)}
            />
            <span>📁 File</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="url"
              checked={audioSource === 'url'}
              onChange={(e) => setAudioSource(e.target.value)}
            />
            <span>🔗 URL</span>
          </label>
        </div>

        {audioSource === 'youtube' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              YouTube URL <span className={styles.required}>*</span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`${styles.input} ${errors.audio ? styles.inputError : ''}`}
            />
            {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
            {formData.videoDuration > 0 && (
              <span className={styles.helperText}>
                ⏱️ Thời lượng: {formatDuration(formData.videoDuration)}
              </span>
            )}
          </div>
        )}

        {audioSource === 'file' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              File audio <span className={styles.required}>*</span>
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className={styles.fileInput}
            />
            {audioFile && <span className={styles.fileName}>📎 {audioFile.name}</span>}
            {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
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
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className={`${styles.input} ${errors.audio ? styles.inputError : ''}`}
            />
            {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
          </div>
        )}

        {/* Thumbnail cho File/URL */}
        {audioSource !== 'youtube' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Thumbnail (tùy chọn)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setThumbnailFile(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setThumbnailPreview(reader.result);
                  reader.readAsDataURL(file);
                }
              }}
              className={styles.fileInput}
            />
            {thumbnailPreview && (
              <div className={styles.thumbnailPreview}>
                <Image
                  src={thumbnailPreview}
                  alt="Thumbnail"
                  width={200}
                  height={120}
                  style={{ objectFit: 'cover', borderRadius: '8px' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Get SRT Buttons */}
        <div className={styles.srtActions} style={{ marginTop: '20px' }}>
          {audioSource === 'youtube' && (
            <>
              <button
                type="button"
                onClick={handleGetWhisperSRT}
                disabled={fetchingWhisperSRT || !youtubeUrl.trim()}
                className={styles.actionBtn}
              >
                {fetchingWhisperSRT ? '⏳ Đang tạo...' : '🎙️ Whisper'}
              </button>
              <button
                type="button"
                onClick={handleGetWhisperV3}
                disabled={fetchingWhisperV3 || !youtubeUrl.trim()}
                className={styles.actionBtnPrimary}
              >
                {fetchingWhisperV3 ? '⏳ Đang tạo...' : '🎤 Karaoke'}
              </button>
            </>
          )}

          {(audioSource === 'file' || audioSource === 'url') && (
            <>
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={transcribing || (!audioFile && !audioUrl.trim())}
                className={styles.actionBtn}
              >
                {transcribing ? '⏳ Đang tạo...' : '🎙️ Whisper'}
              </button>
            </>
          )}
        </div>

        {/* Auto Create & Save Button - YouTube only */}
        {audioSource === 'youtube' && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#f0fdf4', borderRadius: '8px', border: '2px solid #10b981' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#065f46', fontWeight: '500' }}>
              ⚡ Tạo nhanh: Chỉ cần URL + Cấp độ + Danh mục, ấn 1 nút là xong!
            </p>
            <button
              type="button"
              onClick={handleAutoCreateAndSave}
              disabled={uploading || !youtubeUrl.trim() || !formData.level}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: (uploading || !youtubeUrl.trim() || !formData.level) ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              {uploading ? '⏳ Đang xử lý...' : '🚀 Tạo & Lưu tự động'}
            </button>
          </div>
        )}
      </div>

      {/* Tiêu đề */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📝 Thông tin bài học</h2>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Tiêu đề <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="VD: Học tiếng Đức cơ bản - Bài 1"
            className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          />
          {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          {formData.id && (
            <span className={styles.helperText}>
              ID: <code className={styles.idCode}>{formData.id}</code>
            </span>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📄 Transcript (SRT)</h2>
        
        {/* SRT Editor */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Nội dung SRT <span className={styles.required}>*</span>
            {srtLineCount > 0 && (
              <span className={styles.lineCount}> ({srtLineCount} dòng)</span>
            )}
          </label>
          <textarea
            value={srtText}
            onChange={(e) => setSrtText(e.target.value)}
            className={`${styles.srtTextarea} ${errors.srt ? styles.inputError : ''}`}
            placeholder="1&#10;00:00:03,200 --> 00:00:04,766&#10;DW Deutsch lernen&#10;&#10;2&#10;00:00:04,766 --> 00:00:06,933&#10;Wie geht es dir heute?"
            rows={12}
          />
          {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => router.push('/admin/dashboard')}
          className={styles.cancelBtn}
          disabled={uploading}
        >
          ← Hủy
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={uploading}
        >
          {uploading ? '⏳ Đang lưu...' : '💾 Lưu bài học'}
        </button>
      </div>
    </form>
  );
};

export default CompactLessonForm;
