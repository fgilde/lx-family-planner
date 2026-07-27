import React from 'react';

export function DashboardWidget({
  widgetId: _widgetId,
  as: Element = 'section',
  children,
  className = '',
  ...props
}) {
  return (
    <Element className={className} {...props}>
      {children}
    </Element>
  );
}
export default function OrderedDashboardGrid({
  children,
  className = '',
  layout
}) {
  const childMap = new Map(
    React.Children.toArray(children)
      .filter(child => React.isValidElement(child) && child.props.widgetId)
      .map(child => [child.props.widgetId, child])
  );
  const hidden = new Set(layout.hidden || []);
  return (
    <div className={`${className} density-${layout.density}`}>
      {layout.order
        .filter(widgetId => !hidden.has(widgetId))
        .map(widgetId => {
          const child = childMap.get(widgetId);
          return child
            ? React.cloneElement(child, { key: widgetId })
            : null;
        })}
    </div>
  );
}
