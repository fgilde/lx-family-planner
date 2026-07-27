import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  Inbox,
  MessageCircle,
  ShoppingBasket,
  Sparkles,
  SunMedium,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { canManageFamily } from '../../constants/roles';

const VIEW_NAMES = new Set([
  'dashboard',
  'chat',
  'calendar',
  'tasks',
  'board',
  'shopping',
  'meals',
  'admin'
]);

const NOTIFICATION_META = {
  groupChat: {
    label: 'Familienchat',
    icon: MessageCircle,
    tone: 'chat'
  },
  directMessages: {
    label: 'Direktnachricht',
    icon: MessageCircle,
    tone: 'chat'
  },
  taskAssigned: {
    label: 'Neue Aufgabe',
    icon: ClipboardCheck,
    tone: 'task'
  },
  taskApproval: {
    label: 'Aufgabenfreigabe',
    icon: CheckCircle2,
    tone: 'approval'
  },
  taskCompleted: {
    label: 'Geschafft',
    icon: Sparkles,
    tone: 'success'
  },
  events: {
    label: 'Familienkalender',
    icon: CalendarDays,
    tone: 'calendar'
  },
  moodHelp: {
    label: 'Familienkompass',
    icon: HeartHandshake,
    tone: 'care'
  }
};

function relativeTime(timestamp) {
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
  const time = date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });
  if (dayDifference === 0) return `Heute, ${time}`;
  if (dayDifference === 1) return `Gestern, ${time}`;
  return date.toLocaleDateString('de-DE', {
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
            !event.memberId ||
            event.memberId === 'all' ||
            event.memberId === activeMember?.id
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
      dateLabel: now.toLocaleDateString('de-DE', {
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
            ? `${unreadNotificationCount} ungelesene Meldungen im Familien-Posteingang`
            : 'Familien-Posteingang öffnen'
        }
        title="Familien-Posteingang"
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
                    <Bell size={13} /> Familienfunk
                  </span>
                  <h2 id="notification-center-title">
                    Familien-Posteingang
                  </h2>
                  <p>
                    Tagesüberblick und Meldungen für{' '}
                    {activeMember?.name?.split(' ')[0] || 'dich'} an einem Ort.
                  </p>
                </div>
                <button
                  type="button"
                  className="notification-center-close"
                  onClick={() => setIsOpen(false)}
                  aria-label="Meldungen schließen"
                >
                  <X size={19} />
                </button>
              </header>

              <div className="notification-center-toolbar">
                <div
                  className="notification-center-tabs"
                  role="tablist"
                  aria-label="Posteingang auswählen"
                >
                  <button
                    type="button"
                    className={activeSection === 'today' ? 'is-active' : ''}
                    onClick={() => setActiveSection('today')}
                    role="tab"
                    aria-selected={activeSection === 'today'}
                  >
                    <SunMedium size={15} /> Heute
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
                    <Inbox size={15} /> Meldungen
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
                      <CheckCheck size={15} /> Alle gelesen
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
                          ? `${briefingCount} Dinge brauchen heute euren Blick.`
                          : 'Heute ist alles angenehm übersichtlich.'}
                      </strong>
                      <p>
                        Ein kurzer Blick genügt – danach kann der Tag beginnen.
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
                          <small>Termine</small>
                          <strong>
                            {dailyBriefing.events.length
                              ? dailyBriefing.events[0].title
                              : 'Heute ist frei'}
                          </strong>
                          <p>
                            {dailyBriefing.events.length
                              ? `${dailyBriefing.events.length} ${
                                  dailyBriefing.events.length === 1
                                    ? 'Termin'
                                    : 'Termine'
                                } heute`
                              : 'Keine Einträge im Kalender'}
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
                          <small>Aufgaben</small>
                          <strong>
                            {dailyBriefing.approvals.length
                              ? `${dailyBriefing.approvals.length} wartet auf Freigabe`
                              : dailyBriefing.tasks.length
                                ? `${dailyBriefing.tasks.length} heute offen`
                                : 'Alles geschafft'}
                          </strong>
                          <p>
                            {dailyBriefing.tasks[0]?.title ||
                              dailyBriefing.approvals[0]?.title ||
                              'Keine dringende Aufgabe'}
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
                          <small>Heute essen</small>
                          <strong>
                            {dailyBriefing.meals[0]?.recipe ||
                              'Noch nicht geplant'}
                          </strong>
                          <p>
                            {dailyBriefing.meals.length
                              ? dailyBriefing.meals
                                  .map(meal => meal.meal)
                                  .join(' · ')
                              : 'Der Speiseplan hat noch Platz'}
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
                          <small>Einkauf</small>
                          <strong>
                            {dailyBriefing.shopping.length
                              ? `${dailyBriefing.shopping.length} Dinge fehlen`
                              : 'Liste ist leer'}
                          </strong>
                          <p>
                            {dailyBriefing.shopping
                              .slice(0, 3)
                              .map(item => item.name)
                              .join(' · ') || 'Gerade nichts einzukaufen'}
                          </p>
                        </div>
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </div>
                ) : orderedNotifications.length === 0 ? (
                  <div className="notification-center-empty">
                    <span><CheckCheck size={28} /></span>
                    <strong>Hier ist alles ruhig</strong>
                    <p>
                      Neue Termine, Nachrichten und Aufgaben landen künftig
                      zuverlässig hier.
                    </p>
                  </div>
                ) : (
                  orderedNotifications.map(notification => {
                    const meta =
                      NOTIFICATION_META[notification.eventKey] || {
                        label: 'Familienplaner',
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
                            <strong>{meta.label}</strong>
                            <time>{relativeTime(notification.createdAt)}</time>
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
                  ? 'Der Tagesüberblick wird live aus eurem Familienplan erstellt.'
                  : 'Meldungen werden 90 Tage lang gespeichert.'}
              </footer>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
