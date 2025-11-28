import React from 'react';

const Transcript = ({ transcriptData, currentTime, isHidden, onSentenceClick, currentSentenceIndex = 0, onPreviousSentence, onNextSentence }) => {
  const renderCurrentSentence = () => {
    if (!transcriptData.length) {
      return <div>Text wird geladen...</div>;
    }

    const currentItem = transcriptData[currentSentenceIndex];
    const isHighlighted = currentTime >= currentItem.start && currentTime < currentItem.end;
    
    return (
      <div className="current-sentence-container">
        <div className="sentence-counter-container">
          <button 
            className="nav-btn prev-btn"
            onClick={onPreviousSentence}
            disabled={currentSentenceIndex === 0}
            title="Vorheriger Satz"
          >
            ‹
          </button>
          
          <div className="sentence-counter">
            Satz {currentSentenceIndex + 1} / {transcriptData.length}
          </div>
          
          <button 
            className="nav-btn next-btn"
            onClick={onNextSentence}
            disabled={currentSentenceIndex === transcriptData.length - 1}
            title="Nächster Satz"
          >
            ›
          </button>
        </div>
        
        <div 
          className={`current-sentence ${isHighlighted ? 'highlighted-sentence' : ''}`}
          onClick={() => onSentenceClick(currentItem.start, currentItem.end)}
        >
          {currentItem.text.trim()}
        </div>
        
        <div className="sentence-time">
          {formatTime(currentItem.start)} - {formatTime(currentItem.end)}
        </div>
      </div>
    );
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="text-section">
      <div className="text-header">
        <h2>Transkript - Satz {currentSentenceIndex + 1}</h2>
      </div>
      
      <div className={`transcript-box sentence-mode ${isHidden ? 'hidden' : ''}`}>
        {renderCurrentSentence()}
      </div>
      
      <p className="source-line">Quelle: DW Deutsch lernen</p>
    </div>
  );
};

export default Transcript;
