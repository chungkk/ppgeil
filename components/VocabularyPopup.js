import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translationCache } from '../lib/translationCache';

const VocabularyPopup = ({ word, translation, onClose, onSave, isSaved = false, position }) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchedTranslation, setFetchedTranslation] = useState(translation || '');
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);

  // Fetch translation when word changes and no translation provided
  useEffect(() => {
    const fetchTranslation = async () => {
      if (!word || translation) return;
      
      // Check cache first
      const cached = translationCache.get(word, 'de', 'vi');
      if (cached) {
        setFetchedTranslation(cached);
        return;
      }
      
      setIsLoadingTranslation(true);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: word,
            context: '',
            sourceLang: 'de',
            targetLang: 'vi'
          })
        });

        const data = await response.json();
        if (data.success && data.translation) {
          setFetchedTranslation(data.translation);
          translationCache.set(word, data.translation, 'de', 'vi');
        }
      } catch (error) {
        console.error('Translation fetch error:', error);
      } finally {
        setIsLoadingTranslation(false);
      }
    };

    fetchTranslation();
  }, [word, translation]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ word, translation: fetchedTranslation, notes });
    setSaving(false);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--spacing-lg)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          padding: 'var(--spacing-xl)',
          maxWidth: '500px',
          width: '100%',
          position: 'relative',
          border: '1px solid var(--border-color)',
          animation: 'slideUp 0.3s ease',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            right: 'var(--spacing-md)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '24px',
          }}
        >
          ✕
        </button>

        <h3
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: 'var(--spacing-lg)',
            paddingRight: 'var(--spacing-xl)',
          }}
        >
          {isSaved ? t('vocabularyPopup.details') : t('vocabularyPopup.saveTitle')}
        </h3>

        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: 'var(--accent-blue)',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            {word}
          </div>

          {isLoadingTranslation ? (
            <div
              style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                fontStyle: 'italic',
              }}
            >
              {t('vocabularyPopup.translating')}
            </div>
          ) : fetchedTranslation ? (
            <div
              style={{
                fontSize: '16px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}
            >
              {fetchedTranslation}
            </div>
          ) : null}
        </div>

        {!isSaved && (
          <>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                {t('vocabularyPopup.notesLabel')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('vocabularyPopup.notesPlaceholder')}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-small)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--border-radius-small)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '500',
                }}
              >
                {t('vocabularyPopup.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: saving ? 'var(--bg-hover)' : 'var(--accent-gradient)',
                  border: 'none',
                  color: 'white',
                  borderRadius: 'var(--border-radius-small)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                {saving ? t('vocabularyPopup.saving') : t('vocabularyPopup.save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VocabularyPopup;
