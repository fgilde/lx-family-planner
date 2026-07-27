import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  toggleWidget,
  widgets
}) {
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
            <span className="dashboard-studio-kicker">Ansichtsatelier</span>
            <h2 id={`${mode}-dashboard-studio-title`}>
              {isTablet ? 'Tablet-Kacheln' : 'Dein Überblick'}
            </h2>
            <p>
              Diese Auswahl gilt nur für {profileName || 'dieses Profil'} auf
              diesem Gerät.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-studio-close"
            onClick={onClose}
            aria-label="Ansichtsatelier schließen"
          >
            <X size={19} />
          </button>
        </header>

        <div className="dashboard-density-picker">
          <div>
            <strong>Kachelabstand</strong>
            <span>Bequem für Touch oder kompakt für mehr Überblick.</span>
          </div>
          <div role="group" aria-label="Kachelabstand auswählen">
            <button
              type="button"
              className={layout.density === 'comfortable' ? 'active' : ''}
              onClick={() => setDensity('comfortable')}
              aria-pressed={layout.density === 'comfortable'}
            >
              Bequem
            </button>
            <button
              type="button"
              className={layout.density === 'compact' ? 'active' : ''}
              onClick={() => setDensity('compact')}
              aria-pressed={layout.density === 'compact'}
            >
              Kompakt
            </button>
          </div>
        </div>

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
                    aria-label={`${widget.label} nach oben`}
                  >
                    <ChevronUp size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'down')}
                    disabled={index === layout.order.length - 1}
                    aria-label={`${widget.label} nach unten`}
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
                      : 'Mindestens eine Kachel muss sichtbar bleiben.'
                  }
                >
                  {isHidden ? <EyeOff size={17} /> : <Eye size={17} />}
                  {isHidden ? 'Aus' : 'An'}
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
            <RotateCcw size={16} /> Standard wiederherstellen
          </button>
          <button
            type="button"
            className="dashboard-studio-done"
            onClick={onClose}
          >
            <Check size={17} /> Fertig
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
