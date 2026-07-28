import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  LockKeyhole,
  MessageCircleHeart,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Trophy,
  Vote
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

const RULES = [
  {
    key: 'groupChat',
    title: 'Familienchat',
    description: 'Nachrichten an alle',
    icon: MessageCircleMore
  },
  {
    key: 'directMessages',
    title: 'Direktnachrichten',
    description: 'Nur für das passende Profil',
    icon: ShieldCheck
  },
  {
    key: 'taskAssigned',
    title: 'Neue Aufgaben',
    description: 'Neue Missionen und Pflichten',
    icon: ClipboardCheck
  },
  {
    key: 'taskApproval',
    title: 'Aufgaben prüfen',
    description: 'Erledigt-Meldungen der Kinder',
    icon: ShieldCheck
  },
  {
    key: 'taskCompleted',
    title: 'Geschaffte Aufgaben',
    description: 'Sterne und Erfolge der Kinder',
    icon: Trophy
  },
  {
    key: 'events',
    title: 'Familientermine',
    description: 'Neue Kalendereinträge',
    icon: CalendarDays
  },
  {
    key: 'moodHelp',
    title: 'Brauche Nähe',
    description: 'Dringender Familienkompass-Hinweis',
    icon: BellRing
  },
  {
    key: 'encouragements',
    title: 'Mutmacher',
    description: 'Liebe Nachrichten der Familie',
    icon: MessageCircleHeart
  },
  {
    key: 'familyPolls',
    title: 'Abstimmungen',
    description: 'Neue Familienentscheidungen',
    icon: Vote
  },
  {
    key: 'schoolItems',
    title: 'Schule',
    description: 'Hausaufgaben und Klassenarbeiten',
    icon: GraduationCap
  }
];

