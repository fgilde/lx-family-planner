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
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { canManageFamily } from '../../constants/roles';

const STATE_LABEL_KEYS = {
  on: 'homeAssistant.states.on',
  off: 'homeAssistant.states.off',
  open: 'homeAssistant.states.open',
  closed: 'homeAssistant.states.closed',
  opening: 'homeAssistant.states.opening',
  closing: 'homeAssistant.states.closing',
  home: 'homeAssistant.states.home',
  not_home: 'homeAssistant.states.notHome',
  unavailable: 'homeAssistant.states.unavailable',
  unknown: 'homeAssistant.states.unknown',
  clear: 'homeAssistant.states.clear',
  cloudy: 'homeAssistant.states.cloudy',
  rainy: 'homeAssistant.states.rainy'
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

function displayState(entity, t) {
  if (
    entity.temperature !== null &&
    entity.temperature !== undefined
  ) {
    return `${entity.temperature} °C`;
  }
  const labelKey = STATE_LABEL_KEYS[entity.state];
  const label = labelKey ? t(labelKey) : entity.state;
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
  title
}) {
  const { t } = useTranslation('widgets');
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
            <small>{t('homeAssistant.subtitle')}</small>
            <strong>{title ?? t('homeAssistant.defaultTitle')}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => refreshHomeAssistantStates()}
          disabled={homeAssistantLoading}
          aria-label={t('homeAssistant.refreshAria')}
          title={t('common:actions.refresh')}
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
            <strong>{t('homeAssistant.emptyTitle')}</strong>
            <small>{t('homeAssistant.emptyHint')}</small>
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
                  <small>{displayState(entity, t)}</small>
                </span>

                {entity.domain === 'cover' && entity.allowControl ? (
                  <span className="ha-cover-actions">
                    <button
                      type="button"
                      disabled={isBusy || (entity.requiresAdult && !isAdult)}
                      onClick={() => run(entity, 'open_cover')}
                      title={t('homeAssistant.openCover')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || (entity.requiresAdult && !isAdult)}
                      onClick={() => run(entity, 'close_cover')}
                      title={t('homeAssistant.closeCover')}
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
                        ? t('homeAssistant.adultsOnlyConfirm')
                        : t('homeAssistant.control')
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
                    <ShieldAlert size={13} /> {t('common:actions.confirm')}
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
