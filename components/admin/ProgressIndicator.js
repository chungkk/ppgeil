import styles from '../../styles/wizardStyles.module.css';

/**
 * ProgressIndicator Component
 * 
 * Hiển thị thanh tiến độ cho wizard với 4 bước:
 * 1. Thông tin cơ bản
 * 2. Nguồn audio
 * 3. Transcript
 * 4. Review & Publish
 */
const ProgressIndicator = ({ currentStep, totalSteps = 4 }) => {
  const steps = [
    { number: 1, label: 'Thông tin', icon: '📝' },
    { number: 2, label: 'Audio', icon: '🎵' },
    { number: 3, label: 'Transcript', icon: '📄' },
    { number: 4, label: 'Xem trước', icon: '✅' }
  ];

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'active';
    return 'upcoming';
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressSteps}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const isLastStep = index === steps.length - 1;

          return (
            <div key={step.number} className={styles.progressStepWrapper}>
              {/* Step Circle */}
              <div className={styles.progressStepItem}>
                <div className={`${styles.stepCircle} ${styles[`step-${status}`]}`}>
                  {status === 'completed' ? (
                    <span className={styles.stepCheckmark}>✓</span>
                  ) : (
                    <span className={styles.stepIcon}>{step.icon}</span>
                  )}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepNumber}>Bước {step.number}</div>
                  <div className={styles.stepLabel}>{step.label}</div>
                </div>
              </div>

              {/* Connector Line */}
              {!isLastStep && (
                <div 
                  className={`${styles.stepConnector} ${
                    step.number < currentStep ? styles.connectorCompleted : ''
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressBarFill}
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className={styles.progressText}>
        Bước {currentStep} / {totalSteps}
      </div>
    </div>
  );
};

export default ProgressIndicator;
