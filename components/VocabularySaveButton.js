import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';

export default function VocabularySaveButton({ word, context, lessonId }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [translation, setTranslation] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (!translation.trim()) {
      toast.warning(t('vocabularySave.warning'));
      return;
    }

    setSaving(true);
    try {
      // First, try to fetch dictionary details
      let dictionaryData = null;
      try {
        setFetchingDetails(true);
        const dictRes = await fetch('/api/dictionary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            word,
            sourceLang: 'de',
            targetLang: 'vi'
          })
        });

        if (dictRes.ok) {
          const dictJson = await dictRes.json();
          if (dictJson.success) {
            dictionaryData = dictJson.data;
          }
        }
      } catch (dictError) {
        console.log('Dictionary fetch failed, continuing without details:', dictError);
      } finally {
        setFetchingDetails(false);
      }

      // Prepare vocabulary data
      const vocabularyData = {
        word,
        translation: translation.trim(),
        context: context || '',
        lessonId
      };

      // Add dictionary details if available
      if (dictionaryData) {
        if (dictionaryData.partOfSpeech) {
          vocabularyData.partOfSpeech = dictionaryData.partOfSpeech;
        }
        if (dictionaryData.explanation) {
          vocabularyData.definition = dictionaryData.explanation;
        }
        if (dictionaryData.examples && dictionaryData.examples.length > 0) {
          vocabularyData.examples = dictionaryData.examples.map(ex => ({
            text: ex.de || ex.text,
            translation: ex.translation
          }));
        }
        // Add placeholder phonetics (can be enhanced with actual IPA data)
        vocabularyData.phonetics = {
          us: `/${word}/`,
          uk: `/${word}/`
        };
      }

      const res = await fetchWithAuth('/api/vocabulary', {
        method: 'POST',
        body: JSON.stringify(vocabularyData)
      });

      if (res.ok) {
        toast.success(t('vocabularySave.success'));
        setShowPopup(false);
        setTranslation('');
      } else {
        const data = await res.json();
        toast.error(t('vocabularySave.error', { message: data.message }));
      }
    } catch (error) {
      toast.error(t('vocabularySave.generalError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPopup(true)}
        style={{
          padding: '4px 8px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '5px'
        }}
        title={t('vocabularySave.buttonTitle')}
      >
        💾
      </button>

      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '15px' }}>
              {t('vocabularySave.popupTitle')}
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('vocabularySave.labels.word')}
              </label>
              <div style={{ 
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#2196F3'
              }}>
                {word}
              </div>
            </div>

            {context && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  {t('vocabularySave.labels.context')}
                </label>
                <div style={{ 
                  padding: '10px',
                  background: '#f5f5f5',
                  borderRadius: '5px',
                  fontSize: '14px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  {context}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {t('vocabularySave.labels.meaning')}
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder={t('vocabularySave.placeholder')}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>

            {fetchingDetails && (
              <div style={{
                marginBottom: '15px',
                padding: '10px',
                background: '#e3f2fd',
                borderRadius: '5px',
                fontSize: '13px',
                color: '#1976d2',
                textAlign: 'center'
              }}>
                {t('vocabularySave.loadingDetails')}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: saving ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {saving ? (fetchingDetails ? t('vocabularySave.buttons.loadingInfo') : t('vocabularySave.buttons.saving')) : t('vocabularySave.buttons.save')}
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setTranslation('');
                }}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {t('vocabularySave.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
