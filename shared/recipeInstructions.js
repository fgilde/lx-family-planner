// Shared by the recipe importer and the browser cooking mode.
const SECTION_HEADING_PATTERN =
  /^(?:zubereitung|zubereitungsschritte|anleitung|zubereitungsanleitung|instructions?|methode|method)\s*:?\s*$/i;
const NUMBER_PREFIX_PATTERN =
  /^(?:(?:schritt\s*)?\d+\s*[\).,:;\-–]\s*)+/i;
const COOKING_SIDE_PATTERN =
  /\b(reis|nudeln?|pasta|kartoffeln?|couscous|bulgur|quinoa|polenta|hirse)\b/i;
const WAITING_STEP_PATTERN =
  /\b(?:ofen|backen|garen|köcheln|köcheln lassen|ziehen lassen|ruhen lassen)\b/i;
const DURATION_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:min(?:ute[n]?)?\.?|std\.?|stunde[n]?)\b/i;

function collectInstructionStrings(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectInstructionStrings);
  if (typeof value !== 'object') return [];

  if (typeof value.text === 'string' && value.text.trim()) {
    return [value.text];
  }
  if (value.itemListElement || value.steps) {
    return collectInstructionStrings(
      value.itemListElement || value.steps
    );
  }
  if (typeof value.name === 'string' && value.name.trim()) {
    return [value.name];
  }
  return [];
}

function restoreAbbreviations(value) {
  return value.replaceAll('\u0007', '.');
}

function protectAbbreviations(value) {
  return value
    .replace(/\b(ca|bzw|usw|evtl|ggf|inkl|max|mind|approx)\./gi, '$1\u0007')
    .replace(/\bz\.\s*B\./gi, 'z\u0007 B\u0007')
    .replace(/\bu\.\s*a\./gi, 'u\u0007 a\u0007');
}

function cleanInstructionText(value) {
  return restoreAbbreviations(
    protectAbbreviations(String(value || ''))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|li|div)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim()
  );
}

function splitLongInstruction(value) {
  if (value.length <= 420) return [value];
  const protectedText = protectAbbreviations(value);
  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/u)
    .map(restoreAbbreviations)
    .map(part => part.trim())
    .filter(Boolean);
}

function splitInstructionBlock(value) {
  const normalized = cleanInstructionText(value)
    .replace(
      /\s+(?=(?:schritt\s*)?\d+\s*[\).,:;\-–]\s+)/gi,
      '\n'
    );

  return normalized
    .split(/\n+|(?:^|\s)[•●▪]\s+/u)
    .map(part => part.trim())
    .filter(Boolean)
    .flatMap(splitLongInstruction);
}

function normalizeCandidate(value) {
  const cleaned = cleanInstructionText(value)
    .replace(NUMBER_PREFIX_PATTERN, '')
    .replace(/^[-–—•]\s*/, '')
    .trim();

  if (
    cleaned.length < 3 ||
    /^\d+[\s.,/]*$/.test(cleaned) ||
    SECTION_HEADING_PATTERN.test(cleaned)
  ) {
    return '';
  }
  return cleaned;
}

function shouldMergeWithPrevious(previous, current) {
  if (!previous) return false;
  if (/\b(?:ca|bzw|evtl|ggf|z\. B|u\. a)\.$/i.test(previous)) return true;
  if (/[:;,–—-]$/.test(previous)) return true;
  if (!/[.!?]$/.test(previous) && previous.length < 150) return true;
  return (
    previous.length < 130 &&
    /^[a-zäöüß0-9½¼¾]/u.test(current)
  );
}

function mergeInstructionFragments(candidates) {
  const merged = [];
  for (const candidate of candidates) {
    const previous = merged.at(-1);
    if (shouldMergeWithPrevious(previous, candidate)) {
      merged[merged.length - 1] = `${previous} ${candidate}`
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      merged.push(candidate);
    }
  }
  return merged;
}

function accompanimentName(value) {
  const directMatch = value.match(
    /^(?:dazu|hierzu)\s+(?:passt|passen)\s+(.+?)[.!]?$/i
  );
  if (directMatch) return directMatch[1].trim();

  const servingMatch = value.match(
    /^(?:als\s+beilage\s+)?(.+?)\s+(?:dazu\s+)?servieren[.!]?$/i
  );
  return servingMatch?.[1]?.trim() || '';
}

function scheduleAccompaniment(steps) {
  const accompanimentIndex = steps.findIndex(step =>
    /^(?:dazu|hierzu)\s+(?:passt|passen)\b/i.test(step)
  );
  if (accompanimentIndex < 1) return steps;

  const waitIndex = steps.findIndex(
    (step, index) =>
      index < accompanimentIndex &&
      WAITING_STEP_PATTERN.test(step) &&
      DURATION_PATTERN.test(step)
  );
  if (waitIndex < 0) return steps;

  const original = steps[accompanimentIndex];
  const side = accompanimentName(original);
  if (!side) return steps;

  const instruction = COOKING_SIDE_PATTERN.test(side)
    ? `Wenn du ${side} dazu servierst, jetzt nach Packungsangabe aufsetzen – die Beilage kann während der Garzeit fertig werden.`
    : `Wenn du ${side} dazu servierst, jetzt vorbereiten – so ist die Beilage gleichzeitig mit dem Hauptgericht fertig.`;

  const reordered = steps.filter((_step, index) => index !== accompanimentIndex);
  reordered.splice(waitIndex, 0, instruction);
  return reordered;
}

function deduplicateSteps(steps) {
  const seen = new Set();
  return steps.filter(step => {
    const key = step
      .toLocaleLowerCase('de-DE')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseInstructionSteps(instructionsInput) {
  const candidates = collectInstructionStrings(instructionsInput)
    .flatMap(splitInstructionBlock)
    .map(normalizeCandidate)
    .filter(Boolean);

  const steps = scheduleAccompaniment(
    deduplicateSteps(mergeInstructionFragments(candidates))
  );

  return steps.length
    ? steps
    : ['Zutaten vorbereiten und nach Rezept zubereiten.'];
}

export function getInstructionDurationMinutes(value) {
  const text = String(value || '');
  const hours = text.match(
    /\b(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunde[n]?)\b/i
  );
  const minutes = text.match(
    /\b(\d+(?:[.,]\d+)?)\s*min(?:ute[n]?)?\.?\b/i
  );
  const total =
    (hours ? Number(hours[1].replace(',', '.')) * 60 : 0) +
    (minutes ? Number(minutes[1].replace(',', '.')) : 0);
  return total > 0 ? Math.round(total) : 0;
}
