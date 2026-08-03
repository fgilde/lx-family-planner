import { strFromU8, unzipSync } from 'fflate';

const GENERIC_STEP_NAMES = new Set([
  'zubereitung',
  'anleitung',
  'instructions',
  'instruction',
  'preparation',
  'directions'
]);

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formattedAmount(value) {
  const text = clean(value);
  if (!text || Number(text) === 0) return '';
  return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function tandoorIngredient(ingredient) {
  if (!ingredient || ingredient.is_header) return '';
  const amount = ingredient.no_amount ? '' : formattedAmount(ingredient.amount);
  const unit = clean(ingredient.unit?.name);
  const food = clean(ingredient.food?.name);
  const note = clean(ingredient.note);
  const main = [amount, unit, food].filter(Boolean).join(' ');
  if (!main) return note;
  return note ? `${main} (${note})` : main;
}

function tandoorInstruction(step) {
  const name = clean(step?.name);
  const instruction = clean(step?.instruction);
  if (!instruction) return '';
  if (!name || GENERIC_STEP_NAMES.has(name.toLowerCase())) {
    return instruction;
  }
  return `${name}: ${instruction}`;
}

function bytesToDataUrl(bytes, filename = '') {
  if (!bytes?.length || bytes.length > 6 * 1024 * 1024) return '';
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

export function normalizeTandoorRecipe(data, image = '') {
  if (!data || typeof data !== 'object') return null;
  const title = clean(data.name || data.title);
  if (!title) return null;
  const steps = Array.isArray(data.steps)
    ? [...data.steps].sort(
        (left, right) => Number(left?.order || 0) - Number(right?.order || 0)
      )
    : [];
  const ingredients = steps
    .flatMap(step => Array.isArray(step?.ingredients) ? step.ingredients : [])
    .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    .map(tandoorIngredient)
    .filter(Boolean);
  const instructions = steps.map(tandoorInstruction).filter(Boolean);
  const totalMinutes = Math.max(
    0,
    Number(data.working_time || data.workingTime || 0) +
      Number(data.waiting_time || data.waitingTime || 0)
  );
  const servingsText = clean(data.servings_text || data.servingsText);
  const servings = Number(data.servings || 0);
  return {
    title,
    description: clean(data.description),
    prepTime: totalMinutes ? `${totalMinutes} Min` : '',
    servings: servingsText || (servings ? `${servings} Portionen` : ''),
    image,
    ingredients,
    instructions,
    source: 'tandoor',
    sourceUrl: clean(data.source_url || data.sourceUrl)
  };
}

function recipesFromZip(bytes, depth = 0) {
  if (depth > 2) return [];
  const archive = unzipSync(bytes);
  const entries = Object.entries(archive);
  const recipeJson = entries.find(([name]) =>
    name.toLowerCase().endsWith('recipe.json')
  );
  if (recipeJson) {
    const imageEntry = entries.find(([name]) =>
      /(^|\/)image\.(?:jpe?g|png|webp|gif)$/i.test(name)
    );
    const data = JSON.parse(strFromU8(recipeJson[1]));
    const recipe = normalizeTandoorRecipe(
      data,
      imageEntry ? bytesToDataUrl(imageEntry[1], imageEntry[0]) : ''
    );
    return recipe ? [recipe] : [];
  }
  return entries
    .filter(([name]) => name.toLowerCase().endsWith('.zip'))
    .flatMap(([, nestedBytes]) => recipesFromZip(nestedBytes, depth + 1));
}

export function parseTandoorExport(bytes, filename = '') {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(strFromU8(input));
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    return candidates.map(item => normalizeTandoorRecipe(item)).filter(Boolean);
  }
  return recipesFromZip(input);
}
