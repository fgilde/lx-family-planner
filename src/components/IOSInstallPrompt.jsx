import React, { useEffect, useState } from 'react';
import { Plus, Share2, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isCapacitorNative } from '../utils/apiConfig';
import { shouldOfferIosInstall } from '../utils/iosPwa';

const DISMISS_KEY = 'lx_ios_install_prompt_dismissed_until';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function installContext() {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone,
    dismissedUntil: Number(localStorage.getItem(DISMISS_KEY) || 0)
  };
}

export default function IOSInstallPrompt() {
  const { t } = useTranslation('chrome');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isCapacitorNative() || !shouldOfferIosInstall(installContext())) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    setVisible(false);
  };

  return (
    <aside
      className="ios-install-prompt"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ios-install-prompt-title"
    >
      <div className="ios-install-prompt-orbit" aria-hidden="true">
        <Sparkles size={15} />
      </div>
      <div className="ios-install-prompt-mark" aria-hidden="true">
        <span>LX</span>
      </div>
      <div className="ios-install-prompt-copy">
        <small>{t('iosInstall.kicker')}</small>
        <strong id="ios-install-prompt-title">{t('iosInstall.title')}</strong>
        <p>{t('iosInstall.body')}</p>
        <ol>
          <li><Share2 size={15} /> {t('iosInstall.stepShare')}</li>
          <li><Plus size={15} /> {t('iosInstall.stepHome')}</li>
          <li><span>3</span> {t('iosInstall.stepAdd')}</li>
        </ol>
        {!window.isSecureContext && (
          <em>{t('iosInstall.secureHint')}</em>
        )}
      </div>
      <div className="ios-install-prompt-actions">
        <button type="button" onClick={dismiss}>
          {t('iosInstall.later')}
        </button>
      </div>
      <button
        type="button"
        className="ios-install-prompt-close"
        aria-label={t('iosInstall.close')}
        onClick={dismiss}
      >
        <X size={17} />
      </button>
    </aside>
  );
}
