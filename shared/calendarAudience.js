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
