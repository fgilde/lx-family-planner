import assert from 'node:assert/strict';
import test from 'node:test';
import {
  metaImage,
  resolveMediaPreview,
  safeCoverUrl,
  youtubeVideoId
} from './mediaPreview.js';

test('YouTube video links receive their official thumbnail without a key', async () => {
  assert.equal(
    youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    youtubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=12'),
    'dQw4w9WgXcQ'
  );
  assert.deepEqual(
    await resolveMediaPreview({
      kind: 'youtube',
      url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ'
    }),
    {
      coverUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      providerTitle: ''
    }
  );
});

test('YouTube channel pages only accept official thumbnail hosts', async () => {
  const preview = await resolveMediaPreview(
    {
      kind: 'youtube',
      url: 'https://www.youtube.com/@example'
    },
    {
      fetchImpl: async () => new Response(
        '<meta property="og:image" content="https://yt3.googleusercontent.com/channel-cover">',
        {
          status: 200,
          headers: { 'content-type': 'text/html' }
        }
      )
    }
  );
  assert.equal(
    preview.coverUrl,
    'https://yt3.googleusercontent.com/channel-cover'
  );
  assert.equal(
    metaImage(
      '<meta content="https://evil.example/cover.jpg" property="og:image">'
    ),
    'https://evil.example/cover.jpg'
  );
  assert.equal(
    safeCoverUrl('https://evil.example/cover.jpg', 'youtube'),
    ''
  );
});

test('YouTube preview redirects cannot leave official YouTube hosts', async () => {
  let requestCount = 0;
  const preview = await resolveMediaPreview(
    {
      kind: 'youtube',
      url: 'https://www.youtube.com/@example'
    },
    {
      fetchImpl: async () => {
        requestCount += 1;
        return new Response('', {
          status: 302,
          headers: { location: 'http://127.0.0.1/private' }
        });
      }
    }
  );
  assert.deepEqual(preview, { coverUrl: '', providerTitle: '' });
  assert.equal(requestCount, 1);
});

test('Spotify oEmbed covers are normalized and untrusted images are rejected', async () => {
  const preview = await resolveMediaPreview(
    {
      kind: 'spotify',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
    },
    {
      fetchImpl: async request => {
        assert.match(String(request), /^https:\/\/open\.spotify\.com\/oembed\?/);
        return Response.json({
          title: 'Heute gute Laune',
          thumbnail_url: 'https://i.scdn.co/image/playlist-cover'
        });
      }
    }
  );
  assert.deepEqual(preview, {
    coverUrl: 'https://i.scdn.co/image/playlist-cover',
    providerTitle: 'Heute gute Laune'
  });
  assert.equal(
    safeCoverUrl('http://i.scdn.co/image/insecure', 'spotify'),
    ''
  );
});
