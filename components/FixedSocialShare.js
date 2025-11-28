import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/FixedSocialShare.module.css';

const FixedSocialShare = () => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = 'PapaGeil - Deutsch Lernen';
  const shareDescription = 'Lerne Deutsch mit interaktiven Lektionen';

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

  return (
    <div className={`${styles.fixedShareContainer} ${!isVisible ? styles.hidden : ''}`}>
      {isVisible && (
        <>
          <button
            className={`${styles.shareButton} ${styles.share}`}
            aria-label="Share"
            title="Share"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08259 9.19807C7.54305 8.46868 6.71916 8 5.8 8C4.14315 8 2.8 9.34315 2.8 11C2.8 12.6569 4.14315 14 5.8 14C6.71916 14 7.54305 13.5313 8.08259 12.8019L15.0227 16.6294C15.0077 16.7508 15 16.8745 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.081 14 16.2571 14.4687 15.7176 15.1981L8.77732 11.3706C8.79234 11.2492 8.8 11.1255 8.8 11C8.8 10.8745 8.79234 10.7508 8.77732 10.6294L15.7176 6.80193C16.2571 7.53132 17.081 8 18 8Z" fill="currentColor"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('facebook')}
            className={`${styles.shareButton} ${styles.facebook}`}
            aria-label="Facebook"
            title="Facebook"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('twitter')}
            className={`${styles.shareButton} ${styles.twitter}`}
            aria-label="X (Twitter)"
            title="X (Twitter)"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('linkedin')}
            className={`${styles.shareButton} ${styles.linkedin}`}
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('telegram')}
            className={`${styles.shareButton} ${styles.telegram}`}
            aria-label="Telegram"
            title="Telegram"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('whatsapp')}
            className={`${styles.shareButton} ${styles.whatsapp}`}
            aria-label="WhatsApp"
            title="WhatsApp"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('email')}
            className={`${styles.shareButton} ${styles.line}`}
            aria-label="LINE"
            title="LINE"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
          </button>

          <button
            onClick={() => handleShare('email')}
            className={`${styles.shareButton} ${styles.weibo}`}
            aria-label="Weibo"
            title="Weibo"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M10.063 4.5c-.378 0-.755.027-1.118.081C6.918 4.935 5.25 6.54 5.25 8.568c0 .783.298 1.513.826 2.109.528.597 1.242 1.014 2.025 1.177a4.16 4.16 0 0 0 1.962-.056c1.783-.446 2.937-2.098 2.574-3.687-.363-1.588-1.875-2.73-3.574-2.61zm9.75 1.5c-1.05 0-1.905.85-1.905 1.905 0 1.05.855 1.905 1.905 1.905S21.72 8.955 21.72 7.905c0-1.05-.855-1.905-1.905-1.905zM10.065 7.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5zm-5.532 3.038c-2.483 1.035-4.53 3.09-4.53 5.655 0 3.314 4.193 5.999 9.372 5.999 6.09 0 10.125-3.527 10.125-6.33 0-1.695-1.417-2.667-2.4-2.667-.298 0-.585.075-.853.21-.857.435-1.875.653-2.937.653-4.147 0-7.5-2.46-7.5-5.5 0-.883.293-1.74.84-2.49-.372.134-.753.284-1.116.47z"/>
            </svg>
          </button>

          <div className={styles.copyLinkWrapper}>
            <button
              onClick={handleCopyLink}
              className={`${styles.shareButton} ${styles.copy}`}
              aria-label={t('shareButtons.copyLink')}
              title={t('shareButtons.copyLink')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </button>
            {showTooltip && (
              <div className={styles.tooltip}>{t('shareButtons.linkCopied')}</div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`${styles.toggleButton} ${!isVisible ? styles.collapsed : ''}`}
        aria-label={isVisible ? 'Hide share buttons' : 'Show share buttons'}
        title={isVisible ? 'Ẩn' : 'Hiện'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points={isVisible ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}></polyline>
        </svg>
      </button>
    </div>
  );
};

export default FixedSocialShare;
