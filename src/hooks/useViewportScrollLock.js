import { useEffect } from 'react';

// iOS Safari keeps scrolling the visual viewport when only body overflow is
// hidden. A fixed body is the reliable lock there. This module-level state
// also lets nested dialogs cooperate.
let lockCount = 0;
let scrollY = 0;
let previousBodyStyle = null;
let previousHtmlStyle = null;

const BODY_STYLE_KEYS = [
  'position', 'top', 'left', 'right', 'width', 'overflow', 'overscrollBehavior'
];

function captureInlineStyle(element, keys) {
  return Object.fromEntries(keys.map(key => [key, element.style[key]]));
}

function restoreInlineStyle(element, snapshot) {
  Object.entries(snapshot).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

function lockViewport() {
  if (lockCount > 0) {
    lockCount += 1;
    return;
  }

  const { body, documentElement } = document;
  scrollY = window.scrollY;
  previousBodyStyle = captureInlineStyle(body, BODY_STYLE_KEYS);
  previousHtmlStyle = captureInlineStyle(documentElement, ['overscrollBehavior']);
  lockCount = 1;
  documentElement.classList.add('lx-viewport-scroll-locked');
  body.classList.add('lx-viewport-scroll-locked');
  Object.assign(body.style, {
    position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', width: '100%',
    overflow: 'hidden', overscrollBehavior: 'none'
  });
  documentElement.style.overscrollBehavior = 'none';
}

function unlockViewport() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const { body, documentElement } = document;
  restoreInlineStyle(body, previousBodyStyle || {});
  restoreInlineStyle(documentElement, previousHtmlStyle || {});
  body.classList.remove('lx-viewport-scroll-locked');
  documentElement.classList.remove('lx-viewport-scroll-locked');
  window.scrollTo(0, scrollY);
  previousBodyStyle = null;
  previousHtmlStyle = null;
}

export function useViewportScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;
    lockViewport();
    return unlockViewport;
  }, [isLocked]);
}
