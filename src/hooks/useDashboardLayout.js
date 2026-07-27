import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  moveDashboardWidget,
  normalizeDashboardLayout
} from '../utils/dashboardLayout';

function storageKey(profileId, mode) {
  return `lx_dashboard_layout_v1:${profileId || 'unknown'}:${mode}`;
}
function readLayout(key, widgetIds) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    return normalizeDashboardLayout(stored, widgetIds);
  } catch {
    return normalizeDashboardLayout(null, widgetIds);
  }
}

export default function useDashboardLayout(profileId, mode, widgetIds) {
  const stableWidgetIds = useMemo(
    () => [...new Set(widgetIds)],
    [widgetIds.join('|')]
  );
  const key = storageKey(profileId, mode);
  const [layout, setLayout] = useState(() =>
    readLayout(key, stableWidgetIds)
  );

  useEffect(() => {
    setLayout(readLayout(key, stableWidgetIds));
  }, [key, stableWidgetIds]);

  const saveLayout = useCallback(nextValue => {
    setLayout(previous => {
      const candidate =
        typeof nextValue === 'function'
          ? nextValue(previous)
          : nextValue;
      const normalized = normalizeDashboardLayout(
        candidate,
        stableWidgetIds
      );
      try {
        localStorage.setItem(key, JSON.stringify(normalized));
      } catch {
        // The layout remains usable for the current session.
      }
      return normalized;
    });
  }, [key, stableWidgetIds]);

  const toggleWidget = useCallback(widgetId => {
    saveLayout(previous => {
      const hidden = new Set(previous.hidden);
      if (hidden.has(widgetId)) {
        hidden.delete(widgetId);
      } else if (previous.order.length - hidden.size > 1) {
        hidden.add(widgetId);
      }
      return { ...previous, hidden: [...hidden] };
    });
  }, [saveLayout]);

  const moveWidget = useCallback((widgetId, direction) => {
    saveLayout(previous =>
      moveDashboardWidget(previous, widgetId, direction)
    );
  }, [saveLayout]);

  const setDensity = useCallback(density => {
    saveLayout(previous => ({ ...previous, density }));
  }, [saveLayout]);

  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Reset still applies to the current session.
    }
    setLayout(normalizeDashboardLayout(null, stableWidgetIds));
  }, [key, stableWidgetIds]);

  return {
    layout,
    moveWidget,
    resetLayout,
    setDensity,
    toggleWidget
  };
}
