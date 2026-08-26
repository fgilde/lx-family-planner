import test from 'node:test';
import assert from 'node:assert/strict';
import { exportEventsToICSContent } from '../src/utils/icsUtils.js';

test('ICS export preserves timed event end date and end time', () => {
  const content = exportEventsToICSContent([{
    id: 'dentist',
    title: 'Zahnarzt',
    date: '2026-09-02',
    time: '09:15',
    endDate: '2026-09-03',
    endTime: '10:45'
  }], 'Testfamilie');

  assert.match(content, /DTSTART:20260902T091500/);
  assert.match(content, /DTEND:20260903T104500/);
});

test('ICS export keeps all-day end dates exclusive', () => {
  const content = exportEventsToICSContent([{
    id: 'holiday',
    title: 'Urlaub',
    date: '2026-09-02',
    allDay: true,
    endDate: '2026-09-06'
  }], 'Testfamilie');

  assert.match(content, /DTSTART;VALUE=DATE:20260902/);
  assert.match(content, /DTEND;VALUE=DATE:20260906/);
});
