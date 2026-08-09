import {
  CUSTOM_THEME_PROPERTIES,
  parseCustomThemeCss
} from '../../shared/customThemeCss.js';
import { CUSTOM_THEME_ID, isPlainTheme } from '../constants/themes';

export function applyCustomThemeCss(css) {
  const result = parseCustomThemeCss(css);
  if (!result.valid) return result;
  for (const property of CUSTOM_THEME_PROPERTIES) {
    document.documentElement.style.removeProperty(property);
  }
  for (const [property, value] of Object.entries(result.variables)) {
    document.documentElement.style.setProperty(property, value);
  }
  return result;
}

export function applyThemePresentation(themeId, customThemeCss = '') {
  const nextTheme = themeId || 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  document.documentElement.setAttribute(
    'data-theme-style',
    isPlainTheme(nextTheme) ? 'plain' : 'illustrated'
  );
  return applyCustomThemeCss(
    nextTheme === CUSTOM_THEME_ID ? customThemeCss : ''
  );
}
