import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Explicit public allowlist: never serve the repository or environment files.
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/search.png', ['search.png', 'image/png']]
]);

export function createApp({ apiKey, fetchImpl = fetch } = {}) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return json(405, { error: 'Method not allowed.' });
      }
      if (url.pathname === '/api/video') {
        const videoId = url.searchParams.get('id');
        if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
            [...url.searchParams.keys()].some(key => key !== 'id') || url.searchParams.getAll('id').length !== 1) {
          return json(400, { error: 'Provide a valid 11-character video ID.' });
        }
        if (!apiKey) return json(503, { error: 'Video service is not configured.' });
        const upstream = new URL('https://www.googleapis.com/youtube/v3/videos');
        upstream.search = new URLSearchParams({
          key: apiKey, part: 'snippet', id: videoId,
          fields: 'items(snippet(title,description,tags,thumbnails))'
        }).toString();
        // Fixed upstream and no redirects prevent this endpoint becoming an arbitrary proxy.
        const response = await fetchImpl(upstream, { signal: AbortSignal.timeout(10000), redirect: 'error' });
        if (!response.ok) return json(502, { error: 'Video service is temporarily unavailable.' });
        const data = await response.json();
        const snippet = data.items?.[0]?.snippet;
        if (!snippet) return json(404, { error: 'Video not found or unavailable.' });
        const thumbnails = snippet.thumbnails ?? {};
        const thumbnail = thumbnails.maxres ?? thumbnails.standard ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default;
        return json(200, {
          title: typeof snippet.title === 'string' ? snippet.title : '',
          description: typeof snippet.description === 'string' ? snippet.description : '',
          tags: Array.isArray(snippet.tags) ? snippet.tags.filter(tag => typeof tag === 'string') : [],
          thumbnail: thumbnail?.url ?? null
        });
      }
      const asset = assets.get(url.pathname);
      if (!asset) return json(404, { error: 'Not found.' });
      const body = await readFile(new URL(asset[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': asset[1] });
      res.end(body);
    } catch {
      // Never return upstream bodies, exception messages, or request URLs containing secrets.
      json(502, { error: 'Unable to load video information. Please try again.' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.YOUTUBE_API_KEY?.trim()) {
    console.error('Set YOUTUBE_API_KEY in the server environment before starting.');
    process.exit(1);
  }
  createApp({ apiKey: process.env.YOUTUBE_API_KEY.trim() }).listen(process.env.PORT || 3000, () => {
    console.log('GrabNail server started.');
  });
}
