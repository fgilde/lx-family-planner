import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Pin,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  UtensilsCrossed
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { INITIAL_TRASH_EVENTS } from '../Calendar/TrashCalendarView';
import ChildDashboard from './ChildDashboard';
import PetDashboard from './PetDashboard';
import DashboardCustomizer from './DashboardCustomizer';
import OrderedDashboardGrid, {
  DashboardWidget
} from './OrderedDashboardGrid';
import useDashboardLayout from '../../hooks/useDashboardLayout';
import { isChildProfile, isPetProfile } from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

const ADULT_WIDGETS = [
  {
    id: 'calendar',
    label: 'Meine Termine',
    description: 'Deine nächsten Termine und Familienereignisse',
    icon: Calendar,
    color: '#377d69'
  },
  {
    id: 'tasks',
    label: 'Aufgaben & Freigaben',
    description: 'Eigene Aufgaben und offene Elternbestätigungen',
    icon: CheckSquare,
    color: '#3975b9'
  },
  {
    id: 'meals',
    label: 'Heute auf dem Tisch',
    description: 'Der aktuelle Essensplan für euren Haushalt',
    icon: UtensilsCrossed,
    color: '#c26745'
  },
  {
    id: 'shopping',
    label: 'Noch einzukaufen',
    description: 'Die wichtigsten offenen Artikel auf einen Blick',
    icon: ShoppingBag,
    color: '#8a6a24'
  },
  {
    id: 'trash',
    label: 'Nächste Müllabfuhr',
    description: 'Der nächste Abholtermin für euren Planungsort',
    icon: Trash2,
    color: '#66736e'
  },
  {
    id: 'board',
    label: 'Pinnwand',
    description: 'Die neuesten gemeinsamen Familiennotizen',
    icon: Pin,
    color: '#a65a3f'
  }
];
const ADULT_WIDGET_IDS = ADULT_WIDGETS.map(widget => widget.id);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function DashboardCardHeader({
  action,
  actionLabel,
  count,
  icon: Icon,
  title,
  tone = 'var(--primary)'
}) {
  return (
    <div className="adult-widget-header">
      <div className="adult-widget-heading" style={{ color: tone }}>
        <span className="adult-widget-heading-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <h3>
          <span>{title}</span>
          {count !== undefined && (
            <span className="adult-widget-count">{count}</span>
          )}
        </h3>
      </div>
      <button
        type="button"
        className="adult-widget-link"
        onClick={action}
        aria-label={`${actionLabel}: ${title}`}
        title={actionLabel}
      >
        Öffnen <ArrowRight size={13} />
      </button>
    </div>
  );
}

function EmptyWidget({ icon, children }) {
  return (
    <div className="adult-widget-empty">
      <span>{icon}</span>
      <p>{children}</p>
    </div>
  );
}

