import React, { useMemo, useState } from 'react';
import {
  Activity,
  Blinds,
  CloudSun,
  Fan,
  Gauge,
  Home,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Play,
  Power,
  RefreshCw,
  ShieldAlert,
  Snowflake,
  Thermometer,
  ToggleLeft,
  Wind
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { canManageFamily } from '../../constants/roles';

const STATE_LABELS = {
  on: 'An',
  off: 'Aus',
  open: 'Offen',
  closed: 'Geschlossen',
  opening: 'Öffnet …',
  closing: 'Schließt …',
  home: 'Zuhause',
  not_home: 'Unterwegs',
  unavailable: 'Nicht erreichbar',
  unknown: 'Unbekannt',
  clear: 'Klar',
  cloudy: 'Bewölkt',
  rainy: 'Regen'
};

function EntityIcon({ entity, size = 20 }) {
  const Icon = {
    binary_sensor: Activity,
    button: ToggleLeft,
    climate: Thermometer,
    cover: Blinds,
    fan: Fan,
    input_boolean: ToggleLeft,
    light: Lightbulb,
    scene: Play,
    script: Play,
    sensor: Gauge,
    sun: CloudSun,
    switch: Power,
    vacuum: Wind,
    weather: CloudSun
  }[entity.domain] || Home;
  return <Icon size={size} />;
}

function displayState(entity) {
  if (
    entity.temperature !== null &&
    entity.temperature !== undefined
  ) {
    return `${entity.temperature} °C`;
  }
  const label = STATE_LABELS[entity.state] || entity.state;
  return `${label}${entity.unit ? ` ${entity.unit}` : ''}`;
}

function primaryAction(entity) {
  if (['light', 'switch', 'input_boolean', 'fan'].includes(entity.domain)) {
    return entity.state === 'on' ? 'turn_off' : 'turn_on';
  }
  if (entity.domain === 'scene' || entity.domain === 'script') {
    return 'turn_on';
  }
  if (entity.domain === 'button') return 'press';
  if (entity.domain === 'vacuum') {
    return entity.state === 'cleaning' ? 'return_to_base' : 'start';
  }
  if (entity.domain === 'media_player') return 'media_play_pause';
  return '';
}

export default function HomeAssistantWidget({
  className = '',
  compact = false,
  title = 'Unser Zuhause'
}) {
  const {
    activeMember,
    homeAssistantEntities,
    homeAssistantLoading,
    refreshHomeAssistantStates,
    callHomeAssistantAction
  } = useFamily();
  const [busyEntity, setBusyEntity] = useState('');
  const [confirmRequest, setConfirmRequest] = useState(null);
  const entities = useMemo(
    () => homeAssistantEntities || [],
    [homeAssistantEntities]
  );
  const isAdult = canManageFamily(activeMember);

  const run = async (entity, action, payload = {}) => {
    if (!action) return;
    if (entity.requiresAdult) {
      if (!isAdult) return;
      if (
        confirmRequest?.entityId !== entity.entityId ||
        confirmRequest?.action !== action
      ) {
        setConfirmRequest({
          entityId: entity.entityId,
          action,
          payload
        });
        return;
      }
    }
    setBusyEntity(entity.entityId);
    await callHomeAssistantAction(entity.entityId, action, payload);
    setBusyEntity('');
    setConfirmRequest(null);
  };

  return (
    <section
      className={`home-assistant-widget ${compact ? 'compact' : ''} ${className}`}
    >
      <header>
        <div>
          <span className="ha-widget-mark"><Home size={20} /></span>
          <span>
            <small>Home Assistant · live</small>
            <strong>{title}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => refreshHomeAssistantStates()}
          disabled={homeAssistantLoading}
          aria-label="Hausstatus aktualisieren"
          title="Aktualisieren"
        >
          {homeAssistantLoading
            ? <LoaderCircle className="spin" size={16} />
            : <RefreshCw size={16} />}
        </button>
      </header>

      {!entities.length ? (
        <div className="ha-widget-empty">
          <Gauge size={24} />
          <span>
            <strong>Noch keine Hauskacheln</strong>
            <small>
              Ein Elternprofil kann Geräte und Sensoren in der Elternzentrale
              freigeben.
            </small>
          </span>
        </div>
      ) : (
        <div className="ha-widget-grid">
          {entities.slice(0, compact ? 8 : 12).map(entity => {
            const action = primaryAction(entity);
            const isBusy = busyEntity === entity.entityId;
            const needsConfirmation =
              confirmRequest?.entityId === entity.entityId &&
              entity.requiresAdult;
            return (
              <article
                key={entity.entityId}
                className={[
                  entity.allowControl ? 'controllable' : '',
                  entity.state === 'on' ||
                  entity.state === 'open' ||
                  entity.state === 'cleaning'
                    ? 'active'
                    : '',
                  entity.state === 'unavailable' ? 'unavailable' : ''
                ].join(' ')}
              >
                <span className="ha-entity-icon">
                  {entity.requiresAdult
                    ? <LockKeyhole size={18} />
                    : <EntityIcon entity={entity} size={18} />}
                </span>
                <span className="ha-entity-copy">
                  <strong title={entity.name}>{entity.name}</strong>
                  <small>{displayState(entity)}</small>
                </span>

                {entity.domain === 'cover' && entity.allowControl ? (
                  <span className="ha-cover-actions">
                    <button
                      type="button"
                      disabled={isBusy || (entity.requiresAdult && !isAdult)}
                      onClick={() => run(entity, 'open_cover')}
                      title="Öffnen"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || (entity.requiresAdult && !isAdult)}
                      onClick={() => run(entity, 'close_cover')}
                      title="Schließen"
                    >
                      ↓
                    </button>
                  </span>
                ) : entity.domain === 'climate' && entity.allowControl ? (
                  <span className="ha-climate-actions">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => run(entity, 'set_temperature', {
                        temperature: Math.max(
                          5,
                          Number(entity.targetTemperature || 20) - 0.5
                        )
                      })}
                    >
                      −
                    </button>
                    <em>{entity.targetTemperature ?? 20}°</em>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => run(entity, 'set_temperature', {
                        temperature: Math.min(
                          35,
                          Number(entity.targetTemperature || 20) + 0.5
                        )
                      })}
                    >
                      +
                    </button>
                  </span>
                ) : action && entity.allowControl ? (
                  <button
                    type="button"
                    className="ha-primary-action"
                    disabled={isBusy || (entity.requiresAdult && !isAdult)}
                    onClick={() => run(entity, action)}
                    title={
                      entity.requiresAdult
                        ? 'Nur für Erwachsene mit Bestätigung'
                        : 'Steuern'
                    }
                  >
                    {isBusy
                      ? <LoaderCircle className="spin" size={15} />
                      : entity.domain === 'scene' ||
                        entity.domain === 'script'
                        ? <Play size={15} />
                        : entity.domain === 'climate'
                          ? <Snowflake size={15} />
                          : <Power size={15} />}
                  </button>
                ) : null}

                {needsConfirmation && (
                  <button
                    type="button"
                    className="ha-confirm-action"
                    onClick={() => run(
                      entity,
                      confirmRequest.action,
                      confirmRequest.payload
                    )}
                  >
                    <ShieldAlert size={13} /> Bestätigen
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
