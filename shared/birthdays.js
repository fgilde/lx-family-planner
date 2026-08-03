export const BIRTHDAY_REMINDERS = Object.freeze([10_080, 0]);

export function normalizeBirthDate(value) {
  const candidate = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(candidate);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > new Date().getFullYear()) return '';
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return '';
  }
  return candidate;
}

export function birthdayDateForYear(birthDate, year) {
  const normalized = normalizeBirthDate(birthDate);
  if (!normalized || !Number.isInteger(Number(year))) return '';
  const [, month, day] = normalized.split('-').map(Number);
  const targetYear = Number(year);
  const isLeapYear =
    targetYear % 4 === 0 &&
    (targetYear % 100 !== 0 || targetYear % 400 === 0);
  const targetDay = month === 2 && day === 29 && !isLeapYear ? 28 : day;
  return [
    String(targetYear).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(targetDay).padStart(2, '0')
  ].join('-');
}

export function birthdayEventsForMembers(
  members,
  { startYear = new Date().getFullYear(), years = 2 } = {}
) {
  const events = [];
  for (const member of Array.isArray(members) ? members : []) {
    const birthDate = normalizeBirthDate(member?.birthDate);
    if (!birthDate || member?.role === 'pet') continue;
    const birthYear = Number(birthDate.slice(0, 4));
    for (let offset = 0; offset < Math.max(1, Number(years) || 1); offset += 1) {
      const year = Number(startYear) + offset;
      const date = birthdayDateForYear(birthDate, year);
      events.push({
        id: `birthday-${member.id}-${year}`,
        title: `🎂 ${member.name} hat Geburtstag`,
        date,
        time: '',
        allDay: true,
        endDate: '',
        memberId: 'all',
        memberIds: [],
        location: 'Familie',
        notes: `${member.name} wird ${Math.max(0, year - birthYear)} Jahre alt.`,
        reminders: [...BIRTHDAY_REMINDERS],
        household: 'familie',
        color: member.color || '#d87058',
        birthdayMemberId: member.id,
        birthdayMemberName: member.name,
        birthdayAge: Math.max(0, year - birthYear),
        isBirthday: true,
        readOnly: true,
        sourceName: 'Familiengeburtstag'
      });
    }
  }
  return events.sort((left, right) => left.date.localeCompare(right.date));
}

export function birthdayEventCopy(event, t) {
  if (!event?.birthdayMemberId || typeof t !== 'function') {
    return {
      title: event?.title || '',
      location: event?.location || '',
      notes: event?.notes || '',
      sourceName: event?.sourceName || ''
    };
  }
  const name = String(event.birthdayMemberName || '').trim() ||
    String(event.title || '')
      .replace(/^🎂\s*/, '')
      .replace(/\s+hat Geburtstag$/, '')
      .trim();
  return {
    title: t('common:birthdays.eventTitle', { name }),
    location: t('common:birthdays.location'),
    notes: t('common:birthdays.ageNote', {
      name,
      count: Number(event.birthdayAge || 0)
    }),
    sourceName: t('common:birthdays.sourceName')
  };
}

export function nextBirthdayEvent(member, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) return null;
  const today = [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0')
  ].join('-');
  return birthdayEventsForMembers([member], {
    startYear: current.getFullYear(),
    years: 2
  }).find(event => event.date >= today) || null;
}

function localDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export function nextBirthdayOccurrencesOnly(
  events,
  today = new Date(),
  { includePast = false } = {}
) {
  const todayKey = localDateKey(today);
  if (!todayKey) return Array.isArray(events) ? events : [];
  const nearest = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    if (!event?.birthdayMemberId || !event.date || event.date < todayKey) {
      continue;
    }
    const previous = nearest.get(event.birthdayMemberId);
    if (!previous || event.date < previous.date) {
      nearest.set(event.birthdayMemberId, event);
    }
  }
  return (Array.isArray(events) ? events : []).filter(event => {
    if (!event?.birthdayMemberId) return true;
    if (includePast && event.date < todayKey) return true;
    return nearest.get(event.birthdayMemberId) === event;
  });
}
