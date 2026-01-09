import React, { useEffect, useState, useRef } from 'react';
import styles from '../styles/FlipCounter.module.css';

const FlipDigit = ({ digit, prevDigit }) => {
  const [flipping, setFlipping] = useState(false);
  
  useEffect(() => {
    if (digit !== prevDigit) {
      setFlipping(true);
      const timer = setTimeout(() => setFlipping(false), 300);
      return () => clearTimeout(timer);
    }
  }, [digit, prevDigit]);

  return (
    <div className={`${styles.flipDigit} ${flipping ? styles.flipping : ''}`}>
      <div className={styles.digitTop}>
        <span>{digit}</span>
      </div>
      <div className={styles.digitBottom}>
        <span>{digit}</span>
      </div>
      {flipping && (
        <div className={styles.flipCard}>
          <div className={styles.flipCardFront}>
            <span>{prevDigit}</span>
          </div>
          <div className={styles.flipCardBack}>
            <span>{digit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FlipCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setPrevValue(prevValueRef.current);
      setDisplayValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  const digits = String(displayValue || 0).split('');
  const prevDigits = String(prevValue || 0).padStart(digits.length, '0').split('');

  return (
    <div className={styles.flipCounter}>
      {digits.map((digit, index) => (
        <FlipDigit 
          key={index} 
          digit={digit} 
          prevDigit={prevDigits[index] || '0'}
        />
      ))}
    </div>
  );
};

export default FlipCounter;
