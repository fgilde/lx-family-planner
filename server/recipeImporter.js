import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import * as cheerio from 'cheerio';
import { parseInstructionSteps } from '../shared/recipeInstructions.js';

const RECIPE_FETCH_TIMEOUT_MS = 12_000;
const RECIPE_MAX_BYTES = 3 * 1024 * 1024;
const PINTEREST_HOST_PATTERN = /(^|\.)pinterest\.[a-z.]+$/i;
const PINTEREST_SHORT_HOSTS = new Set(['pin.it', 'www.pin.it']);

function recipeError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, fallback = '', maxLength = 4000) {
  return String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isPinterestHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return PINTEREST_SHORT_HOSTS.has(host) || PINTEREST_HOST_PATTERN.test(host);
}

function ipv4Parts(address) {
  if (isIP(address) !== 4) return null;
  return address.split('.').map(Number);
}

function blockedPublicAddress(address) {
  const normalized = String(address || '').toLowerCase();
  const mappedIpv4 = normalized.startsWith('::ffff:')
    ? normalized.slice(7)
    : normalized;
  const parts = ipv4Parts(mappedIpv4);
  if (parts) {
    const [first, second] = parts;
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.RECIPE_ALLOW_LOOPBACK_FOR_TESTS === 'true' &&
      first === 127
    ) {
      return false;
    }
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
  if (isIP(normalized) !== 6) return false;
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  );
}

export function normalizeRecipeImportUrl(value) {
  let url;
  try {
    url = new URL(cleanText(value, '', 4000));
  } catch {
    throw recipeError('Bitte gib einen vollständigen Rezept-Link ein.', 400);
  }
  const allowTestHttp =
    process.env.NODE_ENV === 'test' &&
    process.env.RECIPE_ALLOW_LOOPBACK_FOR_TESTS === 'true' &&
    url.protocol === 'http:';
  if (url.protocol !== 'https:' && !allowTestHttp) {
    throw recipeError('Rezept-Links müssen mit https:// beginnen.', 400);
  }
  if (url.username || url.password) {
    throw recipeError(
      'Zugangsdaten dürfen nicht direkt im Rezept-Link stehen.',
      400
    );
  }
  url.hash = '';
  return url;
}

async function validatePublicTarget(url) {
  let addresses;
  try {
    addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw recipeError('Die Rezeptseite konnte nicht gefunden werden.', 400);
  }
  if (
    !addresses.length ||
    addresses.some(entry => blockedPublicAddress(entry.address))
  ) {
    throw recipeError(
      'Lokale und private Netzwerkadressen sind beim Rezeptimport nicht erlaubt.',
      400
    );
  }
}

async function readLimitedHtml(response) {
  const announcedLength = Number(response.headers.get('content-length') || 0);
  if (announcedLength > RECIPE_MAX_BYTES) {
    throw recipeError('Die Rezeptseite ist größer als 3 MB.', 413);
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > RECIPE_MAX_BYTES) {
      await reader.cancel();
      throw recipeError('Die Rezeptseite ist größer als 3 MB.', 413);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchRecipePage(rawUrl) {
  let url = normalizeRecipeImportUrl(rawUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    await validatePublicTarget(url);
    let response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(RECIPE_FETCH_TIMEOUT_MS),
        headers: {
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
          'accept-language': 'de-DE,de;q=0.9,en;q=0.6',
          'user-agent':
            'Mozilla/5.0 (compatible; LX-Family-Planner/2.0; +private-recipe-import)'
        }
      });
    } catch {
      throw recipeError('Die Rezeptseite antwortet gerade nicht.', 502);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) {
        throw recipeError('Der Rezept-Link leitet zu oft weiter.', 502);
      }
      url = normalizeRecipeImportUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw recipeError(
        response.status === 401 || response.status === 403
          ? 'Die Rezeptseite blockiert den automatischen Import.'
          : `Die Rezeptseite meldet Fehler ${response.status}.`,
        502
      );
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/html|xhtml/i.test(contentType)) {
      throw recipeError('Unter diesem Link wurde keine Rezeptseite gefunden.');
    }
    return {
      html: await readLimitedHtml(response),
      url
    };
  }
  throw recipeError('Die Rezeptseite konnte nicht geladen werden.', 502);
}

function schemaTypes(value) {
  return (Array.isArray(value) ? value : [value])
    .map(entry => String(entry || '').split('/').at(-1))
    .filter(Boolean);
}

function recipeCandidates(value, seen = new WeakSet(), depth = 0) {
  if (depth > 8 || value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap(entry => recipeCandidates(entry, seen, depth + 1));
  }
  if (typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const candidates = schemaTypes(value['@type']).includes('Recipe')
    ? [value]
    : [];
  for (const [key, nested] of Object.entries(value)) {
    if (key === '@context' || key === 'image') continue;
    candidates.push(...recipeCandidates(nested, seen, depth + 1));
  }
  return candidates;
}

function structuredText(value, maxLength = 240) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return cleanText(value, '', maxLength);
  }
  if (Array.isArray(value)) {
    return value.map(entry => structuredText(entry, maxLength)).find(Boolean) || '';
  }
  if (typeof value !== 'object') return '';
  if (value['@value']) return cleanText(value['@value'], '', maxLength);
  const amount = cleanText(value.value, '', 60);
  const unit = cleanText(value.unitText || value.unitCode, '', 40);
  const name = cleanText(value.name || value.description, '', maxLength);
  return cleanText([amount, unit, name].filter(Boolean).join(' '), '', maxLength);
}

