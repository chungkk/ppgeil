import React from 'react';
import { useTranslation } from 'react-i18next';

const AudioControls = ({
  isPlaying,
  onPlayPause,
  onReplay,
  currentTime,
  duration,
  onSeek,
  playbackRate,
  onPlaybackRateChange,
  showPlaybackRate = true,
}) => {
  const { t } = useTranslation();
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--border-radius)',
      padding: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-lg)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-md)',
      }}>
        <button
          onClick={onReplay}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={t('audioControls.replay')}
        >
          ⏮
        </button>

        <button
          onClick={onPlayPause}
          style={{
            background: 'var(--accent-gradient)',
            border: 'none',
            color: 'white',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={isPlaying ? t('audioControls.pause') : t('audioControls.play')}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px', minWidth: '45px' }}>
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime || 0}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'var(--bg-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px', minWidth: '45px', textAlign: 'right' }}>
            {formatTime(duration)}
          </span>
        </div>

        {showPlaybackRate && (
          <select
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-small)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {playbackRates.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default AudioControls;
