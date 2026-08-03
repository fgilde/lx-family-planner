import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAppView } from '../src/constants/roles.js';

test('profile changes cannot retain privileged or unsuitable views', () => {
  const parent = { role: 'adult' };
  const child = { role: 'child' };
  const teenager = { role: 'teen' };
  const pet = { role: 'pet' };
  const familyMember = { role: 'member' };

  assert.equal(canAccessAppView(parent, 'admin'), true);
  assert.equal(canAccessAppView(parent, 'cloud'), true);
  assert.equal(canAccessAppView(child, 'admin'), false);
  assert.equal(canAccessAppView(child, 'cloud'), false);
  assert.equal(canAccessAppView(teenager, 'mail'), false);
  assert.equal(canAccessAppView(pet, 'chat'), false);
  assert.equal(canAccessAppView(pet, 'calendar'), true);
  assert.equal(canAccessAppView(familyMember, 'tasks'), true);
  assert.equal(canAccessAppView(familyMember, 'cloud'), false);
  assert.equal(canAccessAppView(parent, 'trash', ['trash']), false);
  assert.equal(
    canAccessAppView(
      { role: 'adult', allowedModules: ['calendar', 'cloud'] },
      'cloud'
    ),
    true
  );
  assert.equal(
    canAccessAppView(
      { role: 'adult', allowedModules: ['calendar', 'cloud'] },
      'mail'
    ),
    false
  );
  assert.equal(
    canAccessAppView(
      { role: 'adult', allowedModules: [] },
      'admin'
    ),
    true
  );
});
