import { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import AvatarCropper from './AvatarCropper';
import styles from '../styles/UserProfileSidebar.module.css';

export default function UserProfileSidebar({ stats, userPoints = 0, achievements = [] }) {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [avatarKey, setAvatarKey] = useState(Date.now());
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
        setAvatarKey(Date.now());
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
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
        <div className={styles.profileCard}>
          {/* Avatar */}
          <div
            className={`${styles.userAvatar} ${styles.clickable}`}
            onClick={handleAvatarClick}
            title="Nhấn để đổi ảnh đại diện"
          >
            {user?.avatar ? (
              <Image
                src={`${user.avatar}?t=${avatarKey}`}
                alt={user.name}
                fill
                sizes="100px"
                className={styles.avatarImage}
                unoptimized
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

          {/* Name */}
          <h2 className={styles.userName}>{user?.name || 'User'}</h2>

          {/* Points */}
          <div className={styles.pointsBadge}>
            <span className={styles.pointsIcon}>💎</span>
            <span className={styles.pointsValue}>{(userPoints ?? 0).toLocaleString()}</span>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className={styles.achievementsSection}>
              <h3 className={styles.achievementsTitle}>
                <span>🏅</span> Thành tích
              </h3>
              <div className={styles.achievementsGrid}>
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`${styles.achievementItem} ${!achievement.unlocked ? styles.locked : ''}`}
                  >
                    <span className={styles.achievementIcon}>{achievement.icon}</span>
                    <span className={styles.achievementName}>{achievement.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
