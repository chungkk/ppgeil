import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import ProtectedPage from '../../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../../../styles/adminDashboard.module.css';


function LessonFormPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNewLesson = id === 'new';

  const [loading, setLoading] = useState(!isNewLesson);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [fetchingYouTubeSRT, setFetchingYouTubeSRT] = useState(false);
  const [fetchingSRTShort, setFetchingSRTShort] = useState(false);
  const [fetchingWhisperSRT, setFetchingWhisperSRT] = useState(false);
  const [fetchingWhisperV2, setFetchingWhisperV2] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    level: 'A1',
    videoDuration: 0
  });

  const [audioSource, setAudioSource] = useState('youtube');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [srtText, setSrtText] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const generateIdFromTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const convertJSONtoSRT = (jsonData) => {
    if (!Array.isArray(jsonData)) return '';
    return jsonData.map((item, index) => {
      const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        const ms = Math.round((seconds % 1) * 1000).toString().padStart(3, '0');
        return `${h}:${m}:${s},${ms}`;
      };
      return `${index + 1}\n${formatTime(item.start)} --> ${formatTime(item.end)}\n${item.text}`;
    }).join('\n\n');
  };

  const loadLesson = useCallback(async (lessonId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/lessons');
      const responseData = await res.json();
      const lessons = Array.isArray(responseData) ? responseData : (responseData.lessons || []);
      const lesson = lessons.find(l => l.id === lessonId);

      if (lesson) {
        setFormData({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          level: lesson.level || 'A1',
          videoDuration: lesson.videoDuration || 0
        });
        
        // Load JSON and convert to SRT
        if (lesson.json) {
          try {
            const jsonRes = await fetch(lesson.json);
            if (jsonRes.ok) {
              const jsonData = await jsonRes.json();
              const srt = convertJSONtoSRT(jsonData);
              setSrtText(srt);
            }
          } catch (e) {
            console.error('Error loading JSON:', e);
          }
        }
      } else {
        toast.error('Lektion nicht gefunden');
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      toast.error('Fehler beim Laden der Lektion');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isNewLesson && id) {
      loadLesson(id);
    }
  }, [id, isNewLesson, loadLesson]);

  const validateSRT = (text) => {
    if (!text.trim()) return true;
    const lines = text.trim().split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        i++;
        continue;
      }
      const indexLine = lines[i].trim();
      if (!/^\d+$/.test(indexLine)) return false;
      i++;
      if (i >= lines.length) return false;
      const timeLine = lines[i].trim();
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) return false;
      i++;
      let hasText = false;
      while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
        if (lines[i].trim()) hasText = true;
        i++;
      }
      if (!hasText) return false;
    }
    return true;
  };

  const handleTranscribe = async () => {
    if (audioSource === 'file' && !audioFile) {
      toast.error('Bitte wählen Sie eine Audio-Datei aus');
      return;
    }
    if (audioSource === 'url' && !audioUrl.trim()) {
      toast.error('Bitte geben Sie eine Audio-URL ein');
      return;
    }

    setTranscribing(true);
    try {
      const formData = new FormData();
      if (audioSource === 'url') {
        formData.append('url', audioUrl);
      } else {
        formData.append('audio', audioFile);
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Transcription failed');
      }

      const data = await res.json();
      setSrtText(data.srt);
      toast.success('SRT erfolgreich aus Audio generiert!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Fehler bei der Transkription: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleGetYouTubeSRT = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Bitte geben Sie eine YouTube-URL ein');
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
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || `SRT erfolgreich von YouTube geladen!`);
    } catch (error) {
      console.error('YouTube SRT error:', error);
      toast.error('Fehler beim Laden von SRT von YouTube: ' + error.message);
    } finally {
      setFetchingYouTubeSRT(false);
    }
  };

  const handleGetSRTShort = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Bitte geben Sie eine YouTube-URL ein');
      return;
    }

    setFetchingSRTShort(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/get-youtube-srt-short', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get SRT Short');
      }

      const data = await res.json();
      setSrtText(data.srt);
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || 'SRT Short loaded!');
    } catch (error) {
      console.error('SRT Short error:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setFetchingSRTShort(false);
    }
  };

  const handleGetWhisperSRT = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Bitte geben Sie eine YouTube-URL ein');
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
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || 'SRT từ Whisper AI đã được tạo!');
    } catch (error) {
      console.error('Whisper SRT error:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setFetchingWhisperSRT(false);
    }
  };

  const handleGetWhisperV2 = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Bitte geben Sie eine YouTube-URL ein');
      return;
    }

    setFetchingWhisperV2(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/whisper-youtube-srt-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get Whisper v2 SRT');
      }

      const data = await res.json();
      setSrtText(data.srt);
      if (data.videoDuration) {
        setFormData(prev => ({ ...prev, videoDuration: data.videoDuration }));
      }
      if (data.videoTitle) {
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || 'Whisper v2 SRT đã được tạo!');
    } catch (error) {
      console.error('Whisper v2 error:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setFetchingWhisperV2(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (!isNewLesson && !formData.id.trim()) newErrors.id = 'ID ist erforderlich';
    if (!formData.title.trim()) newErrors.title = 'Titel ist erforderlich';
    if (!formData.description.trim()) newErrors.description = 'Beschreibung ist erforderlich';
    if (!formData.level) newErrors.level = 'Niveau ist erforderlich';

    // For new lessons, require audio and SRT
    if (isNewLesson) {
      if (audioSource === 'file' && !audioFile) newErrors.audio = 'Audio-Datei ist erforderlich';
      if (audioSource === 'url' && !audioUrl.trim()) newErrors.audio = 'Audio-URL ist erforderlich';
      if (audioSource === 'youtube' && !youtubeUrl.trim()) newErrors.audio = 'YouTube-URL ist erforderlich';
      if (!srtText.trim()) newErrors.srt = 'SRT-Text ist erforderlich';
    }

    // Validate SRT format
    if (srtText.trim() && !validateSRT(srtText)) {
      newErrors.srt = 'Ungültiges SRT-Format';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    // Upload files and save lesson
    try {
      setUploading(true);

      let finalAudioPath = '';
      let finalJsonPath = '';
      let finalYoutubeUrl = '';
      let finalThumbnailPath = '';

      if (isNewLesson) {
        if (audioSource === 'youtube') {
          finalYoutubeUrl = youtubeUrl.trim();
        } else {
          // Upload audio
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

          // Upload thumbnail if provided
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
          body: JSON.stringify({ srtText, lessonId: formData.id })
        });

        if (!srtRes.ok) throw new Error('Convert SRT failed');
        const srtData = await srtRes.json();
        finalJsonPath = srtData.url;
      }

      // Save lesson
      const token = localStorage.getItem('token');
      const url = '/api/lessons';
      const method = isNewLesson ? 'POST' : 'PUT';

      let lessonData;
      if (isNewLesson) {
        lessonData = {
          ...formData,
          audio: finalAudioPath || 'youtube',
          json: finalJsonPath,
          youtubeUrl: finalYoutubeUrl || undefined,
          thumbnail: finalThumbnailPath || undefined,
          videoDuration: formData.videoDuration || undefined
        };
      } else {
        // Update SRT/JSON if changed
        if (srtText.trim()) {
          const srtRes = await fetch('/api/convert-srt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ srtText, lessonId: formData.id })
          });
          if (!srtRes.ok) throw new Error('Convert SRT failed');
        }
        
        lessonData = {
          title: formData.title,
          description: formData.description,
          level: formData.level,
          videoDuration: formData.videoDuration || undefined
        };
      }

      const requestBody = isNewLesson ? lessonData : { id: formData.id, ...lessonData };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) throw new Error('Lektion konnte nicht gespeichert werden');

      toast.success(isNewLesson ? 'Lektion erfolgreich erstellt!' : 'Lektion erfolgreich aktualisiert!');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className={styles.loadingState}>Lädt...</div>
      </AdminDashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{isNewLesson ? 'Neue Lektion' : 'Lektion bearbeiten'} - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              {isNewLesson ? '➕ Neue Lektion erstellen' : '✏️ Lektion bearbeiten'}
            </h1>
            <p className={styles.pageSubtitle}>
              {isNewLesson
                ? 'Füllen Sie alle Felder aus, um eine neue Lektion zu erstellen'
                : 'Bearbeiten Sie die Lektionsinformationen'}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className={styles.secondaryButton}
          >
            ← Zurück
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Submit Buttons at Top */}
          {isNewLesson && (
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => router.push('/admin/dashboard')}
                className={styles.cancelButton}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={uploading}
                className={styles.submitButton}
              >
                {uploading ? '⏳ Speichert...' : '➕ Lektion erstellen'}
              </button>
            </div>
          )}

          {/* Audio & SRT (only for new lessons) */}
          {isNewLesson && (
            <>
              <div className={styles.formSectionCompact}>
                <div className={styles.sourceRow}>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className={styles.levelSelect}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="youtube"
                      checked={audioSource === 'youtube'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    YouTube
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="file"
                      checked={audioSource === 'file'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    Audio
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="url"
                      checked={audioSource === 'url'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    URL
                  </label>
                </div>

                {audioSource === 'youtube' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>YouTube URL *</label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={styles.input}
                    />
                    {formData.videoDuration > 0 && (
                      <small className={styles.helperText}>
                        ⏱️ Dauer: {Math.floor(formData.videoDuration / 60)}:{(formData.videoDuration % 60).toString().padStart(2, '0')}
                      </small>
                    )}
                  </div>
                )}

                {audioSource === 'file' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Audio-Datei *</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className={styles.fileInput}
                    />
                    {audioFile && <span className={styles.fileName}>📎 {audioFile.name}</span>}
                  </div>
                )}

                {audioSource === 'url' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Audio-URL *</label>
                    <input
                      type="url"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://example.com/audio.mp3"
                      className={styles.input}
                    />
                  </div>
                )}

                {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}

                <div className={styles.srtActions}>
                  {audioSource === 'youtube' && (
                    <>
                      <button
                        type="button"
                        onClick={handleGetYouTubeSRT}
                        disabled={fetchingYouTubeSRT || !youtubeUrl.trim()}
                        className={styles.actionButton}
                      >
                        {fetchingYouTubeSRT ? '⏳...' : '📺 SRT 16w'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGetSRTShort}
                        disabled={fetchingSRTShort || !youtubeUrl.trim()}
                        className={styles.actionButton}
                      >
                        {fetchingSRTShort ? '⏳...' : '📺 SRT 10w'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGetWhisperSRT}
                        disabled={fetchingWhisperSRT || !youtubeUrl.trim()}
                        className={styles.actionButton}
                        title="Whisper + GPT (có thể mất từ)"
                      >
                        {fetchingWhisperSRT ? '⏳...' : '🎙️ Whisper'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGetWhisperV2}
                        disabled={fetchingWhisperV2 || !youtubeUrl.trim()}
                        className={styles.actionButton}
                        title="Whisper v2: 6-14 từ/câu, không mất từ, timestamp chính xác"
                      >
                        {fetchingWhisperV2 ? '⏳...' : '🎙️ Whisper v2'}
                      </button>
                    </>
                  )}

                  {audioSource !== 'youtube' && (
                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={transcribing || (!audioFile && !audioUrl.trim())}
                      className={styles.actionButton}
                    >
                      {transcribing ? '⏳ Generiere...' : '🎙️ SRT aus Audio generieren'}
                    </button>
                  )}
                </div>
              </div>

              {audioSource !== 'youtube' && (
                <div className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>🖼️ Thumbnail (Optional)</h2>
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
                    <div style={{ position: 'relative', width: '300px', height: '200px' }}>
                      <Image
                        src={thumbnailPreview}
                        alt="Thumbnail Preview"
                        fill
                        sizes="300px"
                        quality={85}
                        style={{ objectFit: 'cover', borderRadius: '10px' }}
                        className={styles.thumbnailPreview}
                        priority
                      />
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formSectionCompact}>
                <label className={styles.label}>📝 Untertitel (SRT) *</label>
                <textarea
                  value={srtText}
                  onChange={(e) => setSrtText(e.target.value)}
                  className={`${styles.textarea} ${styles.srtTextarea} ${errors.srt ? styles.error : ''}`}
                  placeholder="1&#10;00:00:03,200 --> 00:00:04,766&#10;DW Deutsch lernen"
                  rows={6}
                />
                {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
              </div>
            </>
          )}

          {/* Basic Information */}
          <div className={styles.formSectionCompact}>
            <div className={styles.formRowCompact}>
              {!isNewLesson && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Level *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className={`${styles.select} ${errors.level ? styles.error : ''}`}
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Titel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    const newId = isNewLesson ? generateIdFromTitle(newTitle) : formData.id;
                    setFormData({ ...formData, title: newTitle, id: newId });
                  }}
                  className={`${styles.input} ${errors.title ? styles.error : ''}`}
                  placeholder="Titel"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Beschreibung *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${styles.input} ${errors.description ? styles.error : ''}`}
                  placeholder="Beschreibung"
                />
              </div>
              {!isNewLesson && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>ID</label>
                  <input type="text" value={formData.id} disabled className={styles.input} />
                </div>
              )}
            </div>
          </div>

          {!isNewLesson && (
            <>
              <div className={styles.formSectionCompact}>
                <label className={styles.label}>📝 SRT bearbeiten</label>
                <textarea
                  value={srtText}
                  onChange={(e) => setSrtText(e.target.value)}
                  className={`${styles.textarea} ${styles.srtTextarea} ${errors.srt ? styles.error : ''}`}
                  placeholder="SRT Text..."
                  rows={8}
                />
                {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
              </div>

              {/* Submit Buttons for Edit */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => router.push('/admin/dashboard')}
                  className={styles.cancelButton}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={styles.submitButton}
                >
                  {uploading ? '⏳ Speichert...' : '✏️ Aktualisieren'}
                </button>
              </div>
            </>
          )}
        </form>
      </AdminDashboardLayout>
    </>
  );
}

export default function LessonForm() {
  return (
    <ProtectedPage requireAdmin={true}>
      <LessonFormPage />
    </ProtectedPage>
  );
}
