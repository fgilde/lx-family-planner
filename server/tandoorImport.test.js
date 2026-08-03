import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import {
  normalizeTandoorRecipe,
  parseTandoorExport
} from '../shared/tandoorImport.js';

const tandoorRecipe = {
  name: 'Ofengemüse',
  working_time: 20,
  waiting_time: 30,
  servings: 4,
  steps: [
    {
      name: 'Zubereitung',
      instruction: 'Gemüse schneiden und backen.',
      ingredients: [
        {
          amount: '2.000',
          unit: { name: 'Stück' },
          food: { name: 'Zucchini' },
          note: 'klein'
        }
      ]
    }
  ]
};

test('Tandoor recipes keep ingredients without generic step headings', () => {
  const recipe = normalizeTandoorRecipe(tandoorRecipe);
  assert.equal(recipe.title, 'Ofengemüse');
  assert.equal(recipe.prepTime, '50 Min');
  assert.deepEqual(recipe.ingredients, ['2 Stück Zucchini (klein)']);
  assert.deepEqual(recipe.instructions, ['Gemüse schneiden und backen.']);
});

test('Tandoor default exports with nested recipe zips are imported', () => {
  const inner = zipSync({
    'recipe.json': strToU8(JSON.stringify(tandoorRecipe)),
    'image.png': new Uint8Array([137, 80, 78, 71])
  });
  const outer = zipSync({ '42.zip': inner });
  const recipes = parseTandoorExport(outer, 'tandoor.zip');
  assert.equal(recipes.length, 1);
  assert.equal(recipes[0].title, 'Ofengemüse');
  assert.match(recipes[0].image, /^data:image\/png;base64,/);
});
