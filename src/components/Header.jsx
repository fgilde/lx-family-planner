import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../context/FamilyContext';
import { HeartHandshake, Tablet, Star, LogOut, Home, Users, Sparkles, Settings, PawPrint, X, Server } from 'lucide-react';
import { isChildProfile, isPetProfile } from '../constants/roles';
import FamilyEditModal from './FamilyTree/FamilyEditModal';
import PlanLocationHelp from './PlanLocationHelp';
import NotificationCenter from './Notifications/NotificationCenter';

const ADULT_THEMES = [
  { id: 'light', icon: '❧', color: '#286a58', accent: '#d87058' },
  { id: 'ocean', icon: '≈', color: '#17687a', accent: '#d99157' },
  { id: 'midnight', icon: '☾', color: '#164f49', accent: '#e0a65b' },
  { id: 'rock', icon: '⚡', color: '#70251f', accent: '#efb84d' },
  { id: 'festival', icon: '✦', color: '#a22d78', accent: '#25aab4' }
];

const CHILD_THEMES = [
  { id: 'space', icon: '🚀', color: '#4747a9', accent: '#ffbd4a' },
  { id: 'unicorn', icon: '🦄', color: '#d84692', accent: '#8063d9' },
  { id: 'fairy', icon: '🧚', color: '#728a35', accent: '#b84f91' },
  { id: 'dino', icon: '🦖', color: '#287755', accent: '#d66d31' },
  { id: 'sunshine', icon: '☀️', color: '#ed8d26', accent: '#e74757' },
  { id: 'adventure', icon: '🦸', color: '#3169c8', accent: '#e7474f' }
];

const PET_THEMES = [
  { id: 'light', icon: '🐾', color: '#286a58', accent: '#d87058' },
  { id: 'ocean', icon: '🌊', color: '#17687a', accent: '#d99157' },
  { id: 'rock', icon: '🦴', color: '#70251f', accent: '#efb84d' },
  { id: 'midnight', icon: '🌙', color: '#164f49', accent: '#e0a65b' }
];

