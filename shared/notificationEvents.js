export const NOTIFICATION_EVENT_DEFINITIONS = Object.freeze([
  {
    key: 'groupChat',
    group: 'messages',
    title: 'Familienchat',
    description: 'Neue Nachrichten in der Familiengruppe',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'directMessages',
    group: 'messages',
    title: 'Direktnachrichten',
    description: 'Private Nachrichten für das passende Profil',
    webDefault: true,
    gotifyDefault: false
  },
  {
    key: 'familyMail',
    group: 'messages',
    title: 'Familienbriefkasten',
    description: 'Neue Briefe von verbundenen Familien',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'familyChatInvites',
    group: 'messages',
    title: 'Chat-Einladungen',
    description: 'Einladungen in den Chat einer verbundenen Familie',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'events',
    group: 'calendar',
    title: 'Kalender & Erinnerungen',
    description: 'Neue, geänderte, abgesagte und bald beginnende Termine',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'taskAssigned',
    group: 'tasks',
    title: 'Neue Aufgaben',
    description: 'Neue Missionen und Pflichten',
    webDefault: true,
    gotifyDefault: false
  },
  {
    key: 'taskApproval',
    group: 'tasks',
    title: 'Aufgaben prüfen',
    description: 'Erledigt-Meldungen und abgelehnte Prüfungen',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'taskCompleted',
    group: 'tasks',
    title: 'Geschaffte Aufgaben',
    description: 'Bestätigte Aufgaben, Sterne und Erfolge',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'moodUpdates',
    group: 'care',
    title: 'Gefühlslage der Kinder',
    description: 'Neue Einträge im Familienkompass',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'moodHelp',
    group: 'care',
    title: 'Brauche Nähe',
    description: 'Dringender Hinweis – auch während erlaubter Ruhezeiten',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'problemReports',
    group: 'admin',
    title: 'Problemmeldungen',
    description: 'Neue Meldungen und Rückmeldung zur Lösung',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'encouragements',
    group: 'family',
    title: 'Mutmacher',
    description: 'Liebe Nachrichten der Familie',
    webDefault: true,
    gotifyDefault: false
  },
  {
    key: 'familyPolls',
    group: 'family',
    title: 'Abstimmungen',
    description: 'Neue Familienentscheidungen',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'familyMissions',
    group: 'family',
    title: 'Familienmissionen',
    description: 'Neue gemeinsame Missionen',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'schoolItems',
    group: 'family',
    title: 'Schule',
    description: 'Hausaufgaben, Schultasche und Klassenarbeiten',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'rewards',
    group: 'money',
    title: 'Belohnungen',
    description: 'Neue und eingelöste Belohnungen',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'pocketMoney',
    group: 'money',
    title: 'Taschengeld',
    description: 'Neue Einzahlungen, Abzüge und Umwandlungen',
    webDefault: true,
    gotifyDefault: true
  },
  {
    key: 'familyConnections',
    group: 'admin',
    title: 'Familiennetz',
    description: 'Anfragen, Freigaben und Änderungen verbundener Familien',
    webDefault: true,
    gotifyDefault: true
  }
]);

export const DEFAULT_WEB_PUSH_PREFERENCES = Object.freeze({
  ...Object.fromEntries(
    NOTIFICATION_EVENT_DEFINITIONS.map(definition => [
      definition.key,
      definition.webDefault
    ])
  ),
  showPreviews: false
});

export const DEFAULT_GOTIFY_RULES = Object.freeze({
  ...Object.fromEntries(
    NOTIFICATION_EVENT_DEFINITIONS.map(definition => [
      definition.key,
      definition.gotifyDefault
    ])
  ),
  includeMessageText: false
});

export function notificationDefinition(eventKey) {
  return NOTIFICATION_EVENT_DEFINITIONS.find(
    definition => definition.key === eventKey
  ) || null;
}
