import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, Download, X } from 'lucide-react';
import { buildApiUrl, isCapacitorNative } from '../utils/apiConfig';

function installedAndroidVersionCode() {
  const match = navigator.userAgent.match(/LXFamilyAndroid\/(\d+)/i);
  return Math.max(0, Number(match?.[1]) || 0);
}

export default function AppUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const installedVersionCode = installedAndroidVersionCode();
    if (!isCapacitorNative() && !installedVersionCode) return undefined;

    let cancelled = false;
    const checkVersion = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/app/version'), {
          method: 'GET',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (
          cancelled ||
          !data.success ||
          !data.apkUrl ||
          Number(data.versionCode) <= installedVersionCode
        ) {
          return;
        }
        setUpdateInfo({
          versionName: data.versionName,
          versionCode: Number(data.versionCode),
          apkUrl: buildApiUrl(data.apkUrl)
        });
      } catch {
        // Die App bleibt bei einem vorübergehend unerreichbaren Server ruhig.
      }
    };

    void checkVersion();
    const interval = window.setInterval(checkVersion, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <aside className="app-update-banner" aria-label="Android-App-Update">
      <span className="app-update-mark"><ArrowUpCircle size={21} /></span>
      <div>
        <strong>Neue Android-App verfügbar</strong>
        <small>
          Version {updateInfo.versionName} bringt die aktuelle Gerätefunktion
          auf dein Handy.
        </small>
      </div>
      <a
        href={updateInfo.apkUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download size={16} />
        Update laden
      </a>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Update-Hinweis schließen"
      >
        <X size={17} />
      </button>
    </aside>
  );
}
