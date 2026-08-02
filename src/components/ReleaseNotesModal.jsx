import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Home,
  Rocket,
  ShoppingBasket,
  Sparkles,
  UsersRound,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../context/FamilyContext';

const HIGHLIGHT_ICONS = {
  profiles: UsersRound,
  tasks: ClipboardCheck,
  kids: Rocket,
  food: ShoppingBasket,
  notifications: BellRing,
  home: Home
};

export default function ReleaseNotesModal() {
  const { t } = useTranslation('chrome');
  const { releaseNotes, acknowledgeReleaseNotes } = useFamily();
  const [isSaving, setIsSaving] = useState(false);
  const closeButtonRef = useRef(null);

  const closeReleaseNotes = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    const saved = await acknowledgeReleaseNotes();
    if (!saved) setIsSaving(false);
  }, [acknowledgeReleaseNotes, isSaving]);

  useEffect(() => {
    if (!releaseNotes) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus({ preventScroll: true }),
      120
    );
    const closeOnEscape = event => {
      if (event.key === 'Escape') void closeReleaseNotes();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [closeReleaseNotes, releaseNotes]);

  if (!releaseNotes) return null;

  return (
    <div className="release-notes-layer">
      <section
        className="release-notes-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        aria-describedby="release-notes-intro"
      >
        <button
          type="button"
          className="release-notes-close"
          aria-label={t('releaseNotes.close')}
          onClick={closeReleaseNotes}
          disabled={isSaving}
          ref={closeButtonRef}
        >
          <X size={20} />
        </button>

        <header className="release-notes-hero">
          <span className="release-notes-mark" aria-hidden="true">
            <Sparkles size={27} />
          </span>
          <div>
            <div className="release-notes-meta">
              <span>{releaseNotes.eyebrow}</span>
              <strong>{t('releaseNotes.version', { version: releaseNotes.version })}</strong>
            </div>
            <h2 id="release-notes-title">{releaseNotes.title}</h2>
            <p id="release-notes-intro">{releaseNotes.intro}</p>
          </div>
        </header>

        {releaseNotes.highlights?.length > 0 && (
          <div className="release-notes-grid">
            {releaseNotes.highlights.map(highlight => {
              const HighlightIcon = HIGHLIGHT_ICONS[highlight.id] || Sparkles;
              return (
                <article className="release-notes-card" key={highlight.id}>
                  <span className="release-notes-card-icon" aria-hidden="true">
                    <HighlightIcon size={21} />
                  </span>
                  <div>
                    <h3>{highlight.title}</h3>
                    <p>{highlight.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="release-notes-footer">
          <p>
            <CheckCircle2 size={19} aria-hidden="true" />
            <span>{releaseNotes.closing}</span>
          </p>
          <button
            type="button"
            className="release-notes-confirm"
            onClick={closeReleaseNotes}
            disabled={isSaving}
          >
            {isSaving ? t('common:status.saving') : t('releaseNotes.confirm')}
          </button>
        </footer>
      </section>
    </div>
  );
}
