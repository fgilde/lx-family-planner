export const CUSTOM_THEME_MAX_LENGTH = 4000;

export const CUSTOM_THEME_PROPERTIES = Object.freeze([
  '--primary',
  '--primary-hover',
  '--primary-light',
  '--accent',
  '--accent-light',
  '--bg-main',
  '--bg-card',
  '--bg-subtle',
  '--bg-elevated',
  '--field-bg',
  '--header-bg',
  '--text-main',
  '--text-muted',
  '--border-color',
  '--on-primary',
  '--success',
  '--warning',
  '--danger',
  '--info',
  '--hero-start',
  '--hero-mid',
  '--hero-end',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl'
]);

const COLOR_PROPERTIES = new Set(
  CUSTOM_THEME_PROPERTIES.filter(property => !property.startsWith('--radius-'))
);
const RADIUS_PROPERTIES = new Set(
  CUSTOM_THEME_PROPERTIES.filter(property => property.startsWith('--radius-'))
);
const SIMPLE_COLORS = new Set([
  'black',
  'white',
  'transparent',
  'currentcolor'
]);

export const CUSTOM_THEME_EXAMPLE = `--primary: #365f55;
--accent: #b56f52;
--bg-main: #f3f0e8;
--bg-card: #fffdf8;
--text-main: #202b27;
--border-color: #d8d3c8;
--radius-lg: 18px;`;

function validColor(value) {
  const candidate = value.trim().toLowerCase();
  if (SIMPLE_COLORS.has(candidate)) return true;
  if (/^#[0-9a-f]{3,4}([0-9a-f]{3,4})?$/i.test(candidate)) return true;
  return /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9a-z.%+\-/,\s]+\)$/i
    .test(candidate) &&
    !/(url|var|env|attr|image|expression|javascript|data:|@|!)/i
      .test(candidate);
}

function validRadius(value) {
  const candidate = value.trim().toLowerCase();
  if (candidate === '0') return true;
  const match = candidate.match(/^(\d+(?:\.\d+)?)px$/);
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 48);
}

function normalizeSource(value) {
  const source = String(value || '').trim();
  if (!source) return { source: '', errors: [] };
  if (source.length > CUSTOM_THEME_MAX_LENGTH) {
    return { source: '', errors: [{ code: 'tooLong' }] };
  }
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (withoutComments.includes('/*') || withoutComments.includes('*/')) {
    return { source: '', errors: [{ code: 'invalidComment' }] };
  }
  if (!/[{}]/.test(withoutComments)) {
    return { source: withoutComments, errors: [] };
  }
  const rootBlock = withoutComments.match(/^:root\s*\{([\s\S]*)\}$/i);
  if (!rootBlock || /[{}]/.test(rootBlock[1])) {
    return { source: '', errors: [{ code: 'selectorsNotAllowed' }] };
  }
  return { source: rootBlock[1].trim(), errors: [] };
}

export function parseCustomThemeCss(value) {
  const normalized = normalizeSource(value);
  if (normalized.errors.length) {
    return { valid: false, css: '', variables: {}, errors: normalized.errors };
  }
  if (!normalized.source) {
    return { valid: true, css: '', variables: {}, errors: [] };
  }

  const variables = {};
  const errors = [];
  const declarations = normalized.source
    .split(';')
    .map(declaration => declaration.trim())
    .filter(Boolean);
  if (declarations.length > CUSTOM_THEME_PROPERTIES.length) {
    errors.push({ code: 'tooManyDeclarations' });
  }

  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon <= 0) {
      errors.push({ code: 'invalidDeclaration', declaration });
      continue;
    }
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const propertyValue = declaration.slice(colon + 1).trim();
    if (!CUSTOM_THEME_PROPERTIES.includes(property)) {
      errors.push({ code: 'propertyNotAllowed', property });
      continue;
    }
    if (!propertyValue || propertyValue.length > 120) {
      errors.push({ code: 'invalidValue', property });
      continue;
    }
    if (
      /[{};]/.test(propertyValue) ||
      /(url|var|env|attr|image|expression|javascript|data:|@|!important)/i
        .test(propertyValue)
    ) {
      errors.push({ code: 'unsafeValue', property });
      continue;
    }
    const valid = COLOR_PROPERTIES.has(property)
      ? validColor(propertyValue)
      : RADIUS_PROPERTIES.has(property) && validRadius(propertyValue);
    if (!valid) {
      errors.push({ code: 'invalidValue', property });
      continue;
    }
    variables[property] = propertyValue;
  }

  const valid = errors.length === 0;
  return {
    valid,
    css: valid
      ? Object.entries(variables)
          .map(([property, propertyValue]) => `${property}: ${propertyValue};`)
          .join('\n')
      : '',
    variables: valid ? variables : {},
    errors
  };
}
