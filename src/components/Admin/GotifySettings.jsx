import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Bug,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock3,
  Coins,
  ExternalLink,
  Flag,
  Gift,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  MessageCircleMore,
  Network,
  RadioTower,
  Send,
  ShieldCheck,
  Smartphone,
  Trophy,
  Unplug,
  Vote
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import {
  DEFAULT_GOTIFY_RULES,
  NOTIFICATION_EVENT_DEFINITIONS
} from '../../../shared/notificationEvents';

const RULE_ICONS = {
  groupChat: MessageCircleMore,
  directMessages: ShieldCheck,
  events: CalendarClock,
  taskAssigned: ClipboardCheck,
  taskApproval: Clock3,
  taskCompleted: Trophy,
  moodUpdates: HeartPulse,
  moodHelp: BellRing,
  problemReports: Bug,
  encouragements: HeartHandshake,
  familyPolls: Vote,
  familyMissions: Flag,
  schoolItems: GraduationCap,
  rewards: Gift,
  pocketMoney: Coins,
  familyConnections: Network
};

const RULE_OPTIONS = NOTIFICATION_EVENT_DEFINITIONS.map(definition => ({
  ...definition,
  icon: RULE_ICONS[definition.key] || BellRing
}));

function suggestedPlannerUrl() {
  const current = new URL(window.location.origin);
  if (['localhost', '127.0.0.1'].includes(current.hostname)) {
    current.hostname = '192.168.10.10';
  }
  return current.origin;
}

