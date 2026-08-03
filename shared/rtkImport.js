import { strFromU8, unzipSync } from 'fflate';

// Keep the base64 image below the API's default 5 MB JSON request limit.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RECIPE_JSON_BYTES = 12 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 180 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2000;
const GENERIC_STEP_NAMES = new Set([
  'zubereitung',
  'anleitung',
  'instructions',
  'instruction',
  'preparation',
  'method',
  'directions'
]);

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function listFromText(value, { removeGenericHeading = false } = {}) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map(entry => entry
      .replace(/^\s*(?:[-–—*•▪▫◦✓✅]+|\d{1,3}[.)])\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(entry => entry.length > 0)
    .filter(entry => !removeGenericHeading || !GENERIC_STEP_NAMES.has(
      entry.replace(/:$/, '').trim().toLowerCase()
    ));
}

function minutes(value) {
  const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Math.max(0, Math.round(Number(match[0]))) : 0;
}

function recipeMinutes(data) {
  const total = minutes(data.totalTime);
  if (total) return total;
  return ['preparationTime', 'cookingTime', 'inactiveTime']
    .reduce((sum, key) => sum + minutes(data[key]), 0);
}

function bytesToDataUrl(bytes, filename = '') {
  if (!bytes?.length || bytes.length > MAX_IMAGE_BYTES) return '';
  const extension = filename.split('.').pop()?.toLowerCase();
  const mime = extension === 'png'
    ? 'image/png'
    : extension === 'webp'
      ? 'image/webp'
      : extension === 'gif'
        ? 'image/gif'
        : 'image/jpeg';
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  if (typeof btoa === 'function') {
    return `data:${mime};base64,${btoa(binary)}`;
  }
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

function findArchiveEntry(archive, filename) {
  const wanted = String(filename || '').replace(/\\/g, '/').toLowerCase();
  if (!wanted) return null;
  const basename = wanted.split('/').pop();
  return Object.entries(archive).find(([entryName]) => {
    const normalized = entryName.replace(/\\/g, '/').toLowerCase();
    return normalized === wanted || normalized.split('/').pop() === basename;
  }) || null;
}

export function normalizeRtkRecipe(data, archive = {}) {
  if (!data || typeof data !== 'object') return null;
  const title = clean(data.title);
  if (!title) return null;
  const pictureNames = Array.isArray(data.pictures) ? data.pictures : [];
  const imageEntry = pictureNames
    .map(filename => findArchiveEntry(archive, filename))
    .find(Boolean);
  const totalMinutes = recipeMinutes(data);
  const quantity = clean(data.quantity);
  return {
    title,
    description: clean(data.description),
    prepTime: totalMinutes ? `${totalMinutes} Min` : '',
    servings: quantity ? `${quantity} Portionen` : '',
    image: imageEntry ? bytesToDataUrl(imageEntry[1], imageEntry[0]) : '',
    ingredients: listFromText(data.ingredients),
    instructions: listFromText(data.instructions, {
      removeGenericHeading: true
    }),
    notes: clean(data.notes),
    source: 'my-recipe-box',
    sourceUrl: clean(data.url),
    sourceExternalId: clean(data.uuid),
    categories: Array.isArray(data.categories)
      ? data.categories.map(entry => clean(entry?.title)).filter(Boolean)
      : [],
    tags: Array.isArray(data.tags)
      ? data.tags.map(entry => clean(entry?.title)).filter(Boolean)
      : []
  };
}

export function parseRtkExport(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let extractedBytes = 0;
  let extractedEntries = 0;
  const archive = unzipSync(input, {
    filter(file) {
      const name = file.name.replace(/\\/g, '/');
      const isRecipeJson = /(^|\/)recipes_\d+\.json$/i.test(name);
      const isRecipeImage = /\.(?:jpe?g|png|webp|gif)$/i.test(name);
      const allowedSize = isRecipeJson
        ? MAX_RECIPE_JSON_BYTES
        : isRecipeImage
          ? MAX_IMAGE_BYTES
          : 0;
      if (
        !allowedSize ||
        file.originalSize > allowedSize ||
        extractedEntries >= MAX_ARCHIVE_ENTRIES ||
        extractedBytes + file.originalSize > MAX_EXTRACTED_BYTES
      ) {
        return false;
      }
      extractedEntries += 1;
      extractedBytes += file.originalSize;
      return true;
    }
  });
  const recipeFiles = Object.entries(archive)
    .filter(([name]) => /(^|\/)recipes_\d+\.json$/i.test(name))
    .sort(([left], [right]) => left.localeCompare(right, undefined, {
      numeric: true
    }));
  return recipeFiles.flatMap(([, jsonBytes]) => {
    const parsed = JSON.parse(strFromU8(jsonBytes));
    const records = Array.isArray(parsed) ? parsed : [];
    return records
      .map(record => normalizeRtkRecipe(record, archive))
      .filter(Boolean);
  });
}
