import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Bell,
  Bug,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Flag,
  Gift,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Inbox,
  Mail,
  MessageCircle,
  MessageCircleHeart,
  Network,
  ShoppingBasket,
  Sparkles,
  SunMedium,
  UtensilsCrossed,
  UserRoundPlus,
  Vote,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { eventIsForMember } from '../../../shared/calendarAudience.js';
import { canManageFamily } from '../../constants/roles';
import {
  formatDate,
  formatDateTime,
  formatTime
} from '../../utils/formatting';

const VIEW_NAMES = new Set([
  'dashboard',
  'chat',
  'calendar',
  'tasks',
  'board',
  'shopping',
  'meals',
  'family-life',
  'cloud',
  'mail',
  'admin'
]);

const NOTIFICATION_META = {
  groupChat: {
    labelKey: 'center.meta.groupChat',
    icon: MessageCircle,
    tone: 'chat'
  },
  directMessages: {
    labelKey: 'center.meta.directMessages',
    icon: MessageCircle,
    tone: 'chat'
  },
  taskAssigned: {
    labelKey: 'center.meta.taskAssigned',
    icon: ClipboardCheck,
    tone: 'task'
  },
  taskApproval: {
    labelKey: 'center.meta.taskApproval',
    icon: CheckCircle2,
    tone: 'approval'
  },
  taskCompleted: {
    labelKey: 'center.meta.taskCompleted',
    icon: Sparkles,
    tone: 'success'
  },
  events: {
    labelKey: 'center.meta.events',
    icon: CalendarDays,
    tone: 'calendar'
  },
  moodHelp: {
    labelKey: 'center.meta.moodHelp',
    icon: HeartHandshake,
    tone: 'care'
  },
  moodUpdates: {
    labelKey: 'center.meta.moodUpdates',
    icon: HeartPulse,
    tone: 'care'
  },
  problemReports: {
    labelKey: 'center.meta.problemReports',
    icon: Bug,
    tone: 'approval'
  },
  encouragements: {
    labelKey: 'center.meta.encouragements',
    icon: MessageCircleHeart,
    tone: 'care'
  },
  familyPolls: {
    labelKey: 'center.meta.familyPolls',
    icon: Vote,
    tone: 'calendar'
  },
  familyMissions: {
    labelKey: 'center.meta.familyMissions',
    icon: Flag,
    tone: 'success'
  },
  schoolItems: {
    labelKey: 'center.meta.schoolItems',
    icon: GraduationCap,
    tone: 'task'
  },
  rewards: {
    labelKey: 'center.meta.rewards',
    icon: Gift,
    tone: 'success'
  },
  pocketMoney: {
    labelKey: 'center.meta.pocketMoney',
    icon: Coins,
    tone: 'success'
  },
  familyConnections: {
    labelKey: 'center.meta.familyConnections',
    icon: Network,
    tone: 'calendar'
  },
  familyMail: {
    labelKey: 'center.meta.familyMail',
    icon: Mail,
    tone: 'chat'
  },
  familyChatInvites: {
    labelKey: 'center.meta.familyChatInvites',
    icon: UserRoundPlus,
    tone: 'approval'
  }
};

