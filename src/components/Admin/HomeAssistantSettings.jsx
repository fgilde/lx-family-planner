import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Gauge,
  Home,
  KeyRound,
  Link2,
  LoaderCircle,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wifi
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { isManagedProfile } from '../../constants/roles';

const CONTROLLABLE_DOMAINS = new Set([
  'button',
  'climate',
  'cover',
  'fan',
  'input_boolean',
  'light',
  'media_player',
  'scene',
  'script',
  'switch',
  'vacuum'
]);

const DOMAIN_LABELS = {
  binary_sensor: 'Status',
  button: 'Taste',
  climate: 'Klima',
  cover: 'Rollladen',
  device_tracker: 'Anwesenheit',
  fan: 'Lüfter',
  input_boolean: 'Schalter',
  light: 'Licht',
  media_player: 'Medien',
  person: 'Person',
  scene: 'Szene',
  script: 'Ablauf',
  sensor: 'Sensor',
  sun: 'Sonne',
  switch: 'Schalter',
  vacuum: 'Saugroboter',
  weather: 'Wetter'
};

function selectedMap(items) {
  return new Map((items || []).map(item => [item.entityId, item]));
}

export default function HomeAssistantSettings() {
  const {
    members,
    homeAssistantIntegration,
    setupHomeAssistant,
    fetchHomeAssistantEntities,
    updateHomeAssistant,
    testHomeAssistant,
    disconnectHomeAssistant
  } = useFamily();
  const [baseUrl, setBaseUrl] = useState(
    homeAssistantIntegration?.baseUrl || ''
  );
  const [token, setToken] = useState('');
  const [available, setAvailable] = useState([]);
  const [selection, setSelection] = useState(() =>
    selectedMap(homeAssistantIntegration?.selectedEntities)
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const connected = Boolean(homeAssistantIntegration?.connected);
  const assignableProfiles = members.filter(
    member =>
      !isManagedProfile(member) &&
      member.role !== 'pet' &&
      ['child', 'teen'].includes(member.role)
  );

  useEffect(() => {
    setBaseUrl(homeAssistantIntegration?.baseUrl || '');
    setSelection(selectedMap(homeAssistantIntegration?.selectedEntities));
  }, [
    homeAssistantIntegration?.baseUrl,
    homeAssistantIntegration?.updatedAt
  ]);

  const loadEntities = async () => {
    setBusy('load');
    const result = await fetchHomeAssistantEntities();
    if (result) setAvailable(result);
    setBusy('');
  };

  const connect = async event => {
    event.preventDefault();
    if (!baseUrl.trim() || !token.trim()) return;
    setBusy('connect');
    const result = await setupHomeAssistant({
      baseUrl: baseUrl.trim(),
      token: token.trim()
    });
    setBusy('');
    if (result) {
      setToken('');
      setAvailable(result.entities || []);
      setSelection(selectedMap(result.integration?.selectedEntities));
    }
  };

  const toggleEntity = entity => {
    setSelection(previous => {
      const next = new Map(previous);
      if (next.has(entity.entityId)) {
        next.delete(entity.entityId);
      } else {
        next.set(entity.entityId, {
          entityId: entity.entityId,
          name: entity.name,
          allowControl: false,
          profileIds: []
        });
      }
      return next;
    });
  };

  const patchEntity = (entityId, changes) => {
    setSelection(previous => {
      const next = new Map(previous);
      const current = next.get(entityId);
      if (current) next.set(entityId, { ...current, ...changes });
      return next;
    });
  };

  const save = async () => {
    setBusy('save');
    await updateHomeAssistant({
      enabled: homeAssistantIntegration?.enabled !== false,
      selectedEntities: [...selection.values()]
    });
    setBusy('');
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('de-DE');
    return available.filter(entity =>
      !term ||
      `${entity.name} ${entity.entityId} ${DOMAIN_LABELS[entity.domain] || ''}`
        .toLocaleLowerCase('de-DE')
        .includes(term)
    );
  }, [available, search]);

  return (
    <section className="admin-panel ha-settings-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">
            Smart Home · lokal & geschützt
          </span>
          <h2><Home size={22} /> Home Assistant</h2>
        </div>
        <span className={`ha-connection-badge ${connected ? 'online' : ''}`}>
          <i />
          {connected ? 'Verbunden' : 'Nicht verbunden'}
        </span>
      </header>

      <p className="admin-panel-intro">
        Holt ausgewählte Hauszustände als echte Kacheln in den Familienplaner.
        Der Zugriffsschlüssel bleibt verschlüsselt auf eurem Server.
      </p>

      {!connected ? (
        <form className="ha-connect-form" onSubmit={connect}>
          <label>
            <span><Link2 size={14} /> Home-Assistant-Adresse</span>
            <input
              value={baseUrl}
              onChange={event => setBaseUrl(event.target.value)}
              placeholder="http://192.168.178.50:8123"
              inputMode="url"
              required
            />
            <small>
              Bei Docker am zuverlässigsten die feste IP im Heimnetz verwenden.
            </small>
          </label>
          <label>
            <span><KeyRound size={14} /> Langlebiger Zugriffsschlüssel</span>
            <input
              type="password"
              value={token}
              onChange={event => setToken(event.target.value)}
              autoComplete="new-password"
              placeholder="Token aus dem Home-Assistant-Profil"
              required
            />
            <small>Der Schlüssel wird nach dem Speichern nicht mehr angezeigt.</small>
          </label>
          <button className="admin-primary-button" disabled={busy === 'connect'}>
            {busy === 'connect'
              ? <LoaderCircle className="spin" size={17} />
              : <Wifi size={17} />}
            Verbindung prüfen
          </button>
        </form>
      ) : (
        <div className="ha-connected-workspace">
          <div className="ha-connection-summary">
            <span className="ha-home-mark"><Gauge size={25} /></span>
            <span>
              <strong>{homeAssistantIntegration.host}</strong>
              <small>
                {selection.size} Kachel{selection.size === 1 ? '' : 'n'} im
                Dashboard freigegeben
              </small>
            </span>
            <label className="ha-master-switch">
              <input
                type="checkbox"
                checked={homeAssistantIntegration.enabled !== false}
                onChange={event =>
                  updateHomeAssistant({ enabled: event.target.checked })
                }
              />
              <span><Power size={14} /> Aktiv</span>
            </label>
          </div>

          <div className="ha-toolbar">
            <button
              type="button"
              onClick={loadEntities}
              disabled={busy === 'load'}
            >
              {busy === 'load'
                ? <LoaderCircle className="spin" size={16} />
                : <RefreshCw size={16} />}
              Geräte laden
            </button>
            <button type="button" onClick={testHomeAssistant}>
              <Wifi size={16} /> Verbindung testen
            </button>
            {available.length > 0 && (
              <label>
                <Search size={15} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Gerät oder Sensor suchen"
                />
              </label>
            )}
          </div>

          {!available.length ? (
            <button
              type="button"
              className="ha-load-callout"
              onClick={loadEntities}
            >
              <SlidersHorizontal size={23} />
              <span>
                <strong>Dashboard-Kacheln auswählen</strong>
                <small>
                  Lade die Geräte und entscheide genau, was sichtbar und
                  steuerbar sein darf.
                </small>
              </span>
              <ChevronDown size={18} />
            </button>
          ) : (
            <>
              <div className="ha-entity-list">
                {filtered.slice(0, 250).map(entity => {
                  const configured = selection.get(entity.entityId);
                  const controllable = CONTROLLABLE_DOMAINS.has(entity.domain);
                  return (
                    <article
                      key={entity.entityId}
                      className={configured ? 'selected' : ''}
                    >
                      <button
                        type="button"
                        className="ha-entity-select"
                        onClick={() => toggleEntity(entity)}
                        aria-pressed={Boolean(configured)}
                      >
                        <span className="ha-entity-check">
                          {configured && <Check size={13} />}
                        </span>
                        <span>
                          <strong>{entity.name}</strong>
                          <small>
                            {DOMAIN_LABELS[entity.domain] || entity.domain}
                            {' · '}{entity.entityId}
                          </small>
                        </span>
                        <em>
                          {entity.state}{entity.unit ? ` ${entity.unit}` : ''}
                        </em>
                      </button>
                      {configured && (
                        <div className="ha-entity-permissions">
                          {controllable && (
                            <label>
                              <input
                                type="checkbox"
                                checked={configured.allowControl}
                                onChange={event => patchEntity(
                                  entity.entityId,
                                  { allowControl: event.target.checked }
                                )}
                              />
                              <span><ShieldCheck size={13} /> Bedienung erlauben</span>
                            </label>
                          )}
                          {assignableProfiles.length > 0 && (
                            <div>
                              <span>Auch sichtbar für:</span>
                              {assignableProfiles.map(member => {
                                const active =
                                  configured.profileIds.includes(member.id);
                                return (
                                  <button
                                    type="button"
                                    key={member.id}
                                    className={active ? 'active' : ''}
                                    onClick={() => patchEntity(
                                      entity.entityId,
                                      {
                                        profileIds: active
                                          ? configured.profileIds.filter(
                                              id => id !== member.id
                                            )
                                          : [
                                              ...configured.profileIds,
                                              member.id
                                            ]
                                      }
                                    )}
                                  >
                                    {member.name.split(' ')[0]}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
                {!filtered.length && (
                  <div className="admin-inline-empty">
                    Keine passenden Geräte gefunden.
                  </div>
                )}
              </div>
              <div className="ha-save-bar">
                <span>
                  <strong>{selection.size} ausgewählt</strong>
                  <small>Erwachsene sehen alle, Kinder nur ihre Freigaben.</small>
                </span>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={save}
                  disabled={busy === 'save'}
                >
                  {busy === 'save'
                    ? <LoaderCircle className="spin" size={16} />
                    : <Check size={16} />}
                  Auswahl speichern
                </button>
              </div>
            </>
          )}

          <details className="ha-danger-zone">
            <summary>Verbindung verwalten</summary>
            <div>
              <form onSubmit={connect}>
                <input
                  value={baseUrl}
                  onChange={event => setBaseUrl(event.target.value)}
                  aria-label="Home-Assistant-Adresse"
                  required
                />
                <input
                  type="password"
                  value={token}
                  onChange={event => setToken(event.target.value)}
                  placeholder="Neuer Zugriffsschlüssel"
                  aria-label="Neuer Zugriffsschlüssel"
                  required
                />
                <button>Verbindung erneuern</button>
              </form>
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  if (!confirmDisconnect) {
                    setConfirmDisconnect(true);
                    return;
                  }
                  await disconnectHomeAssistant();
                  setConfirmDisconnect(false);
                  setAvailable([]);
                }}
              >
                <Trash2 size={15} />
                {confirmDisconnect ? 'Wirklich trennen?' : 'Verbindung trennen'}
              </button>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
