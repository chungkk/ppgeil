import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import AvatarCropper from './AvatarCropper';
import styles from '../styles/UserProfileSidebar.module.css';

export default function UserProfileSidebar({ stats, userPoints = 0 }) {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropCancel = () => {
    setCropperImage(null);
  };

  const handleCropSave = async (croppedBlob) => {
    setCropperImage(null);
    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', croppedBlob, 'avatar.jpg');

      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        await refreshUser();
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi upload avatar');
      }
    } catch {
      alert('Lỗi upload avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {cropperImage && (
        <AvatarCropper
          image={cropperImage}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}
      
      <aside className={styles.profileSidebar}>
        {/* User Identity */}
        <div className={styles.userIdentity}>
          <div 
            className={`${styles.userAvatar} ${styles.clickable}`}
            onClick={handleAvatarClick}
            title="Nhấn để đổi ảnh đại diện"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className={styles.avatarImage}
              />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
            <div className={styles.avatarOverlay}>
              {uploading ? '...' : '📷'}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <h2 className={styles.userName}>
            {user?.name || 'User'}
          </h2>
        </div>

      {/* Points */}
      <div className={styles.pointsSection}>
        <span className={styles.pointsIcon}>💎</span>
        <span className={styles.pointsValue}>{userPoints}</span>
      </div>

      {/* Simple Stats */}
      <div className={styles.statsGridSection}>
        <div className={styles.statsGrid}>
          <div className={`${styles.statItem} ${styles.lessons}`}>
            <span className={styles.statItemIcon}>🎓</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Đã học</span>
              <span className={styles.statItemValue}>{stats?.totalLessons || 0}</span>
            </div>
          </div>
          <div className={`${styles.statItem} ${styles.lessons}`}>
            <span className={styles.statItemIcon}>✅</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Hoàn thành</span>
              <span className={styles.statItemValue}>{stats?.completedLessons || 0}</span>
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
