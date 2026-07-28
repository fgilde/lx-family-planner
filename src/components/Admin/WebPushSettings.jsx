import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Bug,
  CalendarDays,
  Check,
  Coins,
  ClipboardCheck,
  Flag,
  Gift,
  GraduationCap,
  HeartPulse,
  LockKeyhole,
  MessageCircleHeart,
  MessageCircleMore,
  Network,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Trophy,
  Vote
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { NOTIFICATION_EVENT_DEFINITIONS } from '../../../shared/notificationEvents';
import { isCapacitorNative } from '../../utils/apiConfig';

const RULE_ICONS = {
  groupChat: MessageCircleMore,
  directMessages: ShieldCheck,
  events: CalendarDays,
  taskAssigned: ClipboardCheck,
  taskApproval: ShieldCheck,
  taskCompleted: Trophy,
  moodUpdates: HeartPulse,
  moodHelp: BellRing,
  problemReports: Bug,
  encouragements: MessageCircleHeart,
  familyPolls: Vote,
  familyMissions: Flag,
  schoolItems: GraduationCap,
  rewards: Gift,
  pocketMoney: Coins,
  familyConnections: Network
};

const RULES = NOTIFICATION_EVENT_DEFINITIONS.map(definition => ({
  ...definition,
  icon: RULE_ICONS[definition.key] || BellRing
}));

const NATIVE_ACTIVATION_LABELS = {
  server: 'Server wird geprüft …',
  android: 'Android wird vorbereitet …',
  channels: 'Meldungen werden eingerichtet …',
  permission: 'Berechtigung wird geprüft …',
  'permission-request': 'Bitte Android-Abfrage bestätigen …',
  firebase: 'Gerät wird bei Firebase angemeldet …',
  save: 'Gerät wird gespeichert …'
};

