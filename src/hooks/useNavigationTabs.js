import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  CheckSquare,
  Pin,
  UserCheck,
  Trash2,
  MessageSquare,
  ShieldCheck,
  PawPrint,
  HeartHandshake,
  Cloud,
  Mail
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import {
  canAccessAppView,
  canManageFamily,
  isChildProfile,
  isPetProfile
} from '../constants/roles';
import { taskIsAvailableToMember } from '../../shared/taskAssignments.js';
import { taskIsVisibleOnDate } from '../../shared/taskVisibility.js';

/**
 * Builds the visible navigation tabs based on the active member's role and
 * the household settings (disabled modules, read-only demo mode).
 *
 * Extracted into a hook so both the horizontal tab bar (`Navigation.jsx`) and
 * the mobile drawer (`MobileNavDrawer.jsx`) render the exact same set of tabs
 * without duplicating the builder logic.
 *
 * @returns {{ visibleTabs: Array, pendingTasksCount: number, shoppingCount: number }}
 */
export function useNavigationTabs() {
  const { t } = useTranslation('chrome');
  const {
    shoppingItems,
    tasks,
    activeMember,
    members,
    familyLetters,
    familySettings,
    readOnlyDemo
  } = useFamily();

  // Active shopping items selected but not in cart
  const shoppingCount = shoppingItems.filter(
    i => i.isSelected && !i.inCart
  ).length;

  // Children see their open missions; adults see approval requests addressed to them.
  const pendingTasksCount = isChildProfile(activeMember)
    ? tasks.filter(
        task =>
          taskIsAvailableToMember(task, activeMember?.id) &&
          !task.completed &&
          taskIsVisibleOnDate(task)
      ).length
    : tasks.filter(
        task =>
          task.completionStatus === 'pending_approval' &&
          (!task.createdByMemberId ||
            !members.some(member => member.id === task.createdByMemberId) ||
            task.createdByMemberId === activeMember?.id)
      ).length;

  const unreadLetterCount = familyLetters.filter(
    letter => letter.direction === 'received' && !letter.readAt
  ).length;

  const allTabs = [
    {
      id: 'dashboard',
      label: t('navigation.myArea', {
        name:
          activeMember?.name?.split(' ')[0] || t('navigation.myAreaFallback')
      }),
      icon: UserCheck
    },
    { id: 'chat', label: t('navigation.chat'), icon: MessageSquare },
    { id: 'calendar', label: t('navigation.calendar'), icon: Calendar },
    { id: 'trash', label: t('navigation.trash'), icon: Trash2 },
    {
      id: 'shopping',
      label: t('navigation.shopping'),
      icon: ShoppingBag,
      badge: shoppingCount > 0 ? shoppingCount : null
    },
    { id: 'meals', label: t('navigation.meals'), icon: UtensilsCrossed },
    {
      id: 'tasks',
      label: t('navigation.tasks'),
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null
    },
    { id: 'family-life', label: t('navigation.familyLife'), icon: HeartHandshake },
    { id: 'board', label: t('navigation.board'), icon: Pin }
  ];

  const childTabs = [
    {
      id: 'dashboard',
      label: t('navigation.childDashboard'),
      icon: UserCheck
    },
    {
      id: 'tasks',
      label: t('navigation.childTasks'),
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null
    },
    { id: 'family-life', label: t('navigation.childFamilyLife'), icon: HeartHandshake },
    { id: 'calendar', label: t('navigation.childCalendar'), icon: Calendar },
    { id: 'chat', label: t('navigation.childChat'), icon: MessageSquare },
    { id: 'board', label: t('navigation.board'), icon: Pin }
  ];

  const petTabs = [
    {
      id: 'dashboard',
      label: t('navigation.petDashboard', {
        name:
          activeMember?.name?.split(' ')[0] ||
          t('navigation.petDashboardFallback')
      }),
      icon: PawPrint
    },
    { id: 'calendar', label: t('navigation.petCalendar'), icon: Calendar }
  ];

  const disabledModules = familySettings[0]?.disabledModules || [];

  const roleTabs = isPetProfile(activeMember)
    ? petTabs
    : isChildProfile(activeMember)
      ? childTabs
      : canManageFamily(activeMember)
        ? [
            allTabs[0],
            { id: 'cloud', label: t('navigation.cloud'), icon: Cloud },
            {
              id: 'mail',
              label: t('navigation.mail'),
              icon: Mail,
              badge: unreadLetterCount > 0 ? unreadLetterCount : null
            },
            ...allTabs.slice(1),
            { id: 'admin', label: t('navigation.admin'), icon: ShieldCheck }
          ]
        : allTabs;

  const visibleTabs = roleTabs.filter(
    tab =>
      (!readOnlyDemo || tab.id !== 'cloud') &&
      canAccessAppView(activeMember, tab.id, disabledModules)
  );

  return { visibleTabs, pendingTasksCount, shoppingCount };
}
