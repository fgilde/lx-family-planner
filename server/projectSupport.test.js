import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  GITHUB_SPONSORS_ENABLED,
  GITHUB_SPONSORS_URL,
  isGitHubSponsorsVisible
} from '../src/constants/project.js';

test('GitHub Sponsors stays hidden in production until the profile is approved', () => {
  assert.equal(GITHUB_SPONSORS_ENABLED, false);
  assert.equal(
    isGitHubSponsorsVisible({
      development: false,
      search: '?support-preview=1',
      hostname: 'familie.laxxx-lab.de'
    }),
    false
  );
  assert.equal(
    isGitHubSponsorsVisible({
      development: false,
      search: '?support-preview=1',
      hostname: '192.168.101.50'
    }),
    false
  );
  assert.equal(GITHUB_SPONSORS_URL, 'https://github.com/sponsors/laxxx-lab');
});

test('the finished support card can be reviewed locally without enabling it', () => {
  assert.equal(
    isGitHubSponsorsVisible({
      development: false,
      search: '?support-preview=1',
      hostname: 'localhost'
    }),
    true
  );
  assert.equal(
    isGitHubSponsorsVisible({
      development: false,
      search: '',
      hostname: 'localhost'
    }),
    false
  );
  assert.equal(
    isGitHubSponsorsVisible({
      development: true,
      search: '?support-preview=1',
      hostname: '192.168.101.50'
    }),
    true
  );
});

test('repository funding and role-aware placements remain wired together', () => {
  const funding = fs.readFileSync('.github/FUNDING.yml', 'utf8');
  const login = fs.readFileSync(
    'src/components/Auth/FamilyLoginScreen.jsx',
    'utf8'
  );
  const settings = fs.readFileSync(
    'src/components/FamilyTree/FamilyEditModal.jsx',
    'utf8'
  );
  const header = fs.readFileSync('src/components/Header.jsx', 'utf8');

  assert.match(funding, /github:\s*\n\s*- laxxx-lab/);
  assert.match(login, /<ProjectSupportCard variant="auth" \/>/);
  assert.match(settings, /<ProjectSupportCard variant="settings" \/>/);
  assert.match(
    header,
    /\{!isChild && !isPet && !isWall && \(\s*<button[\s\S]*?setIsFamilySettingsOpen\(true\)/
  );
});
