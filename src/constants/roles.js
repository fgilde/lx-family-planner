import i18n from '../i18n/index.js';

export const POSITION_OPTIONS = [
  { value: 'mama', label: 'Mama', role: 'adult', emoji: '🌷' },
  { value: 'papa', label: 'Papa', role: 'adult', emoji: '🧢' },
  { value: 'kind', label: 'Kind', role: 'child', emoji: '🪁' },
  { value: 'teenager', label: 'Teenager', role: 'teen', emoji: '🎧' },
  {
    value: 'tochter_erwachsen',
    label: 'Tochter (erwachsen)',
    role: 'adult',
    emoji: '🌻'
  },
  {
    value: 'sohn_erwachsen',
    label: 'Sohn (erwachsen)',
    role: 'adult',
    emoji: '🌱'
  },
  { value: 'oma', label: 'Oma', role: 'senior', emoji: '🫶' },
  { value: 'opa', label: 'Opa', role: 'senior', emoji: '🌿' },
  {
    value: 'betreute_person',
    label: 'Betreute Person',
    role: 'member',
    emoji: '🤲'
  },
  { value: 'tante', label: 'Tante', role: 'adult', emoji: '✨' },
  { value: 'onkel', label: 'Onkel', role: 'adult', emoji: '🧭' },
  { value: 'patin', label: 'Patin', role: 'adult', emoji: '💛' },
  { value: 'pate', label: 'Pate', role: 'adult', emoji: '🤝' },
  { value: 'haustier', label: 'Haustier', role: 'pet', emoji: '🐾' },
  {
    value: 'familienmitglied',
    label: 'Familienmitglied',
    role: 'member',
    emoji: '🏡'
  }
];

export const ROLE_LABELS = {
  adult: 'Erwachsen',
  child: 'Kind',
  teen: 'Teenager',
  senior: 'Großeltern',
  member: 'Familienmitglied',
  pet: 'Haustier'
};

export const PROFILE_MODULE_OPTIONS = [
  'chat',
  'calendar',
  'trash',
  'shopping',
  'meals',
  'tasks',
  'family-life',
  'board',
  'cloud',
  'mail'
];

export function getPositionOption(position) {
  return (
    POSITION_OPTIONS.find(option => option.value === position) ||
    POSITION_OPTIONS.at(-1)
  );
}

export function getPositionOptionLabel(option) {
  if (!option) return undefined;
  return i18n.t(`profile:positions.${option.value}`, {
    defaultValue: option.label
  });
}

export function getPositionLabel(member) {
  if (!member) {
    return i18n.t('profile:positions.familienmitglied', {
      defaultValue: 'Familienmitglied'
    });
  }
  return (
    getPositionOptionLabel(getPositionOption(member.position)) ||
    (ROLE_LABELS[member.role]
      ? i18n.t(`profile:roleLabels.${member.role}`, {
          defaultValue: ROLE_LABELS[member.role]
        })
      : ROLE_LABELS[member.role])
  );
}

export function roleForPosition(position) {
  return getPositionOption(position)?.role || 'member';
}

export function isChildProfile(member) {
  return member?.role === 'child' && !isManagedProfile(member);
}

export function isPetProfile(member) {
  return member?.role === 'pet';
}

export function isYoungProfile(member) {
  return (
    !isManagedProfile(member) &&
    (member?.role === 'child' || member?.role === 'teen')
  );
}

export function isManagedProfile(member) {
  return Boolean(member?.isManaged);
}

export function canManageFamily(member) {
  return (
    !isManagedProfile(member) &&
    (member?.role === 'adult' || member?.role === 'senior')
  );
}

const FAMILY_VIEWS = new Set([
  'dashboard',
  'chat',
  'calendar',
  'trash',
  'shopping',
  'meals',
  'tasks',
  'family-life',
  'board'
]);
const YOUNG_PROFILE_VIEWS = new Set([
  'dashboard',
  'tasks',
  'family-life',
  'calendar',
  'chat',
  'board'
]);
const PET_PROFILE_VIEWS = new Set(['dashboard', 'calendar']);
const MANAGEMENT_VIEWS = new Set(['cloud', 'mail', 'admin', 'kitchen']);

export function canAccessAppView(member, view, disabledModules = []) {
  const normalizedView = String(view || 'dashboard');
  if (
    !['dashboard', 'admin', 'kitchen'].includes(normalizedView) &&
    disabledModules.includes(normalizedView)
  ) {
    return false;
  }
  if (
    !['dashboard', 'admin', 'kitchen'].includes(normalizedView) &&
    Array.isArray(member?.allowedModules) &&
    !member.allowedModules.includes(normalizedView)
  ) {
    return false;
  }
  if (isPetProfile(member)) {
    return PET_PROFILE_VIEWS.has(normalizedView);
  }
  if (isYoungProfile(member)) {
    return YOUNG_PROFILE_VIEWS.has(normalizedView);
  }
  if (MANAGEMENT_VIEWS.has(normalizedView)) {
    return canManageFamily(member);
  }
  return FAMILY_VIEWS.has(normalizedView);
}
