const YOUTUBE_PAGE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtubekids.com',
  'www.youtubekids.com'
]);
const YOUTUBE_REDIRECT_HOSTS = new Set([
  ...YOUTUBE_PAGE_HOSTS,
  'consent.youtube.com'
]);

const COVER_HOSTS = {
  youtube: new Set([
    'i.ytimg.com',
    'img.youtube.com',
    'yt3.googleusercontent.com',
    'yt3.ggpht.com'
  ]),
  spotify: new Set([
    'i.scdn.co',
    'mosaic.scdn.co',
    'image-cdn-ak.spotifycdn.com'
  ])
};

const PREVIEW_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

function youtubeVideoId(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return '';
  }
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    return /^[a-z0-9_-]{6,20}$/i.test(url.pathname.slice(1))
      ? url.pathname.slice(1)
      : '';
  }
  if (!YOUTUBE_PAGE_HOSTS.has(host)) return '';
  const pathMatch = url.pathname.match(
    /^\/(?:shorts|embed|live)\/([a-z0-9_-]{6,20})(?:\/|$)/i
  );
  const candidate = pathMatch?.[1] || url.searchParams.get('v') || '';
  return /^[a-z0-9_-]{6,20}$/i.test(candidate) ? candidate : '';
}

function safeCoverUrl(value, kind) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return '';
  }
  const allowedHosts = COVER_HOSTS[kind];
  if (
    url.protocol !== 'https:' ||
    !allowedHosts?.has(url.hostname.toLowerCase())
  ) {
    return '';
  }
  return url.href;
}

function decodeHtmlAttribute(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function metaImage(html) {
  const source = String(html || '');
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return decodeHtmlAttribute(match[1]);
  }
  return '';
}

async function responseTextLimited(response) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_HTML_BYTES) {
    throw new Error('Die Medienseite ist für eine Vorschau zu groß.');
  }
  if (!response.body?.getReader) {
    const text = await response.text();
    return text.slice(0, MAX_HTML_BYTES);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  while (received < MAX_HTML_BYTES) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (received >= MAX_HTML_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return `${text}${decoder.decode()}`.slice(0, MAX_HTML_BYTES);
}

async function fetchSpotifyPreview(url, fetchImpl) {
  const endpoint = new URL('https://open.spotify.com/oembed');
  endpoint.searchParams.set('url', url.href);
  const response = await fetchImpl(endpoint, {
    headers: {
      Accept: 'application/json'
    },
    redirect: 'error',
    signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS)
  });
  if (!response.ok) return { coverUrl: '', providerTitle: '' };
  const payload = await response.json();
  return {
    coverUrl: safeCoverUrl(payload.thumbnail_url, 'spotify'),
    providerTitle: String(payload.title || '').trim().slice(0, 160)
  };
}

async function fetchYoutubePreview(url, fetchImpl) {
  const videoId = youtubeVideoId(url.href);
  if (videoId) {
    return {
      coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      providerTitle: ''
    };
  }
  if (!YOUTUBE_PAGE_HOSTS.has(url.hostname.toLowerCase())) {
    return { coverUrl: '', providerTitle: '' };
  }
  let currentUrl = url;
  let response;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    response = await fetchImpl(currentUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.7',
        'User-Agent': 'LX-Family-Media-Preview/1.0'
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS)
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get('location');
    if (!location) return { coverUrl: '', providerTitle: '' };
    const nextUrl = new URL(location, currentUrl);
    if (
      nextUrl.protocol !== 'https:' ||
      !YOUTUBE_REDIRECT_HOSTS.has(nextUrl.hostname.toLowerCase())
    ) {
      return { coverUrl: '', providerTitle: '' };
    }
    currentUrl = nextUrl;
  }
  if (!response.ok) return { coverUrl: '', providerTitle: '' };
  const finalHost = currentUrl.hostname.toLowerCase();
  if (!YOUTUBE_PAGE_HOSTS.has(finalHost)) {
    return { coverUrl: '', providerTitle: '' };
  }
  const html = await responseTextLimited(response);
  return {
    coverUrl: safeCoverUrl(metaImage(html), 'youtube'),
    providerTitle: ''
  };
}

export async function resolveMediaPreview(
  { kind, url },
  { fetchImpl = fetch } = {}
) {
  const normalizedKind = kind === 'spotify' ? 'spotify' : 'youtube';
  const parsedUrl = new URL(url);
  return normalizedKind === 'spotify'
    ? fetchSpotifyPreview(parsedUrl, fetchImpl)
    : fetchYoutubePreview(parsedUrl, fetchImpl);
}

export {
  metaImage,
  safeCoverUrl,
  youtubeVideoId
};
