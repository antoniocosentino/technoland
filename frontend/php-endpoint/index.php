<?php
// Independent companion endpoint. Never include or modify the old PHP script.
ini_set('display_errors', '0');
umask(0077);
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');

function reply($body, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}
function readRecord($key) {
    global $db;
    $query = $db->prepare('SELECT value FROM storage WHERE key = ?');
    $query->execute([$key]);
    $value = $query->fetchColumn();
    return $value === false ? null : json_decode($value, true);
}
function saveRecord($key, $value) {
    global $db;
    $query = $db->prepare('INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)');
    $query->execute([$key, json_encode($value, JSON_THROW_ON_ERROR)]);
}
function removeRecord($key) {
    global $db;
    $query = $db->prepare('DELETE FROM storage WHERE key = ?');
    $query->execute([$key]);
}
function requestJson($url, $headers = [], $fields = null) {
    $ch = curl_init($url);
    $retry = 30;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$retry) {
            if (stripos($line, 'Retry-After:') === 0) $retry = max(1, (int) trim(substr($line, 12)));
            return strlen($line);
        },
    ]);
    if ($fields !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
    }
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false) throw new RuntimeException('Upstream connection failed');
    $data = $status === 204 ? null : json_decode($body, true);
    if ($status !== 204 && !is_array($data)) throw new RuntimeException('Invalid upstream JSON');
    return [$status, $data, $retry];
}
function tokenRequest($fields) {
    global $config;
    return requestJson('https://accounts.spotify.com/api/token', [
        'Authorization: Basic ' . base64_encode($config['client_id'] . ':' . $config['client_secret']),
        'Content-Type: application/x-www-form-urlencoded',
    ], $fields);
}
function tokens($data, $previous = null) {
    if (empty($data['access_token'])) throw new RuntimeException('Missing token');
    return [
        'access_token' => $data['access_token'],
        'refresh_token' => $data['refresh_token'] ?? $previous,
        'expires_at' => time() + (int) ($data['expires_in'] ?? 3600),
    ];
}
function spotifyGet($path, $token) {
    return requestJson('https://api.spotify.com/v1/' . $path, ['Authorization: Bearer ' . $token]);
}
function enrich($data, $token) {
    // Match the original app: classify the track's first artist, by exact ID.
    $data['genres'] = null;
    $id = $data['item']['artists'][0]['id'] ?? null;
    if (empty($data['is_playing']) || !is_string($id) || !preg_match('/^[A-Za-z0-9]{22}$/D', $id)) return $data;
    $key = 'artist:' . $id;
    $cached = readRecord($key);
    if ($cached && $cached['until'] > time()) {
        $data['genres'] = $cached['genres'];
        return $data;
    }
    try {
        [$status, $artist, $retry] = spotifyGet('artists/' . $id, $token);
        $genres = $status === 200 && isset($artist['genres']) && is_array($artist['genres'])
            ? array_values(array_filter($artist['genres'], 'is_string')) : null;
        saveRecord($key, ['until' => time() + ($status === 200 ? 86400 : ($status === 429 ? $retry : 60)), 'genres' => $genres]);
        $data['genres'] = $genres;
    } catch (Throwable $error) {
        // Track playback remains useful if artist metadata is unavailable.
        saveRecord($key, ['until' => time() + 60, 'genres' => null]);
    }
    return $data;
}
function publicPlayback($data, $name) {
    return [
        'is_playing' => $data['is_playing'] ?? false,
        'currently_playing_type' => $data['currently_playing_type'] ?? null,
        'item' => $data['item'] ?? null,
        'user_name' => $name,
    ];
}

