import React, { useEffect, useMemo, useState } from 'react';
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

function readableSize(bytes) {
  const megabytes = Number(bytes || 0) / 1024 / 1024;
  return megabytes > 0 ? `${megabytes.toFixed(1)} MB` : '';
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
      release?.versionName ? `Version ${release.versionName}` : '',
      release?.size,
      'Android 7+'
    ].filter(Boolean),
    [release]
  );

  if (isCapacitorNative() || status === 'unavailable') return null;

  if (status === 'loading') {
    return (
      <aside
        className="android-download-card is-loading"
        aria-label="Android-App wird geladen"
      >
        <RefreshCw className="spin" size={20} />
        <span>Android-App wird vorbereitet …</span>
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
          <Smartphone size={14} /> Die Familien-App
        </span>
        <h3 id="android-app-title">LX direkt aufs Android-Handy</h3>
        <p>
          Schneller öffnen, Rezepte direkt teilen und neue App-Versionen
          automatisch entdecken.
        </p>
        <div className="android-download-facts">
          {releaseFacts.map(fact => <span key={fact}>{fact}</span>)}
          <span><ShieldCheck size={13} /> Direkt von eurem Server</span>
        </div>
        <a
          className="android-download-button"
          href={release.downloadUrl}
          download="LX-Family-Planner.apk"
          aria-label={`LX Family Planner ${release.versionName} für Android herunterladen`}
        >
          <Download size={17} />
          Android-App laden
        </a>
      </div>

      <div
        className={`android-download-qr ${
          release.qrAvailable ? '' : 'is-local'
        }`}
      >
        {release.qrAvailable ? (
          <>
            <span><QrCode size={13} /> Mit dem Handy scannen</span>
            <div className="android-download-qr-frame">
              <QRCodeSVG
                value={release.qrDownloadUrl}
                size={104}
                level="Q"
                marginSize={1}
                bgColor="#fffdf8"
                fgColor="#173e34"
                title="QR-Code zum Download der LX Family Planner Android-App"
              />
            </div>
          </>
        ) : (
          <>
            <span><Wifi size={13} /> Auf dem Handy öffnen</span>
            <div className="android-download-local-hint">
              <strong>Lokale Vorschau</strong>
              <small>
                Öffne LX über die Heimnetz-IP oder eure öffentliche Adresse.
                Dann erscheint hier der passende QR-Code.
              </small>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
