export const DASHBOARD_DENSITIES = new Set(['comfortable', 'compact']);

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
      : 'comfortable'
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
