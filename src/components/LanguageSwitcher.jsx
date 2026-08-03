import React, { useRef } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  applyLanguage,
  normalizeLanguage,
  setStoredLanguage
} from '../i18n/index.js';

const LANGUAGE_OPTIONS = [
  { code: 'de', short: 'DE', label: 'Deutsch' },
  { code: 'en', short: 'EN', label: 'English' }
];

export default function LanguageSwitcher({ variant = 'header' }) {
  const { t, i18n } = useTranslation('common');
  const detailsRef = useRef(null);
  const current =
    normalizeLanguage(i18n.resolvedLanguage || i18n.language) ||
    DEFAULT_LANGUAGE;

  const chooseLanguage = language => {
    setStoredLanguage(language);
    applyLanguage(language);
    detailsRef.current?.removeAttribute('open');
  };

  if (variant === 'auth') {
    return (
      <div
        className="language-switcher language-switcher-auth"
        role="group"
        aria-label={t('language.choose')}
      >
        <span className="language-switcher-label">
          <Languages size={16} />
          {t('language.label')}
        </span>
        <span className="language-switcher-options">
          {LANGUAGE_OPTIONS.map(option => (
            <button
              key={option.code}
              type="button"
              className={current === option.code ? 'active' : ''}
              onClick={() => chooseLanguage(option.code)}
              aria-pressed={current === option.code}
              lang={option.code}
            >
              {option.label}
            </button>
          ))}
        </span>
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      className="language-switcher language-switcher-header"
    >
      <summary
        className="icon-circle-btn"
        title={t('language.choose')}
        aria-label={t('language.choose')}
      >
        <Languages size={17} />
        <span>{current.toUpperCase()}</span>
      </summary>
      <div className="language-switcher-menu" role="group" aria-label={t('language.choose')}>
        <span>{t('language.title')}</span>
        {LANGUAGE_OPTIONS.map(option => (
          <button
            key={option.code}
            type="button"
            className={current === option.code ? 'active' : ''}
            onClick={() => chooseLanguage(option.code)}
            aria-pressed={current === option.code}
            lang={option.code}
          >
            <span>{option.short}</span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
    </details>
  );
}
