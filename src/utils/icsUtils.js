// Helper for exporting calendar events to standard iCal .ics format
export function exportEventsToICS(events, familyName = 'LX Familie') {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LX Family Planner//DE',
    `X-WR-CALNAME:${familyName} Kalender`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach(evt => {
    const formattedDate = (evt.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const formattedTime = (evt.time || '09:00').replace(':', '') + '00';
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@lxfamily.de`);
    icsContent.push(`DTSTAMP:${dtStamp}`);
    icsContent.push(`DTSTART:${formattedDate}T${formattedTime}`);
    icsContent.push(`SUMMARY:${evt.title || 'Familientermin'}`);
    if (evt.location) icsContent.push(`LOCATION:${evt.location}`);
    if (evt.notes) icsContent.push(`DESCRIPTION:${evt.notes}`);
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `familien_kalender_${new Date().toISOString().split('T')[0]}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper for parsing imported .ics content
export function parseICSContent(icsString) {
  const events = [];
  const lines = icsString.split(/\r\n|\n|\r/);
  let currentEvent = null;

  lines.forEach(line => {
    line = line.trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {
        id: `ics-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: 'Importiert',
        memberId: 'all'
      };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = line.replace('SUMMARY:', '').trim();
      } else if (line.startsWith('DTSTART:')) {
        const val = line.replace('DTSTART:', '').trim();
        // Parse YYYYMMDD or YYYYMMDDTHHMMSS
        if (val.includes('T')) {
          const [dPart, tPart] = val.split('T');
          if (dPart.length === 8) {
            currentEvent.date = `${dPart.substring(0,4)}-${dPart.substring(4,6)}-${dPart.substring(6,8)}`;
          }
          if (tPart && tPart.length >= 4) {
            currentEvent.time = `${tPart.substring(0,2)}:${tPart.substring(2,4)}`;
          }
        } else if (val.length >= 8) {
          currentEvent.date = `${val.substring(0,4)}-${val.substring(4,6)}-${val.substring(6,8)}`;
          currentEvent.time = '09:00';
        }
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.replace('LOCATION:', '').trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.notes = line.replace('DESCRIPTION:', '').trim();
      }
    }
  });

  return events;
}
