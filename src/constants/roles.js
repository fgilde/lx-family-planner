import i18n from '../i18n/index.js';

export const POSITION_OPTIONS = [
  { value: 'mama', label: 'Mama', role: 'adult', emoji: '🌷' },
  { value: 'papa', label: 'Papa', role: 'adult', emoji: '🧢' },
  { value: 'kind', label: 'Kind', role: 'child', emoji: '🪁' },
  { value: 'teenager', label: 'Teenager', role: 'teen', emoji: '🎧' },
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
