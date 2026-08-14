import React, { useMemo } from 'react';
import { Sparkles, ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../../appVersion';
import { releaseNotesForVersion } from '../../../shared/releaseNotes.js';

function languageCode(value) {
  return String(value || 'de').toLowerCase().split('-')[0];
}

export default function ReleasePreviewCard() {
  const { t, i18n } = useTranslation('auth');
  const releaseNotes = useMemo(() => {
    const notes = releaseNotesForVersion(APP_VERSION);
    const localized = notes.localizations?.[languageCode(
      i18n.resolvedLanguage || i18n.language
    )];
    return { ...notes, ...(localized || {}) };
  }, [i18n.language, i18n.resolvedLanguage]);

  const highlights = (releaseNotes.highlights || []).slice(0, 2);

  return (
    <aside className="auth-release-preview" aria-labelledby="auth-release-title">
      <header className="auth-release-preview-head">
        <span className="auth-release-preview-icon" aria-hidden="true">
          <Sparkles size={19} />
        </span>
        <div>
          <span>{t('releasePreview.eyebrow')}</span>
          <strong>{t('releasePreview.version', { version: releaseNotes.version })}</strong>
        </div>
        <ScrollText size={19} aria-hidden="true" />
      </header>
      <div className="auth-release-preview-copy">
        <h3 id="auth-release-title">{releaseNotes.title}</h3>
        <p>{releaseNotes.intro}</p>
      </div>
      {highlights.length > 0 && (
        <div className="auth-release-preview-highlights">
          {highlights.map(highlight => (
            <div key={highlight.id}>
              <strong>{highlight.title}</strong>
              <span>{highlight.description}</span>
            </div>
          ))}
        </div>
      )}
      <p className="auth-release-preview-note">
        {t('releasePreview.afterLogin')}
      </p>
    </aside>
  );
}
