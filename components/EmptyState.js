import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

const EmptyState = ({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}) => {
  const { t } = useTranslation();
  const displayTitle = title || t('emptyState.noItems');
  const displayDescription = description || t('emptyState.noItemsDescription');
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--spacing-xl)',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-md)' }}>
        {icon}
      </div>

      <h3
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        {displayTitle}
      </h3>

      <p
        style={{
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          marginBottom: actionLabel ? 'var(--spacing-lg)' : 0,
        }}
      >
        {displayDescription}
      </p>

      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'var(--accent-gradient)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 'var(--border-radius-small)',
                fontWeight: '600',
                transition: 'transform 0.2s ease',
              }}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-small)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export const NoLessonsFound = () => {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="🔍"
      title={t('emptyState.noLessons')}
      description={t('emptyState.noLessonsDescription')}
      actionLabel={t('emptyState.viewAllLessons')}
      actionHref="/"
    />
  );
};

export const NoVocabularyFound = () => {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="📚"
      title={t('emptyState.noVocabulary')}
      description={t('emptyState.noVocabularyDescription')}
      actionLabel={t('emptyState.browseLessons')}
      actionHref="/"
    />
  );
};

export default EmptyState;