export default function WebPushSettings() {
  const {
    activeMember,
    webPush,
    enableWebPush,
    disableWebPush,
    updateWebPushPreferences,
    testWebPush,
    fetchPushDevices,
    removePushDevice
  } = useFamily();
  const currentDevice =
    webPush.devices.find(device => device.id === webPush.currentDeviceId) ||
    null;
  const [preferences, setPreferences] = useState({
    ...webPush.defaults,
    ...(currentDevice?.preferences || {})
  });
  const [familyDevices, setFamilyDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState('');

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      setFamilyDevices(await fetchPushDevices());
    } catch {
      setFamilyDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [fetchPushDevices]);

  useEffect(() => {
    setPreferences({
      ...webPush.defaults,
      ...(currentDevice?.preferences || {})
    });
  }, [currentDevice?.id, currentDevice?.updatedAt, webPush.defaults]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const status = useMemo(() => {
    if (!webPush.supported) return 'unavailable';
    if (webPush.permission === 'denied') return 'denied';
    if (currentDevice) return 'connected';
    return 'ready';
  }, [currentDevice, webPush.permission, webPush.supported]);

  const toggle = key => {
    setPreferences(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const activate = async () => {
    const device = await enableWebPush(preferences);
    if (device) await loadDevices();
  };

  const remove = async deviceId => {
    if (confirmRemove !== deviceId) {
      setConfirmRemove(deviceId);
      return;
    }
    await removePushDevice(deviceId);
    setConfirmRemove('');
    await loadDevices();
  };

  return (
    <section className="admin-panel admin-webpush-panel">
      <header className="webpush-heading">
        <div className="webpush-mark"><BellRing size={23} /></div>
        <div>
          <span className="admin-section-kicker">Ohne Zusatz-App</span>
          <h2>Browser-Benachrichtigungen</h2>
          <p>
            Jedes Handy oder Tablet meldet sich einmal für ein Familienprofil
            an. Schlüssel und technische Daten bleiben unsichtbar.
          </p>
        </div>
        {status === 'connected' && (
          <span className="webpush-connected"><Check size={14} /> Dieses Gerät ist an</span>
        )}
      </header>

      {status === 'unavailable' && (
        <div className="webpush-prerequisite">
          <LockKeyhole size={24} />
          <div>
            <strong>
              {webPush.reason === 'secure-context'
                ? 'HTTPS fehlt – deshalb kommt kein Hintergrund-Push'
                : 'Noch ein sicherer Schritt'}
            </strong>
            <p>{webPush.message}</p>
            <small>
              Eine Android-App ist dafür nicht nötig. Öffne den Planer über
              eine vertrauenswürdige HTTPS-Adresse, füge ihn auf Android zum
              Startbildschirm hinzu und aktiviere danach dieses Gerät.
            </small>
          </div>
        </div>
      )}

      {status === 'denied' && (
        <div className="webpush-prerequisite denied">
          <BellRing size={24} />
          <div>
            <strong>Im Browser ausgeschaltet</strong>
            <p>
              Erlaube Benachrichtigungen in den Website-Einstellungen deines
              Browsers und öffne den Planer danach erneut.
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="webpush-ready-card">
          <div>
            <Smartphone size={25} />
            <span>
              <strong>Dieses Gerät für {activeMember?.name} anmelden</strong>
              <small>Ein Klick – kein Token und keine zusätzliche App.</small>
            </span>
          </div>
          <button type="button" onClick={activate} disabled={Boolean(webPush.busy)}>
            <BellRing size={17} />
            {webPush.busy === 'enable' ? 'Wird verbunden …' : 'Benachrichtigungen einschalten'}
          </button>
        </div>
      )}

      {status === 'connected' && (
        <>
          <div className="webpush-background-note">
            <Check size={16} />
            <span>
              <strong>Bereit für Hintergrund-Push</strong>
              Für die zuverlässigste Zustellung auf Android den Planer über
              „Zum Startbildschirm hinzufügen“ installieren und
              Benachrichtigungen in den Android-App-Einstellungen erlauben.
            </span>
          </div>
          <div className="webpush-rule-grid">
            {RULES.map(rule => {
              const Icon = rule.icon;
              return (
                <button
                  type="button"
                  key={rule.key}
                  className={preferences[rule.key] ? 'active' : ''}
                  aria-pressed={Boolean(preferences[rule.key])}
                  onClick={() => toggle(rule.key)}
                >
                  <span><Icon size={18} /></span>
                  <span>
                    <strong>{rule.title}</strong>
                    <small>{rule.description}</small>
                  </span>
                  <i>{preferences[rule.key] ? <Check size={13} /> : null}</i>
                </button>
              );
            })}
          </div>

          <label className="webpush-preview-option">
            <input
              type="checkbox"
              checked={Boolean(preferences.showPreviews)}
              onChange={() => toggle('showPreviews')}
            />
            <span>
              <strong>Details auf dem Sperrbildschirm zeigen</strong>
              Ausgeschaltet bleiben Chats, Aufgaben und Termine privat.
            </span>
          </label>

          <div className="webpush-actions">
            <button
              type="button"
              className="admin-primary-button"
              disabled={Boolean(webPush.busy)}
              onClick={() => updateWebPushPreferences(preferences)}
            >
              <Check size={16} />
              {webPush.busy === 'save' ? 'Speichert …' : 'Auswahl speichern'}
            </button>
            <button
              type="button"
              disabled={Boolean(webPush.busy)}
              onClick={testWebPush}
            >
              <Send size={16} />
              {webPush.busy === 'test' ? 'Sendet …' : 'Test senden'}
            </button>
            <button
              type="button"
              className="disconnect"
              disabled={Boolean(webPush.busy)}
              onClick={async () => {
                if (await disableWebPush()) await loadDevices();
              }}
            >
              <BellRing size={16} /> Auf diesem Gerät ausschalten
            </button>
          </div>
        </>
      )}

      <div className="webpush-device-section">
        <div className="webpush-device-title">
          <span>
            <Smartphone size={18} />
            <strong>Familiengeräte</strong>
          </span>
          <small>
            {loadingDevices
              ? 'Wird geladen …'
              : `${familyDevices.length} angemeldet`}
          </small>
        </div>
        <div className="webpush-device-list">
          {familyDevices.map(device => (
            <article key={device.id}>
              <span className="webpush-device-icon"><Smartphone size={18} /></span>
              <div>
                <strong>{device.deviceName}</strong>
                <small>{device.memberName} · zuletzt aktualisiert {
                  new Date(device.updatedAt).toLocaleDateString('de-DE')
                }</small>
              </div>
              <button
                type="button"
                aria-label={`${device.deviceName} entfernen`}
                onClick={() => remove(device.id)}
              >
                {confirmRemove === device.id ? 'Bestätigen' : <Trash2 size={16} />}
              </button>
            </article>
          ))}
          {!loadingDevices && !familyDevices.length && (
            <div className="admin-inline-empty">
              <Smartphone size={18} /> Noch kein Browser angemeldet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
