import React from 'react';
import { useFamily } from '../context/FamilyContext';
import { Calendar, ShoppingBag, UtensilsCrossed, CheckSquare, Pin, UserCheck, Trash2, MessageSquare, Network, ShieldCheck, PawPrint, HeartHandshake } from 'lucide-react';
import { canManageFamily, isChildProfile, isPetProfile } from '../constants/roles';

export default function Navigation({ onOpenFamilyTree }) {
  const {
    activeTab,
    setActiveTab,
    shoppingItems,
    tasks,
    activeMember,
    members
  } = useFamily();

  // Active shopping items selected but not in cart
  const shoppingCount = shoppingItems.filter(i => i.isSelected && !i.inCart).length;
  // Children see their open missions; adults see approval requests addressed to them.
  const pendingTasksCount = isChildProfile(activeMember)
    ? tasks.filter(task => task.memberId === activeMember?.id && !task.completed).length
    : tasks.filter(
        task =>
          task.completionStatus === 'pending_approval' &&
          (!task.createdByMemberId ||
            !members.some(member => member.id === task.createdByMemberId) ||
            task.createdByMemberId === activeMember?.id)
      ).length;

  const allTabs = [
    { id: 'dashboard', label: `Mein Bereich (${activeMember?.name?.split(' ')[0] || 'Start'})`, icon: UserCheck },
    { id: 'chat', label: 'Familien-Chat & PM', icon: MessageSquare },
    { id: 'calendar', label: 'Kalender', icon: Calendar },
    { id: 'trash', label: 'Müllkalender', icon: Trash2 },
    { id: 'shopping', label: 'Bring! Einkauf', icon: ShoppingBag, badge: shoppingCount > 0 ? shoppingCount : null },
    { id: 'meals', label: 'Essensplan', icon: UtensilsCrossed },
    { id: 'tasks', label: 'Aufgaben & Sterne', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'family-life', label: 'Familienreise', icon: HeartHandshake },
    { id: 'board', label: 'Pinnwand', icon: Pin }
  ];

  const childTabs = [
    { id: 'dashboard', label: 'Mein Abenteuer', icon: UserCheck },
    { id: 'tasks', label: 'Missionen & Sterne', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'family-life', label: 'Meine Reise', icon: HeartHandshake },
    { id: 'calendar', label: 'Familienkalender', icon: Calendar },
    { id: 'chat', label: 'Familienfunk', icon: MessageSquare },
    { id: 'board', label: 'Pinnwand', icon: Pin }
  ];

  const petTabs = [
    { id: 'dashboard', label: `Für ${activeMember?.name?.split(' ')[0] || 'unser Tier'}`, icon: PawPrint },
    { id: 'calendar', label: 'Tierarzt & Termine', icon: Calendar }
  ];

  // Granular access filter: If member has allowedModules restriction, filter tabs accordingly
  const roleTabs = isPetProfile(activeMember)
    ? petTabs
    : isChildProfile(activeMember)
      ? childTabs
      : canManageFamily(activeMember)
        ? [...allTabs, { id: 'admin', label: 'Elternzentrale', icon: ShieldCheck }]
        : allTabs;
  const visibleTabs = activeMember?.allowedModules
    ? roleTabs.filter(t => t.id === 'dashboard' || activeMember.allowedModules.includes(t.id))
    : roleTabs;

  return (
    <nav className="main-nav">
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={19} />
            <span>{tab.label}</span>
            {tab.badge && <span className="nav-badge">{tab.badge}</span>}
          </button>
        );
      })}

      {canManageFamily(activeMember) && <button
        className="nav-tab"
        style={{ marginLeft: 'auto', background: 'var(--bg-subtle)', color: 'var(--primary)' }}
        onClick={onOpenFamilyTree}
        title="Stammbaum & Familien verknüpfen"
      >
        <Network size={19} />
        <span>Stammbaum</span>
      </button>}
    </nav>
  );
}
