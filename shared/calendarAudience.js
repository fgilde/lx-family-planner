export function eventAudienceIds(event) {
  const memberIds = Array.isArray(event?.memberIds)
    ? event.memberIds
        .map(value => String(value || '').trim())
        .filter(value => value && value !== 'all')
    : [];
  if (memberIds.length) return [...new Set(memberIds)];

  const legacyMemberId = String(event?.memberId || '').trim();
  return legacyMemberId && legacyMemberId !== 'all'
    ? [legacyMemberId]
    : [];
}

export function eventIsForEveryone(event) {
  return eventAudienceIds(event).length === 0;
}

export function eventIsForMember(event, memberId) {
  const audience = eventAudienceIds(event);
  return audience.length === 0 || audience.includes(String(memberId || ''));
}

export function eventAudienceMembers(event, members = []) {
  const ids = new Set(eventAudienceIds(event));
  return ids.size
    ? members.filter(member => ids.has(member.id))
    : [];
}

export function eventIsCurrentOrFuture(event, todayDate) {
  const today = String(todayDate || '').slice(0, 10);
  const eventDate = String(event?.date || '').slice(0, 10);
  const eventEndDate = String(event?.endDate || '').slice(0, 10);
  if (!today || !eventDate) return false;

  // Mehrtägige Termine bleiben bis einschließlich ihres letzten Tages sichtbar.
  const lastVisibleDate = eventEndDate >= eventDate ? eventEndDate : eventDate;
  return lastVisibleDate >= today;
}

/**
 * Letzter sichtbarer Tag eines Termins. Bei ganztägigen Terminen endet die
 * Anzeige am Vortag des endDate (exklusives Kalenderformat), sonst am endDate.
 */
export function eventLastDate(event) {
  const eventDate = String(event?.date || '').slice(0, 10);
  if (!event?.endDate) return eventDate;
  const rawEnd = String(event.endDate).slice(0, 10);
  const endDate = event.allDay
    ? previousDateKey(rawEnd)
    : rawEnd;
  return endDate < eventDate ? eventDate : endDate;
}

/**
 * Wahr, wenn ein Termin an `todayDate` stattfindet – also heute startet, heute
 * endet oder todayDate in einen mehrtägigen Zeitraum fällt.
 */
export function eventSpansToday(event, todayDate) {
  const today = String(todayDate || '').slice(0, 10);
  const eventDate = String(event?.date || '').slice(0, 10);
  if (!today || !eventDate) return false;
  const last = eventLastDate(event);
  return eventDate <= today && last >= today;
}

function previousDateKey(value) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