function relativeTime(timestamp, t) {
  const date = new Date(Number(timestamp || Date.now()));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notificationDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const dayDifference = Math.round(
    (today.getTime() - notificationDay.getTime()) / 86_400_000
  );
  const time = formatTime(date);
  if (dayDifference === 0) return t('center.time.today', { time });
  if (dayDifference === 1) return t('center.time.yesterday', { time });
  return formatDateTime(date, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export default function NotificationCenter() {
  const { t, i18n } = useTranslation('notifications');
  const {
    activeMember,
    activeHousehold,
    events,
    meals,
    notifications,
    shoppingItems,
    tasks,
    unreadNotificationCount,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveTab
  } = useFamily();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('today');

  const orderedNotifications = useMemo(
    () => [...notifications].sort(
      (left, right) => Number(right.createdAt) - Number(left.createdAt)
    ),
    [notifications]
  );
  const dailyBriefing = useMemo(() => {
    const now = new Date();
    const today = localDateKey(now);
    const dayName = now.toLocaleDateString('de-DE', { weekday: 'long' });
    const belongsToHousehold = item =>
      (item.household || 'familie') === activeHousehold;
    const profileEvents = events
      .filter(
        event =>
          event.date === today &&
          belongsToHousehold(event) &&
          (
            eventIsForMember(event, activeMember?.id)
          )
      )
      .sort((left, right) =>
        String(left.time || '00:00').localeCompare(
          String(right.time || '00:00')
        )
      );
    const profileTasks = tasks.filter(
      task =>
        task.memberId === activeMember?.id &&
        !task.completed &&
        belongsToHousehold(task) &&
        (!task.dueDate || task.dueDate <= today)
    );
    const approvals = canManageFamily(activeMember)
      ? tasks.filter(
          task =>
            task.completionStatus === 'pending_approval' &&
            belongsToHousehold(task) &&
            (
              !task.createdByMemberId ||
              task.createdByMemberId === activeMember?.id
            )
        )
      : [];
    const todayMeals = meals.filter(
      meal =>
        meal.day === dayName &&
        belongsToHousehold(meal)
    );
    const openShopping = shoppingItems.filter(
      item =>
        item.isSelected &&
        !item.inCart &&
        belongsToHousehold(item)
    );
    return {
      dateLabel: formatDate(now, {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }),
      events: profileEvents,
      tasks: profileTasks,
      approvals,
      meals: todayMeals,
      shopping: openShopping
    };
  }, [
    activeHousehold,
    activeMember,
    events,
    i18n.language,
    meals,
    shoppingItems,
    tasks
  ]);

  useEffect(() => {
    if (!isOpen) return undefined;
    refreshNotifications({ silent: true });
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, refreshNotifications]);

  const openNotification = notification => {
    if (!notification.read) {
      void markNotificationRead(notification.id, true);
    }
    try {
      const target = new URL(notification.url || '/', window.location.origin);
      const requestedView = target.searchParams.get('view');
      if (VIEW_NAMES.has(requestedView)) {
        const chatTarget = target.searchParams.get('chat');
        if (requestedView === 'chat' && chatTarget) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('chat', chatTarget);
          window.history.replaceState(
            {},
            '',
            `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
          );
        }
        setActiveTab(requestedView);
      }
    } catch {
      // A notification without a valid target still remains readable.
    }
    setIsOpen(false);
  };

  const openView = view => {
    setActiveTab(view);
    setIsOpen(false);
  };

  const briefingCount =
    dailyBriefing.events.length +
    dailyBriefing.tasks.length +
    dailyBriefing.approvals.length;

  return (
    <>
      <button
        type="button"
        className={`notification-center-trigger ${
          unreadNotificationCount ? 'has-unread' : ''
        }`}
        onClick={() => {
          setActiveSection('today');
          setIsOpen(true);
        }}
        aria-label={
          unreadNotificationCount
            ? t('center.trigger.unread', { count: unreadNotificationCount })
            : t('center.trigger.open')
        }
        title={t('center.trigger.title')}
      >
        <Bell size={19} />
        {unreadNotificationCount > 0 && (
          <span className="notification-center-badge">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            className="notification-center-layer"
            onPointerDown={() => setIsOpen(false)}
          >
            <aside
              className="notification-center-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-center-title"
              onPointerDown={event => event.stopPropagation()}
            >
              <header className="notification-center-header">
                <div>
                  <span className="notification-center-kicker">
                    <Bell size={13} /> {t('center.header.kicker')}
                  </span>
                  <h2 id="notification-center-title">
                    {t('center.header.title')}
                  </h2>
                  <p>
                    {t('center.header.subtitle', {
                      name:
                        activeMember?.name?.split(' ')[0] ||
                        t('center.header.subtitleFallbackName')
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  className="notification-center-close"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('center.header.close')}
                >
                  <X size={19} />
                </button>
              </header>

              <div className="notification-center-toolbar">
                <div
                  className="notification-center-tabs"
                  role="tablist"
                  aria-label={t('center.tabs.label')}
                >
                  <button
                    type="button"
                    className={activeSection === 'today' ? 'is-active' : ''}
                    onClick={() => setActiveSection('today')}
                    role="tab"
                    aria-selected={activeSection === 'today'}
                  >
                    <SunMedium size={15} /> {t('center.tabs.today')}
                  </button>
                  <button
                    type="button"
                    className={
                      activeSection === 'notifications' ? 'is-active' : ''
                    }
                    onClick={() => setActiveSection('notifications')}
                    role="tab"
                    aria-selected={activeSection === 'notifications'}
                  >
                    <Inbox size={15} /> {t('center.tabs.notifications')}
                    {unreadNotificationCount > 0 && (
                      <span>{unreadNotificationCount}</span>
                    )}
                  </button>
                </div>
                {activeSection === 'notifications' &&
                  unreadNotificationCount > 0 && (
                    <button
                      type="button"
                      className="notification-mark-all"
                      onClick={() => void markAllNotificationsRead()}
                    >
                      <CheckCheck size={15} /> {t('center.markAllRead')}
                    </button>
                  )}
              </div>

              <div className="notification-center-list">
                {activeSection === 'today' ? (
                  <div className="family-digest">
                    <header className="family-digest-intro">
                      <span>{dailyBriefing.dateLabel}</span>
                      <strong>
                        {briefingCount
                          ? t('center.digest.summary', { count: briefingCount })
                          : t('center.digest.allClear')}
                      </strong>
                      <p>
                        {t('center.digest.intro')}
                      </p>
                    </header>

                    <div className="family-digest-grid">
                      <button
                        type="button"
                        className="digest-card tone-calendar"
                        onClick={() => openView('calendar')}
                      >
                        <span><CalendarDays size={19} /></span>
                        <div>
                          <small>{t('center.digest.events.label')}</small>
                          <strong>
                            {dailyBriefing.events.length
                              ? dailyBriefing.events[0].title
                              : t('center.digest.events.free')}
                          </strong>
                          <p>
                            {dailyBriefing.events.length
                              ? t('center.digest.events.count', {
                                  count: dailyBriefing.events.length
                                })
                              : t('center.digest.events.empty')}
                          </p>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>

                      <button
                        type="button"
                        className="digest-card tone-task"
                        onClick={() => openView('tasks')}
                      >
                        <span><ClipboardCheck size={19} /></span>
                        <div>
                          <small>{t('center.digest.tasks.label')}</small>
                          <strong>
                            {dailyBriefing.approvals.length
                              ? t('center.digest.tasks.approvals', {
                                  count: dailyBriefing.approvals.length
                                })
                              : dailyBriefing.tasks.length
                                ? t('center.digest.tasks.open', {
                                    count: dailyBriefing.tasks.length
                                  })
                                : t('center.digest.tasks.done')}
                          </strong>
                          <p>
                            {dailyBriefing.tasks[0]?.title ||
                              dailyBriefing.approvals[0]?.title ||
                              t('center.digest.tasks.empty')}
                          </p>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>

                      <button
                        type="button"
                        className="digest-card tone-meal"
                        onClick={() => openView('meals')}
                      >
                        <span><UtensilsCrossed size={19} /></span>
                        <div>
                          <small>{t('center.digest.meals.label')}</small>
                          <strong>
                            {dailyBriefing.meals[0]?.recipe ||
                              t('center.digest.meals.unplanned')}
                          </strong>
                          <p>
                            {dailyBriefing.meals.length
                              ? dailyBriefing.meals
                                  .map(meal => meal.meal)
                                  .join(' · ')
                              : t('center.digest.meals.empty')}
                          </p>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>

                      <button
                        type="button"
                        className="digest-card tone-shopping"
                        onClick={() => openView('shopping')}
                      >
                        <span><ShoppingBasket size={19} /></span>
                        <div>
                          <small>{t('center.digest.shopping.label')}</small>
                          <strong>
                            {dailyBriefing.shopping.length
                              ? t('center.digest.shopping.missing', {
                                  count: dailyBriefing.shopping.length
                                })
                              : t('center.digest.shopping.listEmpty')}
                          </strong>
                          <p>
                            {dailyBriefing.shopping
                              .slice(0, 3)
                              .map(item => item.name)
                              .join(' · ') ||
                              t('center.digest.shopping.nothingToBuy')}
                          </p>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : orderedNotifications.length === 0 ? (
                  <div className="notification-center-empty">
                    <span><CheckCheck size={28} /></span>
                    <strong>{t('center.empty.title')}</strong>
                    <p>{t('center.empty.text')}</p>
                  </div>
                ) : (
                  orderedNotifications.map(notification => {
                    const meta =
                      NOTIFICATION_META[notification.eventKey] || {
                        labelKey: 'center.meta.default',
                        icon: Bell,
                        tone: 'default'
                      };
                    const Icon = meta.icon;
                    return (
                      <button
                        type="button"
                        key={notification.id}
                        className={`notification-center-item ${
                          notification.read ? 'is-read' : 'is-unread'
                        } tone-${meta.tone}`}
                        onClick={() => openNotification(notification)}
                      >
                        <span className="notification-center-icon">
                          <Icon size={19} />
                        </span>
                        <span className="notification-center-copy">
                          <span className="notification-center-meta">
                            <strong>{t(meta.labelKey)}</strong>
                            <time>{relativeTime(notification.createdAt, t)}</time>
                          </span>
                          <b>{notification.title}</b>
                          {notification.body && <p>{notification.body}</p>}
                        </span>
                        <ArrowUpRight
                          className="notification-center-arrow"
                          size={17}
                        />
                      </button>
                    );
                  })
                )}
              </div>

              <footer className="notification-center-footer">
                {activeSection === 'today'
                  ? t('center.footer.today')
                  : t('center.footer.notifications')}
              </footer>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
