import { parseICalendar } from '../../shared/icsCalendar.js';
import i18n from '../i18n';

function escapeIcsText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function dateStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function exportEventsToICS(
  events,
  familyName = i18n.t('context:ics.defaultFamilyName')
) {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LX Family//Private Family OS//DE',
    `X-WR-CALNAME:${escapeIcsText(
      i18n.t('context:ics.calendarName', { familyName })
    )}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events
    .filter(event => !event.readOnly)
    .forEach(event => {
      const formattedDate = (
        event.date || new Date().toISOString().split('T')[0]
      ).replace(/-/g, '');
      const formattedTime = (event.time || '09:00').replace(':', '') + '00';
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(
        `UID:${escapeIcsText(event.id || `event-${formattedDate}`)}@lxfamily.local`
      );
      icsContent.push(`DTSTAMP:${dateStamp()}`);
      if (event.allDay || !event.time) {
        icsContent.push(`DTSTART;VALUE=DATE:${formattedDate}`);
      } else {
        icsContent.push(`DTSTART:${formattedDate}T${formattedTime}`);
      }
      icsContent.push(
        `SUMMARY:${escapeIcsText(
          event.title || i18n.t('context:ics.defaultEventTitle')
        )}`
      );
      if (event.location) {
        icsContent.push(`LOCATION:${escapeIcsText(event.location)}`);
      }
      if (event.notes) {
        icsContent.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);
      }
      icsContent.push('END:VEVENT');
    });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob(
    [icsContent.join('\r\n')],
    { type: 'text/calendar;charset=utf-8;' }
  );
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.setAttribute(
    'download',
    i18n.t('context:ics.exportFileName', {
      date: new Date().toISOString().split('T')[0]
    })
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

export function parseICSContent(icsString) {
  return parseICalendar(icsString, { maxEvents: 1000 }).map(
    (event, index) => ({
      ...event,
      id: `ics-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      category: 'Importiert',
      memberId: 'all'
    })
  );
}