function ingredientList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap(entry => {
      if (entry?.itemListElement) return ingredientList(entry.itemListElement);
      return structuredText(entry, 280);
    })
    .filter(Boolean);
}

function imageCandidates(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(imageCandidates);
  if (typeof value !== 'object') return [];
  return [
    value.url,
    value.contentUrl,
    value.thumbnailUrl,
    value.image,
    value.primaryImageOfPage
  ].flatMap(imageCandidates);
}

function resolveExternalUrl(value, baseUrl) {
  const candidate = cleanText(value, '', 2000);
  if (!candidate) return '';
  try {
    const resolved = new URL(candidate, baseUrl);
    if (!['http:', 'https:'].includes(resolved.protocol)) return '';
    if (resolved.protocol === 'http:') resolved.protocol = 'https:';
    return resolved.href;
  } catch {
    return '';
  }
}

function firstText(value, fallback = '', maxLength = 160) {
  if (Array.isArray(value)) {
    return value
      .map(entry => structuredText(entry, maxLength))
      .find(Boolean) || fallback;
  }
  return structuredText(value, maxLength) || fallback;
}

function formatDuration(value) {
  const duration = firstText(value, '', 50);
  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(duration);
  if (!match) return duration;
  const parts = [];
  if (match[1]) parts.push(`${Number(match[1])} Tag${match[1] === '1' ? '' : 'e'}`);
  if (match[2]) parts.push(`${Number(match[2])} Std.`);
  if (match[3]) parts.push(`${Number(match[3])} Min.`);
  if (!parts.length && match[4]) parts.push(`${Number(match[4])} Sek.`);
  return parts.join(' ');
}

function elementValue($, element) {
  const node = $(element);
  return cleanText(
    node.attr('content') ||
      node.attr('datetime') ||
      node.attr('value') ||
      node.attr('src') ||
      node.attr('href') ||
      node.text(),
    '',
    4000
  );
}

function elementValues($, root, selector) {
  return root
    .find(selector)
    .toArray()
    .map(element => elementValue($, element))
    .filter(Boolean);
}

function instructionValues($, root, selector) {
  return root
    .find(selector)
    .toArray()
    .flatMap(element => {
      const node = $(element);
      const listItems = node.find('li').toArray();
      return listItems.length
        ? listItems.map(item => elementValue($, item))
        : elementValue($, element);
    })
    .filter(Boolean);
}

function extractJsonLdRecipe($) {
  let recipe = null;
  $('script[type="application/ld+json"]').each((_index, element) => {
    if (recipe) return;
    try {
      const parsed = JSON.parse($(element).text());
      recipe = recipeCandidates(parsed)[0] || null;
    } catch {
      // A later JSON-LD block may still contain valid recipe metadata.
    }
  });
  return recipe;
}

function extractMicrodataRecipe($) {
  const root = $('[itemtype*="schema.org/Recipe"]').first();
  if (!root.length) return null;
  return {
    name: elementValues($, root, '[itemprop="name"]').at(0),
    image: elementValues($, root, '[itemprop="image"]'),
    recipeIngredient: elementValues(
      $,
      root,
      '[itemprop="recipeIngredient"], [itemprop="ingredients"]'
    ),
    recipeInstructions: instructionValues(
      $,
      root,
      '[itemprop="recipeInstructions"]'
    ),
    prepTime: elementValues($, root, '[itemprop="prepTime"]').at(0),
    cookTime: elementValues($, root, '[itemprop="cookTime"]').at(0),
    totalTime: elementValues($, root, '[itemprop="totalTime"]').at(0),
    recipeYield: elementValues($, root, '[itemprop="recipeYield"]').at(0)
  };
}

function extractHRecipe($) {
  const root = $('.h-recipe').first();
  if (!root.length) return null;
  return {
    name: elementValues($, root, '.p-name').at(0),
    image: elementValues($, root, '.u-photo'),
    recipeIngredient: elementValues($, root, '.p-ingredient'),
    recipeInstructions: instructionValues($, root, '.e-instructions'),
    totalTime: elementValues($, root, '.dt-duration').at(0),
    recipeYield: elementValues($, root, '.p-yield').at(0)
  };
}

function splitPinterestList(value) {
  return String(value || '')
    .split(/\s*(?:\n+|[•●▪]|\/{2,}|={2,}|\s+\+\s+)\s*/u)
    .map(entry => cleanText(entry, '', 280))
    .filter(entry => entry.length > 2);
}