export default function WebPushSettings() {
  const {
    activeMember,
    webPush,
    enableWebPush,
    disableWebPush,
    updateWebPushPreferences,
    testWebPush,
    nativePush,
    enableNativePush,
    disableNativePush,
    updateNativePushPreferences,
    testNativePush,
    refreshNativePushStatus,
    fetchPushDevices,
    removePushDevice
  } = useFamily();
  const isNative = isCapacitorNative();
  const push = isNative ? nativePush : webPush;
  const enablePush = isNative ? enableNativePush : enableWebPush;
  const disablePush = isNative ? disableNativePush : disableWebPush;
  const updatePushPreferences = isNative
    ? updateNativePushPreferences
    : updateWebPushPreferences;
  const testPush = isNative ? testNativePush : testWebPush;
  const currentDevice =
    push.devices.find(device => device.id === push.currentDeviceId) ||
    null;
  const [preferences, setPreferences] = useState({
    ...push.defaults,
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
      ...push.defaults,
      ...(currentDevice?.preferences || {})
    });
  }, [currentDevice?.id, currentDevice?.updatedAt, push.defaults]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!isNative) return;
    refreshNativePushStatus({ silent: true });
  }, [isNative, refreshNativePushStatus]);

  const status = useMemo(() => {
    if (!push.supported) return 'unavailable';
    if (push.loading) return 'loading';
    if (isNative && push.serverConfigured === false) return 'server-missing';
    if (isNative && push.serverConfigured !== true) return 'status-error';
    if (push.permission === 'denied') return 'denied';
    if (currentDevice) return 'connected';
    return 'ready';
  }, [
    currentDevice,
    isNative,
    push.permission,
    push.serverConfigured,
    push.supported
  ]);

  const toggle = key => {
    setPreferences(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const activate = async () => {
    const device = await enablePush(preferences);
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
          <span className="admin-section-kicker">
            {isNative ? 'Direkt von Android' : 'Ohne Zusatz-App'}
          </span>
          <h2>
            {isNative
              ? 'Android-App-Benachrichtigungen'
              : 'Browser-Benachrichtigungen'}
          </h2>
          <p>
            {isNative
              ? 'Die LX App meldet dieses Android-Gerät einmal für ein Profil an. Danach kommen Meldungen auch bei geschlossener App.'
              : 'Jedes Handy oder Tablet meldet sich einmal für ein Familienprofil an. Schlüssel und technische Daten bleiben unsichtbar.'}
          </p>
        </div>
        {status === 'connected' && (
          <span className="webpush-connected"><Check size={14} /> Dieses Gerät ist an</span>
        )}
      </header>

      {status === 'server-missing' && (
        <div className="webpush-prerequisite">
          <LockKeyhole size={24} />
          <div>
            <strong>Firebase-Verbindung fehlt noch</strong>
            <p>
              Der LX-Server besitzt noch keinen privaten Firebase-Dienstschlüssel.
              Deshalb kann er Android momentan nicht erreichen.
            </p>
            <small>
              Lege den Dienstschlüssel ausschließlich im Datenordner des Servers
              ab und installiere danach die mit demselben Firebase-Projekt gebaute
              LX App. Der Schlüssel gehört niemals ins Git-Repository.
            </small>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="webpush-prerequisite">
          <RefreshCw className="spin" size={24} />
          <div>
            <strong>Android-Verbindung wird geprüft</strong>
            <p>LX fragt den aktuellen Firebase-Status beim Familienserver ab.</p>
          </div>
        </div>
      )}

      {status === 'status-error' && (
        <div className="webpush-prerequisite denied">
          <RefreshCw size={24} />
          <div>
            <strong>Status konnte nicht geprüft werden</strong>
            <p>
              {push.statusError ||
                'Die App hat noch keine Antwort vom Familienserver erhalten.'}
            </p>
            <button
              type="button"
              onClick={() => refreshNativePushStatus()}
              disabled={Boolean(push.busy || push.loading)}
            >
              <RefreshCw size={16} />
              Erneut prüfen
            </button>
          </div>
        </div>
      )}

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
              {isNative
                ? 'Installiere die aktuelle LX Android-App, um native Benachrichtigungen zu verwenden.'
                : 'Öffne den Planer über eine vertrauenswürdige HTTPS-Adresse, füge ihn auf Android zum Startbildschirm hinzu und aktiviere danach dieses Gerät.'}
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
              {isNative
                ? 'Erlaube Benachrichtigungen unter Android → Apps → LX Family Planner → Benachrichtigungen.'
                : 'Erlaube Benachrichtigungen in den Website-Einstellungen deines Browsers und öffne den Planer danach erneut.'}
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="webpush-ready-card">
            <div>
              <Smartphone size={25} />
              <span>
                <strong>Dieses Gerät für {activeMember?.name} anmelden</strong>
                <small>
                  {isNative
                    ? 'Ein Klick – die Android-Abfrage erscheint nur einmal.'
                    : 'Ein Klick – kein Token und keine zusätzliche App.'}
                </small>
              </span>
            </div>
            <button type="button" onClick={activate} disabled={Boolean(push.busy)}>
              <BellRing size={17} />
              {push.busy === 'enable'
                ? NATIVE_ACTIVATION_LABELS[push.activationStep] ||
                  'Wird verbunden …'
                : 'Benachrichtigungen einschalten'}
            </button>
          </div>
          {isNative && push.activationError && (
            <div className="webpush-activation-error" role="alert">
              <strong>Verbindung nicht abgeschlossen</strong>
              <span>{push.activationError}</span>
            </div>
          )}
        </>
      )}

      {status === 'connected' && (
        <>
          <div className="webpush-background-note">
            <Check size={16} />
            <span>
              <strong>Bereit für Hintergrund-Push</strong>
              {isNative
                ? 'Android zeigt Familienmeldungen im Systembereich und auf Wunsch auf dem Sperrbildschirm – auch wenn LX geschlossen ist.'
                : 'Für die zuverlässigste Zustellung auf Android den Planer über „Zum Startbildschirm hinzufügen“ installieren und Benachrichtigungen in den Android-App-Einstellungen erlauben.'}
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
              disabled={Boolean(push.busy)}
              onClick={() => updatePushPreferences(preferences)}
            >
              <Check size={16} />
              {push.busy === 'save' ? 'Speichert …' : 'Auswahl speichern'}
            </button>
            <button
              type="button"
              disabled={Boolean(push.busy)}
              onClick={testPush}
            >
              <Send size={16} />
              {push.busy === 'test' ? 'Sendet …' : 'Test senden'}
            </button>
            <button
              type="button"
              className="disconnect"
              disabled={Boolean(push.busy)}
              onClick={async () => {
                if (await disablePush()) await loadDevices();
              }}
            >
              <BellRing size={16} /> Für dieses Profil ausschalten
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
                <small>{
                  device.transport === 'android' ? 'Android-App' : 'Browser'
                } · {device.memberName} · zuletzt aktualisiert {
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
              <Smartphone size={18} /> Noch kein Familiengerät angemeldet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
