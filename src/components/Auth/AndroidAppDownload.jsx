import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Download,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  buildApiUrl,
  isCapacitorNative
} from '../../utils/apiConfig';
import { formatNumber } from '../../utils/formatting';

function readableSize(bytes) {
  const megabytes = Number(bytes || 0) / 1024 / 1024;
  return megabytes > 0
    ? `${formatNumber(megabytes, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} MB`
    : '';
}

function isLoopbackDownloadUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.startsWith('127.')
    );
  } catch {
    return true;
  }
}

export default function AndroidAppDownload() {
  const { t } = useTranslation('auth');
  const [release, setRelease] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (isCapacitorNative()) return undefined;
    let cancelled = false;

    const loadRelease = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/app/version'), {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });
        const data = response.ok ? await response.json() : null;
        if (cancelled) return;
        if (!data?.success || !data.apkUrl) {
          setStatus('unavailable');
          return;
        }
        const relativeDownloadUrl = buildApiUrl(data.apkUrl);
        const downloadUrl = new URL(
          relativeDownloadUrl,
          window.location.origin
        ).href;
        const qrDownloadUrl = new URL(
          data.publicApkUrl || downloadUrl,
          window.location.origin
        ).href;
        setRelease({
          versionName: data.versionName,
          versionCode: Number(data.versionCode) || 0,
          size: readableSize(data.fileSizeBytes),
          downloadUrl,
          qrDownloadUrl,
          qrAvailable: !isLoopbackDownloadUrl(qrDownloadUrl)
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };

    void loadRelease();
    return () => {
      cancelled = true;
    };
  }, []);

  const releaseFacts = useMemo(
    () => [
      release?.versionName
        ? t('androidApp.version', { version: release.versionName })
        : '',
      release?.size,
      t('androidApp.androidRequirement')
    ].filter(Boolean),
    [release, t]
  );

  if (isCapacitorNative() || status === 'unavailable') return null;

  if (status === 'loading') {
    return (
      <aside
        className="android-download-card is-loading"
        aria-label={t('androidApp.loadingAria')}
      >
        <RefreshCw className="spin" size={20} />
        <span>{t('androidApp.loading')}</span>
      </aside>
    );
  }

  return (
    <aside className="android-download-card" aria-labelledby="android-app-title">
      <div className="android-download-phone" aria-hidden="true">
        <span className="android-download-phone-speaker" />
        <span className="android-download-app-mark">LX</span>
        <CheckCircle2 size={16} />
      </div>

      <div className="android-download-copy">
        <span className="android-download-kicker">
          <Smartphone size={14} /> {t('androidApp.kicker')}
        </span>
        <h3 id="android-app-title">{t('androidApp.title')}</h3>
        <p>{t('androidApp.description')}</p>
        <div className="android-download-facts">
          {releaseFacts.map(fact => <span key={fact}>{fact}</span>)}
          <span><ShieldCheck size={13} /> {t('androidApp.fromYourServer')}</span>
        </div>
        <a
          className="android-download-button"
          href={release.downloadUrl}
          download="LX-Family-Planner.apk"
          aria-label={t('androidApp.downloadAria', {
            version: release.versionName
          })}
        >
          <Download size={17} />
          {t('androidApp.downloadButton')}
        </a>
      </div>

      <div
        className={`android-download-qr ${
          release.qrAvailable ? '' : 'is-local'
        }`}
      >
        {release.qrAvailable ? (
          <>
            <span><QrCode size={13} /> {t('androidApp.scanWithPhone')}</span>
            <div className="android-download-qr-frame">
              <QRCodeSVG
                value={release.qrDownloadUrl}
                size={104}
                level="Q"
                marginSize={1}
                bgColor="#fffdf8"
                fgColor="#173e34"
                title={t('androidApp.qrTitle')}
              />
            </div>
          </>
        ) : (
          <>
            <span><Wifi size={13} /> {t('androidApp.openOnPhone')}</span>
            <div className="android-download-local-hint">
              <strong>{t('androidApp.localPreviewTitle')}</strong>
              <small>{t('androidApp.localPreviewHint')}</small>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