try {
    $config = require (getenv('TECHNOLAND_CONFIG') ?: '/usr/www/users/kultcm/_db_stuff/technoland-config.php');
    $origins = array_map(function ($url) {
        $p = parse_url($url);
        return $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    }, $config['frontend_urls']);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && !in_array($origin, $origins, true)) reply(['error' => 'Origin not allowed'], 403);
    if ($origin !== '') {
        // This host already adds Access-Control-Allow-Origin: *.
        // Do not emit a second value: browsers reject duplicate CORS origins.
        // API fetches omit cookies and use an explicit app-session bearer token.
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
    $db = new PDO('sqlite:' . $config['database_path']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA busy_timeout = 20000');
    $db->exec('CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    // Remove expired visitor sessions; Spotify tokens never leave this database.
    $db->exec("DELETE FROM storage WHERE key LIKE 'visitor:%' AND CAST(json_extract(value, '$.until') AS INTEGER) < CAST(strftime('%s', 'now') AS INTEGER)");
    $action = $_GET['action'] ?? 'owner';
    $callback = isset($_GET['code']) || isset($_GET['error']);
    if ($action === 'login' || $callback) {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') reply(['error' => 'Method not allowed'], 405);
        session_name('technoland_login');
        session_start(['use_strict_mode' => 1, 'cookie_secure' => true, 'cookie_httponly' => true,
            'cookie_samesite' => 'Lax', 'cookie_path' => parse_url($config['redirect_uri'], PHP_URL_PATH)]);
        if (!$callback) {
            $return = $_GET['return'] ?? '';
            $nonce = $_GET['nonce'] ?? '';
            if (!is_string($return) || !in_array($return, $config['frontend_urls'], true) ||
                !is_string($nonce) || !preg_match('/^[a-f0-9]{64}$/D', $nonce)) reply(['error' => 'Invalid login request'], 400);
            session_regenerate_id(true);
            $_SESSION['oauth'] = ['state' => bin2hex(random_bytes(32)), 'started' => time(), 'return' => $return, 'nonce' => $nonce];
            $params = ['client_id' => $config['client_id'], 'response_type' => 'code', 'redirect_uri' => $config['redirect_uri'],
                'scope' => 'user-read-currently-playing', 'state' => $_SESSION['oauth']['state'], 'show_dialog' => 'true'];
            session_write_close();
            header('Location: https://accounts.spotify.com/authorize?' . http_build_query($params));
            exit;
        }
        $oauth = $_SESSION['oauth'] ?? null;
        unset($_SESSION['oauth']);
        session_write_close();
        $state = $_GET['state'] ?? '';
        if (!$oauth || !is_string($state) || !hash_equals($oauth['state'], $state) || time() - $oauth['started'] > 600) reply(['error' => 'Expired login. Please start again.'], 400);
        if (isset($_GET['error'])) {
            header('Location: ' . $oauth['return'] . '#login_error=declined&nonce=' . $oauth['nonce'], true, 303); exit;
        }
        if (!is_string($_GET['code'] ?? null)) reply(['error' => 'Missing code'], 400);
        [$status, $data] = tokenRequest(['grant_type' => 'authorization_code', 'code' => $_GET['code'], 'redirect_uri' => $config['redirect_uri']]);
        if ($status !== 200) {
            header('Location: ' . $oauth['return'] . '#login_error=failed&nonce=' . $oauth['nonce'], true, 303); exit;
        }
        $record = tokens($data);
        if (empty($record['refresh_token'])) throw new RuntimeException('Missing refresh token');
        $session = bin2hex(random_bytes(32));
        saveRecord('visitor:' . hash('sha256', $session), ['tokens' => $record, 'until' => time() + 28800]);
        // App-only session capability, not a Spotify token; fragment is never sent to the frontend server.
        header('Location: ' . $oauth['return'] . '#session=' . $session . '&nonce=' . $oauth['nonce'], true, 303); exit;
    }
    if (!in_array($action, ['owner', 'playback', 'logout'], true)) reply(['error' => 'Unknown action'], 404);
    if ($_SERVER['REQUEST_METHOD'] !== ($action === 'logout' ? 'POST' : 'GET')) reply(['error' => 'Method not allowed'], 405);
    $db->exec('BEGIN IMMEDIATE');
    if ($action === 'owner') {
        $cached = readRecord('owner');
        if ($cached && $cached['until'] > time()) { $db->exec('COMMIT'); reply($cached['body'], $cached['status']); }
        [$status, $data] = requestJson($config['owner_endpoint']);
        if ($status === 200) {
            $data = publicPlayback($data, 'Antonio');
            $data['genres'] = null;
            if (!empty($data['is_playing'])) {
                try {
                    $app = readRecord('app-token');
                    if (!$app || $app['expires_at'] <= time() + 60) {
                        [$tokenStatus, $tokenData] = tokenRequest(['grant_type' => 'client_credentials']);
                        if ($tokenStatus !== 200) throw new RuntimeException('Artist authorization unavailable');
                        $app = tokens($tokenData);
                        saveRecord('app-token', $app);
                    }
                    $data = enrich($data, $app['access_token']);
                } catch (Throwable $error) { /* Keep playback, with unknown genre. */ }
            }
        } else { $data = ['error' => 'Owner playback unavailable']; }
        saveRecord('owner', ['until' => time() + 10, 'body' => $data, 'status' => $status]);
        $db->exec('COMMIT'); reply($data, $status);
    }
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D', $authorization, $match)) { $db->exec('COMMIT'); reply(['error' => 'Login required'], 401); }
    $key = 'visitor:' . hash('sha256', $match[1]);
    $visitor = readRecord($key);
    if (!$visitor || $visitor['until'] <= time()) { $db->exec('COMMIT'); reply(['error' => 'Login expired'], 401); }
    if ($action === 'logout') { removeRecord($key); $db->exec('COMMIT'); reply(['ok' => true]); }
    if (isset($visitor['cache']) && $visitor['cache']['until'] > time()) {
        $db->exec('COMMIT'); reply($visitor['cache']['body'], $visitor['cache']['status']);
    }
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $record = $visitor['tokens'];
        if ($record['expires_at'] <= time() + 60 || $attempt === 1) {
            [$status, $data, $retry] = tokenRequest(['grant_type' => 'refresh_token', 'refresh_token' => $record['refresh_token']]);
            if ($status === 400 && ($data['error'] ?? '') === 'invalid_grant') {
                removeRecord($key); $db->exec('COMMIT'); reply(['error' => 'Reconnect required'], 401);
            }
            if ($status !== 200) {
                $visitor['cache'] = ['until' => time() + ($status === 429 ? $retry : 15), 'body' => ['error' => 'Spotify unavailable'], 'status' => 503];
                saveRecord($key, $visitor); $db->exec('COMMIT'); reply($visitor['cache']['body'], 503);
            }
            $record = tokens($data, $record['refresh_token']);
            $visitor['tokens'] = $record;
        }
        [$status, $data, $retry] = spotifyGet('me/player/currently-playing', $record['access_token']);
        if ($status === 401 && $attempt === 0) continue;
        break;
    }
    $outputStatus = in_array($status, [200, 204], true) ? 200 : 503;
    $body = $outputStatus === 200 ? enrich(publicPlayback($data ?? [], 'You'), $record['access_token']) : ['error' => 'Spotify unavailable'];
    $visitor['cache'] = ['until' => time() + ($status === 429 ? $retry : 10), 'body' => $body, 'status' => $outputStatus];
    saveRecord($key, $visitor);
    $db->exec('COMMIT'); reply($body, $outputStatus);
} catch (Throwable $error) {
    $db = null;
    error_log('Technoland companion: ' . get_class($error));
    reply(['error' => 'Playback temporarily unavailable'], 503);
}
