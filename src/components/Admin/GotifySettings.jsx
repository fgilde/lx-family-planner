import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Clock3,
  ExternalLink,
  MessageCircleMore,
  RadioTower,
  Send,
  ShieldCheck,
  Smartphone,
  Trophy,
  Unplug
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

const DEFAULT_RULES = {
  groupChat: true,
  directMessages: false,
  taskApproval: true,
  taskCompleted: true,
  moodHelp: true,
  includeMessageText: false
};

const RULE_OPTIONS = [
  {
    key: 'groupChat',
    title: 'Familienchat',
    description: 'Neue Nachrichten in der gemeinsamen Gruppe',
    icon: MessageCircleMore
  },
  {
    key: 'directMessages',
    title: 'Direktnachrichten',
    description: 'Auch private Chats als Push senden',
    icon: ShieldCheck
  },
  {
    key: 'taskApproval',
    title: 'Aufgaben prüfen',
    description: 'Wenn ein Kind eine Aufgabe fertig meldet',
    icon: Clock3
  },
  {
    key: 'taskCompleted',
    title: 'Aufgaben geschafft',
    description: 'Wenn ein Kind Sterne verdient',
    icon: Trophy
  },
  {
    key: 'moodHelp',
    title: 'Brauche Nähe',
    description: 'Hohe Priorität beim Familienkompass',
    icon: BellRing
  }
];

function suggestedPlannerUrl() {
  const current = new URL(window.location.origin);
  if (['localhost', '127.0.0.1'].includes(current.hostname)) {
    current.hostname = '192.168.10.10';
  }
  return current.origin;
}

export default function GotifySettings() {
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
    ...DEFAULT_RULES,
    ...(gotifyIntegration?.rules || {})
  });
  const [busy, setBusy] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (!gotifyIntegration) return;
    setRules({
      ...DEFAULT_RULES,
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
      return 'Gotify-Server';
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
          <span className="admin-section-kicker">Push-Nachrichten</span>
          <h2>Gotify-Benachrichtigungen</h2>
          <p>
            Wichtige Familienmomente erreichen euch auch dann, wenn der
            Planer gerade nicht geöffnet ist.
          </p>
        </div>
        {connected && (
          <span className="gotify-connected">
            <Check size={14} /> Verbunden
          </span>
        )}
      </header>

      {!connected ? (
        <form className="gotify-connect-form" onSubmit={connect}>
          <div className="gotify-security-note">
            <ShieldCheck size={19} />
            <span>
              <strong>Sichere Einrichtung</strong>
              Das Passwort wird nur einmal zum Erstellen einer eigenen
              Gotify-App verwendet und nicht gespeichert.
            </span>
          </div>
          <label>
            <span>Gotify-Server</span>
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
            <span>Benutzer</span>
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
            <span>Passwort</span>
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
            <span>Planer-Adresse auf dem Handy</span>
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
            {busy === 'connect' ? 'Verbindet …' : 'Verbinden & testen'}
          </button>
        </form>
      ) : (
        <>
          <div className="gotify-status-row">
            <div>
              <Smartphone size={19} />
              <span>
                <small>Nachrichtenkanal</small>
                <strong>{serverHost}</strong>
              </span>
            </div>
            <a
              href={gotifyIntegration.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Gotify öffnen <ExternalLink size={14} />
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
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
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
              <strong>Nachrichtentext auf dem Sperrbildschirm zeigen</strong>
              Aus Datenschutzgründen standardmäßig ausgeschaltet.
            </span>
          </label>

          <label className="gotify-phone-url">
            <span>Beim Antippen diese Planer-Adresse öffnen</span>
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
              {busy === 'save' ? 'Speichert …' : 'Regeln speichern'}
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={Boolean(busy)}
            >
              <Send size={16} />
              {busy === 'test' ? 'Sendet …' : 'Test senden'}
            </button>
            <button
              type="button"
              className="disconnect"
              onClick={disconnect}
              disabled={Boolean(busy)}
            >
              <Unplug size={16} />
              {confirmDisconnect ? 'Wirklich trennen?' : 'Verbindung trennen'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
