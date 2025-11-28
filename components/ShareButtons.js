import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/ShareButtons.module.css';

const ShareButtons = ({ url, title, description }) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  // Get current URL if not provided
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'PapaGeil - Deutsch Lernen';
  const shareDescription = description || 'Lerne Deutsch mit interaktiven Lektionen';

  const handleShare = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedDescription = encodeURIComponent(shareDescription);

    let shareLink = '';

    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`;
        break;
      default:
        return;
    }

    if (platform === 'email') {
      window.location.href = shareLink;
    } else {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <div className={styles.shareButtons}>
      <div className={styles.shareTitle}>{t('shareButtons.title')}</div>
      
      <div className={styles.buttonGroup}>
        <button
          onClick={() => handleShare('facebook')}
          className={`${styles.shareButton} ${styles.facebook}`}
          aria-label={t('shareButtons.facebook')}
          title={t('shareButtons.facebook')}
        >
          <span>📘</span>
        </button>

        <button
          onClick={() => handleShare('twitter')}
          className={`${styles.shareButton} ${styles.twitter}`}
          aria-label={t('shareButtons.twitter')}
          title={t('shareButtons.twitter')}
        >
          <span>🐦</span>
        </button>

        <button
          onClick={() => handleShare('linkedin')}
          className={`${styles.shareButton} ${styles.linkedin}`}
          aria-label={t('shareButtons.linkedin')}
          title={t('shareButtons.linkedin')}
        >
          <span>💼</span>
        </button>

        <button
          onClick={() => handleShare('whatsapp')}
          className={`${styles.shareButton} ${styles.whatsapp}`}
          aria-label={t('shareButtons.whatsapp')}
          title={t('shareButtons.whatsapp')}
        >
          <span>💬</span>
        </button>

        <button
          onClick={() => handleShare('telegram')}
          className={`${styles.shareButton} ${styles.telegram}`}
          aria-label={t('shareButtons.telegram')}
          title={t('shareButtons.telegram')}
        >
          <span>✈️</span>
        </button>

        <button
          onClick={() => handleShare('email')}
          className={`${styles.shareButton} ${styles.email}`}
          aria-label={t('shareButtons.email')}
          title={t('shareButtons.email')}
        >
          <span>📧</span>
        </button>

        <div className={styles.copyLinkWrapper}>
          <button
            onClick={handleCopyLink}
            className={`${styles.shareButton} ${styles.copy}`}
            aria-label={t('shareButtons.copyLink')}
            title={t('shareButtons.copyLink')}
          >
            <span>🔗</span>
          </button>
          {showTooltip && (
            <div className={styles.tooltip}>{t('shareButtons.linkCopied')}</div>
          )}
        </div>

        {/* Native Share API for mobile */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleNativeShare}
            className={`${styles.shareButton} ${styles.more}`}
            aria-label={t('shareButtons.moreOptions')}
            title={t('shareButtons.moreOptions')}
          >
            <span>⋯</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ShareButtons;