function extractPinterestDescriptionRecipe($) {
  const description = cleanText(
    $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content'),
    '',
    6000
  );
  const ingredientsMatch = /\b(?:zutaten|ingredients)\s*:\s*/i.exec(description);
  if (!ingredientsMatch) return null;
  const afterHeading = description.slice(
    ingredientsMatch.index + ingredientsMatch[0].length
  );
  const instructionsMatch =
    /\b(?:zubereitung|anleitung|instructions?|methode)\s*:\s*/i.exec(afterHeading);
  const ingredientsText = instructionsMatch
    ? afterHeading.slice(0, instructionsMatch.index)
    : afterHeading;
  const instructionsText = instructionsMatch
    ? afterHeading.slice(instructionsMatch.index + instructionsMatch[0].length)
    : '';
  const ingredients = splitPinterestList(ingredientsText);
  if (!ingredients.length) return null;
  const rawTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    'Pinterest-Rezept';
  return {
    name: cleanText(rawTitle.split('|')[0], 'Pinterest-Rezept', 160),
    image:
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content'),
    recipeIngredient: ingredients,
    recipeInstructions: instructionsText
      ? splitPinterestList(instructionsText)
      : [description],
    importWarning: instructionsText
      ? ''
      : 'Pinterest hat nur Zutaten und Beschreibung geliefert. Bitte prüfe die Zubereitung.'
  };
}

function pinterestSourceUrl($, pageUrl) {
  const candidates = [
    $('meta[property="pinterestapp:source"]').attr('content'),
    $('meta[name="pinterestapp:source"]').attr('content'),
    $('meta[property="og:see_also"]').attr('content')
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const source = new URL(candidate, pageUrl);
      if (isPinterestHost(source.hostname)) continue;
      if (source.protocol === 'http:') source.protocol = 'https:';
      return source.href;
    } catch {
      // Ignore malformed source candidates.
    }
  }
  return '';
}

function normalizedRecipe(recipe, pageUrl, fallbackImage = '') {
  const image = [
    ...imageCandidates(recipe.image),
    ...imageCandidates(recipe.thumbnailUrl),
    ...imageCandidates(recipe.primaryImageOfPage),
    fallbackImage
  ]
    .map(candidate => resolveExternalUrl(candidate, pageUrl))
    .find(Boolean) || '';
  const ingredients = ingredientList(
    recipe.recipeIngredient || recipe.ingredients || []
  );
  const instructions = parseInstructionSteps(recipe.recipeInstructions);
  return {
    title: firstText(recipe.name, 'Importiertes Rezept', 160),
    image: cleanText(image, '', 2000),
    ingredients,
    instructions,
    prepTime: formatDuration(recipe.prepTime),
    cookTime: formatDuration(recipe.cookTime),
    totalTime: formatDuration(recipe.totalTime),
    servings: firstText(recipe.recipeYield, '', 80),
    sourceUrl: pageUrl,
    source: 'recipe-import'
  };
}

export function extractRecipeDocument(html, pageUrl) {
  const $ = cheerio.load(String(html || ''));
  const recipe =
    extractJsonLdRecipe($) ||
    extractMicrodataRecipe($) ||
    extractHRecipe($) ||
    (isPinterestHost(new URL(pageUrl).hostname)
      ? extractPinterestDescriptionRecipe($)
      : null);
  const fallbackImage = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
    $('link[rel="image_src"]').attr('href')
  ].find(Boolean) || '';
  return {
    recipe: recipe ? normalizedRecipe(recipe, pageUrl, fallbackImage) : null,
    sourceUrl: isPinterestHost(new URL(pageUrl).hostname)
      ? pinterestSourceUrl($, pageUrl)
      : '',
    warning: cleanText(recipe?.importWarning, '', 240)
  };
}

export async function importRecipeFromUrl(rawUrl) {
  const requestedUrl = normalizeRecipeImportUrl(rawUrl);
  const firstPage = await fetchRecipePage(requestedUrl);
  const firstResult = extractRecipeDocument(firstPage.html, firstPage.url.href);
  if (firstResult.recipe) {
    return {
      recipe: firstResult.recipe,
      warnings: firstResult.warning ? [firstResult.warning] : []
    };
  }

  if (firstResult.sourceUrl) {
    const sourcePage = await fetchRecipePage(firstResult.sourceUrl);
    const sourceResult = extractRecipeDocument(
      sourcePage.html,
      sourcePage.url.href
    );
    if (sourceResult.recipe) {
      return {
        recipe: {
          ...sourceResult.recipe,
          importedFromUrl: firstPage.url.href
        },
        warnings: sourceResult.warning ? [sourceResult.warning] : []
      };
    }
  }

  throw recipeError(
    isPinterestHost(firstPage.url.hostname)
      ? 'Dieser Pinterest-Pin enthält kein vollständig lesbares Rezept und verweist auf keine öffentliche Rezeptseite.'
      : 'Auf dieser Seite wurden keine lesbaren Rezeptdaten gefunden. Unterstützt werden Schema.org- und h-recipe-Seiten.',
    422
  );
}