export default function PersonalDashboard() {
  const {
    activeMember,
    events,
    tasks,
    toggleTask,
    notes,
    meals,
    shoppingItems,
    trashEvents: savedTrashEvents,
    setActiveTab,
    setIsQuickAddOpen,
    activeHousehold
  } = useFamily();
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const dashboardLayout = useDashboardLayout(
    activeMember?.id,
    'personal',
    ADULT_WIDGET_IDS
  );

  const now = new Date();
  const hour = now.getHours();
  const timeGreeting =
    hour < 11 ? 'Guten Morgen' : hour >= 18 ? 'Guten Abend' : 'Guten Tag';
  const todayKey = localDateKey(now);
  const currentDayName = now.toLocaleDateString('de-DE', {
    weekday: 'long'
  });
  const belongsToHousehold = item =>
    (item.household || 'familie') === activeHousehold;

  const myEvents = useMemo(
    () =>
      events
        .filter(
          event =>
            (event.memberId === activeMember.id ||
              event.memberId === 'all') &&
            belongsToHousehold(event)
        )
        .sort(
          (left, right) =>
            new Date(`${left.date}T${left.time || '00:00'}`) -
            new Date(`${right.date}T${right.time || '00:00'}`)
        ),
    [activeHousehold, activeMember.id, events]
  );
  const myTasks = useMemo(
    () =>
      tasks
        .filter(
          task =>
            task.memberId === activeMember.id &&
            !task.completed &&
            belongsToHousehold(task)
        )
        .sort((left, right) =>
          String(left.dueDate || '9999-12-31').localeCompare(
            String(right.dueDate || '9999-12-31')
          )
        ),
    [activeHousehold, activeMember.id, tasks]
  );
  const approvalTasks = useMemo(
    () =>
      tasks.filter(
        task =>
          task.completionStatus === 'pending_approval' &&
          belongsToHousehold(task) &&
          (
            !task.createdByMemberId ||
            task.createdByMemberId === activeMember.id
          )
      ),
    [activeHousehold, activeMember.id, tasks]
  );
  const todayMeals = useMemo(
    () =>
      meals.filter(
        meal =>
          meal.day === currentDayName &&
          belongsToHousehold(meal)
      ),
    [activeHousehold, currentDayName, meals]
  );
  const openShopping = useMemo(
    () =>
      shoppingItems.filter(
        item =>
          item.isSelected &&
          !item.inCart &&
          belongsToHousehold(item)
      ),
    [activeHousehold, shoppingItems]
  );
  const householdNotes = useMemo(
    () =>
      notes.filter(
        note => note.isShared || belongsToHousehold(note)
      ),
    [activeHousehold, notes]
  );
  const householdTrashEvents = savedTrashEvents.filter(belongsToHousehold);
  const trashEvents = householdTrashEvents.length
    ? householdTrashEvents
    : activeHousehold === 'familie'
      ? INITIAL_TRASH_EVENTS
      : [];
  const nextTrash = trashEvents
    .filter(item => item.date >= todayKey)
    .sort((left, right) => left.date.localeCompare(right.date))[0];

  if (isChildProfile(activeMember)) return <ChildDashboard />;
  if (isPetProfile(activeMember)) return <PetDashboard />;

  return (
    <div className="adult-dashboard">
      <div
        className="adult-hero"
        style={{ '--member-color': activeMember?.color || '#246b58' }}
      >
        <div className="adult-hero-identity">
          <img
            src={activeMember.avatar || DEFAULT_FAMILY_AVATAR}
            onError={handleImgError}
            alt={activeMember.name}
            className="adult-hero-avatar"
          />
          <div>
            <span className="adult-hero-kicker">Dein Familienüberblick</span>
            <h1>{timeGreeting}, {activeMember.name.split(' ')[0]}!</h1>
            <p>
              Heute im Blick: {myEvents.length}{' '}
              {myEvents.length === 1 ? 'Termin' : 'Termine'},{' '}
              {myTasks.length} offene{' '}
              {myTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} und{' '}
              {openShopping.length} Einkäufe.
            </p>
          </div>
        </div>
        <div className="adult-hero-actions">
          <button
            type="button"
            className="adult-layout-button"
            onClick={() => setIsCustomizerOpen(true)}
          >
            <LayoutDashboard size={17} /> Ansicht
          </button>
          <button
            type="button"
            className="adult-quick-add"
            onClick={() => setIsQuickAddOpen(true)}
          >
            <Plus size={18} /> Etwas eintragen
          </button>
        </div>
      </div>

      <OrderedDashboardGrid
        className="adult-widget-grid"
        layout={dashboardLayout.layout}
      >
        <DashboardWidget widgetId="calendar" className="card adult-dashboard-widget">
          <DashboardCardHeader
            action={() => setActiveTab('calendar')}
            actionLabel="Alle anzeigen"
            count={myEvents.length}
            icon={Calendar}
            title="Meine Termine"
          />
          {myEvents.length === 0 ? (
            <EmptyWidget icon="🎉">Keine Termine für dich eingetragen.</EmptyWidget>
          ) : (
            <div className="adult-event-list">
              {myEvents.slice(0, 4).map(event => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setActiveTab('calendar')}
                >
                  <time>
                    <strong>{event.time || 'ganztags'}</strong>
                    <span>
                      {new Date(`${event.date}T12:00:00`).toLocaleDateString(
                        'de-DE',
                        { weekday: 'short', day: '2-digit', month: 'short' }
                      )}
                    </span>
                  </time>
                  <span>
                    <strong>{event.title}</strong>
                    <small>{event.location || 'Familientermin'}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget widgetId="tasks" className="card adult-dashboard-widget">
          <DashboardCardHeader
            action={() => setActiveTab('tasks')}
            actionLabel="Aufgabenplan"
            count={myTasks.length + approvalTasks.length}
            icon={CheckSquare}
            title="Aufgaben & Freigaben"
          />
          {approvalTasks.length > 0 && (
            <button
              type="button"
              className="adult-approval-alert"
              onClick={() => setActiveTab('tasks')}
            >
              <span>{approvalTasks.length}</span>
              <strong>
                {approvalTasks.length === 1
                  ? 'Erledigung wartet auf dich'
                  : 'Erledigungen warten auf dich'}
              </strong>
              <ArrowRight size={15} />
            </button>
          )}
          {myTasks.length === 0 && approvalTasks.length === 0 ? (
            <EmptyWidget icon="🌟">Alle Aufgaben sind erledigt.</EmptyWidget>
          ) : (
            <div className="adult-task-list">
              {myTasks.slice(0, approvalTasks.length ? 3 : 4).map(task => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                >
                  <span className="adult-task-check" />
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {task.dueDate
                        ? `Fällig ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('de-DE')}`
                        : task.category || 'Aufgabe'}
                    </small>
                  </span>
                  <em><Star size={13} fill="currentColor" /> +{task.stars}</em>
                </button>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget widgetId="meals" className="card adult-dashboard-widget meals">
          <DashboardCardHeader
            action={() => setActiveTab('meals')}
            actionLabel="Essensplan"
            count={todayMeals.length}
            icon={UtensilsCrossed}
            title="Heute auf dem Tisch"
            tone="var(--accent)"
          />
          {todayMeals.length === 0 ? (
            <EmptyWidget icon="🥣">Für heute ist noch nichts geplant.</EmptyWidget>
          ) : (
            <div className="adult-meal-list">
              {todayMeals.map(meal => (
                <button
                  type="button"
                  key={meal.id}
                  onClick={() => setActiveTab('meals')}
                >
                  <span>{meal.meal}</span>
                  <strong>{meal.recipe}</strong>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget widgetId="shopping" className="card adult-dashboard-widget shopping">
          <DashboardCardHeader
            action={() => setActiveTab('shopping')}
            actionLabel="Einkaufsliste"
            count={openShopping.length}
            icon={ShoppingBag}
            title="Noch einzukaufen"
            tone="var(--warning)"
          />
          {openShopping.length === 0 ? (
            <EmptyWidget icon="✓">Die Einkaufsliste ist erledigt.</EmptyWidget>
          ) : (
            <div className="adult-shopping-preview">
              {openShopping.slice(0, 6).map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveTab('shopping')}
                >
                  <span>{item.icon || '🛒'}</span>
                  <strong>{item.name}</strong>
                  <small>{item.quantity || '1×'}</small>
                </button>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget widgetId="trash" className="card adult-dashboard-widget trash">
          <DashboardCardHeader
            action={() => setActiveTab('trash')}
            actionLabel="Müllkalender"
            icon={Trash2}
            title="Nächste Müllabfuhr"
            tone="var(--warning)"
          />
          {nextTrash ? (
            <button
              type="button"
              className="adult-trash-next"
              onClick={() => setActiveTab('trash')}
            >
              <span>🗑️</span>
              <span>
                <strong>{nextTrash.title}</strong>
                <small>
                  Abholung am{' '}
                  {new Date(`${nextTrash.date}T12:00:00`).toLocaleDateString(
                    'de-DE',
                    { weekday: 'long', day: 'numeric', month: 'long' }
                  )}
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <EmptyWidget icon="🗓️">Keine Mülltermine vorhanden.</EmptyWidget>
          )}
        </DashboardWidget>

        <DashboardWidget widgetId="board" className="card adult-dashboard-widget board">
          <DashboardCardHeader
            action={() => setActiveTab('board')}
            actionLabel="Zur Pinnwand"
            count={householdNotes.length}
            icon={Pin}
            title="Neues an der Pinnwand"
          />
          {householdNotes.length === 0 ? (
            <EmptyWidget icon="📌">Noch keine Notizen vorhanden.</EmptyWidget>
          ) : (
            <div className="adult-note-stack">
              {householdNotes.slice(0, 3).map(note => (
                <button
                  type="button"
                  key={note.id}
                  onClick={() => setActiveTab('board')}
                  style={{ '--note-color': note.color || '#fef08a' }}
                >
                  <strong>{note.title}</strong>
                  <span>{note.content}</span>
                </button>
              ))}
            </div>
          )}
        </DashboardWidget>
      </OrderedDashboardGrid>

      <DashboardCustomizer
        isOpen={isCustomizerOpen}
        layout={dashboardLayout.layout}
        mode="personal"
        moveWidget={dashboardLayout.moveWidget}
        onClose={() => setIsCustomizerOpen(false)}
        profileName={activeMember.name.split(' ')[0]}
        resetLayout={dashboardLayout.resetLayout}
        setDensity={dashboardLayout.setDensity}
        toggleWidget={dashboardLayout.toggleWidget}
        widgets={ADULT_WIDGETS}
      />
    </div>
  );
}
