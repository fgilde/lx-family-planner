import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { HeartHandshake, Tablet, Star, LogOut, Home, Users, Sparkles, Settings } from 'lucide-react';
import { isChildProfile } from '../constants/roles';
import FamilyEditModal from './FamilyTree/FamilyEditModal';

const ADULT_THEMES = [
  { id: 'light', name: 'Waldruhe', description: 'warm & natürlich', icon: '❧', color: '#286a58', accent: '#d87058' },
  { id: 'ocean', name: 'Küstenruhe', description: 'luftig & entspannt', icon: '≈', color: '#17687a', accent: '#d99157' },
  { id: 'midnight', name: 'Nachtlounge', description: 'ruhig & dunkel', icon: '☾', color: '#164f49', accent: '#e0a65b' },
  { id: 'rock', name: 'Backstage', description: 'rockig & warm', icon: '⚡', color: '#70251f', accent: '#efb84d' },
  { id: 'festival', name: 'Neon Nacht', description: 'fett & farbig', icon: '✦', color: '#a22d78', accent: '#25aab4' }
];

const CHILD_THEMES = [
  { id: 'space', name: 'Raketenbasis', description: 'Raketen & Planeten', icon: '🚀', color: '#4747a9', accent: '#ffbd4a' },
  { id: 'unicorn', name: 'Einhornland', description: 'Regenbogen & Magie', icon: '🦄', color: '#d84692', accent: '#8063d9' },
  { id: 'fairy', name: 'Feenzauber', description: 'Feen & Zauberwald', icon: '🧚', color: '#728a35', accent: '#b84f91' },
  { id: 'dino', name: 'Dinowelt', description: 'Dinos & Dschungel', icon: '🦖', color: '#287755', accent: '#d66d31' },
  { id: 'sunshine', name: 'Sonneninsel', description: 'Sommer & gute Laune', icon: '☀️', color: '#ed8d26', accent: '#e74757' },
  { id: 'adventure', name: 'Helden-Camp', description: 'Helden & Blitze', icon: '🦸', color: '#3169c8', accent: '#e7474f' }
];

export default function Header({ onLogout, unreadChatCount = 0 }) {
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
  const availableThemes = isChild ? CHILD_THEMES : ADULT_THEMES;

  const toggleHousehold = (targetHousehold) => {
    setActiveHousehold(targetHousehold);
    showToast(
      '🏠 Haushalt gewechselt',
      targetHousehold === 'familie' ? 'Ansicht: Unser Familien-Zuhause' : 'Ansicht: Zuhause von Oma & Opa',
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
          <p>Unser Familien-Zuhause</p>
        </div>
      </a>

      {/* Household planning context */}
      {!isChild && <div
        className="household-switcher"
        role="group"
        aria-label="Planungsort auswählen"
        title="Wechselt Termine, Aufgaben, Essensplan, Mülltermine und Pinnwand zwischen den beiden Haushalten."
      >
        <span className="household-switcher-label">Planungsort</span>
        <button
          onClick={() => toggleHousehold('familie')}
          className={activeHousehold === 'familie' ? 'active' : ''}
          aria-pressed={activeHousehold === 'familie'}
        >
          <Home size={15} /> Unser Zuhause
        </button>

        <button
          onClick={() => toggleHousehold('oma_opa')}
          className={activeHousehold === 'oma_opa' ? 'active grandparents' : ''}
          aria-pressed={activeHousehold === 'oma_opa'}
        >
          <Users size={15} /> Zuhause Oma & Opa
        </button>
      </div>}

      <div className="header-right">
        {!isChild && (
          <button
            className="icon-circle-btn"
            onClick={() => setIsFamilySettingsOpen(true)}
            title="Familie verwalten"
          >
            <Settings size={18} />
          </button>
        )}
        {/* Role-aware theme worlds */}
        <div className="theme-picker-wrap">
          <button
            className="icon-circle-btn"
            onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
            title={isChild ? 'Meine Themenwelt wählen' : 'Themenwelt wählen'}
            aria-label={isChild ? 'Meine Themenwelt wählen' : 'Themenwelt wählen'}
            aria-expanded={isThemePickerOpen}
          >
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          </button>

          {isThemePickerOpen && (
            <div className="theme-picker">
              <div className="theme-picker-title">
                <strong>{isChild ? 'Deine Themenwelt' : 'Dein Zuhause, dein Stil'}</strong>
                <span>{isChild ? 'Such dir deine Lieblingswelt aus.' : 'Ruhig oder laut – die Auswahl wird im Profil gespeichert.'}</span>
              </div>
              {availableThemes.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setIsThemePickerOpen(false); }}
                  className={`theme-choice ${theme === t.id ? 'active' : ''}`}
                  style={{ '--choice-color': t.color, '--choice-accent': t.accent }}
                  aria-pressed={theme === t.id}
                >
                  <span className="theme-choice-preview" aria-hidden="true">{t.icon}</span>
                  <span className="theme-choice-copy">
                    <strong>{t.name}</strong>
                    <small>{t.description}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tablet Dashboard Toggle */}
        {!isChild && <button
          className={`tablet-mode-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'kitchen' ? 'dashboard' : 'kitchen')}
          title={activeTab === 'kitchen' ? 'Tablet Mode verlassen' : 'Tablet Mode öffnen'}
        >
          <Tablet size={18} />
          <span className="hide-mobile">
            {activeTab === 'kitchen' ? 'Tablet verlassen' : 'Tablet Mode'}
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
          </div>

          {/* Unread Chat Badge Counter */}
          {unreadChatCount > 0 && (
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

        {/* Logout / Switch Family Button */}
        <button
          className="icon-circle-btn"
          onClick={onLogout}
          title="Familie wechseln / Abmelden"
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
