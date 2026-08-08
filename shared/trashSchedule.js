export function groupTrashEventsByDate(events) {
  const groups = new Map();
  for (const item of Array.isArray(events) ? events : []) {
    const date = String(item?.date || '').slice(0, 10);
    if (!date) continue;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(item);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((left, right) =>
        String(left?.type || '').localeCompare(String(right?.type || '')) ||
        String(left?.title || '').localeCompare(String(right?.title || ''))
      )
    }));
}

export function trashGroupTitle(group, titleForItem = item => item?.title || '') {
  const labels = (group?.items || [])
    .map(item => String(titleForItem(item) || '').trim())
    .filter(Boolean);
  return [...new Set(labels)].join(' · ');
}