export default function Header({ onLogout, onOpenServerConfig, unreadChatCount = 0 }) {
  const { t } = useTranslation('chrome');
  const {
    theme, setTheme,
    activeTab, setActiveTab,
    activeHousehold, setActiveHousehold,
    activeMember, familyAccount,
    setIsProfileModalOpen, showToast
  } = useFamily();

  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isFamilySettingsOpen, setIsFamilySettingsOpen] = useState(false);
  const isChild = isChildProfile(activeMember);
  const isPet = isPetProfile(activeMember);
  const grandparentsHouseholdEnabled =
    familyAccount?.grandparentsHouseholdEnabled !== false;
  const availableThemes = isPet
    ? PET_THEMES
    : isChild
      ? CHILD_THEMES
      : ADULT_THEMES;
  const themeGroup = isPet ? 'pet' : isChild ? 'child' : 'adult';
  const themePickerTitle = isPet
    ? t('header.themePicker.titlePet', {
        name:
          activeMember?.name?.split(' ')[0] ||
          t('header.themePicker.petNameFallback')
      })
    : isChild
      ? t('header.themePicker.titleChild')
      : t('header.themePicker.titleAdult');
  const themePickerDescription = isPet
    ? t('header.themePicker.descriptionPet')
    : isChild
      ? t('header.themePicker.descriptionChild')
      : t('header.themePicker.descriptionAdult');

  useEffect(() => {
    if (!isThemePickerOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsThemePickerOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isThemePickerOpen]);

  const toggleHousehold = (targetHousehold) => {
    setActiveHousehold(targetHousehold);
    showToast(
      t('header.householdSwitched'),
      targetHousehold === 'familie' ? t('header.householdViewFamily') : t('header.householdViewGrandparents'),
      'info'
    );
  };

  return (
    <header className="app-header">
      <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
        <div className="brand-icon-wrapper">
          <HeartHandshake size={26} />
        </div>
        <div className="brand-text">
          <h1>LX Family Planner</h1>
          <p>{t('header.tagline')}</p>
        </div>
      </a>

      {/* Household planning context */}
      {!isChild && !isPet && grandparentsHouseholdEnabled && <div
        className="household-switcher"
        role="group"
        aria-label={t('header.planLocationAria')}
      >
        <span className="household-switcher-label">
          {t('header.planLocation')}
          <PlanLocationHelp />
        </span>
        <button
          onClick={() => toggleHousehold('familie')}
          className={activeHousehold === 'familie' ? 'active' : ''}
          aria-pressed={activeHousehold === 'familie'}
        >
          <Home size={15} /> {t('header.ourHome')}
        </button>

        <button
          onClick={() => toggleHousehold('oma_opa')}
          className={activeHousehold === 'oma_opa' ? 'active grandparents' : ''}
          aria-pressed={activeHousehold === 'oma_opa'}
        >
          <Users size={15} /> {t('header.grandparentsHome')}
        </button>
      </div>}

      <div className="header-right">
        {!isPet && <NotificationCenter />}
        {!isChild && !isPet && (
          <button
            className="icon-circle-btn"
            onClick={() => setIsFamilySettingsOpen(true)}
            title={t('header.manageFamily')}
          >
            <Settings size={18} />
          </button>
        )}
        {/* Role-aware theme worlds */}
        <div className="theme-picker-wrap">
          <button
            className="icon-circle-btn"
            onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
            title={isPet ? t('header.themePicker.openPet') : isChild ? t('header.themePicker.openChild') : t('header.themePicker.openAdult')}
            aria-label={isPet ? t('header.themePicker.openPet') : isChild ? t('header.themePicker.openChild') : t('header.themePicker.openAdult')}
            aria-expanded={isThemePickerOpen}
          >
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          </button>

          {isThemePickerOpen &&
            createPortal(
              <div
                className="theme-picker-layer"
                onPointerDown={() => setIsThemePickerOpen(false)}
              >
                <section
                  className="theme-picker theme-picker-portal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="theme-picker-title"
                  onPointerDown={event => event.stopPropagation()}
                >
                  <div className="theme-picker-title">
                    <span className="theme-picker-kicker">
                      <Sparkles size={14} /> {t('header.themePicker.kicker')}
                    </span>
                    <strong id="theme-picker-title">{themePickerTitle}</strong>
                    <span>{themePickerDescription}</span>
                    <button
                      type="button"
                      className="theme-picker-close"
                      onClick={() => setIsThemePickerOpen(false)}
                      aria-label={t('header.themePicker.close')}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {availableThemes.map(themeOption => (
                    <button
                      key={themeOption.id}
                      onClick={() => {
                        setTheme(themeOption.id);
                        setIsThemePickerOpen(false);
                      }}
                      className={`theme-choice ${theme === themeOption.id ? 'active' : ''}`}
                      style={{ '--choice-color': themeOption.color, '--choice-accent': themeOption.accent }}
                      aria-pressed={theme === themeOption.id}
                    >
                      <span className="theme-choice-preview" aria-hidden="true">{themeOption.icon}</span>
                      <span className="theme-choice-copy">
                        <strong>{t(`header.themes.${themeGroup}.${themeOption.id}.name`)}</strong>
                        <small>{t(`header.themes.${themeGroup}.${themeOption.id}.description`)}</small>
                      </span>
                    </button>
                  ))}
                </section>
              </div>,
              document.body
            )}
        </div>

        {/* Tablet Dashboard Toggle */}
        {!isChild && !isPet && <button
          className={`tablet-mode-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'kitchen' ? 'dashboard' : 'kitchen')}
          title={activeTab === 'kitchen' ? t('header.tabletMode.exitTitle') : t('header.tabletMode.enterTitle')}
        >
          <Tablet size={18} />
          <span className="hide-mobile">
            {activeTab === 'kitchen' ? t('header.tabletMode.exit') : t('header.tabletMode.enter')}
          </span>
        </button>}

        {/* Profile Switcher Pill with Unread Chat Notification Badge */}
        <div className="profile-pill-btn" onClick={() => setIsProfileModalOpen(true)}>
          {activeMember?.avatar ? (
            <img src={activeMember.avatar} alt={activeMember.name} className="avatar-img-sm" />
          ) : (
            <div className="avatar-fallback-sm" style={{ backgroundColor: activeMember?.color || '#2563eb' }}>
              {activeMember?.name?.charAt(0) || 'F'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span className="profile-pill-name">{activeMember?.name?.split(' ')[0]}</span>
            {isChild && (
              <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star size={10} fill="#f59e0b" /> {activeMember.stars || 0}★
              </span>
            )}
            {isPet && (
              <span className="profile-pill-pet">
                <PawPrint size={11} /> {t('header.pet')}
              </span>
            )}
          </div>

          {/* Unread Chat Badge Counter */}
          {!isPet && unreadChatCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white',
              fontSize: '0.75rem', fontWeight: 800,
              width: 20, height: 20, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
            }}>
              {unreadChatCount}
            </span>
          )}
        </div>

        {/* Server IP Config Button */}
        {onOpenServerConfig && (
          <button
            className="icon-circle-btn"
            onClick={onOpenServerConfig}
            title={t('header.serverConfigTitle')}
          >
            <Server size={18} />
          </button>
        )}

        {/* Logout / Switch Family Button */}
        <button
          className="icon-circle-btn"
          onClick={onLogout}
          title={t('header.logoutTitle')}
        >
          <LogOut size={18} />
        </button>
      </div>
      <FamilyEditModal
        family={familyAccount}
        isOpen={isFamilySettingsOpen}
        onClose={() => setIsFamilySettingsOpen(false)}
      />
    </header>
  );
}
