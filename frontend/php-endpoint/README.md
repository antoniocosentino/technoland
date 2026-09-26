# Technoland companion endpoint

This is a new, independent endpoint. Do not replace `/lab/technoapi/`, edit its PHP file, or reuse its SQLite database. The old repository `backend/` directory is unused.

The companion reads the owner's playback from the existing public endpoint and adds genres using the first artist's exact Spotify ID. Visitor accounts authorize separately; their Spotify credentials remain in a new server-side SQLite database. The browser receives an opaque app session valid for eight hours, stored only in the current browser tab. Cross-site API calls use this session rather than third-party cookies. The top-level OAuth round trip uses a secure, HttpOnly, SameSite=Lax cookie and a ten-minute state check; a second nonce binds the return to the initiating frontend tab.

## Deploy

1. Create `/lab/technolandapi/` on the PHP host and upload **only `index.php`** there. Requires PHP 7.3+ (use a supported PHP release), cURL, PDO SQLite, SQLite JSON functions, and PHP sessions.
2. Copy `config.example.php` **outside the web root**, to `/usr/www/users/kultcm/_db_stuff/technoland-config.php`. Fill in the Spotify app ID and secret there. Alternatively set the server environment variable `TECHNOLAND_CONFIG` to that private file's absolute path. Do not put secrets in the React environment.
3. Keep `database_path` distinct from `spotify.sqlite`. The private parent directory must be writable by PHP. The new database is created automatically with restrictive permissions.
4. In the Spotify developer dashboard, add exactly `https://www.kultmedia.com/lab/technolandapi/` as an additional redirect URI. Keep the old redirect URI registered. If you choose a different endpoint URL, update `redirect_uri` and the frontend setting together.
5. Configure `frontend_urls` with the exact frontend return URLs, including trailing slashes. Defaults cover GitHub Pages, localhost:3000 and 127.0.0.1:3000. Remove development URLs if not needed.
6. Ensure the host passes the `Authorization` header to PHP. The script accepts `HTTP_AUTHORIZATION` or `REDIRECT_HTTP_AUTHORIZATION`. For Apache/FastCGI, your host may require `SetEnvIf Authorization "(.+)" HTTP_AUTHORIZATION=$1` in this new directory's `.htaccess`.
7. This host already supplies `Access-Control-Allow-Origin: *`; the script deliberately does not emit another origin header. Keep that host rule. The PHP allowlist still rejects unapproved origins, and API fetches omit cookies (visitor requests use an explicit Authorization header). The script supplies allowed methods and headers for preflight requests. If deploying to another host without CORS headers, configure exactly one origin header there or emit it from PHP. Do not add `Access-Control-Allow-Credentials: true` or change the frontend to send cookies.
8. In `frontend/.env`, set:

   ```dotenv
   REACT_APP_API_URL=https://www.kultmedia.com/lab/technoapi/
   REACT_APP_PUBLIC_API_URL=https://www.kultmedia.com/lab/technolandapi/
   ```

   Restart `npm start`, or rebuild for deployment. No frontend Spotify client ID, secret, or redirect setting is needed.

Without `REACT_APP_PUBLIC_API_URL`, the frontend uses the existing playback endpoint directly. Tracks display, genres are UNKNOWN, and visitor login is hidden. The generated local `.env` starts in this mode until the new endpoint has been deployed.

## Behavior and checks

- `GET ?action=owner`: playback from the existing PHP backend, enriched with first-artist genres. Does not read or write the owner's token database.
- `GET ?action=login&return=...&nonce=...`: start visitor OAuth; use the frontend button to supply the correct values.
- OAuth callback to the new endpoint: store visitor tokens server-side and return an app session in the URL fragment. The frontend validates the nonce and immediately removes the fragment.
- `GET ?action=playback` with `Authorization: Bearer <app-session>`: visitor playback and genres.
- `POST ?action=logout` with the same header: delete that visitor session and its Spotify tokens. This does not revoke the Spotify app's authorization; that can be revoked in Spotify account settings.
- Playback is cached for ten seconds; artist genres for one day. Rate-limited visitor requests respect Spotify's Retry-After. Expired visitor sessions are cleaned up on subsequent requests.
- Missing/empty genres produce UNKNOWN, not NO. Episodes and empty/paused playback are treated as not playing a track. Backend errors display a retry message instead of claiming that the user stopped listening.

Before deployment, run `php -l index.php` and `php -l config.example.php`. After deployment, check owner playback with a track playing and paused, then visitor connect → playback → disconnect on localhost and GitHub Pages. Check browser Network: playback requests should go only to the PHP host, with no Spotify tokens returned. Confirm the original endpoint still behaves as before. Confirm an unapproved Origin returns 403 and visitor playback without a session returns 401.

Visitor login remains subject to the Spotify app's current development-mode user access limits. Genres are available only when Spotify returns artist genre metadata. See the official [authorization flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow), [redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri), and [artist response](https://developer.spotify.com/documentation/web-api/reference/get-an-artist).

## Validation in this workspace

The frontend's automated tests and production build can run locally. PHP CLI is not installed and Docker is not running here, so the PHP endpoint and real OAuth round trip still require validation on a PHP host. No remote files have been deployed or changed.
