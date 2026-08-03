export const ADULT_THEMES = Object.freeze([
  { id: 'linen', plain: true, color: '#455b50', accent: '#a67858' },
  { id: 'clear', plain: true, color: '#345f78', accent: '#8b735d' },
  { id: 'graphite', plain: true, color: '#d7dbde', accent: '#aa9675' },
  { id: 'light', icon: '❧', color: '#286a58', accent: '#d87058' },
  { id: 'ocean', icon: '≈', color: '#17687a', accent: '#d99157' },
  { id: 'midnight', icon: '☾', color: '#164f49', accent: '#e0a65b' },
  { id: 'rock', icon: '⚡', color: '#70251f', accent: '#efb84d' },
  { id: 'festival', icon: '✦', color: '#a22d78', accent: '#25aab4' }
]);

export const CUSTOM_THEME_ID = 'custom';

export const CHILD_THEMES = Object.freeze([
  { id: 'space', icon: '🚀', color: '#4747a9', accent: '#ffbd4a' },
  { id: 'unicorn', icon: '🦄', color: '#d84692', accent: '#8063d9' },
  { id: 'fairy', icon: '🧚', color: '#728a35', accent: '#b84f91' },
  { id: 'dino', icon: '🦖', color: '#287755', accent: '#d66d31' },
  { id: 'sunshine', icon: '☀️', color: '#ed8d26', accent: '#e74757' },
  { id: 'adventure', icon: '🦸', color: '#3169c8', accent: '#e7474f' }
]);

export const PET_THEMES = Object.freeze([
  { id: 'light', icon: '🐾', color: '#286a58', accent: '#d87058' },
  { id: 'ocean', icon: '🌊', color: '#17687a', accent: '#d99157' },
  { id: 'rock', icon: '🦴', color: '#70251f', accent: '#efb84d' },
  { id: 'midnight', icon: '🌙', color: '#164f49', accent: '#e0a65b' }
]);

export const PLAIN_THEME_IDS = new Set(
  [
    ...ADULT_THEMES.filter(theme => theme.plain).map(theme => theme.id),
    CUSTOM_THEME_ID
  ]
);

export function isPlainTheme(themeId) {
  return PLAIN_THEME_IDS.has(themeId);
}
