import React, { useCallback, useEffect, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import {
  ArrowUpCircle,
  CheckCircle2,
  Download,
  LoaderCircle,
  ShieldCheck,
  X
} from 'lucide-react';
import { buildApiUrl, isCapacitorNative } from '../utils/apiConfig';

const LXAppUpdater = registerPlugin('LXAppUpdater');

function installedAndroidVersionCode() {
  const match = navigator.userAgent.match(/LXFamilyAndroid\/(\d+)/i);
  return Math.max(0, Number(match?.[1]) || 0);
}

export default function AppUpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const [installState, setInstallState] = useState('idle');
  const [installMessage, setInstallMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const checkVersion = useCallback(async () => {
    const native = isCapacitorNative();
    let installedVersionCode = installedAndroidVersionCode();
    if (!native && !installedVersionCode) return;

    try {
      if (native) {
        const installed = await LXAppUpdater.getInstalledVersion();
        installedVersionCode = Math.max(
          installedVersionCode,
          Number(installed?.versionCode) || 0
        );
      }
      const response = await fetch(buildApiUrl('/api/app/version'), {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return;
      const data = await response.json();
      if (
        !data.success ||
        !data.apkUrl ||
        Number(data.versionCode) <= installedVersionCode
      ) {
        setUpdateInfo(null);
        return;
      }
      setUpdateInfo({
        versionName: data.versionName,
        versionCode: Number(data.versionCode),
        apkUrl: buildApiUrl(data.apkUrl),
        sha256: data.sha256 || '',
        fileSizeBytes: Number(data.fileSizeBytes) || 0
      });
    } catch {
      // Bei einem vorübergehend unerreichbaren Server bleibt die App ruhig.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runCheck = () => {
      if (!cancelled && document.visibilityState !== 'hidden') {
        void checkVersion();
      }
    };

    runCheck();
    const interval = window.setInterval(runCheck, 15 * 60 * 1000);
    window.addEventListener('focus', runCheck);
    window.addEventListener('pageshow', runCheck);
    document.addEventListener('visibilitychange', runCheck);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', runCheck);
      window.removeEventListener('pageshow', runCheck);
      document.removeEventListener('visibilitychange', runCheck);
    };
  }, [checkVersion]);

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    let listener;
    void LXAppUpdater
      .addListener('downloadProgress', event => {
        const total = Number(event?.totalBytes) || 0;
        const downloaded = Number(event?.downloadedBytes) || 0;
        setProgress(total > 0
          ? Math.max(1, Math.min(100, Math.round(downloaded / total * 100)))
          : 0);
      })
      .then(handle => {
        listener = handle;
      });
    return () => {
      void listener?.remove();
    };
  }, []);

  const startUpdate = async () => {
    if (!updateInfo || installState === 'loading') return;
    if (!isCapacitorNative()) {
      window.location.assign(updateInfo.apkUrl);
      return;
    }
    setInstallState('loading');
    setInstallMessage('');
    setProgress(0);
    try {
      const result = await LXAppUpdater.installUpdate({
        url: updateInfo.apkUrl,
        sha256: updateInfo.sha256
      });
      if (result?.status === 'permission') {
        setInstallState('permission');
        setInstallMessage(
          'Erlaube LX auf der geöffneten Android-Seite einmalig App-Updates. Kehre danach zurück und tippe erneut auf „Jetzt aktualisieren“.'
        );
        return;
      }
      setInstallState('installer');
      setInstallMessage(
        'Android zeigt jetzt den Installationsdialog. Deine Daten und Einstellungen bleiben erhalten.'
      );
    } catch (error) {
      setInstallState('error');
      setInstallMessage(
        error?.message ||
        'Das Update konnte nicht geladen werden. Bitte versuche es noch einmal.'
      );
    }
  };

  if (
    !updateInfo ||
    dismissedVersion === updateInfo.versionCode
  ) {
    return null;
  }

  return (
    <div className="app-update-layer" role="presentation">
      <aside
        className="app-update-banner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lx-app-update-title"
      >
        <button
          type="button"
          className="app-update-close"
          onClick={() => setDismissedVersion(updateInfo.versionCode)}
          aria-label="Update später installieren"
        >
          <X size={17} />
        </button>
        <span className="app-update-mark"><ArrowUpCircle size={25} /></span>
        <div className="app-update-copy">
          <small>Direkt von eurem LX-Server</small>
          <strong id="lx-app-update-title">
            Version {updateInfo.versionName} ist da
          </strong>
          <p>
            LX kann das Update jetzt laden und anschließend direkt den
            Android-Installationsdialog öffnen.
          </p>
        </div>
        {installState === 'loading' && (
          <div className="app-update-progress" aria-live="polite">
            <span>
              <LoaderCircle className="spin" size={16} />
              Update wird sicher geladen
            </span>
            <i><b style={{ width: `${progress || 12}%` }} /></i>
          </div>
        )}
        {installMessage && (
          <div
            className={`app-update-status ${installState}`}
            aria-live="polite"
          >
            {installState === 'installer'
              ? <CheckCircle2 size={17} />
              : <ShieldCheck size={17} />}
            <span>{installMessage}</span>
          </div>
        )}
        <div className="app-update-actions">
          <button
            type="button"
            className="primary"
            onClick={startUpdate}
            disabled={installState === 'loading'}
          >
            {installState === 'loading'
              ? <LoaderCircle className="spin" size={17} />
              : <Download size={17} />}
            {installState === 'loading'
              ? 'Wird geladen …'
              : installState === 'permission'
                ? 'Berechtigung prüfen'
                : 'Jetzt aktualisieren'}
          </button>
          <button
            type="button"
            onClick={() => setDismissedVersion(updateInfo.versionCode)}
          >
            Später
          </button>
        </div>
      </aside>
    </div>
  );
}
