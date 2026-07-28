function urlsFromValue(value) {
  const text = String(value || '');
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  return matches
    .map(match => match.replace(/[\])},.;!?]+$/g, ''))
    .filter(candidate => {
      try {
        return ['http:', 'https:'].includes(new URL(candidate).protocol);
      } catch {
        return false;
      }
    });
}

export function recipeShareTargetFromUrl(value) {
  const location = value instanceof URL ? value : new URL(String(value));
  const isShareTarget =
    location.pathname.replace(/\/+$/, '') === '/share-recipe';
  if (!isShareTarget) {
    return { isShareTarget: false, url: '', title: '', text: '' };
  }
  const title = location.searchParams.get('title') || '';
  const text = location.searchParams.get('text') || '';
  const directUrl = location.searchParams.get('url') || '';
  const candidates = [
    ...urlsFromValue(directUrl),
    ...urlsFromValue(text),
    ...urlsFromValue(title)
  ];
  return {
    isShareTarget: true,
    url: candidates[0] || '',
    title: String(title).trim().slice(0, 240),
    text: String(text).trim().slice(0, 1000)
  };
}
