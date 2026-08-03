import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { normalizeRtkRecipe, parseRtkExport } from '../shared/rtkImport.js';

const rtkRecipe = {
  uuid: 'dce2a77a-ff62-4a8c-a087-05d9300c6665',
  title: 'Apfelkuchen',
  description: 'Omas Rezept',
  preparationTime: '10',
  cookingTime: '35',
  inactiveTime: '5',
  quantity: '8',
  ingredients: '2 Äpfel\n200 g Mehl\n',
  instructions: 'Zubereitung\n1. Äpfel schneiden.\n2. Kuchen backen.\n',
  pictures: ['recipe-picture.png'],
  url: 'https://example.com/apfelkuchen',
  categories: [{ title: 'Kuchen' }],
  tags: [{ title: 'Familie' }]
};

test('My Recipe Box recipes map to the LX recipe model', () => {
  const recipe = normalizeRtkRecipe(rtkRecipe, {
    'recipe-picture.png': new Uint8Array([137, 80, 78, 71])
  });
  assert.equal(recipe.title, 'Apfelkuchen');
  assert.equal(recipe.prepTime, '50 Min');
  assert.equal(recipe.servings, '8 Portionen');
  assert.deepEqual(recipe.ingredients, ['2 Äpfel', '200 g Mehl']);
  assert.deepEqual(recipe.instructions, [
    'Äpfel schneiden.',
    'Kuchen backen.'
  ]);
  assert.match(recipe.image, /^data:image\/png;base64,/);
  assert.deepEqual(recipe.categories, ['Kuchen']);
  assert.deepEqual(recipe.tags, ['Familie']);
});

test('RTK backups import every recipes_n.json file and its images', () => {
  const archive = zipSync({
    'recipes_0.json': strToU8(JSON.stringify([rtkRecipe])),
    'recipes_1.json': strToU8(JSON.stringify([{
      ...rtkRecipe,
      uuid: 'second-recipe',
      title: 'Gemüsesuppe',
      pictures: []
    }])),
    'recipe-picture.png': new Uint8Array([137, 80, 78, 71]),
    'categories.json': strToU8('[]')
  });
  const recipes = parseRtkExport(archive);
  assert.equal(recipes.length, 2);
  assert.equal(recipes[0].title, 'Apfelkuchen');
  assert.equal(recipes[1].title, 'Gemüsesuppe');
  assert.match(recipes[0].image, /^data:image\/png;base64,/);
});

test('invalid RTK archives without recipe files return no recipes', () => {
  const archive = zipSync({ 'categories.json': strToU8('[]') });
  assert.deepEqual(parseRtkExport(archive), []);
});
