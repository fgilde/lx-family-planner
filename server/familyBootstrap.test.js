import assert from 'node:assert/strict';
import test from 'node:test';
import { applyFamilyBootstrap } from '../src/context/familyBootstrap.js';

test('bootstrap mapping keeps family state complete after context modularization', () => {
  const values = {};
  const versionRef = { current: 0 };
  const setters = {
    emptyIntegrations: { homeAssistant: {} },
    setActiveMemberId: value => { values.activeMemberId = value; },
    setAppVersion: value => { values.appVersion = value; },
    setCalendarSubscriptions: value => { values.calendarSubscriptions = value; },
    setFamilyAccount: value => { values.family = value; },
    setFamilyChatGuests: value => { values.chatGuests = value; },
    setFamilyLetters: value => { values.letters = value; },
    setFamilyRelationships: value => { values.relationships = value; },
    setIntegrations: value => { values.integrations = value; },
    setMembers: value => { values.members = value; },
    setNativePush: update => {
      values.nativePush = update({ existing: true });
    },
    setNotifications: value => { values.notifications = value; },
    setReadOnlyDemo: value => { values.readOnlyDemo = value; },
    setReleaseNotes: value => { values.releaseNotes = value; },
    setResources: value => { values.resources = value; },
    setUnreadNotificationCount: value => { values.unread = value; },
    resourceWithDefaults: value => value,
    versionRef
  };

  applyFamilyBootstrap({
    activeMemberId: 'member-1',
    appVersion: '1.19.0-test',
    calendarSubscriptions: [{ id: 'calendar-1' }],
    family: { id: 'family-1' },
    familyChatGuests: [{ id: 'guest-1' }],
    familyLetters: [{ id: 'letter-1' }],
    familyRelationships: [{ id: 'relationship-1' }],
    integrations: { nextcloud: { connected: true } },
    members: [{ id: 'member-1' }],
    nativePushServer: { configured: true, reason: '' },
    notifications: [{ id: 'notification-1' }],
    readOnlyDemo: true,
    releaseNotes: { version: '1.19.0-test' },
    resources: { tasks: [{ id: 'task-1' }] },
    unreadNotificationCount: 3,
    version: 7
  }, setters);

  assert.equal(values.activeMemberId, 'member-1');
  assert.equal(values.appVersion, '1.19.0-test');
  assert.deepEqual(values.calendarSubscriptions, [{ id: 'calendar-1' }]);
  assert.deepEqual(values.family, { id: 'family-1' });
  assert.deepEqual(values.members, [{ id: 'member-1' }]);
  assert.deepEqual(values.resources.tasks, [{ id: 'task-1' }]);
  assert.equal(values.nativePush.serverConfigured, true);
  assert.equal(values.unread, 3);
  assert.equal(versionRef.current, 7);
});
