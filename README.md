# GrabNail

A YouTube metadata tool showing a video's title, description, tags, and thumbnail.

## Secret boundary

The browser loads `script.js` and calls the same-origin `GET /api/video?id=VIDEO_ID` endpoint. `server.js` validates the ID, calls the fixed YouTube Data API endpoint using `YOUTUBE_API_KEY` from the server environment, and returns only the metadata needed by the UI. Neither the key nor raw upstream errors are returned to the browser. Only explicitly listed public assets are served; `.env`, server code, and repository files are inaccessible over HTTP.

**Revoke the previously committed Google API key and create a replacement before deployment.** Removing it from current code does not remove it from Git history, existing clones, or cached deployments. Check the old key's usage and quota. Restrict the replacement to YouTube Data API v3 and, where your hosting supports stable outbound IPs, restrict it to those server IPs. Never place the replacement in HTML, browser JavaScript, frontend build variables, or Git.

## Run locally

Requires Node.js 22+; there are no npm dependencies.

```sh
cp .env.example .env
# Edit .env and set a NEW YOUTUBE_API_KEY with YouTube Data API v3 enabled.
npm start
```

Open `http://localhost:3000`. Optional `PORT` defaults to `3000`. The ignored `.env` file is loaded by the start command; existing environment variables take precedence. The server refuses to start without a key.

## Deploy

1. Deploy this repository to a host that runs Node.js 22+ as a persistent web service. Set its start command to `npm start`; no build or install step is required.
2. Configure `YOUTUBE_API_KEY` in the host's server-side secret/environment settings, and allow outbound HTTPS to `www.googleapis.com`. Use the host's assigned `PORT`.
3. Serve the application through HTTPS. Route both the frontend and `/api/video` to this service under the same origin. Do not deploy the repository directory as a public static root.
4. Replace any old static deployment with this service. GitHub Pages or opening `index.html` directly cannot run this backend. If retaining a static host, configure a same-origin reverse proxy for `/api/video` to the Node service and serve only public assets there.
5. Configure edge rate limits, request/concurrency limits, and Google quota/budget monitoring before exposing the service publicly. The endpoint is public and can consume quota: same-origin routing and hiding a key do not authenticate users. For a private tool, require authentication at the hosting gateway. For multiple instances, enforce shared limits at the gateway rather than process-local counters.
6. Ensure application, proxy, and outbound HTTP tracing logs redact the `key` query parameter. This implementation does not log upstream URLs or errors. Rotate secrets in the host settings and restart/redeploy the service when needed.

## Validate

```sh
npm test
node --check server.js
node --check script.js
curl -i 'http://localhost:3000/api/video?id=INVALID'
curl -i 'http://localhost:3000/.env'
```

The invalid ID returns 400; `.env` returns 404. Tests use mocked upstream responses and cover secret forwarding only to the fixed upstream, metadata normalization, missing configuration, unavailable videos, malformed responses, network failures, sanitized errors, method restrictions, and private-file denial. No real Google credentials or quota are required for tests.

After deploying, submit a public YouTube watch, short, or `youtu.be` URL. Confirm metadata appears, including a fallback thumbnail and empty tags when absent. In browser DevTools, verify the request goes only to `/api/video?id=...` with no API key, and search downloaded HTML/JavaScript for the old key or a replacement. Confirm unavailable videos show a readable error and the submit button re-enables after failure. Test once with a disabled replacement key to confirm the UI receives a generic error without Google details. Automated tests do not make a live Google request or verify your hosting configuration.
