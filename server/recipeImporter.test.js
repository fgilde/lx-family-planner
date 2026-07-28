import assert from 'node:assert/strict';
import test from 'node:test';
import { extractRecipeDocument } from './recipeImporter.js';

test('recipe importer reads nested Schema.org recipes with structured values', () => {
  const html = `
    <html>
      <head>
        <meta property="og:image" content="/fallback.jpg">
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [{
              "@type": "WebPage",
              "mainEntity": {
                "@type": "Recipe",
                "name": "Familien-Pasta",
                "image": {"contentUrl": "/pasta.jpg"},
                "recipeIngredient": [
                  {"@type": "PropertyValue", "value": "500", "unitText": "g", "name": "Nudeln"},
                  "1 Dose Tomaten"
                ],
                "recipeInstructions": [
                  {"@type": "HowToStep", "text": "Nudeln nach Packungsangabe kochen."},
                  {"@type": "HowToStep", "text": "Mit der Sauce servieren."}
                ],
                "prepTime": "PT10M",
                "cookTime": "PT20M",
                "recipeYield": "4 Portionen"
              }
            }]
          }
        </script>
      </head>
    </html>
  `;
  const result = extractRecipeDocument(
    html,
    'https://recipes.example/familien-pasta'
  );

  assert.equal(result.recipe.title, 'Familien-Pasta');
  assert.equal(result.recipe.image, 'https://recipes.example/pasta.jpg');
  assert.deepEqual(result.recipe.ingredients, [
    '500 g Nudeln',
    '1 Dose Tomaten'
  ]);
  assert.equal(result.recipe.instructions.length, 2);
  assert.equal(result.recipe.prepTime, '10 Min.');
  assert.equal(result.recipe.cookTime, '20 Min.');
});

test('recipe importer supports h-recipe pages used by common portals', () => {
  const html = `
    <article class="h-recipe">
      <h1 class="p-name">Schnelle Waffeln</h1>
      <img class="u-photo" src="/waffeln.webp">
      <ul>
        <li class="p-ingredient">250 g Mehl</li>
        <li class="p-ingredient">2 Eier</li>
      </ul>
      <ol class="e-instructions">
        <li>Teig glatt rühren.</li>
        <li>Im Waffeleisen goldbraun backen.</li>
      </ol>
      <time class="dt-duration" datetime="PT25M">25 Minuten</time>
      <data class="p-yield" value="8">8 Waffeln</data>
    </article>
  `;
  const result = extractRecipeDocument(
    html,
    'https://food.example/waffeln'
  );

  assert.equal(result.recipe.title, 'Schnelle Waffeln');
  assert.deepEqual(result.recipe.ingredients, ['250 g Mehl', '2 Eier']);
  assert.equal(result.recipe.totalTime, '25 Min.');
  assert.equal(result.recipe.servings, '8');
});

test('Pinterest pins expose their original recipe source safely', () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Schnelle Kekse | Pinterest">
      <meta property="og:see_also" content="http://food.example/kekse">
      <meta property="pinterestapp:source" content="http://food.example/kekse">
    </head></html>
  `;
  const result = extractRecipeDocument(
    html,
    'https://www.pinterest.de/pin/123456789/'
  );

  assert.equal(result.recipe, null);
  assert.equal(result.sourceUrl, 'https://food.example/kekse');
});

test('self-contained Pinterest recipes retain ingredients with a warning', () => {
  const html = `
    <html><head>
      <meta property="og:title" content="Kartoffel-Taler | Rezept">
      <meta property="og:image" content="https://i.pinimg.com/taler.jpg">
      <meta property="og:description"
        content="ZUTATEN: 500 g Kartoffeln + 2 Eier + Salz ZUBEREITUNG: Alles mischen // Taler goldbraun braten">
    </head></html>
  `;
  const result = extractRecipeDocument(
    html,
    'https://www.pinterest.com/pin/987654321/'
  );

  assert.equal(result.recipe.title, 'Kartoffel-Taler');
  assert.deepEqual(result.recipe.ingredients, [
    '500 g Kartoffeln',
    '2 Eier',
    'Salz'
  ]);
  assert.deepEqual(result.recipe.instructions, [
    'Alles mischen Taler goldbraun braten'
  ]);
  assert.equal(result.warning, '');
});
