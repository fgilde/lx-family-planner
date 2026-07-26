import React from 'react';
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  PawPrint,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { DEFAULT_FAMILY_AVATAR, handleImgError } from '../../utils/imageFallback';

function upcomingDateValue(event) {
  if (!event?.date) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(`${event.date}T${event.time || '00:00'}`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function formatAppointment(event) {
  if (!event?.date) return 'Termin ohne Datum';
  const date = new Date(`${event.date}T${event.time || '00:00'}`);
  const day = date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
  return event.time ? `${day} · ${event.time} Uhr` : day;
}

function careIcon(title = '') {
  if (/tierarzt|arzt|impf|medizin|tablette|kontrolle/i.test(title)) {
    return <Stethoscope size={18} />;
  }
  if (/futter|fütter|napf|wasser|trinken/i.test(title)) {
    return <HeartPulse size={18} />;
  }
  return <PawPrint size={18} />;
}

export default function PetDashboard() {
  const {
    activeMember,
    events,
    tasks,
    notes,
    setActiveTab
  } = useFamily();
  const firstName = activeMember?.name?.split(' ')[0] || 'Fellnase';
  const today = new Date().toISOString().slice(0, 10);
  const careTasks = tasks.filter(
    task => task.memberId === activeMember?.id && !task.completed
  );
  const appointments = events
    .filter(
      event =>
        event.memberId === activeMember?.id ||
        event.memberId === 'all'
    )
    .filter(event => !event.date || event.date >= today)
    .sort((left, right) => upcomingDateValue(left) - upcomingDateValue(right));
  const petNotes = notes
    .filter(note => note.memberId === activeMember?.id)
    .slice(0, 2);
  const nextAppointment = appointments[0];

  return (
    <div className="pet-dashboard">
      <section
        className="pet-hero"
        style={{ '--pet-color': activeMember?.color || '#3f7b62' }}
      >
        <div className="pet-hero-trail" aria-hidden="true">
          <PawPrint />
          <PawPrint />
          <PawPrint />
        </div>
        <div className="pet-hero-avatar">
          <img
            src={activeMember?.avatar || DEFAULT_FAMILY_AVATAR}
            onError={handleImgError}
            alt={activeMember?.name || 'Haustier'}
          />
          <span><PawPrint size={20} /></span>
        </div>
        <div className="pet-hero-copy">
          <span className="pet-kicker">Pfotenprofil · Familienliebling</span>
          <h1>Alles für {firstName} im Blick</h1>
          <p>
            Termine, Pflege und Versorgung an einem ruhigen Ort – ohne Chat,
            Sterne oder unnötige Menüs.
          </p>
        </div>
        <div className="pet-hero-status">
          <span><HeartPulse size={18} /> Umsorgt</span>
          <strong>{careTasks.length}</strong>
          <small>offene Pflegepunkte</small>
        </div>
      </section>

      <section className="pet-overview-strip" aria-label="Pfotenüberblick">
        <article>
          <span><CalendarDays size={20} /></span>
          <div>
            <small>Nächster Termin</small>
            <strong>{nextAppointment?.title || 'Nichts geplant'}</strong>
            <p>
              {nextAppointment
                ? formatAppointment(nextAppointment)
                : 'Der Kalender ist frei.'}
            </p>
          </div>
        </article>
        <article>
          <span><ClipboardCheck size={20} /></span>
          <div>
            <small>Versorgung</small>
            <strong>
              {careTasks.length
                ? `${careTasks.length} ${
                    careTasks.length === 1 ? 'Punkt' : 'Punkte'
                  } offen`
                : 'Alles erledigt'}
            </strong>
            <p>Wird von den Erwachsenen gepflegt.</p>
          </div>
        </article>
        <article>
          <span><ShieldCheck size={20} /></span>
          <div>
            <small>Haustiermodus</small>
            <strong>Ruhig &amp; geschützt</strong>
            <p>Kein Chat und keine Kontofunktionen.</p>
          </div>
        </article>
      </section>

      <div className="pet-dashboard-grid">
        <section className="pet-panel pet-care-panel">
          <header>
            <div>
              <span className="pet-section-label">Versorgungsplan</span>
              <h2><ClipboardCheck size={22} /> Was für {firstName} ansteht</h2>
            </div>
            <span className="pet-readonly-badge">Familie kümmert sich</span>
          </header>
          <div className="pet-care-list">
            {careTasks.length ? (
              careTasks.slice(0, 6).map(task => (
                <article key={task.id}>
                  <span className="pet-care-icon">{careIcon(task.title)}</span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.category || 'Pflege & Versorgung'}</small>
                  </div>
                  <span className="pet-care-open">
                    <Clock3 size={14} /> offen
                  </span>
                </article>
              ))
            ) : (
              <div className="pet-empty-state">
                <span>🐾</span>
                <strong>Alles bestens versorgt</strong>
                <p>Für {firstName} sind gerade keine Pflegepunkte offen.</p>
              </div>
            )}
          </div>
        </section>

        <section className="pet-panel pet-appointments-panel">
          <header>
            <div>
              <span className="pet-section-label">Termine & Gesundheit</span>
              <h2><Stethoscope size={22} /> Pfotenkalender</h2>
            </div>
            <button type="button" onClick={() => setActiveTab('calendar')}>
              Kalender <ChevronRight size={16} />
            </button>
          </header>
          <div className="pet-appointment-list">
            {appointments.length ? (
              appointments.slice(0, 4).map(event => (
                <article key={event.id}>
                  <time dateTime={`${event.date || ''}T${event.time || ''}`}>
                    <span>
                      {event.date
                        ? new Date(`${event.date}T00:00:00`).toLocaleDateString(
                            'de-DE',
                            { day: '2-digit' }
                          )
                        : '–'}
                    </span>
                    <small>
                      {event.date
                        ? new Date(`${event.date}T00:00:00`).toLocaleDateString(
                            'de-DE',
                            { month: 'short' }
                          )
                        : 'offen'}
                    </small>
                  </time>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{formatAppointment(event)}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="pet-empty-state compact">
                <span>🩺</span>
                <strong>Keine Termine geplant</strong>
                <p>Im Pfotenkalender ist gerade alles frei.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {petNotes.length > 0 && (
        <section className="pet-notes">
          <span className="pet-section-label">Wichtige Hinweise</span>
          <div>
            {petNotes.map(note => (
              <article key={note.id}>
                <strong>{note.title || 'Notiz'}</strong>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
