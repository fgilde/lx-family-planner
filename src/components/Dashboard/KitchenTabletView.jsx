import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckSquare,
  Clock3,
  Home,
  MessageSquare,
  Pin,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  Users,
  UtensilsCrossed
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { isChildProfile } from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortDate(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

function TabletCard({ tab, icon: Icon, title, count, tone, children, onOpen }) {
  return (
    <section className={`tablet-command-card ${tone || ''}`}>
      <button
        type="button"
        className="tablet-card-heading"
        onClick={() => onOpen(tab)}
      >
        <span className="tablet-card-icon"><Icon size={20} /></span>
        <span>
          <strong>{title}</strong>
          {count !== undefined && <small>{count}</small>}
        </span>
        <ArrowUpRight size={17} />
      </button>
      <div className="tablet-card-body">{children}</div>
    </section>
  );
}

export default function KitchenTabletView() {
  const {
    activeMember,
    activeHousehold,
    chatMessages,
    events,
    meals,
    members,
    notes,
    setActiveTab,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
    shoppingItems,
    tasks,
    toggleShoppingInCart,
    toggleTask,
    trashEvents
  } = useFamily();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayKey = localDateKey(currentTime);
  const currentDayName = currentTime.toLocaleDateString('de-DE', {
    weekday: 'long'
  });
  const householdName =
    activeHousehold === 'oma_opa' ? 'Oma & Opa' : 'Unser Zuhause';
  const belongsToHousehold = item =>
    (item.household || 'familie') === activeHousehold;

  const todayEvents = useMemo(
    () =>
      events
        .filter(event => event.date === todayKey && belongsToHousehold(event))
        .sort((left, right) =>
          String(left.time || '').localeCompare(String(right.time || ''))
        ),
    [activeHousehold, events, todayKey]
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
  const activeShopping = useMemo(
    () =>
      shoppingItems.filter(
        item =>
          item.isSelected &&
          !item.inCart &&
          belongsToHousehold(item)
      ),
    [activeHousehold, shoppingItems]
  );
  const pendingTasks = useMemo(
    () =>
      tasks.filter(
        task => !task.completed && belongsToHousehold(task)
      ),
    [activeHousehold, tasks]
  );
  const visibleNotes = useMemo(
    () =>
      notes.filter(
        note => note.isShared || belongsToHousehold(note)
      ),
    [activeHousehold, notes]
  );
  const groupMessages = useMemo(
    () =>
      chatMessages
        .filter(message => !message.target || message.target === 'group')
        .sort(
          (left, right) =>
            Number(right.timestamp || 0) - Number(left.timestamp || 0)
        ),
    [chatMessages]
  );
  const nextTrash = useMemo(
    () =>
      trashEvents
        .filter(item => item.date >= todayKey)
        .sort((left, right) => left.date.localeCompare(right.date))[0],
    [todayKey, trashEvents]
  );

  const openQuickAdd = type => {
    setQuickAddDefaultType(type);
    setIsQuickAddOpen(true);
  };

  const handleTask = task => {
    if (
      isChildProfile(activeMember) &&
      task.memberId === activeMember?.id &&
      !task.completed
    ) {
      toggleTask(task.id);
      return;
    }
    setActiveTab('tasks');
  };

  return (
    <div className="tablet-command-center">
      <header className="tablet-command-hero">
        <div className="tablet-time-block">
          <span className="tablet-live-dot">Live</span>
          <strong>
            {currentTime.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </strong>
          <p>
            {currentTime.toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <div className="tablet-home-status">
          <span><Home size={17} /> {householdName}</span>
          <strong>Alles im Blick.</strong>
          <small>Angemeldet als {activeMember?.name}</small>
        </div>
        <div className="tablet-quick-actions">
          <button type="button" onClick={() => openQuickAdd('event')}>
            <Plus size={17} /> Termin
          </button>
          <button type="button" onClick={() => openQuickAdd('shopping')}>
            <Plus size={17} /> Einkauf
          </button>
          <button type="button" onClick={() => setActiveTab('dashboard')}>
            Standardansicht <ArrowUpRight size={16} />
          </button>
        </div>
      </header>

      <div className="tablet-command-grid">
        <TabletCard
          tab="calendar"
          icon={CalendarDays}
          title="Heute"
          count={`${todayEvents.length} Termine`}
          tone="calendar"
          onOpen={setActiveTab}
        >
          {todayEvents.length ? (
            <div className="tablet-event-list">
              {todayEvents.slice(0, 4).map(event => {
                const member = members.find(entry => entry.id === event.memberId);
                return (
                  <button
                    type="button"
                    key={event.id}
                    onClick={() => setActiveTab('calendar')}
                  >
                    <time>{event.time || 'ganztags'}</time>
                    <span>
                      <strong>{event.title}</strong>
                      <small>{event.location || member?.name || 'Familie'}</small>
                    </span>
                    {member && (
                      <img
                        src={member.avatar || DEFAULT_FAMILY_AVATAR}
                        onError={handleImgError}
                        alt=""
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="tablet-empty">
              <CalendarDays size={24} />
              <span>Heute ist noch ganz frei.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="meals"
          icon={UtensilsCrossed}
          title="Essen"
          count={currentDayName}
          tone="meals"
          onOpen={setActiveTab}
        >
          {todayMeals.length ? (
            <div className="tablet-meal-list">
              {todayMeals.map(meal => (
                <button
                  type="button"
                  key={meal.id}
                  onClick={() => setActiveTab('meals')}
                >
                  <small>{meal.meal}</small>
                  <strong>{meal.recipe}</strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="tablet-empty">
              <UtensilsCrossed size={24} />
              <span>Noch kein Essen geplant.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="tasks"
          icon={CheckSquare}
          title="Aufgaben"
          count={`${pendingTasks.length} offen`}
          tone="tasks"
          onOpen={setActiveTab}
        >
          {pendingTasks.length ? (
            <div className="tablet-task-list">
              {pendingTasks.slice(0, 4).map(task => {
                const member = members.find(entry => entry.id === task.memberId);
                const pendingApproval =
                  task.completionStatus === 'pending_approval';
                return (
                  <button
                    type="button"
                    key={task.id}
                    onClick={() => handleTask(task)}
                  >
                    <span className={pendingApproval ? 'waiting' : ''}>
                      {pendingApproval ? <Clock3 size={15} /> : <Check size={15} />}
                    </span>
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        {pendingApproval ? 'Wartet auf Prüfung' : member?.name}
                      </small>
                    </span>
                    <em><Star size={12} fill="currentColor" /> {task.stars}</em>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="tablet-empty">
              <Star size={24} />
              <span>Alle Aufgaben sind geschafft.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="shopping"
          icon={ShoppingBag}
          title="Einkauf"
          count={`${activeShopping.length} Artikel`}
          tone="shopping"
          onOpen={setActiveTab}
        >
          {activeShopping.length ? (
            <div className="tablet-shopping-list">
              {activeShopping.slice(0, 6).map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={event => toggleShoppingInCart(item.id, event)}
                >
                  <span>{item.icon || '🛒'}</span>
                  <strong>{item.name}</strong>
                  <small>{item.quantity || '1'}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="tablet-empty">
              <Check size={24} />
              <span>Alles eingekauft.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="chat"
          icon={MessageSquare}
          title="Familienchat"
          count={`${groupMessages.length} Nachrichten`}
          tone="chat"
          onOpen={setActiveTab}
        >
          {groupMessages.length ? (
            <div className="tablet-chat-preview">
              {groupMessages.slice(0, 3).map(message => (
                <button
                  type="button"
                  key={message.id}
                  onClick={() => setActiveTab('chat')}
                >
                  <strong>{message.senderName || 'Familie'}</strong>
                  <span>
                    {message.text || (message.photo ? '📷 Foto' : 'Neue Nachricht')}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tablet-empty">
              <MessageSquare size={24} />
              <span>Noch keine Nachricht.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="board"
          icon={Pin}
          title="Pinnwand"
          count={`${visibleNotes.length} Notizen`}
          tone="board"
          onOpen={setActiveTab}
        >
          {visibleNotes.length ? (
            <div className="tablet-note-stack">
              {visibleNotes.slice(0, 3).map(note => (
                <button
                  type="button"
                  key={note.id}
                  onClick={() => setActiveTab('board')}
                >
                  <strong>{note.title}</strong>
                  <span>{note.content}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tablet-empty">
              <Pin size={24} />
              <span>Die Pinnwand ist leer.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="trash"
          icon={Trash2}
          title="Nächste Abholung"
          count={nextTrash ? shortDate(nextTrash.date) : 'Kein Termin'}
          tone="trash"
          onOpen={setActiveTab}
        >
          {nextTrash ? (
            <button
              type="button"
              className="tablet-trash-next"
              onClick={() => setActiveTab('trash')}
            >
              <span>🗑️</span>
              <strong>{nextTrash.title}</strong>
              <small>{shortDate(nextTrash.date)}</small>
            </button>
          ) : (
            <div className="tablet-empty">
              <Trash2 size={24} />
              <span>Noch kein Mülltermin.</span>
            </div>
          )}
        </TabletCard>

        <TabletCard
          tab="dashboard"
          icon={Users}
          title="Familie"
          count={`${members.length} Profile`}
          tone="family"
          onOpen={setActiveTab}
        >
          <div className="tablet-family-row">
            {members.slice(0, 6).map(member => (
              <button
                type="button"
                key={member.id}
                onClick={() => setActiveTab('dashboard')}
                title={member.name}
              >
                <img
                  src={member.avatar || DEFAULT_FAMILY_AVATAR}
                  onError={handleImgError}
                  alt=""
                />
                <strong>{member.name.split(' ')[0]}</strong>
                {isChildProfile(member) && (
                  <small><Star size={10} fill="currentColor" /> {member.stars || 0}</small>
                )}
              </button>
            ))}
          </div>
        </TabletCard>
      </div>
    </div>
  );
}
