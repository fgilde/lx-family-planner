export function isAppleMobileDevice({
  userAgent = '',
  platform = '',
  maxTouchPoints = 0
} = {}) {
  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (platform === 'MacIntel' && Number(maxTouchPoints) > 1)
  );
}

export function isStandaloneWebApp({ standalone = false } = {}) {
  return Boolean(standalone);
}

export function shouldOfferIosInstall({
  userAgent = '',
  platform = '',
  maxTouchPoints = 0,
  standalone = false,
  dismissedUntil = 0,
  now = Date.now()
} = {}) {
  return (
    isAppleMobileDevice({ userAgent, platform, maxTouchPoints }) &&
    !isStandaloneWebApp({ standalone }) &&
    Number(dismissedUntil || 0) <= now
  );
}
