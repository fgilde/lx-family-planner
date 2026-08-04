export const DASHBOARD_DENSITIES = new Set(['comfortable', 'compact']);
export const DASHBOARD_TRASH_VISIBILITY = new Set([
  'always',
  'upcoming',
  'never'
]);
export const DASHBOARD_PREVIEW_LIMITS = new Set(['4', '8', 'all']);

export function dashboardPreviewItems(items, requestedLimit) {
  const source = Array.isArray(items) ? items : [];
  const limit = DASHBOARD_PREVIEW_LIMITS.has(String(requestedLimit))
    ? String(requestedLimit)
    : '4';
  return limit === 'all' ? source : source.slice(0, Number(limit));
}

export function normalizeDashboardLayout(value, allowedWidgetIds) {
  const allowed = [...new Set((allowedWidgetIds || []).filter(Boolean))];
  const input = value && typeof value === 'object' ? value : {};
  const requestedOrder = Array.isArray(input.order) ? input.order : [];
  const order = [
    ...requestedOrder.filter(
      (id, index) =>
        allowed.includes(id) && requestedOrder.indexOf(id) === index
    ),
    ...allowed.filter(id => !requestedOrder.includes(id))
  ];
  const hidden = [
    ...new Set(
      (Array.isArray(input.hidden) ? input.hidden : []).filter(id =>
        allowed.includes(id)
      )
    )
  ];
  if (allowed.length && hidden.length >= allowed.length) {
    hidden.splice(hidden.indexOf(order[0]), 1);
  }
  return {
    order,
    hidden,
    density: DASHBOARD_DENSITIES.has(input.density)
      ? input.density
      : 'comfortable',
    preferences: {
      trashVisibility: DASHBOARD_TRASH_VISIBILITY.has(
        input.preferences?.trashVisibility
      )
        ? input.preferences.trashVisibility
        : 'always',
      trashWindowDays: Math.max(
        1,
        Math.min(30, Number(input.preferences?.trashWindowDays) || 3)
      ),
      tabletEventLimit: DASHBOARD_PREVIEW_LIMITS.has(
        String(input.preferences?.tabletEventLimit)
      )
        ? String(input.preferences.tabletEventLimit)
        : '4',
      tabletTaskLimit: DASHBOARD_PREVIEW_LIMITS.has(
        String(input.preferences?.tabletTaskLimit)
      )
        ? String(input.preferences.tabletTaskLimit)
        : '4'
    }
  };
}

export function dashboardLayoutForTrash(
  layout,
  nextTrashDate,
  todayDate
) {
  const mode = layout?.preferences?.trashVisibility || 'always';
  let dynamicallyHidden = mode === 'never';
  if (mode === 'upcoming') {
    if (!nextTrashDate || !todayDate) {
      dynamicallyHidden = true;
    } else {
      const today = new Date(`${todayDate}T12:00:00`);
      const pickup = new Date(`${nextTrashDate}T12:00:00`);
      const days = Math.round((pickup - today) / 86_400_000);
      dynamicallyHidden =
        !Number.isFinite(days) ||
        days < 0 ||
        days > Number(layout.preferences?.trashWindowDays || 3);
    }
  }
  if (!dynamicallyHidden) return layout;
  return {
    ...layout,
    hidden: [...new Set([...(layout?.hidden || []), 'trash'])]
  };
}
export function moveDashboardWidget(layout, widgetId, direction) {
  const order = [...(layout?.order || [])];
  const currentIndex = order.indexOf(widgetId);
  const targetIndex = currentIndex + (direction === 'up' ? -1 : 1);
  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= order.length
  ) {
    return layout;
  }
  [order[currentIndex], order[targetIndex]] = [
    order[targetIndex],
    order[currentIndex]
  ];
  return { ...layout, order };
}
