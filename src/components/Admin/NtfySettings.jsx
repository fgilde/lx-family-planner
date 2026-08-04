import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  ExternalLink,
  RadioTower,
  Send,
  ShieldCheck,
  Unplug
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import {
  DEFAULT_GOTIFY_RULES,
  NOTIFICATION_EVENT_DEFINITIONS
} from '../../../shared/notificationEvents';

function suggestedPlannerUrl() {
  return window.location.origin;
}

function suggestedTopic() {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 10) ||
    Math.random().toString(36).slice(2, 12);
  return `lx-family-${suffix}`;
}

export default function NtfySettings() {
  const { t } = useTranslation('admin');
  const { t: tShared } = useTranslation('shared');
  const {
    ntfyIntegration,
    setupNtfy,
    updateNtfySettings,
    testNtfy,
    disconnectNtfy
  } = useFamily();
  const connected = Boolean(ntfyIntegration?.connected);
  const [form, setForm] = useState({
    baseUrl: ntfyIntegration?.baseUrl || 'https://ntfy.sh',
    topic: ntfyIntegration?.topic || suggestedTopic(),
    token: '',
    plannerUrl: ntfyIntegration?.plannerUrl || suggestedPlannerUrl()
  });
  const [rules, setRules] = useState({
    ...DEFAULT_GOTIFY_RULES,
    ...(ntfyIntegration?.rules || {})
  });
  const [busy, setBusy] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (!ntfyIntegration) return;
    setRules({
      ...DEFAULT_GOTIFY_RULES,
      ...(ntfyIntegration.rules || {})
    });
    setForm(previous => ({
      ...previous,
      baseUrl: ntfyIntegration.baseUrl || previous.baseUrl,
      topic: ntfyIntegration.topic || previous.topic,
      plannerUrl: ntfyIntegration.plannerUrl || previous.plannerUrl,
      token: ''
    }));
  }, [ntfyIntegration]);

  const serverHost = useMemo(() => {
    try {
      return new URL(ntfyIntegration?.baseUrl || form.baseUrl).host;
    } catch {
      return '';
    }
  }, [form.baseUrl, ntfyIntegration?.baseUrl]);

  const submit = async event => {
    event.preventDefault();
    setBusy('connect');
    const result = await setupNtfy({ ...form, rules });
    setBusy('');
    if (result) setForm(previous => ({ ...previous, token: '' }));
  };

  const save = async () => {
    setBusy('save');
    await updateNtfySettings({
      topic: form.topic,
      plannerUrl: form.plannerUrl,
      ...(form.token ? { token: form.token } : {}),
      rules
    });
    setBusy('');
    setForm(previous => ({ ...previous, token: '' }));
  };

  const sendTest = async () => {
    setBusy('test');
    await testNtfy();
    setBusy('');
  };

  const disconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy('disconnect');
    await disconnectNtfy();
    setBusy('');
    setConfirmDisconnect(false);
  };

  return (
    <section className="admin-panel admin-gotify-panel admin-ntfy-panel">
      <header className="gotify-heading">
        <div className="gotify-mark"><RadioTower size={23} /></div>
        <div>
          <span className="admin-section-kicker">{t('ntfy.kicker')}</span>
          <h2>{t('ntfy.title')}</h2>
          <p>{t('ntfy.intro')}</p>
        </div>
        {connected && (
          <span className="gotify-connected">
            <Check size={14} /> {t('ntfy.connected')}
          </span>
        )}
      </header>

      {!connected ? (
        <form className="gotify-connect-form" onSubmit={submit}>
          <div className="gotify-security-note">
            <ShieldCheck size={19} />
            <span>
              <strong>{t('ntfy.security.title')}</strong>
              {t('ntfy.security.body')}
            </span>
          </div>
          <label>
            <span>{t('ntfy.server')}</span>
            <input
              type="url"
              value={form.baseUrl}
              onChange={event => setForm(previous => ({
                ...previous,
                baseUrl: event.target.value
              }))}
              required
            />
          </label>
          <label>
            <span>{t('ntfy.topic')}</span>
            <input
              value={form.topic}
              pattern="[-_A-Za-z0-9]{1,64}"
              onChange={event => setForm(previous => ({
                ...previous,
                topic: event.target.value
              }))}
              required
            />
          </label>
          <label>
            <span>{t('ntfy.token')}</span>
            <input
              type="password"
              value={form.token}
              onChange={event => setForm(previous => ({
                ...previous,
                token: event.target.value
              }))}
              autoComplete="off"
              placeholder={t('ntfy.tokenPlaceholder')}
            />
          </label>
          <label>
            <span>{t('ntfy.plannerUrl')}</span>
            <input
              type="url"
              value={form.plannerUrl}
              onChange={event => setForm(previous => ({
                ...previous,
                plannerUrl: event.target.value
              }))}
            />
          </label>
          <button className="gotify-connect-button" disabled={Boolean(busy)}>
            <RadioTower size={17} />
            {busy ? t('ntfy.connecting') : t('ntfy.connect')}
          </button>
        </form>
      ) : (
        <>
          <div className="gotify-status-row">
            <div>
              <BellRing size={19} />
              <span>
                <small>{serverHost}</small>
                <strong>{ntfyIntegration.topic}</strong>
              </span>
            </div>
            <a href={ntfyIntegration.baseUrl} target="_blank" rel="noopener noreferrer">
              {t('ntfy.open')} <ExternalLink size={14} />
            </a>
          </div>

          <div className="gotify-rule-grid">
            {NOTIFICATION_EVENT_DEFINITIONS.map(option => (
              <button
                type="button"
                key={option.key}
                className={rules[option.key] ? 'active' : ''}
                onClick={() => setRules(previous => ({
                  ...previous,
                  [option.key]: !previous[option.key]
                }))}
                aria-pressed={rules[option.key]}
              >
                <span><BellRing size={18} /></span>
                <span>
                  <strong>{tShared(`events.${option.key}.title`, {
                    defaultValue: option.title
                  })}</strong>
                  <small>{tShared(`events.${option.key}.description`, {
                    defaultValue: option.description
                  })}</small>
                </span>
                <i>{rules[option.key] ? <Check size={13} /> : null}</i>
              </button>
            ))}
          </div>

          <label className="gotify-content-option">
            <input
              type="checkbox"
              checked={Boolean(rules.includeMessageText)}
              onChange={() => setRules(previous => ({
                ...previous,
                includeMessageText: !previous.includeMessageText
              }))}
            />
            <span>
              <strong>{t('ntfy.includeText')}</strong>
              {t('ntfy.includeTextHint')}
            </span>
          </label>

          <div className="ntfy-connected-fields">
            <label>
              <span>{t('ntfy.topic')}</span>
              <input
                value={form.topic}
                pattern="[-_A-Za-z0-9]{1,64}"
                onChange={event => setForm(previous => ({
                  ...previous,
                  topic: event.target.value
                }))}
              />
            </label>
            <label>
              <span>{t('ntfy.plannerUrl')}</span>
              <input
                value={form.plannerUrl}
                onChange={event => setForm(previous => ({
                  ...previous,
                  plannerUrl: event.target.value
                }))}
              />
            </label>
          </div>

          <div className="gotify-actions">
            <button type="button" className="admin-primary-button" onClick={save} disabled={Boolean(busy)}>
              <Check size={16} /> {t('ntfy.save')}
            </button>
            <button type="button" onClick={sendTest} disabled={Boolean(busy)}>
              <Send size={16} /> {t('ntfy.test')}
            </button>
            <button type="button" className="is-danger" onClick={disconnect} disabled={Boolean(busy)}>
              <Unplug size={16} />
              {confirmDisconnect ? t('ntfy.disconnectConfirm') : t('ntfy.disconnect')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
