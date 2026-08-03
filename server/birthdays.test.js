import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BIRTHDAY_REMINDERS,
  birthdayDateForYear,
  birthdayEventsForMembers,
  nextBirthdayOccurrencesOnly,
  nextBirthdayEvent,
  normalizeBirthDate
} from '../shared/birthdays.js';

test('birth dates are validated and leap birthdays stay predictable', () => {
  assert.equal(normalizeBirthDate('2012-02-29'), '2012-02-29');
  assert.equal(normalizeBirthDate('2011-02-29'), '');
  assert.equal(normalizeBirthDate('not-a-date'), '');
  assert.equal(birthdayDateForYear('2012-02-29', 2027), '2027-02-28');
  assert.equal(birthdayDateForYear('2012-02-29', 2028), '2028-02-29');
});

test('family birthdays become read-only calendar events with reminders', () => {
  const events = birthdayEventsForMembers([
    { id: 'member-1', name: 'Lina', birthDate: '2015-08-12', color: '#123456' },
    { id: 'pet-1', name: 'Bello', birthDate: '2020-01-01', role: 'pet' }
  ], { startYear: 2026, years: 2 });
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].reminders, BIRTHDAY_REMINDERS);
  assert.equal(events[0].readOnly, true);
  assert.equal(events[0].birthdayAge, 11);
  assert.match(events[0].title, /Lina/);
});

test('the next birthday crosses into the following year', () => {
  const next = nextBirthdayEvent(
    { id: 'member-1', name: 'Lina', birthDate: '2015-01-03' },
    new Date('2026-12-20T12:00:00')
  );
  assert.equal(next.date, '2027-01-03');
  assert.equal(next.birthdayAge, 12);
});

test('dashboard previews keep only the next birthday per person', () => {
  const birthdays = birthdayEventsForMembers([
    { id: 'member-1', name: 'Lina', birthDate: '2015-08-05' },
    { id: 'member-2', name: 'Tom', birthDate: '1988-07-01' }
  ], { startYear: 2026, years: 2 });
  const regularEvent = { id: 'event-1', title: 'Ausflug', date: '2026-08-03' };
  const visible = nextBirthdayOccurrencesOnly(
    [regularEvent, ...birthdays],
    '2026-08-03'
  );

  assert.equal(visible.includes(regularEvent), true);
  assert.deepEqual(
    visible.filter(event => event.birthdayMemberId).map(event => event.id),
    ['birthday-member-1-2026', 'birthday-member-2-2027']
  );
});

test('an agenda does not show this and next years birthday at once', () => {
  const birthdays = birthdayEventsForMembers([
    { id: 'member-mama', name: 'Mama Test', birthDate: '1990-08-05' }
  ], { startYear: 2026, years: 2 });

  const visible = nextBirthdayOccurrencesOnly(birthdays, '2026-08-04');
  const visibleWithHistory = nextBirthdayOccurrencesOnly(
    birthdays,
    '2026-08-04',
    { includePast: true }
  );

  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'birthday-member-mama-2026');
  assert.equal(visible[0].birthdayAge, 36);
  assert.deepEqual(visibleWithHistory, visible);
});

test('birthday history can be shown without duplicating future years', () => {
  const birthdays = birthdayEventsForMembers([
    { id: 'member-mama', name: 'Mama Test', birthDate: '1990-08-05' }
  ], { startYear: 2025, years: 3 });

  const visible = nextBirthdayOccurrencesOnly(
    birthdays,
    '2026-08-04',
    { includePast: true }
  );

  assert.deepEqual(
    visible.map(event => event.id),
    ['birthday-member-mama-2025', 'birthday-member-mama-2026']
  );
});
