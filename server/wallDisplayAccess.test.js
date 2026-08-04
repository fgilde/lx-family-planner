import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isWallDisplayMember,
  wallDisplayMutationAllowed
} from './wallDisplayAccess.js';

test('wall display profiles are recognized explicitly', () => {
  assert.equal(isWallDisplayMember({ role: 'wall' }), true);
  assert.equal(isWallDisplayMember({ role: 'adult' }), false);
});

test('wall display permits reading and the two intended check-off actions', () => {
  assert.equal(wallDisplayMutationAllowed({ method: 'GET', path: '/api/bootstrap' }), true);
  assert.equal(wallDisplayMutationAllowed({ method: 'POST', path: '/api/tasks/task-1/toggle' }), true);
  assert.equal(wallDisplayMutationAllowed({
    method: 'PATCH',
    path: '/api/resources/shoppingItems/item-1',
    body: { inCart: true }
  }), true);
  assert.equal(wallDisplayMutationAllowed({ method: 'POST', path: '/api/auth/logout' }), true);
});

test('wall display cannot edit content, settings or change profiles', () => {
  assert.equal(wallDisplayMutationAllowed({ method: 'POST', path: '/api/auth/member' }), false);
  assert.equal(wallDisplayMutationAllowed({ method: 'POST', path: '/api/resources/events' }), false);
  assert.equal(wallDisplayMutationAllowed({
    method: 'PATCH',
    path: '/api/resources/shoppingItems/item-1',
    body: { name: 'Changed' }
  }), false);
  assert.equal(wallDisplayMutationAllowed({ method: 'PATCH', path: '/api/members/member-1' }), false);
});
