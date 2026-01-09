import React, { useEffect, useState } from 'react';
import styles from '../styles/PointsAnimation.module.css';

const FlipDigit = ({ digit, delay, isNegative }) => {
  const [currentDigit, setCurrentDigit] = useState(0);
  const [flipping, setFlipping] = useState(false);
  
  useEffect(() => {
    const targetDigit = parseInt(digit, 10);
    let current = 0;
    const flipInterval = setInterval(() => {
      if (current < targetDigit) {
        setFlipping(true);
        setTimeout(() => {
          current++;
          setCurrentDigit(current);
          setFlipping(false);
        }, 50);
      } else {
        clearInterval(flipInterval);
      }
    }, 80 + delay * 30);
    
    return () => clearInterval(flipInterval);
  }, [digit, delay]);

  return (
    <div className={`${styles.flipDigit} ${flipping ? styles.flipping : ''}`}>
      <div className={styles.digitTop}>
        <span style={{ color: isNegative ? '#FF4444' : '#FFD700' }}>{currentDigit}</span>
      </div>
      <div className={styles.digitBottom}>
        <span style={{ color: isNegative ? '#FF4444' : '#FFD700' }}>{currentDigit}</span>
      </div>
      <div className={`${styles.flipCard} ${flipping ? styles.flipCardActive : ''}`}>
        <div className={styles.flipCardInner} style={{ color: isNegative ? '#FF4444' : '#FFD700' }}>
          {currentDigit}
        </div>
      </div>
    </div>
  );
};

const PointsAnimation = ({ points, startPosition, endPosition, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const isNegative = points < 0;
  const absPoints = Math.abs(points);
  const digits = String(absPoints).split('');

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1000);

    return () => clearTimeout(hideTimer);
  }, [onComplete]);

  if (!visible) return null;

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
      <div className={styles.retroCounter}>
        <span className={styles.sign} style={{ color: isNegative ? '#FF4444' : '#FFD700' }}>
          {isNegative ? '−' : '+'}
        </span>
        {digits.map((digit, index) => (
          <FlipDigit 
            key={index} 
            digit={digit} 
            delay={index}
            isNegative={isNegative}
          />
        ))}
      </div>
    </div>
  );
};

export default PointsAnimation;
