import React, { useEffect, useState } from 'react';
import styles from '../styles/PointsAnimation.module.css';

const PointsAnimation = ({ points, startPosition, endPosition, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const isNegative = points < 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  // Calculate delta for animation
  const deltaX = endPosition ? endPosition.left - startPosition.left : 0;
  const deltaY = endPosition ? endPosition.top - startPosition.top : -50;

  return (
    <div 
      className={styles.pointsAnimation}
      style={{
        top: `${startPosition.top}px`,
        left: `${startPosition.left}px`,
        '--delta-x': `${deltaX}px`,
        '--delta-y': `${deltaY}px`,
      }}
    >
      <span 
        className={styles.pointsValue}
        style={{
          color: isNegative ? '#FF4444' : '#FFD700',
          textShadow: isNegative 
            ? '0 0 8px rgba(255, 68, 68, 0.8), 0 0 15px rgba(255, 68, 68, 0.5), 1px 1px 3px rgba(0, 0, 0, 0.6)'
            : '0 0 8px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.5), 1px 1px 3px rgba(0, 0, 0, 0.6)',
          filter: isNegative
            ? 'drop-shadow(0 0 6px rgba(255, 68, 68, 0.9))'
            : 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.9))'
        }}
      >
        {points > 0 ? `+${points}` : points}
      </span>
    </div>
  );
};

export default PointsAnimation;
