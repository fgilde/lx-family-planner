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
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { DEFAULT_FAMILY_AVATAR, handleImgError } from '../../utils/imageFallback';
import { formatDate } from '../../utils/formatting';

function upcomingDateValue(event) {
  if (!event?.date) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(`${event.date}T${event.time || '00:00'}`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function formatAppointment(event, t) {
  if (!event?.date) return t('pet.noDateAppointment');
  const day = formatDate(`${event.date}T${event.time || '00:00'}`, {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
  return event.time
    ? t('pet.appointmentWithTime', { day, time: event.time })
    : day;
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
  const { t } = useTranslation('widgets');
  const firstName =
    activeMember?.name?.split(' ')[0] || t('pet.petFallbackName');
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
            alt={activeMember?.name || t('pet.petAlt')}
          />
          <span><PawPrint size={20} /></span>
        </div>
        <div className="pet-hero-copy">
          <span className="pet-kicker">{t('pet.kicker')}</span>
          <h1>{t('pet.heroTitle', { name: firstName })}</h1>
          <p>{t('pet.heroText')}</p>
        </div>
        <div className="pet-hero-status">
          <span><HeartPulse size={18} /> {t('pet.caredFor')}</span>
          <strong>{careTasks.length}</strong>
          <small>{t('pet.openCareItems')}</small>
        </div>
      </section>

      <section className="pet-overview-strip" aria-label={t('pet.overviewAria')}>
        <article>
          <span><CalendarDays size={20} /></span>
          <div>
            <small>{t('pet.nextAppointment')}</small>
            <strong>{nextAppointment?.title || t('pet.nothingPlanned')}</strong>
            <p>
              {nextAppointment
                ? formatAppointment(nextAppointment, t)
                : t('pet.calendarFree')}
            </p>
          </div>
        </article>
        <article>
          <span><ClipboardCheck size={20} /></span>
          <div>
            <small>{t('pet.care')}</small>
            <strong>
              {careTasks.length
                ? t('pet.careOpen', { count: careTasks.length })
                : t('pet.allDone')}
            </strong>
            <p>{t('pet.managedByAdults')}</p>
          </div>
        </article>
        <article>
          <span><ShieldCheck size={20} /></span>
          <div>
            <small>{t('pet.petMode')}</small>
            <strong>{t('pet.calmProtected')}</strong>
            <p>{t('pet.noChatNoAccount')}</p>
          </div>
        </article>
      </section>

      <div className="pet-dashboard-grid">
        <section className="pet-panel pet-care-panel">
          <header>
            <div>
              <span className="pet-section-label">{t('pet.carePlan')}</span>
              <h2>
                <ClipboardCheck size={22} />{' '}
                {t('pet.whatsUpFor', { name: firstName })}
              </h2>
            </div>
            <span className="pet-readonly-badge">{t('pet.familyTakesCare')}</span>
          </header>
          <div className="pet-care-list">
            {careTasks.length ? (
              careTasks.slice(0, 6).map(task => (
                <article key={task.id}>
                  <span className="pet-care-icon">{careIcon(task.title)}</span>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      {task.category || t('pet.careCategoryFallback')}
                    </small>
                  </div>
                  <span className="pet-care-open">
                    <Clock3 size={14} /> {t('pet.openLabel')}
                  </span>
                </article>
              ))
            ) : (
              <div className="pet-empty-state">
                <span>🐾</span>
                <strong>{t('pet.allCaredFor')}</strong>
                <p>{t('pet.noCareItems', { name: firstName })}</p>
              </div>
            )}
          </div>
        </section>

        <section className="pet-panel pet-appointments-panel">
          <header>
            <div>
              <span className="pet-section-label">
                {t('pet.appointmentsHealth')}
              </span>
              <h2><Stethoscope size={22} /> {t('pet.pawCalendar')}</h2>
            </div>
            <button type="button" onClick={() => setActiveTab('calendar')}>
              {t('pet.calendar')} <ChevronRight size={16} />
            </button>
          </header>
          <div className="pet-appointment-list">
            {appointments.length ? (
              appointments.slice(0, 4).map(event => (
                <article key={event.id}>
                  <time dateTime={`${event.date || ''}T${event.time || ''}`}>
                    <span>
                      {event.date
                        ? formatDate(`${event.date}T00:00:00`, {
                            day: '2-digit'
                          })
                        : '–'}
                    </span>
                    <small>
                      {event.date
                        ? formatDate(`${event.date}T00:00:00`, {
                            month: 'short'
                          })
                        : t('pet.noDateShort')}
                    </small>
                  </time>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{formatAppointment(event, t)}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="pet-empty-state compact">
                <span>🩺</span>
                <strong>{t('pet.noAppointments')}</strong>
                <p>{t('pet.pawCalendarFree')}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {petNotes.length > 0 && (
        <section className="pet-notes">
          <span className="pet-section-label">{t('pet.importantNotes')}</span>
          <div>
            {petNotes.map(note => (
              <article key={note.id}>
                <strong>{note.title || t('pet.noteFallback')}</strong>
                <p>{note.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
