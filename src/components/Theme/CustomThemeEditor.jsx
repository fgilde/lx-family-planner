import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  RotateCcw,
  Save,
  ShieldCheck,
  WandSparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CUSTOM_THEME_EXAMPLE,
  CUSTOM_THEME_PROPERTIES,
  parseCustomThemeCss
} from '../../../shared/customThemeCss.js';

export default function CustomThemeEditor({
  savedCss,
  onPreview,
  onPreviewStateChange,
  onSave
}) {
  const { t } = useTranslation('chrome');
  const [draft, setDraft] = useState(savedCss || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const result = useMemo(() => parseCustomThemeCss(draft), [draft]);

  useEffect(() => {
    setDraft(savedCss || '');
  }, [savedCss]);

  const validationMessage = error => {
    if (!error) return '';
    return t(`header.customTheme.validation.${error.code}`, {
      property: error.property || error.declaration || ''
    });
  };

  const updateDraft = value => {
    setDraft(value);
    setSaved(false);
  };

  const preview = () => {
    if (!result.valid) return;
    onPreview(result.css);
    onPreviewStateChange(true);
  };

  const reset = () => {
    setDraft('');
    setSaved(false);
    onPreview('');
    onPreviewStateChange(true);
  };

  const save = async () => {
    if (!result.valid || saving) return;
    setSaving(true);
    const member = await onSave(result.css);
    setSaving(false);
    if (member) {
      setDraft(member.customThemeCss || '');
      setSaved(true);
      onPreviewStateChange(false);
    }
  };

  return (
    <section className="custom-theme-editor">
      <header>
        <span><ShieldCheck size={19} /></span>
        <div>
          <small>{t('header.customTheme.kicker')}</small>
          <strong>{t('header.customTheme.title')}</strong>
          <p>{t('header.customTheme.description')}</p>
        </div>
      </header>

      <div className="custom-theme-safety">
        <ShieldCheck size={16} />
        <span>
          <strong>{t('header.customTheme.safeTitle')}</strong>
          {t('header.customTheme.safeDescription')}
        </span>
      </div>

      <label className="custom-theme-code">
        <span>
          {t('header.customTheme.codeLabel')}
          <button
            type="button"
            onClick={() => updateDraft(CUSTOM_THEME_EXAMPLE)}
          >
            <WandSparkles size={13} />
            {t('header.customTheme.useExample')}
          </button>
        </span>
        <textarea
          value={draft}
          onChange={event => updateDraft(event.target.value)}
          placeholder={CUSTOM_THEME_EXAMPLE}
          spellCheck="false"
          aria-invalid={!result.valid}
        />
      </label>

      <div className="custom-theme-tokens">
        <span>{t('header.customTheme.allowed')}</span>
        <div>
          {CUSTOM_THEME_PROPERTIES.map(property => (
            <code key={property}>{property}</code>
          ))}
        </div>
      </div>

      {!result.valid && (
        <div className="custom-theme-error" role="alert">
          <AlertTriangle size={15} />
          <span>{validationMessage(result.errors[0])}</span>
        </div>
      )}

      {saved && (
        <div className="custom-theme-saved" role="status">
          <Check size={15} /> {t('header.customTheme.saved')}
        </div>
      )}

      <footer>
        <button type="button" className="is-reset" onClick={reset}>
          <RotateCcw size={14} /> {t('header.customTheme.reset')}
        </button>
        <button
          type="button"
          disabled={!result.valid}
          onClick={preview}
        >
          <Eye size={14} /> {t('header.customTheme.preview')}
        </button>
        <button
          type="button"
          className="is-save"
          disabled={!result.valid || saving}
          onClick={save}
        >
          <Save size={14} />
          {saving
            ? t('common:status.saving')
            : t('header.customTheme.save')}
        </button>
      </footer>
    </section>
  );
}
