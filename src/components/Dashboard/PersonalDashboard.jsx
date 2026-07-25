import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Calendar, CheckSquare, Pin, Trash2, UtensilsCrossed, Star, Plus, Sun, Moon, Clock, ArrowRight, Sparkles, Award } from 'lucide-react';
import { INITIAL_TRASH_EVENTS } from '../Calendar/TrashCalendarView';
import ChildDashboard from './ChildDashboard';
import { isChildProfile } from '../../constants/roles';

export default function PersonalDashboard() {
  const {
    activeMember, members, events, tasks, toggleTask, notes, meals, shoppingItems, trashEvents: savedTrashEvents,
    setActiveTab, setIsQuickAddOpen, setQuickAddDefaultType, activeHousehold
  } = useFamily();

  if (isChildProfile(activeMember)) {
    return <ChildDashboard />;
  }

  // Time-based greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Guten Tag';
  if (hour < 11) timeGreeting = 'Guten Morgen';
  else if (hour >= 18) timeGreeting = 'Guten Abend';

  const isChild = false;
  const todayStr = new Date().toISOString().split('T')[0];

  // User's events
  const myEvents = events.filter(
    event =>
      (event.memberId === activeMember.id || event.memberId === 'all') &&
      (event.household || 'familie') === activeHousehold
  )
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

  // User's pending tasks
  const myTasks = tasks.filter(
    task =>
      task.memberId === activeMember.id &&
      !task.completed &&
      (task.household || 'familie') === activeHousehold
  );

  // Today's dinner
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const todayDayName = dayNames[new Date().getDay()];
  const todayMeals = meals.filter(
    meal =>
      meal.day === todayDayName &&
      (meal.household || 'familie') === activeHousehold
  );

  // Load trash events for next pickup widget
  const householdTrashEvents = savedTrashEvents.filter(
    item => (item.household || 'familie') === activeHousehold
  );
  const trashEvents = householdTrashEvents.length
    ? householdTrashEvents
    : activeHousehold === 'familie'
      ? INITIAL_TRASH_EVENTS
      : [];
  const nextTrash = trashEvents.filter(t => t.date >= todayStr).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const householdNotes = notes.filter(
    note =>
      note.isShared ||
      (note.household || 'familie') === activeHousehold
  );

  return (
    <div className="adult-dashboard">
      {/* Hero Welcome Card (Child-Friendly & Colorful for Kids) */}
      <div className="adult-hero" style={{ '--member-color': activeMember?.color || '#246b58' }}>
        <div className="adult-hero-identity">
          <img
            src={activeMember.avatar}
            alt={activeMember.name}
            className="adult-hero-avatar"
          />
          <div>
            <span className="adult-hero-kicker">Dein Familienüberblick</span>
            <h1>
              {timeGreeting}, {activeMember.name.split(' ')[0]}!
            </h1>
            <p>
              Heute im Blick: {myEvents.length}{' '}
              {myEvents.length === 1 ? 'Termin' : 'Termine'},{' '}
              {myTasks.length} offene {myTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} und{' '}
              {shoppingItems.filter(item => item.isSelected && !item.inCart).length}{' '}
              Einkäufe.
            </p>
          </div>
        </div>

        {/* Member Badges & Stars Counter */}
        <div className="adult-hero-actions">
          <button
            className="adult-quick-add"
            onClick={() => setIsQuickAddOpen(true)}
          >
            <Plus size={18} /> Etwas Eintragen
          </button>
        </div>
      </div>

      {/* Grid of Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* WIDGET 1: Meine anstehenden Termine */}
        <div className="card" style={{ borderRadius: isChild ? 'var(--radius-xl)' : 'var(--radius-lg)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--primary)' }}>
              <Calendar size={22} /> Meine Termine ({myEvents.length})
            </h3>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setActiveTab('calendar')}>
              Alle anzeigen <ArrowRight size={12} />
            </button>
          </div>

          {myEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              🎉 Keine Termine für dich eingetragen.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myEvents.slice(0, 4).map(evt => (
                <div key={evt.id} style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', borderLeft: `5px solid ${activeMember.color || 'var(--primary)'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{evt.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 4 }}>
                    <span>📅 {new Date(evt.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span>🕒 {evt.time} Uhr</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WIDGET 2: Meine Aufgaben & Sterne */}
        <div className="card" style={{ borderRadius: isChild ? 'var(--radius-xl)' : 'var(--radius-lg)', border: isChild ? '2px solid #f59e0b' : undefined }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--primary)' }}>
              <CheckSquare size={22} /> Meine Aufgaben ({myTasks.length})
            </h3>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setActiveTab('tasks')}>
              Zum Aufgabenplan <ArrowRight size={12} />
            </button>
          </div>

          {myTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              🌟 Alle deine Aufgaben sind erledigt! Super gemacht.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myTasks.slice(0, 4).map(tsk => (
                <div
                  key={tsk.id}
                  onClick={() => toggleTask(tsk.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={tsk.completed} readOnly style={{ width: 20, height: 20 }} />
                    <span style={{ fontWeight: 700, fontSize: isChild ? '1.05rem' : '0.95rem' }}>{tsk.title}</span>
                  </div>
                  <span style={{ fontWeight: 900, color: 'var(--warning)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Star size={14} fill="#f59e0b" /> +{tsk.stars}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WIDGET 3: Müllabfuhr Erinnerung */}
        <div className="card" style={{ borderLeft: '6px solid #f59e0b' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--warning)' }}>
              <Trash2 size={22} /> Müllabfuhr-Erinnerung
            </h3>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setActiveTab('trash')}>
              Müllkalender <ArrowRight size={12} />
            </button>
          </div>

          {nextTrash ? (
            <div style={{ background: 'color-mix(in srgb, var(--warning) 11%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--warning) 35%, var(--border-color))', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--warning)' }}>
                {nextTrash.title}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 4 }}>
                📅 Abholung am {new Date(nextTrash.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              Keine Müll-Termine vorhanden.
            </div>
          )}
        </div>

        {/* WIDGET 4: Neues an der Pinnwand */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--primary)' }}>
              <Pin size={22} /> Neues an der Pinnwand
            </h3>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setActiveTab('board')}>
              Zur Pinnwand <ArrowRight size={12} />
            </button>
          </div>

          {householdNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              Keine Notizen vorhanden.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {householdNotes.slice(0, 2).map(n => (
                <div key={n.id} style={{ background: n.color || '#fef08a', padding: 14, borderRadius: 'var(--radius-md)', color: '#1e2923' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{n.title}</div>
                  <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', opacity: 0.9 }}>{n.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
