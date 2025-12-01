import React from 'react';
import styles from '../styles/WordTooltip.module.css';

const WordTooltip = ({ translation, position, onClose }) => {
  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div 
        className={styles.tooltip}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className={styles.arrow} />
        <div className={styles.content}>
          {translation || '...'}
        </div>
      </div>
    </>
  );
};

export default WordTooltip;
