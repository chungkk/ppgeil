import styles from '../../styles/wizardStyles.module.css';

/**
 * WizardStep Component
 * 
 * Container wrapper cho mỗi bước trong wizard
 * Provides consistent layout và animation
 */
const WizardStep = ({ 
  title, 
  description, 
  children, 
  stepNumber,
  icon 
}) => {
  return (
    <div className={styles.wizardStep}>
      {/* Step Header */}
      <div className={styles.stepHeader}>
        <div className={styles.stepHeaderIcon}>{icon}</div>
        <div className={styles.stepHeaderText}>
          <h2 className={styles.stepTitle}>{title}</h2>
          {description && (
            <p className={styles.stepDescription}>{description}</p>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {children}
      </div>
    </div>
  );
};

export default WizardStep;
