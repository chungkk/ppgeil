import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/WordSuggestionPopup.module.css';

const WordSuggestionPopup = ({ 
  correctWord, 
  context, 
  wordIndex,
  position,
  initialOptions, // NEW: Pre-generated options from transcript (instant, no API call)
  onCorrectAnswer, 
  onWrongAnswer, 
  onClose
}) => {
  const { t } = useTranslation();
  // If initialOptions provided, use them directly (no loading)
  const [options, setOptions] = useState(initialOptions || []);
  const [loading, setLoading] = useState(!initialOptions);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Only load from API if no initialOptions provided
    if (!initialOptions || initialOptions.length === 0) {
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctWord, initialOptions]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-word-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctWord,
          context
        })
      });

      const data = await response.json();

      if (data.success && data.options) {
        const uniqueOptions = [];
        const seen = new Set();

        for (const option of data.options) {
          const normalized = option.toLowerCase().trim();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            uniqueOptions.push(option);
          }
        }

        setOptions(uniqueOptions);
      } else {
        setOptions([correctWord]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setOptions([correctWord]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option) => {
    if (showResult) return; // Prevent multiple clicks

    setSelectedOption(option);
    const correct = option.toLowerCase() === correctWord.toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      // Correct answer: fill word into input IMMEDIATELY, then show animation
      onCorrectAnswer(correctWord, wordIndex);
    } else {
      // Wrong answer: show shake animation, call callback, but DON'T close popup
      // Call onWrongAnswer immediately to deduct points and reset streak
      onWrongAnswer(correctWord, wordIndex, option);
      
      // After 2s, reset to normal state to allow re-selection
      setTimeout(() => {
        setShowResult(false);
        setSelectedOption(null);
        setIsCorrect(false);
      }, 2000);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !showResult) {
      onClose();
    }
  };

  // Determine if popup should appear on left or right of word
  const shouldShowOnLeft = () => {
    if (!position) return false;
    const screenWidth = window.innerWidth;
    const spaceOnRight = screenWidth - position.left;
    const estimatedPopupWidth = isMobile ? 280 : 350; // Approximate max width
    return spaceOnRight < estimatedPopupWidth && position.left > estimatedPopupWidth;
  };

  const showOnLeft = shouldShowOnLeft();

  // Simple horizontal layout for all screens
  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div 
        className={`${styles.popup} ${isMobile ? styles.popupMobile : ''} ${showOnLeft ? styles.positionLeft : styles.positionRight}`}
        style={{
          position: 'absolute',
          top: `${position?.top || 0}px`,
          left: `${position?.left || 0}px`,
        }}
      >
        {loading ? (
          <div className={isMobile ? styles.loadingMobile : styles.loading}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <div className={isMobile ? styles.optionsContainerMobile : styles.optionsContainer}>
            {options.map((option, index) => {
              // When correct: only show the selected correct word
              if (showResult && isCorrect && option !== selectedOption) {
                return null;
              }

              // Determine if this is the wrong answer or correct answer button
              const isSelectedWrong = showResult && !isCorrect && option === selectedOption;
              const isShowingCorrect = showResult && !isCorrect && option.toLowerCase() === correctWord.toLowerCase();
              const isShowingWrongOption = showResult && !isCorrect && option !== selectedOption && option.toLowerCase() !== correctWord.toLowerCase();

              return (
                <button
                  key={`${option.toLowerCase()}-${index}`}
                  className={`${isMobile ? styles.optionButtonMobile : styles.optionButton} ${
                    selectedOption === option && isCorrect ? styles.correctFall : ''
                  } ${showResult && !isCorrect ? styles.wrongShake : ''}`}
                  style={{
                    '--fall-direction': showOnLeft ? '1' : '-1', // 1 = right, -1 = left
                  }}
                  onClick={() => handleOptionClick(option)}
                  disabled={showResult}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordSuggestionPopup;
