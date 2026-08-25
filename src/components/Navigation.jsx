import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../context/FamilyContext';
import { Star } from 'lucide-react';
import { useNavigationTabs } from '../hooks/useNavigationTabs';
import { useNavigationFavorites } from '../hooks/useNavigationFavorites';

export default function Navigation() {
  const { t } = useTranslation('chrome');
  const { activeTab, setActiveTab } = useFamily();
  const { visibleTabs } = useNavigationTabs();
  const { favoriteTabs } = useNavigationFavorites(visibleTabs);

  if (!favoriteTabs.length) return null;

  return (
    <nav className="main-nav" aria-label={t('navigation.favoritesAria')}>
      <span className="main-nav-favorites-label">
        <Star size={15} fill="currentColor" /> {t('navigation.favorites')}
      </span>
      {favoriteTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={19} />
            <span>{tab.label}</span>
            {tab.badge && <span className="nav-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
