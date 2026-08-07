import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../context/FamilyContext';
import { Network } from 'lucide-react';
import { canManageFamily } from '../constants/roles';
import { useNavigationTabs } from '../hooks/useNavigationTabs';

export default function Navigation({ onOpenFamilyTree }) {
  const navigationRef = useRef(null);
  const { t } = useTranslation('chrome');
  const { activeTab, setActiveTab, activeMember } = useFamily();
  const { visibleTabs } = useNavigationTabs();

  useEffect(() => {
    const nav = navigationRef.current;
    const activeButton = nav?.querySelector('[aria-current="page"]');
    if (!nav || !activeButton) return;
    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    // Nur scrollen, wenn der aktive Tab wirklich außerhalb des sichtbaren
    // Bereichs liegt – verhindert das lästige Springen der ganzen Leiste.
    const isHiddenLeft = buttonRect.left < navRect.left - 1;
    const isHiddenRight = buttonRect.right > navRect.right + 1;
    if (!isHiddenLeft && !isHiddenRight) return;
    activeButton.scrollIntoView({
      behavior: 'auto',
      block: 'nearest',
      inline: 'nearest'
    });
  }, [activeTab]);

  return (
    <nav className="main-nav" ref={navigationRef}>
      {visibleTabs.map(tab => {
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

      {canManageFamily(activeMember) && <button
        className="nav-tab family-tree-nav-tab"
        onClick={onOpenFamilyTree}
        title={t('navigation.familyTreeTitle')}
      >
        <Network size={19} />
        <span>{t('navigation.familyTree')}</span>
      </button>}
    </nav>
  );
}
