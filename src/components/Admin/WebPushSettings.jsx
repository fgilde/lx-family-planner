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
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { NOTIFICATION_EVENT_DEFINITIONS } from '../../../shared/notificationEvents';
import { isCapacitorNative } from '../../utils/apiConfig';
import { formatDate } from '../../utils/formatting';

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

export default function WebPushSettings() {
  const { t } = useTranslation('admin');
  const { t: tShared } = useTranslation('shared');
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
            {isNative ? t('webPush.kickerNative') : t('webPush.kickerWeb')}
          </span>
          <h2>
            {isNative
              ? t('webPush.titleNative')
              : t('webPush.titleWeb')}
          </h2>
          <p>
            {isNative
              ? t('webPush.introNative')
              : t('webPush.introWeb')}
          </p>
        </div>
        {status === 'connected' && (
          <span className="webpush-connected"><Check size={14} /> {t('webPush.deviceConnected')}</span>
        )}
      </header>

      {status === 'server-missing' && (
        <div className="webpush-prerequisite">
          <LockKeyhole size={24} />
          <div>
            <strong>{t('webPush.serverMissing.title')}</strong>
            <p>{t('webPush.serverMissing.description')}</p>
            <small>{t('webPush.serverMissing.hint')}</small>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="webpush-prerequisite">
          <RefreshCw className="spin" size={24} />
          <div>
            <strong>{t('webPush.checking.title')}</strong>
            <p>{t('webPush.checking.description')}</p>
          </div>
        </div>
      )}

      {status === 'status-error' && (
        <div className="webpush-prerequisite denied">
          <RefreshCw size={24} />
          <div>
            <strong>{t('webPush.statusError.title')}</strong>
            <p>
              {push.statusError || t('webPush.statusError.fallback')}
            </p>
            <button
              type="button"
              onClick={() => refreshNativePushStatus()}
              disabled={Boolean(push.busy || push.loading)}
            >
              <RefreshCw size={16} />
              {t('webPush.statusError.retry')}
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
                ? t('webPush.unavailable.titleSecureContext')
                : t('webPush.unavailable.titleGeneric')}
            </strong>
            <p>{webPush.message}</p>
            <small>
              {isNative
                ? t('webPush.unavailable.hintNative')
                : t('webPush.unavailable.hintWeb')}
            </small>
          </div>
        </div>
      )}

      {status === 'denied' && (
        <div className="webpush-prerequisite denied">
          <BellRing size={24} />
          <div>
            <strong>{t('webPush.denied.title')}</strong>
            <p>
              {isNative
                ? t('webPush.denied.bodyNative')
                : t('webPush.denied.bodyWeb')}
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
                <strong>{t('webPush.ready.title', { name: activeMember?.name })}</strong>
                <small>
                  {isNative
                    ? t('webPush.ready.hintNative')
                    : t('webPush.ready.hintWeb')}
                </small>
              </span>
            </div>
            <button type="button" onClick={activate} disabled={Boolean(push.busy)}>
              <BellRing size={17} />
              {push.busy === 'enable'
                ? (push.activationStep
                    ? t(`webPush.activationSteps.${push.activationStep}`)
                    : t('webPush.ready.connecting'))
                : t('webPush.ready.enable')}
            </button>
          </div>
          {isNative && push.activationError && (
            <div className="webpush-activation-error" role="alert">
              <strong>{t('webPush.activationError')}</strong>
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
              <strong>{t('webPush.connectedNote.title')}</strong>
              {isNative
                ? t('webPush.connectedNote.bodyNative')
                : t('webPush.connectedNote.bodyWeb')}
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
                    <strong>
                      {tShared(`events.${rule.key}.title`, {
                        defaultValue: rule.title
                      })}
                    </strong>
                    <small>
                      {tShared(`events.${rule.key}.description`, {
                        defaultValue: rule.description
                      })}
                    </small>
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
              <strong>{t('webPush.preview.title')}</strong>
              {t('webPush.preview.hint')}
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
              {push.busy === 'save'
                ? t('webPush.actions.saving')
                : t('webPush.actions.save')}
            </button>
            <button
              type="button"
              disabled={Boolean(push.busy)}
              onClick={testPush}
            >
              <Send size={16} />
              {push.busy === 'test'
                ? t('webPush.actions.sending')
                : t('webPush.actions.sendTest')}
            </button>
            <button
              type="button"
              className="disconnect"
              disabled={Boolean(push.busy)}
              onClick={async () => {
                if (await disablePush()) await loadDevices();
              }}
            >
              <BellRing size={16} /> {t('webPush.actions.disable')}
            </button>
          </div>
        </>
      )}

      <div className="webpush-device-section">
        <div className="webpush-device-title">
          <span>
            <Smartphone size={18} />
            <strong>{t('webPush.devices.title')}</strong>
          </span>
          <small>
            {loadingDevices
              ? t('common:status.loading')
              : t('webPush.devices.registeredCount', {
                  count: familyDevices.length
                })}
          </small>
        </div>
        <div className="webpush-device-list">
          {familyDevices.map(device => (
            <article key={device.id}>
              <span className="webpush-device-icon"><Smartphone size={18} /></span>
              <div>
                <strong>{device.deviceName}</strong>
                <small>{t('webPush.devices.meta', {
                  transport: device.transport === 'android'
                    ? t('webPush.devices.transportAndroid')
                    : t('webPush.devices.transportBrowser'),
                  member: device.memberName,
                  date: formatDate(device.updatedAt)
                })}</small>
              </div>
              <button
                type="button"
                aria-label={t('webPush.devices.removeDevice', { name: device.deviceName })}
                onClick={() => remove(device.id)}
              >
                {confirmRemove === device.id
                  ? t('common:actions.confirm')
                  : <Trash2 size={16} />}
              </button>
            </article>
          ))}
          {!loadingDevices && !familyDevices.length && (
            <div className="admin-inline-empty">
              <Smartphone size={18} /> {t('webPush.devices.empty')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
