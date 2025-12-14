import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import ProgressIndicator from './ProgressIndicator';
import Step1BasicInfo from './LessonWizardSteps/Step1BasicInfo';
import Step2AudioSource from './LessonWizardSteps/Step2AudioSource';
import Step3Transcript from './LessonWizardSteps/Step3Transcript';
import Step4ReviewPublish from './LessonWizardSteps/Step4ReviewPublish';
import styles from '../../styles/wizardStyles.module.css';

/**
 * LessonWizard - Main Wizard Container
 * 
 * Quản lý:
 * - State cho tất cả 4 steps
 * - Navigation giữa các steps
 * - Validation
 * - Submit logic
 */
const LessonWizard = ({ categories = [], loadingCategories = false }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
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

  // Audio Source State
  const [audioSource, setAudioSource] = useState('youtube');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Transcript State
  const [srtText, setSrtText] = useState('');
  const [whisperV3Segments, setWhisperV3Segments] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [fetchingYouTubeSRT, setFetchingYouTubeSRT] = useState(false);
  const [fetchingWhisperSRT, setFetchingWhisperSRT] = useState(false);
  const [fetchingWhisperV3, setFetchingWhisperV3] = useState(false);

  // Thumbnail State
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Errors
  const [errors, setErrors] = useState({});

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Tiêu đề không được để trống';
        if (!formData.description.trim()) newErrors.description = 'Mô tả không được để trống';
        if (!formData.level) newErrors.level = 'Vui lòng chọn cấp độ';
        break;

      case 2:
        if (audioSource === 'youtube' && !youtubeUrl.trim()) {
          newErrors.audio = 'Vui lòng nhập YouTube URL';
        }
        if (audioSource === 'file' && !audioFile) {
          newErrors.audio = 'Vui lòng chọn file audio';
        }
        if (audioSource === 'url' && !audioUrl.trim()) {
          newErrors.audio = 'Vui lòng nhập Audio URL';
        }
        break;

      case 3:
        if (!srtText.trim()) newErrors.srt = 'Vui lòng tạo hoặc nhập SRT';
        break;

      case 4:
        // Final validation
        if (!formData.title.trim()) newErrors.title = 'Thiếu tiêu đề';
        if (!srtText.trim()) newErrors.srt = 'Thiếu transcript';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Vui lòng hoàn thành thông tin bắt buộc');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step) => {
    // Allow going back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // Convert JSON to SRT helper
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

  // Transcript generation handlers
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
      toast.success('SRT đã được tạo thành công!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Lỗi khi tạo transcript: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

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
        const generateIdFromTitle = (title) => {
          return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        };
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || 'SRT đã được tải từ YouTube!');
    } catch (error) {
      console.error('YouTube SRT error:', error);
      toast.error('Lỗi khi tải SRT từ YouTube: ' + error.message);
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
        const generateIdFromTitle = (title) => {
          return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        };
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
      toast.error('Lỗi: ' + error.message);
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
        const generateIdFromTitle = (title) => {
          return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        };
        const newId = generateIdFromTitle(data.videoTitle);
        setFormData(prev => ({ 
          ...prev, 
          title: data.videoTitle,
          description: data.videoTitle,
          id: newId
        }));
      }
      toast.success(data.message || 'Whisper v3 (word-level) đã được tạo!');
    } catch (error) {
      console.error('Whisper v3 error:', error);
      toast.error('Lỗi: ' + error.message);
    } finally {
      setFetchingWhisperV3(false);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Vui lòng hoàn thành tất cả thông tin');
      return;
    }

    setUploading(true);
    try {
      let finalAudioPath = '';
      let finalJsonPath = '';
      let finalYoutubeUrl = '';
      let finalThumbnailPath = '';

      // Upload audio if not YouTube
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
      toast.error('Lỗi: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            formData={formData}
            onChange={setFormData}
            errors={errors}
            categories={categories}
            loadingCategories={loadingCategories}
          />
        );

      case 2:
        return (
          <Step2AudioSource
            formData={formData}
            onChange={setFormData}
            audioSource={audioSource}
            onAudioSourceChange={setAudioSource}
            audioFile={audioFile}
            onAudioFileChange={setAudioFile}
            audioUrl={audioUrl}
            onAudioUrlChange={setAudioUrl}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            thumbnailFile={thumbnailFile}
            onThumbnailFileChange={setThumbnailFile}
            thumbnailPreview={thumbnailPreview}
            onThumbnailPreviewChange={setThumbnailPreview}
            errors={errors}
          />
        );

      case 3:
        return (
          <Step3Transcript
            srtText={srtText}
            onSrtTextChange={setSrtText}
            audioSource={audioSource}
            youtubeUrl={youtubeUrl}
            audioFile={audioFile}
            audioUrl={audioUrl}
            transcribing={transcribing}
            onTranscribe={handleTranscribe}
            fetchingYouTubeSRT={fetchingYouTubeSRT}
            onGetYouTubeSRT={handleGetYouTubeSRT}
            fetchingWhisperSRT={fetchingWhisperSRT}
            onGetWhisperSRT={handleGetWhisperSRT}
            fetchingWhisperV3={fetchingWhisperV3}
            onGetWhisperV3={handleGetWhisperV3}
            errors={errors}
          />
        );

      case 4:
        return (
          <Step4ReviewPublish
            formData={formData}
            audioSource={audioSource}
            youtubeUrl={youtubeUrl}
            audioFile={audioFile}
            audioUrl={audioUrl}
            srtText={srtText}
            thumbnailFile={thumbnailFile}
            categories={categories}
            uploading={uploading}
            onSubmit={handleSubmit}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.wizardContainer}>
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} totalSteps={4} />

      {/* Step Content */}
      <div className={styles.wizardContent}>
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className={styles.wizardActions}>
        <button
          type="button"
          onClick={() => router.push('/admin/dashboard')}
          className={styles.cancelButton}
          disabled={uploading}
        >
          ← Hủy
        </button>

        <div className={styles.navButtons}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className={styles.previousButton}
              disabled={uploading}
            >
              ← Quay lại
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.nextButton}
            >
              Tiếp theo →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitButton}
              disabled={uploading}
            >
              {uploading ? '⏳ Đang xuất bản...' : '✅ Xuất bản bài học'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonWizard;
