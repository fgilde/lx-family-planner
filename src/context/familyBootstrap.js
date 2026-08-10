/**
 * Maps one server bootstrap response onto the individual context state slices.
 * Keeping this mapping separate makes the upcoming resource-domain providers
 * able to reuse the same wire format without coupling to FamilyContext.
 */
export function applyFamilyBootstrap(data, setters) {
  setters.setFamilyAccount(data.family || null);
  setters.setMembers(data.members || []);
  setters.setResources(setters.resourceWithDefaults(data.resources));
  setters.setCalendarSubscriptions(
    Array.isArray(data.calendarSubscriptions) ? data.calendarSubscriptions : []
  );
  setters.setFamilyRelationships(data.familyRelationships || []);
  setters.setFamilyLetters(
    Array.isArray(data.familyLetters) ? data.familyLetters : []
  );
  setters.setFamilyChatGuests(
    Array.isArray(data.familyChatGuests) ? data.familyChatGuests : []
  );
  setters.setNotifications(
    Array.isArray(data.notifications) ? data.notifications : []
  );
  setters.setUnreadNotificationCount(Number(data.unreadNotificationCount || 0));
  setters.setIntegrations(data.integrations || setters.emptyIntegrations);
  setters.setReadOnlyDemo(Boolean(data.readOnlyDemo));
  setters.setAppVersion(data.appVersion || setters.appVersion);
  setters.setReleaseNotes(data.releaseNotes || null);
  if (data.nativePushServer) {
    setters.setNativePush(previous => ({
      ...previous,
      serverConfigured: Boolean(data.nativePushServer.configured),
      serverReason: data.nativePushServer.reason || '',
      statusError: ''
    }));
  }
  setters.setActiveMemberId(data.activeMemberId || '');
  setters.versionRef.current = Number(data.version || 0);
}
