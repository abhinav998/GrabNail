import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

const secret = 'test-server-secret';
async function run(t, options, check) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  await check(path => fetch(`http://127.0.0.1:${server.address().port}${path}`));
}
test('proxy keeps key upstream and normalizes missing optional metadata', async t => {
  await run(t, { apiKey: secret, fetchImpl: async (url, options) => {
    assert.equal(url.origin, 'https://www.googleapis.com');
    assert.equal(url.searchParams.get('key'), secret);
    assert.equal(url.searchParams.get('id'), 'abcdefghijk');
    assert.equal(options.redirect, 'error');
    return Response.json({ items: [{ snippet: { title: '<script>x</script>', description: 'text', thumbnails: { default: { url: 'https://example.com/thumb.jpg' } } } }] });
  } }, async get => {
    const response = await get('/api/video?id=abcdefghijk');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { title: '<script>x</script>', description: 'text', tags: [], thumbnail: 'https://example.com/thumb.jpg' });
  });
});
test('invalid requests and private files never reach upstream', async t => {
  await run(t, { apiKey: secret, fetchImpl: () => { throw new Error('unexpected upstream call'); } }, async get => {
    for (const path of ['/api/video', '/api/video?id=bad', '/api/video?id=abcdefghijk&key=override', '/api/video?id=abcdefghijk&id=abcdefghijk']) {
      assert.equal((await get(path)).status, 400);
    }
    for (const path of ['/.env', '/server.js', '/.git/config', '/package.json', '/README.md']) assert.equal((await get(path)).status, 404);
    for (const path of ['/', '/script.js']) {
      const response = await get(path);
      assert.equal(response.status, 200);
      const body = await response.text();
      assert.ok(!body.includes(secret));
      assert.ok(!/AIza[\w-]+|googleapis.com\/youtube/.test(body));
    }
  });
});
for (const [name, options, status] of [
  ['missing configuration', {}, 503],
  ['empty result', { apiKey: secret, fetchImpl: async () => Response.json({ items: [] }) }, 404],
  ['upstream failure', { apiKey: secret, fetchImpl: async () => new Response(secret, { status: 403 }) }, 502],
  ['network or timeout failure', { apiKey: secret, fetchImpl: async () => { throw new Error(secret); } }, 502],
  ['malformed response', { apiKey: secret, fetchImpl: async () => new Response('invalid json') }, 502]
]) test(name, async t => {
  await run(t, options, async get => {
    const response = await get('/api/video?id=abcdefghijk');
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes(secret));
  });
});
test('rejects non-GET requests', async t => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/video?id=abcdefghijk`, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});
