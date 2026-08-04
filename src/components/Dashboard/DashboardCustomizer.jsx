import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LayoutDashboard,
  RotateCcw,
  Smartphone,
  X
} from 'lucide-react';

export default function DashboardCustomizer({
  isOpen,
  layout,
  mode = 'personal',
  moveWidget,
  onClose,
  profileName,
  resetLayout,
  setDensity,
  setPreference,
  toggleWidget,
  widgets
}) {
  const { t } = useTranslation('dashboard');
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const widgetMap = new Map(widgets.map(widget => [widget.id, widget]));
  const hidden = new Set(layout.hidden);
  const visibleCount = layout.order.length - hidden.size;
  const isTablet = mode === 'tablet';

  return createPortal(
    <div
      className="dashboard-studio-layer"
      onPointerDown={onClose}
    >
      <section
        className="dashboard-studio"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${mode}-dashboard-studio-title`}
        onPointerDown={event => event.stopPropagation()}
      >
        <header className="dashboard-studio-header">
          <span className="dashboard-studio-mark">
            {isTablet
              ? <Smartphone size={22} />
              : <LayoutDashboard size={22} />}
          </span>
          <div>
            <span className="dashboard-studio-kicker">{t('customizer.kicker')}</span>
            <h2 id={`${mode}-dashboard-studio-title`}>
              {isTablet
                ? t('customizer.tabletTitle')
                : t('customizer.personalTitle')}
            </h2>
            <p>
              {t('customizer.scopeNote', {
                name: profileName || t('customizer.thisProfile')
              })}
            </p>
          </div>
          <button
            type="button"
            className="dashboard-studio-close"
            onClick={onClose}
            aria-label={t('customizer.closeAria')}
          >
            <X size={19} />
          </button>
        </header>

        <div className="dashboard-density-picker">
          <div>
            <strong>{t('customizer.density.title')}</strong>
            <span>{t('customizer.density.hint')}</span>
          </div>
          <div role="group" aria-label={t('customizer.density.groupAria')}>
            <button
              type="button"
              className={layout.density === 'comfortable' ? 'active' : ''}
              onClick={() => setDensity('comfortable')}
              aria-pressed={layout.density === 'comfortable'}
            >
              {t('customizer.density.comfortable')}
            </button>
            <button
              type="button"
              className={layout.density === 'compact' ? 'active' : ''}
              onClick={() => setDensity('compact')}
              aria-pressed={layout.density === 'compact'}
            >
              {t('customizer.density.compact')}
            </button>
          </div>
        </div>

        {isTablet && (
          <div className="dashboard-tablet-preview-picker">
            <div>
              <strong>{t('customizer.tabletPreview.title')}</strong>
              <span>{t('customizer.tabletPreview.hint')}</span>
            </div>
            {[
              ['tabletEventLimit', 'events'],
              ['tabletTaskLimit', 'tasks']
            ].map(([preference, label]) => (
              <label key={preference}>
                <span>{t(`customizer.tabletPreview.${label}`)}</span>
                <select
                  value={layout.preferences?.[preference] || '4'}
                  onChange={event => setPreference(preference, event.target.value)}
                >
                  <option value="4">{t('customizer.tabletPreview.four')}</option>
                  <option value="8">{t('customizer.tabletPreview.eight')}</option>
                  <option value="all">{t('customizer.tabletPreview.all')}</option>
                </select>
              </label>
            ))}
          </div>
        )}

        {widgetMap.has('trash') && (
          <div className="dashboard-trash-picker">
            <div>
              <strong>{t('customizer.trash.title')}</strong>
              <span>{t('customizer.trash.hint')}</span>
            </div>
            <label>
              <span>{t('customizer.trash.visibility')}</span>
              <select
                value={layout.preferences?.trashVisibility || 'always'}
                onChange={event => setPreference(
                  'trashVisibility',
                  event.target.value
                )}
              >
                <option value="always">{t('customizer.trash.always')}</option>
                <option value="upcoming">{t('customizer.trash.upcoming')}</option>
                <option value="never">{t('customizer.trash.never')}</option>
              </select>
            </label>
            {layout.preferences?.trashVisibility === 'upcoming' && (
              <label>
                <span>{t('customizer.trash.days')}</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={layout.preferences?.trashWindowDays || 3}
                  onChange={event => setPreference(
                    'trashWindowDays',
                    Number(event.target.value)
                  )}
                />
              </label>
            )}
          </div>
        )}

        <div className="dashboard-studio-list">
          {layout.order.map((widgetId, index) => {
            const widget = widgetMap.get(widgetId);
            if (!widget) return null;
            const Icon = widget.icon;
            const isHidden = hidden.has(widgetId);
            const canHide = isHidden || visibleCount > 1;
            return (
              <article
                key={widgetId}
                className={isHidden ? 'is-hidden' : 'is-visible'}
              >
                <span
                  className="dashboard-studio-widget-icon"
                  style={{ '--widget-tone': widget.color }}
                >
                  <Icon size={19} />
                </span>
                <span className="dashboard-studio-widget-copy">
                  <strong>{widget.label}</strong>
                  <small>{widget.description}</small>
                </span>
                <span className="dashboard-studio-order">
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'up')}
                    disabled={index === 0}
                    aria-label={t('customizer.moveUp', { label: widget.label })}
                  >
                    <ChevronUp size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'down')}
                    disabled={index === layout.order.length - 1}
                    aria-label={t('customizer.moveDown', { label: widget.label })}
                  >
                    <ChevronDown size={17} />
                  </button>
                </span>
                <button
                  type="button"
                  className="dashboard-studio-visibility"
                  onClick={() => toggleWidget(widgetId)}
                  disabled={!canHide}
                  aria-pressed={!isHidden}
                  title={
                    canHide
                      ? undefined
                      : t('customizer.minVisible')
                  }
                >
                  {isHidden ? <EyeOff size={17} /> : <Eye size={17} />}
                  {isHidden
                    ? t('customizer.visibilityOff')
                    : t('customizer.visibilityOn')}
                </button>
              </article>
            );
          })}
        </div>

        <footer className="dashboard-studio-footer">
          <button
            type="button"
            className="dashboard-studio-reset"
            onClick={resetLayout}
          >
            <RotateCcw size={16} /> {t('customizer.reset')}
          </button>
          <button
            type="button"
            className="dashboard-studio-done"
            onClick={onClose}
          >
            <Check size={17} /> {t('customizer.done')}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