export default function GotifySettings() {
  const { t } = useTranslation('admin');
  const { t: tShared } = useTranslation('shared');
  const {
    gotifyIntegration,
    setupGotify,
    updateGotifySettings,
    testGotify,
    disconnectGotify
  } = useFamily();
  const connected = Boolean(gotifyIntegration?.connected);
  const [form, setForm] = useState({
    baseUrl: gotifyIntegration?.baseUrl || 'https://push.example.de',
    username: 'admin',
    password: '',
    plannerUrl: gotifyIntegration?.plannerUrl || suggestedPlannerUrl()
  });
  const [rules, setRules] = useState({
    ...DEFAULT_GOTIFY_RULES,
    ...(gotifyIntegration?.rules || {})
  });
  const [busy, setBusy] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (!gotifyIntegration) return;
    setRules({
      ...DEFAULT_GOTIFY_RULES,
      ...(gotifyIntegration.rules || {})
    });
    setForm(previous => ({
      ...previous,
      baseUrl: gotifyIntegration.baseUrl || previous.baseUrl,
      plannerUrl: gotifyIntegration.plannerUrl || previous.plannerUrl,
      password: ''
    }));
  }, [gotifyIntegration]);

  const serverHost = useMemo(() => {
    try {
      return new URL(gotifyIntegration?.baseUrl || form.baseUrl).host;
    } catch {
      return '';
    }
  }, [form.baseUrl, gotifyIntegration?.baseUrl]);

  const connect = async event => {
    event.preventDefault();
    setBusy('connect');
    const result = await setupGotify({
      ...form,
      rules
    });
    setBusy('');
    if (result) setForm(previous => ({ ...previous, password: '' }));
  };

  const save = async () => {
    setBusy('save');
    await updateGotifySettings({
      plannerUrl: form.plannerUrl,
      rules
    });
    setBusy('');
  };

  const sendTest = async () => {
    setBusy('test');
    await testGotify();
    setBusy('');
  };

  const disconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy('disconnect');
    await disconnectGotify();
    setBusy('');
    setConfirmDisconnect(false);
  };

  const toggleRule = key => {
    setRules(previous => ({ ...previous, [key]: !previous[key] }));
  };

  return (
    <section className="admin-panel admin-gotify-panel">
      <header className="gotify-heading">
        <div className="gotify-mark"><RadioTower size={23} /></div>
        <div>
          <span className="admin-section-kicker">{t('gotify.kicker')}</span>
          <h2>{t('gotify.title')}</h2>
          <p>{t('gotify.intro')}</p>
        </div>
        {connected && (
          <span className="gotify-connected">
            <Check size={14} /> {t('gotify.connected')}
          </span>
        )}
      </header>

      {!connected ? (
        <form className="gotify-connect-form" onSubmit={connect}>
          <div className="gotify-security-note">
            <ShieldCheck size={19} />
            <span>
              <strong>{t('gotify.security.title')}</strong>
              {t('gotify.security.body')}
            </span>
          </div>
          <label>
            <span>{t('gotify.form.serverLabel')}</span>
            <input
              value={form.baseUrl}
              onChange={event => setForm(previous => ({
                ...previous,
                baseUrl: event.target.value
              }))}
              placeholder="https://push.example.de"
              required
            />
          </label>
          <label>
            <span>{t('gotify.form.usernameLabel')}</span>
            <input
              value={form.username}
              onChange={event => setForm(previous => ({
                ...previous,
                username: event.target.value
              }))}
              autoComplete="username"
              required
            />
          </label>
          <label>
            <span>{t('gotify.form.passwordLabel')}</span>
            <input
              type="password"
              value={form.password}
              onChange={event => setForm(previous => ({
                ...previous,
                password: event.target.value
              }))}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="gotify-planner-url">
            <span>{t('gotify.form.plannerUrlLabel')}</span>
            <input
              value={form.plannerUrl}
              onChange={event => setForm(previous => ({
                ...previous,
                plannerUrl: event.target.value
              }))}
              placeholder="http://192.168.10.10:3001"
              required
            />
          </label>
          <button className="gotify-connect-button" disabled={Boolean(busy)}>
            <RadioTower size={17} />
            {busy === 'connect'
              ? t('gotify.form.connecting')
              : t('gotify.form.connect')}
          </button>
        </form>
      ) : (
        <>
          <div className="gotify-status-row">
            <div>
              <Smartphone size={19} />
              <span>
                <small>{t('gotify.status.channel')}</small>
                <strong>{serverHost || t('gotify.serverFallback')}</strong>
              </span>
            </div>
            <a
              href={gotifyIntegration.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('gotify.status.openGotify')} <ExternalLink size={14} />
            </a>
          </div>

          <div className="gotify-rule-grid">
            {RULE_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <button
                  type="button"
                  key={option.key}
                  className={rules[option.key] ? 'active' : ''}
                  onClick={() => toggleRule(option.key)}
                  aria-pressed={rules[option.key]}
                >
                  <span><Icon size={18} /></span>
                  <span>
                    <strong>
                      {tShared(`events.${option.key}.title`, {
                        defaultValue: option.title
                      })}
                    </strong>
                    <small>
                      {tShared(`events.${option.key}.description`, {
                        defaultValue: option.description
                      })}
                    </small>
                  </span>
                  <i>{rules[option.key] ? <Check size={13} /> : null}</i>
                </button>
              );
            })}
          </div>

          <label className="gotify-content-option">
            <input
              type="checkbox"
              checked={Boolean(rules.includeMessageText)}
              onChange={() => toggleRule('includeMessageText')}
            />
            <span>
              <strong>{t('gotify.includeText.title')}</strong>
              {t('gotify.includeText.hint')}
            </span>
          </label>

          <label className="gotify-phone-url">
            <span>{t('gotify.phoneUrlLabel')}</span>
            <input
              value={form.plannerUrl}
              onChange={event => setForm(previous => ({
                ...previous,
                plannerUrl: event.target.value
              }))}
            />
          </label>

          <div className="gotify-actions">
            <button
              type="button"
              className="admin-primary-button"
              onClick={save}
              disabled={Boolean(busy)}
            >
              <Check size={16} />
              {busy === 'save'
                ? t('gotify.actions.saving')
                : t('gotify.actions.saveRules')}
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={Boolean(busy)}
            >
              <Send size={16} />
              {busy === 'test'
                ? t('gotify.actions.sending')
                : t('gotify.actions.sendTest')}
            </button>
            <button
              type="button"
              className="disconnect"
              onClick={disconnect}
              disabled={Boolean(busy)}
            >
              <Unplug size={16} />
              {confirmDisconnect
                ? t('gotify.actions.disconnectConfirm')
                : t('gotify.actions.disconnect')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
