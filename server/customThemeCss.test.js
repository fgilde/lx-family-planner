import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOM_THEME_MAX_LENGTH,
  parseCustomThemeCss
} from '../shared/customThemeCss.js';

test('safe custom theme CSS accepts only approved design variables', () => {
  const result = parseCustomThemeCss(`
    :root {
      --primary: #365f55;
      --bg-card: rgba(255, 253, 248, 0.96);
      --radius-lg: 18px;
    }
  `);
  assert.equal(result.valid, true);
  assert.deepEqual(result.variables, {
    '--primary': '#365f55',
    '--bg-card': 'rgba(255, 253, 248, 0.96)',
    '--radius-lg': '18px'
  });
  assert.doesNotMatch(result.css, /:root|[{}]/);
});

test('safe custom theme CSS blocks selectors, network access and UI overrides', () => {
  for (const unsafeCss of [
    '.app-header { display: none; }',
    '--bg-main: url(https://example.test/track);',
    '--primary: var(--secret);',
    '--accent: red !important;',
    '@import "https://example.test/theme.css";',
    '--position: fixed;',
    'button:has(input) { opacity: 0; }'
  ]) {
    const result = parseCustomThemeCss(unsafeCss);
    assert.equal(result.valid, false, unsafeCss);
    assert.deepEqual(result.variables, {}, unsafeCss);
  }
});

test('safe custom theme CSS is bounded and can be reset', () => {
  assert.equal(parseCustomThemeCss('').valid, true);
  assert.equal(parseCustomThemeCss('').css, '');
  assert.equal(
    parseCustomThemeCss('x'.repeat(CUSTOM_THEME_MAX_LENGTH + 1)).valid,
    false
  );
  assert.equal(parseCustomThemeCss('--radius-xl: 49px;').valid, false);
});
