import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import ProtectedPage from '../../components/ProtectedPage';
import { useTheme } from '../../context/ThemeContext';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import { SkeletonStats, SkeletonTable } from '../../components/SkeletonLoader';
import { NoLessonsFound } from '../../components/EmptyState';
import styles from '../../styles/adminDashboard.module.css';


function AdminDashboardContent() {
  const router = useRouter();
  const { currentTheme, nextTheme, toggleTheme } = useTheme();
  const [lessons, setLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: '',
    level: 'A1'
  });

  const generateIdFromTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove special chars except spaces
      .replace(/\s+/g, '-') // replace spaces with -
      .replace(/-+/g, '-') // replace multiple - with single
      .replace(/^-|-$/g, ''); // remove leading/trailing -
  };
  const [audioFile, setAudioFile] = useState(null);
  const [audioSource, setAudioSource] = useState('file');
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [srtText, setSrtText] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
   const [uploading, setUploading] = useState(false);
   const [transcribing, setTranscribing] = useState(false);
   const [fetchingYouTubeSRT, setFetchingYouTubeSRT] = useState(false);
   const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');
   const [unusedFiles, setUnusedFiles] = useState({ audio: [], json: [] });
   const [oldFiles, setOldFiles] = useState({ audio: [], json: [] });
   const [deletingFiles, setDeletingFiles] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLessons();
    loadUnusedFiles();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search term changes
  }, [searchTerm]);

  const validateSRT = (text) => {
    if (!text.trim()) return true; // optional
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

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lessons?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const responseData = await res.json();
      // Handle both old array format and new object format
      const data = Array.isArray(responseData) 
        ? responseData.filter(l => l && l._id)
        : (responseData.lessons || []).filter(l => l && l._id);
      setLessons(data);
      setSelectedLessons(new Set()); // Clear selection when lessons are refreshed
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Kann Lektionsliste nicht laden');
    } finally {
      setLoading(false);
    }
  };

  const loadUnusedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnusedFiles(data);
      }
    } catch (error) {
      console.error('Error loading unused files:', error);
    }
  };

  const loadOldFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/old-files?days=3', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOldFiles(data);
      }
    } catch (error) {
      console.error('Error loading old files:', error);
    }
  };

  const deleteOldFiles = async () => {
    if (!confirm('Sind Sie sicher, dass Sie alle Dateien älter als 3 Tage löschen möchten?')) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const allOldFiles = [...oldFiles.audio, ...oldFiles.json];
      if (allOldFiles.length === 0) {
        toast.info('Keine alten Dateien zum Löschen gefunden.');
        return;
      }

      const res = await fetch('/api/unused-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files: allOldFiles })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted.length} alte Dateien gelöscht`);
        if (data.errors.length > 0) {
          toast.warning(`Löschfehler: ${data.errors.join(', ')}`);
        }
        loadUnusedFiles();
        loadOldFiles();
      } else {
        toast.error('Fehler beim Löschen alter Dateien');
      }
    } catch (error) {
      console.error('Error deleting old files:', error);
      toast.error('Fehler beim Löschen alter Dateien');
    } finally {
      setDeletingFiles(false);
    }
  };

  const runScheduledCleanup = async () => {
    if (!confirm('Möchten Sie die geplante Bereinigung jetzt ausführen?')) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/run-cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Bereinigung abgeschlossen: ${data.deletedCount} Dateien gelöscht`);
        loadUnusedFiles();
        loadOldFiles();
      } else {
        toast.error('Fehler bei der Bereinigung');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Fehler bei der Bereinigung');
    } finally {
      setDeletingFiles(false);
    }
  };

  const deleteUnusedFiles = async (files) => {
    if (!confirm(`Sind Sie sicher, dass Sie ${files.length} ungenutzte Dateien löschen möchten?`)) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted.length} Dateien gelöscht`);
        if (data.errors.length > 0) {
          toast.warning(`Löschfehler: ${data.errors.join(', ')}`);
        }
        loadUnusedFiles(); // Refresh
      } else {
        toast.error('Dateilöschfehler');
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Dateilöschfehler');
    } finally {
      setDeletingFiles(false);
    }
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
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
         body: JSON.stringify({
           youtubeUrl: youtubeUrl.trim()
         })
       });

       if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.message || 'Failed to get SRT from YouTube');
       }

       const data = await res.json();
       setSrtText(data.srt);
       toast.success(data.message || `SRT erfolgreich von YouTube geladen! (${data.itemCount} Zeilen)`);
     } catch (error) {
       console.error('YouTube SRT error:', error);
       toast.error('Fehler beim Laden von SRT von YouTube: ' + error.message);
     } finally {
       setFetchingYouTubeSRT(false);
     }
   };

   const handleFileUpload = async () => {
    setUploading(true);
    let audioPath = '';
    let jsonPath = '';
    let thumbnailPath = '';

    try {
      // Upload audio file (required)
      if (audioSource === 'file' && !audioFile) {
        throw new Error('Bitte wählen Sie eine Audio-Datei aus');
      }
      if (audioSource === 'url' && !audioUrl.trim()) {
        throw new Error('Bitte geben Sie eine Audio-URL ein');
      }

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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData
      });

      if (!audioRes.ok) {
        const errorData = await audioRes.json();
        throw new Error(errorData.message || 'Upload audio failed');
      }

      const audioData = await audioRes.json();
      audioPath = audioData.url;

      // Upload thumbnail if provided (optional for audio files)
      if (thumbnailFile) {
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', thumbnailFile);
        thumbnailFormData.append('type', 'thumbnail');

        const thumbnailRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: thumbnailFormData
        });

        if (thumbnailRes.ok) {
          const thumbnailData = await thumbnailRes.json();
          thumbnailPath = thumbnailData.url;
        }
      }

      // Convert SRT to JSON (required)
      if (!srtText.trim()) {
        throw new Error('Bitte geben Sie SRT-Text ein');
      }

      const token = localStorage.getItem('token');
      const srtRes = await fetch('/api/convert-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          srtText: srtText,
          lessonId: formData.id
        })
      });

      if (!srtRes.ok) {
        const errorData = await srtRes.json();
        throw new Error(errorData.message || 'Convert SRT failed');
      }

      const srtData = await srtRes.json();
      jsonPath = srtData.url;

      return {
        audio: audioPath,
        json: jsonPath,
        thumbnail: thumbnailPath
      };
    } catch (error) {
        throw new Error('Upload/Konvertierungsfehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (editingLesson && !formData.id.trim()) newErrors.id = 'ID ist erforderlich';
    if (!formData.title.trim()) newErrors.title = 'Titel ist erforderlich';
    if (!formData.displayTitle.trim()) newErrors.displayTitle = 'Anzeigetitel ist erforderlich';
    if (!formData.description.trim()) newErrors.description = 'Beschreibung ist erforderlich';
    if (!formData.level) newErrors.level = 'Niveau ist erforderlich';

    // For new lessons, require both audio file/URL and SRT text
    if (!editingLesson) {
      if (audioSource === 'file' && !audioFile) newErrors.audio = 'Audio file là bắt buộc';
      if (audioSource === 'url' && !audioUrl.trim()) newErrors.audio = 'Audio URL là bắt buộc';
      if (audioSource === 'youtube' && !youtubeUrl.trim()) newErrors.audio = 'YouTube URL là bắt buộc';
      if (!srtText.trim()) newErrors.srt = 'SRT text là bắt buộc';
    }

    // Validate SRT format if provided
    if (srtText.trim() && !validateSRT(srtText)) {
      newErrors.srt = 'Ungültiges SRT-Format';
    }

    setErrors(newErrors);
    setGeneralError('');
    if (Object.keys(newErrors).length > 0) return;

    // Upload audio and convert SRT
    let finalAudioPath = '';
    let finalJsonPath = '';
    let finalYoutubeUrl = '';
    let finalThumbnailPath = '';

    if (!editingLesson) {
      try {
        if (audioSource === 'youtube') {
          // For YouTube, just save the URL directly
          finalYoutubeUrl = youtubeUrl.trim();
          finalAudioPath = ''; // No audio file for YouTube
          
          // Still need to convert SRT to JSON
          const token = localStorage.getItem('token');
          const srtRes = await fetch('/api/convert-srt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              srtText: srtText,
              lessonId: formData.id
            })
          });

          if (!srtRes.ok) {
            const errorData = await srtRes.json();
            throw new Error(errorData.message || 'Convert SRT failed');
          }

          const srtData = await srtRes.json();
          finalJsonPath = srtData.url;
        } else {
          const uploadResult = await handleFileUpload();
          finalAudioPath = uploadResult.audio;
          finalJsonPath = uploadResult.json;
          finalThumbnailPath = uploadResult.thumbnail;
        }
      } catch (error) {
        setGeneralError(error.message);
        return;
      }
    }

    // Check if lesson ID already exists (for new lessons)
    if (!editingLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setGeneralError('Token existiert nicht. Bitte melden Sie sich erneut an.');
          return;
        }

        const checkRes = await fetch('/api/lessons', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!checkRes.ok) {
          if (checkRes.status === 401) {
            setGeneralError('Ungültiges Token. Bitte melden Sie sich erneut an.');
            return;
          }
          throw new Error('Kann ID nicht überprüfen');
        }

        const responseData = await checkRes.json();
        // Handle both old array format and new object format
        const lessonsArray = Array.isArray(responseData) 
          ? responseData 
          : (responseData.lessons || []);
        const existingLessons = lessonsArray.filter(l => l && l._id);
        const idExists = existingLessons.some(lesson => lesson.id === formData.id);
        if (idExists) {
          setGeneralError(`ID "${formData.id}" existiert bereits. Bitte wählen Sie eine andere ID.`);
          return;
        }
      } catch (error) {
        console.error('Error checking existing lessons:', error);
        setGeneralError('Fehler bei ID-Überprüfung: ' + error.message);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setGeneralError('Token existiert nicht. Bitte melden Sie sich erneut an.');
        return;
      }

       let lessonData;
       if (editingLesson) {
         lessonData = {
           title: formData.title,
           displayTitle: formData.displayTitle,
           description: formData.description,
           level: formData.level
         };
       } else {
         lessonData = {
           ...formData,
           audio: finalAudioPath || 'youtube',
           json: finalJsonPath,
           youtubeUrl: finalYoutubeUrl || undefined,
           thumbnail: finalThumbnailPath || undefined
         };
       }



      const url = '/api/lessons';
      const method = editingLesson ? 'PUT' : 'POST';

       const requestBody = editingLesson ? { id: editingLesson._id, ...lessonData } : lessonData;
       const res = await fetch(url, {
         method,
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify(requestBody)
       });


       if (!res.ok) {
        const errorData = await res.json();
        console.error('Save lesson error:', errorData);
        throw new Error(errorData.message || 'Lektion konnte nicht gespeichert werden');
      }

      toast.success(editingLesson ? 'Erfolgreich aktualisiert!' : 'Lektion erfolgreich hinzugefügt!');
      setShowForm(false);
      setEditingLesson(null);
      resetForm();
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      id: lesson.id,
      title: lesson.title,
      displayTitle: lesson.displayTitle,
      description: lesson.description,
      level: lesson.level || 'A1'
    });
    // Note: Audio and JSON paths are stored in lesson but not editable
    setShowForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Lektion löschen möchten?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token existiert nicht. Bitte melden Sie sich erneut an.');
        return;
      }

      const res = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lektion konnte nicht gelöscht werden');
      }

      toast.success('Erfolgreich gelöscht!');
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedLessons.size === paginatedLessons.length) {
      // Unselect all on current page
      const newSelected = new Set(selectedLessons);
      paginatedLessons.forEach(lesson => newSelected.delete(lesson._id));
      setSelectedLessons(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedLessons);
      paginatedLessons.forEach(lesson => newSelected.add(lesson._id));
      setSelectedLessons(newSelected);
    }
  };

  const handleSelectLesson = (lessonId) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLessons.size === 0) {
      toast.error('Bitte wählen Sie mindestens eine Lektion aus');
      return;
    }

    if (!confirm(`Sind Sie sicher, dass Sie ${selectedLessons.size} Lektion(en) löschen möchten?`)) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token existiert nicht. Bitte melden Sie sich erneut an.');
        return;
      }

      const res = await fetch('/api/lessons', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: Array.from(selectedLessons) })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lektionen konnten nicht gelöscht werden');
      }

      toast.success(`${selectedLessons.size} Lektion(en) erfolgreich gelöscht!`);
      setSelectedLessons(new Set());
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      displayTitle: '',
      description: '',
      level: 'A1'
    });
    setAudioFile(null);
    setAudioSource('file');
    setAudioUrl('');
    setYoutubeUrl('');
     setSrtText('');
     setThumbnailFile(null);
     setThumbnailPreview(null);
     setErrors({});
     setGeneralError('');
     setFetchingYouTubeSRT(false);
  };

  // Filter lessons based on search term
  const filteredLessons = lessons.filter(lesson =>
    lesson.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.level && lesson.level.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredLessons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLessons = filteredLessons.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <Head>
        <title>Admin-Dashboard - PapaGeil</title>
      </Head>
      
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Admin-Dashboard</h1>
            <p className={styles.subtitle}>Verwalten Sie Lektionen, Audio und Dateien</p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              title={nextTheme ? `Theme wechseln: ${nextTheme.label}` : 'Theme wechseln'}
              aria-label={nextTheme ? `Theme wechseln: ${nextTheme.label}` : 'Theme wechseln'}
            >
              <span className={styles.themeToggleEmoji} aria-hidden="true">
                {currentTheme?.emoji || '🎨'}
              </span>
              <span className={styles.themeToggleText}>
                {nextTheme ? `Zu ${nextTheme.label}` : 'Theme wechseln'}
              </span>
            </button>
          </div>
        </div>

        {/* Tabs and Add Button */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('lessons')}
            style={{
              padding: '10px 20px',
              border: activeTab === 'lessons' ? '2px solid #667eea' : '2px solid #e0e0e0',
              background: activeTab === 'lessons' ? '#667eea' : 'white',
              color: activeTab === 'lessons' ? 'white' : '#666',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📚 Lektionen verwalten
          </button>
           <button
             onClick={() => {
               setActiveTab('files');
               loadUnusedFiles();
               loadOldFiles();
             }}
            style={{
              padding: '10px 20px',
              border: activeTab === 'files' ? '2px solid #667eea' : '2px solid #e0e0e0',
              background: activeTab === 'files' ? '#667eea' : 'white',
              color: activeTab === 'files' ? 'white' : '#666',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🗂️ Dateien verwalten ({unusedFiles.audio.length + unusedFiles.json.length})
          </button>
           <div style={{ flex: 1 }}></div> {/* Spacer */}
           {selectedLessons.size > 0 && (
             <button
               onClick={handleDeleteSelected}
               style={{
                 padding: '10px 20px',
                 background: '#f44336',
                 color: 'white',
                 border: 'none',
                 borderRadius: '8px',
                 cursor: 'pointer',
                 marginRight: '10px'
               }}
             >
               🗑️ {selectedLessons.size} löschen
             </button>
           )}
           <button
             onClick={() => {
               setShowForm(!showForm);
               setEditingLesson(null);
               resetForm();
             }}
             className={styles.addButton}
           >
             {showForm ? '✕ Formular schließen' : '+ Neue Lektion hinzufügen'}
           </button>
        </div>

        {activeTab === 'lessons' && (
          <>
            {/* Statistics Section */}
            <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{lessons.length}</div>
               <div className={styles.statLabel}>Gesamt Lektionen</div>
            </div>
          </div>
           <div className={styles.statCard}>
             <div className={styles.statIcon}>✅</div>
             <div className={styles.statContent}>
               <div className={styles.statValue}>{paginatedLessons.length}</div>
                <div className={styles.statLabel}>Auf dieser Seite</div>
             </div>
           </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{showForm ? '1' : '0'}</div>
               <div className={styles.statLabel}>Wird bearbeitet</div>
            </div>
          </div>
         </div>

        {/* Form Section */}
        {showForm && (
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>
                  {editingLesson ? 'Lektion bearbeiten' : 'Neue Lektion hinzufügen'}
              </h2>
              <button
                onClick={() => setFormCollapsed(!formCollapsed)}
                className={styles.collapseButton}
              >
                {formCollapsed ? '🔽 Erweitern' : '🔼 Minimieren'}
              </button>
            </div>

            {!formCollapsed && (
              <>
                {generalError && (
                  <div className={styles.errorMessage}>
                    ⚠️ {generalError}
                  </div>
                )}
            
            <form onSubmit={handleSubmit} className={styles.formGrid}>
               {editingLesson && (
                 <div className={styles.fullWidth}>
                   <label className={styles.label}>
                     ID (wird automatisch aus Titel generiert)
                   </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingLesson}
                    className={`${styles.input} ${errors.id ? styles.error : ''}`}
                     placeholder="Eindeutige ID für die Lektion eingeben"
                  />
                 {errors.id && <span className={styles.errorText}>{errors.id}</span>}
               </div>
               )}

              <div>
                 <label className={styles.label}>
                   Titel (Title)
                 </label>
                 <input
                   type="text"
                   value={formData.title}
                   onChange={(e) => {
                     const newTitle = e.target.value;
                     const newId = editingLesson ? formData.id : generateIdFromTitle(newTitle);
                     setFormData({ ...formData, title: newTitle, id: newId });
                   }}
                   className={`${styles.input} ${errors.title ? styles.error : ''}`}
                    placeholder="Interner Titel"
                 />
                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              </div>

               <div>
                  <label className={styles.label}>
                    Anzeigetitel (Display Title)
                  </label>
                 <input
                   type="text"
                   value={formData.displayTitle}
                   onChange={(e) => setFormData({ ...formData, displayTitle: e.target.value })}
                   className={`${styles.input} ${errors.displayTitle ? styles.error : ''}`}
                    placeholder="Anzeigetitel für Benutzer"
                 />
                 {errors.displayTitle && <span className={styles.errorText}>{errors.displayTitle}</span>}
               </div>

               <div>
                 <label className={styles.label}>
                   Niveau (Level)
                 </label>
                 <select
                   value={formData.level}
                   onChange={(e) => {
                     console.log('Level changed to:', e.target.value);
                     setFormData({ ...formData, level: e.target.value });
                   }}
                   className={`${styles.input} ${errors.level ? styles.error : ''}`}
                 >
                   <option value="A1">A1 - Anfänger</option>
                   <option value="A2">A2 - Elementar</option>
                   <option value="B1">B1 - Mittelstufe</option>
                   <option value="B2">B2 - Oberstufe</option>
                   <option value="C1">C1 - Fortgeschritten</option>
                   <option value="C2">C2 - Muttersprachlich</option>
                 </select>
                 {errors.level && <span className={styles.errorText}>{errors.level}</span>}
               </div>

               <div className={styles.fullWidth}>
                 <label className={styles.label}>
                   Beschreibung (Description)
                 </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
                   placeholder="Kurze Beschreibung der Lektion"
                />
                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
               </div>

               {editingLesson && (
                <div className={`${styles.fullWidth} ${styles.editWarning}`}>
                   <strong>Bearbeitungsmodus:</strong> Sie können nur Lektionsinformationen bearbeiten. Audio und JSON können nicht geändert werden.
                </div>
              )}

               {!editingLesson && (
                 <>
                   <div className={styles.fullWidth}>
                      <label className={styles.label}>
                        📤 Audio-Quelle *
                      </label>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="file"
                             checked={audioSource === 'file'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'file') setAudioUrl('');
                             }}
                           />
                           Datei hochladen
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="url"
                             checked={audioSource === 'url'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'url') {
                                 setAudioFile(null);
                                 setYoutubeUrl('');
                               }
                             }}
                           />
                           URL eingeben
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="youtube"
                             checked={audioSource === 'youtube'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'youtube') {
                                 setAudioFile(null);
                                 setAudioUrl('');
                               }
                             }}
                           />
                           YouTube Video
                         </label>
                      </div>
                       {audioSource === 'file' ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="file"
                             accept="audio/*"
                             onChange={(e) => setAudioFile(e.target.files[0])}
                             className={`${styles.fileInput} ${errors.audio ? styles.error : ''}`}
                           />
                           {audioFile && <span>Ausgewählt: {audioFile.name}</span>}
                           <button
                             onClick={() => setAudioFile(null)}
                             disabled={!audioFile}
                             style={{
                               padding: '4px 8px',
                               background: audioFile ? '#f44336' : '#ccc',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: audioFile ? 'pointer' : 'not-allowed',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         </div>
                       ) : audioSource === 'url' ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="url"
                             value={audioUrl}
                             onChange={(e) => setAudioUrl(e.target.value)}
                             placeholder="https://example.com/audio.mp3"
                             className={`${styles.input} ${errors.audio ? styles.error : ''}`}
                           />
                           {audioUrl.trim() && <span>URL: {audioUrl}</span>}
                           <button
                             onClick={() => setAudioUrl('')}
                             disabled={!audioUrl.trim()}
                             style={{
                               padding: '4px 8px',
                               background: audioUrl.trim() ? '#f44336' : '#ccc',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: audioUrl.trim() ? 'pointer' : 'not-allowed',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         </div>
                       ) : (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="url"
                             value={youtubeUrl}
                             onChange={(e) => setYoutubeUrl(e.target.value)}
                             placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                             className={`${styles.input} ${errors.audio ? styles.error : ''}`}
                           />
                            {youtubeUrl.trim() && <span>YouTube: {youtubeUrl}</span>}
                            <button
                              onClick={() => setYoutubeUrl('')}
                              disabled={!youtubeUrl.trim()}
                              style={{
                                padding: '4px 8px',
                                background: youtubeUrl.trim() ? '#f44336' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: youtubeUrl.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '12px'
                              }}
                            >
                              ✕
                            </button>
                            {youtubeUrl.trim() && (
                              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                                💡 Video phải có phụ đề tự động (CC) hoặc thủ công. Nếu không có, bạn có thể tải SRT từ YouTube thủ công và paste vào ô SRT text.
                              </div>
                            )}
                         </div>
                       )}

                     {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
                   </div>

                   {/* Thumbnail Upload Section - Only for audio files, not YouTube */}
                   {audioSource !== 'youtube' && (
                     <div className={styles.fullWidth}>
                       <label className={styles.label}>
                         🖼️ Thumbnail Bild (Optional für Audio)
                       </label>
                       <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                         Laden Sie ein Thumbnail-Bild für Audio-Dateien hoch. Für YouTube-Videos wird automatisch das Video-Thumbnail verwendet.
                       </p>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <input
                           type="file"
                           accept="image/*"
                           onChange={(e) => {
                             const file = e.target.files[0];
                             setThumbnailFile(file);
                             if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => {
                                 setThumbnailPreview(reader.result);
                               };
                               reader.readAsDataURL(file);
                             }
                           }}
                           className={styles.fileInput}
                         />
                         {thumbnailFile && <span>Ausgewählt: {thumbnailFile.name}</span>}
                         {thumbnailFile && (
                           <button
                             type="button"
                             onClick={() => {
                               setThumbnailFile(null);
                               setThumbnailPreview(null);
                             }}
                             style={{
                               padding: '4px 8px',
                               background: '#f44336',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: 'pointer',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         )}
                       </div>
                       {thumbnailPreview && (
                         <div style={{ marginTop: '10px' }}>
                           <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Vorschau:</p>
                           <Image
                             src={thumbnailPreview}
                             alt="Thumbnail preview"
                             width={300}
                             height={200}
                             style={{
                               maxWidth: '300px',
                               maxHeight: '200px',
                               borderRadius: '8px',
                               border: '2px solid #e0e0e0'
                             }}
                           />
                         </div>
                       )}
                     </div>
                   )}

                   <div className={styles.fullWidth}>
                      <label className={styles.label}>
                        📝 SRT-Text *
                      </label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                         <button
                           type="button"
                           onClick={handleTranscribe}
                           disabled={transcribing || audioSource === 'youtube' || (!audioFile && !(audioSource === 'url' && audioUrl.trim()))}
                           style={{
                            padding: '8px 16px',
                            background: (transcribing || audioSource === 'youtube') ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (transcribing || audioSource === 'youtube' || (!audioFile && !(audioSource === 'url' && audioUrl.trim()))) ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                         >
                          {audioSource === 'youtube' ? '❌ YouTube không hỗ trợ auto-transcribe' : (transcribing ? '⏳ Generiere SRT...' : '🎙️ SRT aus Audio generieren')}
                        </button>
                        {audioSource === 'youtube' && (
                          <button
                            type="button"
                            onClick={handleGetYouTubeSRT}
                            disabled={fetchingYouTubeSRT || !youtubeUrl.trim()}
                            style={{
                              padding: '8px 16px',
                              background: fetchingYouTubeSRT ? '#ccc' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (fetchingYouTubeSRT || !youtubeUrl.trim()) ? 'not-allowed' : 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {fetchingYouTubeSRT ? '⏳ Lade SRT...' : '📺 SRT von YouTube laden'}
                          </button>
                        )}
                      </div>
                     <textarea
                       value={srtText}
                       onChange={(e) => setSrtText(e.target.value)}
                       className={`${styles.textarea} ${errors.srt ? styles.error : ''}`}
                       style={{ minHeight: '200px', fontFamily: 'monospace' }}
                        placeholder={`Beispiel:
1
00:00:03,200 --> 00:00:04,766
DW Deutsch lernen

2
00:00:05,866 --> 00:00:07,133
mit dem Top Thema`}
                     />
                     {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
                     <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                       Text im SRT-Format (SubRip Subtitle) eingeben oder automatisch aus Audio generieren. JSON-Datei wird automatisch aus diesem Text erstellt.
                     </p>
                   </div>
                </>
              )}

               <div className={styles.fullWidth} style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <button
                    type="submit"
                    disabled={uploading || transcribing || fetchingYouTubeSRT}
                    className={styles.submitButton}
                  >
                    {uploading ? '⏳ Wird verarbeitet...' : (editingLesson ? '✏️ Aktualisieren' : '➕ Lektion hinzufügen')}
                  </button>
               </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Lessons List Section */}
        <div className={styles.lessonsSection}>
           <div className={styles.sectionHeader}>
           <h2 className={styles.sectionTitle}>Lektionsliste</h2>
           <div className={styles.lessonCount}>
             {paginatedLessons.length} / {filteredLessons.length} / {lessons.length} Lektionen
           </div>
           </div>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Nach ID, Titel, Beschreibung oder Niveau suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Lädt...</div>
          ) : filteredLessons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📚</div>
              <h3 className={styles.emptyTitle}>
                {searchTerm ? 'Keine passenden Lektionen gefunden' : 'Noch keine Lektionen vorhanden'}
              </h3>
              <p className={styles.emptyText}>
                {searchTerm ? 'Versuchen Sie es mit einem anderen Suchbegriff' : 'Fügen Sie Ihre erste Lektion hinzu!'}
              </p>
            </div>
           ) : (
             <>
               <div className={styles.tableWrapper}>
                 <table className={styles.table}>
                   <thead>
                        <tr>
                           <th style={{ width: '40px' }}>
                             <input
                               type="checkbox"
                               checked={paginatedLessons.length > 0 && paginatedLessons.every(lesson => selectedLessons.has(lesson._id))}
                               onChange={handleSelectAll}
                             />
                           </th>
                           <th>ID</th>
                           <th>Titel</th>
                           <th>Beschreibung</th>
                           <th>Niveau</th>
                           <th style={{ textAlign: 'center' }}>Aktionen</th>
                        </tr>
                   </thead>
                   <tbody>
                     {paginatedLessons.map((lesson) => (
                          <tr key={lesson._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedLessons.has(lesson._id)}
                                onChange={() => handleSelectLesson(lesson._id)}
                              />
                            </td>
                            <td className={styles.lessonId}>{lesson.id}</td>
                            <td className={styles.lessonDisplayTitle}>{lesson.displayTitle}</td>
                            <td className={styles.lessonDescription}>{lesson.description}</td>
                            <td><span className={styles.levelBadge}>{lesson.level || 'A1'}</span></td>
                          <td>
                           <div className={styles.actionButtons}>
                              <button
                                onClick={() => handleEdit(lesson)}
                                className={styles.editButton}
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDelete(lesson._id)}
                                className={styles.deleteButton}
                              >
                                Löschen
                              </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {totalPages > 1 && (
                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px', padding: '20px' }}>
                   <button
                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                     disabled={currentPage === 1}
                     style={{
                       padding: '8px 12px',
                       background: currentPage === 1 ? '#ccc' : '#007bff',
                       color: 'white',
                       border: 'none',
                       borderRadius: '4px',
                       cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                     }}
                   >
                     ‹ Vorherige
                   </button>

                   <span style={{ margin: '0 10px' }}>
                     Seite {currentPage} von {totalPages} ({filteredLessons.length} Lektionen)
                   </span>

                   <button
                     onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                     disabled={currentPage === totalPages}
                     style={{
                       padding: '8px 12px',
                       background: currentPage === totalPages ? '#ccc' : '#007bff',
                       color: 'white',
                       border: 'none',
                       borderRadius: '4px',
                       cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                     }}
                   >
                     Nächste ›
                   </button>
                 </div>
               )}
             </>
           )}
         </div>
          </>
        )}

        {activeTab === 'files' && (
           <div className={styles.lessonsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>📁 Dateien verwalten</h2>
                <div className={styles.lessonCount}>
                  {unusedFiles.audio.length + unusedFiles.json.length} ungenutzte Dateien
                </div>
              </div>

             <div className={styles.filesContent}>
               {/* Auto-delete section */}
               <div className={styles.autoDeleteSection}>
                 <h3 className={styles.autoDeleteTitle}>⏰ Automatische Bereinigung</h3>
                 <p className={styles.autoDeleteText}>
                   Dateien werden automatisch nach 3 Tagen gelöscht, wenn sie nicht verwendet werden.
                   Sie können auch manuell alle alten Dateien löschen.
                 </p>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                   <button
                     onClick={() => deleteOldFiles()}
                     disabled={deletingFiles}
                     style={{
                       padding: '8px 16px',
                       background: deletingFiles ? '#ccc' : '#ffc107',
                       color: '#212529',
                       border: 'none',
                       borderRadius: '6px',
                       cursor: deletingFiles ? 'not-allowed' : 'pointer',
                       fontWeight: 'bold'
                     }}
                   >
                     {deletingFiles ? '⏳ Lösche alte Dateien...' : `🗑️ Alte Dateien löschen (${oldFiles.audio.length + oldFiles.json.length})`}
                   </button>
                   <button
                     onClick={() => runScheduledCleanup()}
                     disabled={deletingFiles}
                     style={{
                       padding: '8px 16px',
                       background: deletingFiles ? '#ccc' : '#17a2b8',
                       color: 'white',
                       border: 'none',
                       borderRadius: '6px',
                       cursor: deletingFiles ? 'not-allowed' : 'pointer',
                       fontSize: '12px'
                     }}
                   >
                     🔄 Jetzt bereinigen
                   </button>
                 </div>
               </div>

               {/* Audio Files Section */}
               <div className={styles.fileTypeSection}>
                 <h3 className={styles.fileTypeHeader}>
                   🎵 Audio-Dateien ({unusedFiles.audio.length})
                 </h3>
                 {unusedFiles.audio.length > 0 ? (
                   <div>
                     <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                       <button
                         onClick={() => deleteUnusedFiles(unusedFiles.audio)}
                         disabled={deletingFiles}
                         style={{
                           padding: '10px 20px',
                           background: deletingFiles ? '#ccc' : '#dc3545',
                           color: 'white',
                           border: 'none',
                           borderRadius: '8px',
                           cursor: deletingFiles ? 'not-allowed' : 'pointer',
                           fontWeight: 'bold'
                         }}
                       >
                         {deletingFiles ? '⏳ Wird gelöscht...' : `🗑️ Alle Audio löschen (${unusedFiles.audio.length})`}
                       </button>
                       <button
                         onClick={() => loadUnusedFiles()}
                         style={{
                           padding: '10px 20px',
                           background: '#6c757d',
                           color: 'white',
                           border: 'none',
                           borderRadius: '8px',
                           cursor: 'pointer'
                         }}
                       >
                         🔄 Aktualisieren
                       </button>
                     </div>
                     <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '8px', padding: '10px' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                         {unusedFiles.audio.map(file => (
                           <div key={file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                             <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{file}</span>
                             <button
                               onClick={() => deleteUnusedFiles([file])}
                               disabled={deletingFiles}
                               style={{
                                 padding: '4px 8px',
                                 background: deletingFiles ? '#ccc' : '#ff6b6b',
                                 color: 'white',
                                 border: 'none',
                                 borderRadius: '4px',
                                 cursor: deletingFiles ? 'not-allowed' : 'pointer',
                                 fontSize: '12px'
                               }}
                             >
                               {deletingFiles ? '...' : '✕'}
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                     <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
                     <p>Keine ungenutzten Audio-Dateien gefunden.</p>
                   </div>
                 )}
               </div>

               {/* JSON Files Section */}
               <div className={styles.fileTypeSection}>
                 <h3 className={styles.fileTypeHeader}>
                   📄 JSON/Text-Dateien ({unusedFiles.json.length})
                 </h3>
                 {unusedFiles.json.length > 0 ? (
                   <div>
                     <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                       <button
                         onClick={() => deleteUnusedFiles(unusedFiles.json)}
                         disabled={deletingFiles}
                         style={{
                           padding: '10px 20px',
                           background: deletingFiles ? '#ccc' : '#dc3545',
                           color: 'white',
                           border: 'none',
                           borderRadius: '8px',
                           cursor: deletingFiles ? 'not-allowed' : 'pointer',
                           fontWeight: 'bold'
                         }}
                       >
                         {deletingFiles ? '⏳ Wird gelöscht...' : `🗑️ Alle JSON löschen (${unusedFiles.json.length})`}
                       </button>
                       <button
                         onClick={() => loadUnusedFiles()}
                         style={{
                           padding: '10px 20px',
                           background: '#6c757d',
                           color: 'white',
                           border: 'none',
                           borderRadius: '8px',
                           cursor: 'pointer'
                         }}
                       >
                         🔄 Aktualisieren
                       </button>
                     </div>
                     <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '8px', padding: '10px' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                         {unusedFiles.json.map(file => (
                           <div key={file} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                             <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{file}</span>
                             <button
                               onClick={() => deleteUnusedFiles([file])}
                               disabled={deletingFiles}
                               style={{
                                 padding: '4px 8px',
                                 background: deletingFiles ? '#ccc' : '#ff6b6b',
                                 color: 'white',
                                 border: 'none',
                                 borderRadius: '4px',
                                 cursor: deletingFiles ? 'not-allowed' : 'pointer',
                                 fontSize: '12px'
                               }}
                             >
                               {deletingFiles ? '...' : '✕'}
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                     <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
                     <p>Keine ungenutzten JSON-Dateien gefunden.</p>
                   </div>
                 )}
               </div>
             </div>
           </div>
         )}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminDashboardContent />
    </ProtectedPage>
  );
}
