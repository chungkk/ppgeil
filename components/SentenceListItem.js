import React from 'react';

const SentenceListItem = ({
  segment,
  index,
  isActive,
  isCompleted,
  onClick,
  showTranslation = false,
  recordingControls = null,
}) => {
  if (!segment) return null;

  return (
    <div
      style={{
        background: isActive ? 'var(--bg-hover)' : 'var(--bg-secondary)',
        border: `2px solid ${isActive ? 'var(--accent-blue)' : 'var(--border-color)'}`,
        borderRadius: 'var(--border-radius)',
        padding: 'var(--spacing-md)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      <div 
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-md)',
        }}
      >
        <div style={{
          minWidth: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isCompleted ? 'var(--accent-gradient)' : 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          {isCompleted ? '✓' : index + 1}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            color: 'var(--text-primary)',
            fontSize: '15px',
            lineHeight: '1.6',
            marginBottom: showTranslation && segment.translation ? 'var(--spacing-sm)' : 0,
          }}>
            {segment.text}
          </div>

          {showTranslation && segment.translation && (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '1.5',
              fontStyle: 'italic',
            }}>
              {segment.translation}
            </div>
          )}

          {segment.start !== undefined && (
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '12px',
              marginTop: 'var(--spacing-xs)',
            }}>
              {formatTime(segment.start)} - {formatTime(segment.end)}
            </div>
          )}
        </div>
      </div>

      {/* Recording controls - only show when sentence is active */}
      {isActive && recordingControls && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 'var(--spacing-md)',
            paddingTop: 'var(--spacing-md)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {recordingControls}
        </div>
      )}
    </div>
  );
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default SentenceListItem;
