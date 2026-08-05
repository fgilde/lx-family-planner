import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Network,
  Sparkles,
  Server,
  LogOut,
  X
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { canManageFamily } from '../constants/roles';
import { useNavigationTabs } from '../hooks/useNavigationTabs';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Slide-in navigation drawer for narrow viewports (handy + tablet portrait).
 *
 * Rendered via portal from the Header. Mirrors the NotificationCenter overlay
 * pattern: a fixed layer acts as the backdrop (click-to-close) and an aside
 * panel slides in from the left. Escape closes; body scroll is locked while
 * open. After picking a tab, the drawer closes automatically so the chosen
 * view is immediately visible.
 *
 * The tab list is shared with the horizontal tab bar via `useNavigationTabs`,
 * guaranteeing both surfaces stay in sync.
 */
export default function MobileNavDrawer({
  isOpen,
  onClose,
  onOpenFamilyTree,
  onOpenTheme,
  onOpenServerConfig,
  onLogout
}) {
  const { t } = useTranslation('chrome');
  const { activeTab, setActiveTab, activeMember } = useFamily();
  const { visibleTabs } = useNavigationTabs();

  // Close on Escape while open (mirrors NotificationCenter behavior).
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  // Lock body scroll while the drawer is open (mirrors ProfileModal behavior).
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectTab = id => {
    setActiveTab(id);
    onClose();
  };

  const openFamilyTree = () => {
    onClose();
    onOpenFamilyTree?.();
  };

  // Triggered actions close the drawer first, then hand off to their overlay.
  const runAction = handler => () => {
    onClose();
    handler?.();
  };

  return createPortal(
    <div
      className="mobile-nav-drawer-layer"
      onPointerDown={onClose}
    >
      <aside
        className="mobile-nav-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-drawer-title"
        onPointerDown={event => event.stopPropagation()}
      >
        <div className="mobile-nav-drawer-header">
          <strong id="mobile-nav-drawer-title">{t('header.menu.title')}</strong>
          <button
            type="button"
            className="mobile-nav-drawer-close"
            onClick={onClose}
            aria-label={t('header.menu.close')}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mobile-nav-drawer-tabs" aria-label={t('header.menu.title')}>
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => selectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="mobile-nav-item-badge">{tab.badge}</span>
                )}
              </button>
            );
          })}

          {canManageFamily(activeMember) && (
            <button
              type="button"
              className="mobile-nav-item mobile-nav-item-secondary"
              onClick={openFamilyTree}
            >
              <Network size={20} />
              <span>{t('navigation.familyTree')}</span>
            </button>
          )}
        </nav>

        <div className="mobile-nav-drawer-actions">
          <span className="mobile-nav-section-label">
            {t('header.menu.settings')}
          </span>
          <LanguageSwitcher />
          <button
            type="button"
            className="mobile-nav-action-btn"
            onClick={runAction(onOpenTheme)}
          >
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            <span>{t('header.themePicker.kicker')}</span>
          </button>
          {onOpenServerConfig && (
            <button
              type="button"
              className="mobile-nav-action-btn"
              onClick={runAction(onOpenServerConfig)}
            >
              <Server size={18} />
              <span>{t('header.serverConfigTitle')}</span>
            </button>
          )}
          <button
            type="button"
            className="mobile-nav-action-btn mobile-nav-action-danger"
            onClick={runAction(onLogout)}
          >
            <LogOut size={18} />
            <span>{t('header.logoutTitle')}</span>
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
