<?php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
ob_start();

require __DIR__ . '/db.php';

$allowedOrigins = cfg()['allowed_origins'] ?? [];
if (!is_array($allowedOrigins) || !$allowedOrigins) {
    $base = (string) (cfg()['base_url'] ?? '');
    $host = parse_url($base, PHP_URL_SCHEME) . '://' . parse_url($base, PHP_URL_HOST);
    $allowedOrigins = $host !== '://' ? [$host] : ['*'];
}
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$originOk = static function (string $o, array $list): bool {
    if (in_array($o, $list, true)) {
        return true;
    }
    foreach ($list as $item) {
        if (is_string($item) && strlen($item) > 2 && $item[0] === '*' && $item[1] === '.') {
            $suffix = substr($item, 1);
            if (substr($o, -strlen($suffix)) === $suffix) {
                return true;
            }
        }
    }
    return false;
};
if ($origin !== '' && $originOk($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} elseif ($origin === '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
} elseif (in_array('*', $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
header('Access-Control-Max-Age: 86400');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

const TZ_OFFSET = 7 * 3600; // Томск, UTC+7

function tomskTs(?string $utc = null): int
{
    $ts = $utc === null ? time() : strtotime($utc . ' UTC');
    return $ts + TZ_OFFSET;
}

function fmtTime(?string $utc = null): string
{
    $ts = tomskTs($utc);
    $today = (int) floor(tomskTs() / 86400);
    $day = (int) floor($ts / 86400);
    $diff = $today - $day;
    if ($diff <= 0) {
        return gmdate('H:i', $ts);
    }
    if ($diff === 1) {
        return 'вчера ' . gmdate('H:i', $ts);
    }
    if (gmdate('Y', $ts) === gmdate('Y', tomskTs())) {
        return gmdate('d.m H:i', $ts);
    }
    return gmdate('d.m.Y H:i', $ts);
}

const ROOMS = ['kuhnya', 'kurilka', 'baraholka', 'ucheba', 'tomsk', 'znakomstva', 'flirt', 'sex', 'noch'];
const ONLINE_SEC = 75;
const OWNER_NICK = 'админ';
const OWNER_NICKS = ['админ', 'комендант'];
const UNI_LIST = ['ТГУ', 'ТУСУР', 'СибГМУ', 'ТПУ', 'ТГАСУ', 'ТГПУ'];
const ROOM_UNI = [
    'kuhnya' => 'ТГУ',
    'ucheba' => 'ТУСУР',
    'tomsk' => 'ТПУ',
    'flirt' => 'СибГМУ',
    'sex' => 'ТГАСУ',
    'noch' => 'ТГПУ',
];

function canEnterRoom(string $room, array $user): bool
{
    if (!empty($user['isAdmin'])) {
        return true;
    }
    if (!isset(ROOM_UNI[$room])) {
        return true;
    }
    return ($user['uni'] ?? null) === ROOM_UNI[$room];
}

function isOwnerNick(string $lower): bool
{
    return in_array($lower, OWNER_NICKS, true);
}

function out(int $code, array $payload): void
{
    if (ob_get_level() > 0) {
        ob_clean();
    }
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $code, string $message): void
{
    out($code, ['error' => $message]);
}

function token(): string
{
    $h = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'x-auth-token') {
                $h = $v;
            }
        }
    }
    return trim((string) $h);
}

function body(): array
{
    static $data = null;
    if ($data === null) {
        $raw = file_get_contents('php://input');
        $data = $raw ? (json_decode($raw, true) ?: []) : [];
    }
    return $data;
}

function param(string $name, $default = null)
{
    return $_GET[$name] ?? body()[$name] ?? $default;
}

function shapeUser(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'nick' => $r['nick'],
        'color' => (int) $r['color'],
        'status' => $r['status'],
        'room' => $r['room'],
        'since' => gmdate('d.m.Y', tomskTs($r['created_at'])),
        'avatar' => (int) $r['avatar'],
        'avatarUrl' => $r['avatar_url'],
        'isAdmin' => (bool) ($r['is_admin'] ?? false),
        'uni' => $r['uni'] ?? null,
        'email' => $r['email'] ?? null,
        'emailVerified' => !empty($r['email_verified_at']),
    ];
}

function clientIp(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return mb_substr($ip, 0, 45);
}

function hasAttemptTable(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS login_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            nick VARCHAR(32) NULL,
            at DATETIME NOT NULL,
            INDEX idx_ip_at (ip, at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function hasSecurityTable(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS security_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event VARCHAR(24) NOT NULL,
            nick VARCHAR(32) NULL,
            ip VARCHAR(45) NOT NULL,
            note VARCHAR(160) NULL,
            at DATETIME NOT NULL,
            INDEX idx_at (at),
            INDEX idx_event (event)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function logSecurity(string $event, ?string $nick, string $note = ''): void
{
    if (!hasSecurityTable()) {
        return;
    }
    try {
        q('DELETE FROM security_log WHERE at < UTC_TIMESTAMP() - INTERVAL 30 DAY');
        q('INSERT INTO security_log (event, nick, ip, note, at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())', [
            mb_substr($event, 0, 24),
            $nick !== null && $nick !== '' ? mb_substr($nick, 0, 32) : null,
            clientIp(),
            mb_substr($note, 0, 160),
        ]);
    } catch (Throwable $e) {
        // журнал не должен ломать основную работу
    }
}

function loginGuard(string $nick): void
{
    if (!hasAttemptTable()) {
        return;
    }
    q('DELETE FROM login_attempts WHERE at < UTC_TIMESTAMP() - INTERVAL 1 HOUR');
    $row = one(
        'SELECT COUNT(*) AS n FROM login_attempts
         WHERE at > UTC_TIMESTAMP() - INTERVAL 15 MINUTE AND (ip = ? OR nick = ?)',
        [clientIp(), mb_strtolower($nick)]
    );
    if ((int) ($row['n'] ?? 0) >= 10) {
        logSecurity('login_blocked', $nick, 'Вход заблокирован на 15 минут');
        fail(429, 'Слишком много попыток входа. Подожди 15 минут.');
    }
}

function loginFailed(string $nick): void
{
    if (!hasAttemptTable()) {
        return;
    }
    q('INSERT INTO login_attempts (ip, nick, at) VALUES (?, ?, UTC_TIMESTAMP())',
      [clientIp(), mb_substr(mb_strtolower($nick), 0, 32)]);
    logSecurity('login_fail', $nick, 'Неверный ник или пароль');
}

function loginPassed(string $nick): void
{
    if (!hasAttemptTable()) {
        return;
    }
    q('DELETE FROM login_attempts WHERE ip = ? OR nick = ?', [clientIp(), mb_strtolower($nick)]);
}

function currentUser(): ?array
{
    $t = token();
    if (!$t) {
        return null;
    }
    $r = one(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.created_at > UTC_TIMESTAMP() - INTERVAL 90 DAY',
        [$t]
    );
    return $r ? shapeUser($r) : null;
}

function requireUser(string $message = 'Не авторизован'): array
{
    $u = currentUser();
    if (!$u) {
        fail(401, $message);
    }
    return $u;
}

function verifiedCond(string $alias = ''): string
{
    if (!hasEmailColumns()) {
        return '';
    }
    $p = $alias === '' ? '' : $alias . '.';
    return " AND ({$p}email_verified_at IS NOT NULL OR {$p}email_code IS NULL)";
}

function hasCryptoTable(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS user_keys (
            user_id INT PRIMARY KEY,
            public_jwk TEXT NOT NULL,
            private_enc TEXT NOT NULL,
            salt VARCHAR(64) NOT NULL,
            iv VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        db()->exec("CREATE TABLE IF NOT EXISTS vault_key (
            id TINYINT PRIMARY KEY,
            public_jwk TEXT NOT NULL,
            fingerprint VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function hasDmCipherColumn(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'direct_messages'
               AND COLUMN_NAME = 'cipher'"
        );
        if ($found < 1) {
            try {
                db()->exec("ALTER TABLE direct_messages ADD COLUMN cipher MEDIUMTEXT NULL");
                $found = 1;
            } catch (Throwable $e) {
                // работаем без шифрования
            }
        }
        $ok = $found >= 1;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function vaultPublicJwk(): ?string
{
    if (!hasCryptoTable()) {
        return null;
    }
    $row = one('SELECT public_jwk FROM vault_key WHERE id = 1');
    return $row ? (string) $row['public_jwk'] : null;
}

function hasIpColumns(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND COLUMN_NAME IN ('last_ip', 'last_city')"
        );
        if ($found < 2) {
            try {
                db()->exec("ALTER TABLE users
                    ADD COLUMN last_ip VARCHAR(45) NULL,
                    ADD COLUMN last_city VARCHAR(80) NULL");
                $found = 2;
            } catch (Throwable $e) {
                // нет прав на ALTER — работаем без геоданных
            }
        }
        $ok = $found >= 2;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function geoCity(string $ip): ?string
{
    if ($ip === '' || $ip === '0.0.0.0') {
        return null;
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        return 'локальная сеть';
    }
    if ((cfg()['geo_lookup'] ?? true) === false) {
        return null;
    }
    try {
        $ctx = stream_context_create(['http' => ['timeout' => 2, 'ignore_errors' => true]]);
        $raw = @file_get_contents(
            'http://ip-api.com/json/' . urlencode($ip) . '?fields=status,city,regionName,country&lang=ru',
            false,
            $ctx
        );
        if ($raw === false) {
            return null;
        }
        $j = json_decode($raw, true);
        if (!is_array($j) || ($j['status'] ?? '') !== 'success') {
            return null;
        }
        $parts = array_filter([
            (string) ($j['city'] ?? ''),
            (string) ($j['country'] ?? ''),
        ], static fn($v) => trim($v) !== '');
        if (!$parts) {
            return null;
        }
        return mb_substr(implode(', ', $parts), 0, 80);
    } catch (Throwable $e) {
        return null;
    }
}

function rememberIp(int $userId): void
{
    if (!hasIpColumns()) {
        return;
    }
    $ip = clientIp();
    try {
        $row = one('SELECT last_ip, last_city FROM users WHERE id = ?', [$userId]);
        if ($row && (string) ($row['last_ip'] ?? '') === $ip && !empty($row['last_city'])) {
            return;
        }
        $city = geoCity($ip);
        q('UPDATE users SET last_ip = ?, last_city = ? WHERE id = ?', [$ip, $city, $userId]);
    } catch (Throwable $e) {
        // геоданные не критичны
    }
}

function rememberIpThrottled(int $userId): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    rememberIp($userId);
}

function touch_user(int $id, ?string $room = null): void
{
    if ($room !== null) {
        q('UPDATE users SET last_seen = UTC_TIMESTAMP(), room = ? WHERE id = ?', [$room, $id]);
    } else {
        q('UPDATE users SET last_seen = UTC_TIMESTAMP() WHERE id = ?', [$id]);
    }
    rememberIpThrottled($id);
}

function hasTypingColumns(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND COLUMN_NAME IN ('typing_at', 'typing_room')"
        );
        if ($found < 2) {
            try {
                db()->exec("ALTER TABLE users
                    ADD COLUMN typing_at DATETIME NULL,
                    ADD COLUMN typing_room VARCHAR(32) NULL");
                $found = 2;
            } catch (Throwable $e) {
                // нет прав на ALTER — просто работаем без индикатора
            }
        }
        $ok = $found >= 2;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function hasUniColumn(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'uni'"
        );
        if ($found < 1) {
            try {
                db()->exec("ALTER TABLE users ADD COLUMN uni VARCHAR(16) NULL");
                $found = 1;
            } catch (Throwable $e) {
                // нет прав на ALTER
            }
        }
        $ok = $found >= 1;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function notifyFromAdmin(int $recipientId, string $text): void
{
    try {
        $admin = one('SELECT id, nick, color, avatar, avatar_url FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1');
        if (!$admin || (int) $admin['id'] === $recipientId) {
            return;
        }
        q(
            'INSERT INTO direct_messages
             (sender_id, recipient_id, sender_nick, sender_color, text, sender_avatar, sender_avatar_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [
                (int) $admin['id'],
                $recipientId,
                $admin['nick'],
                (int) $admin['color'],
                mb_substr($text, 0, 500),
                (int) $admin['avatar'],
                $admin['avatar_url'],
            ]
        );
    } catch (Throwable $e) {
        // уведомление не критично
    }
}

function hasSettingsTable(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS app_settings (
            name VARCHAR(32) PRIMARY KEY,
            value VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function setting(string $name, string $default): string
{
    if (!hasSettingsTable()) {
        return $default;
    }
    try {
        $v = scalar('SELECT value FROM app_settings WHERE name = ?', [$name]);
        return $v === null || $v === false ? $default : (string) $v;
    } catch (Throwable $e) {
        return $default;
    }
}

function settingSet(string $name, string $value): void
{
    if (!hasSettingsTable()) {
        return;
    }
    try {
        q('INSERT INTO app_settings (name, value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE value = VALUES(value)', [$name, $value]);
    } catch (Throwable $e) {
        // не критично
    }
}

function hasTickerTable(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS ticker_posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            nick VARCHAR(32) NOT NULL,
            uni VARCHAR(16) NULL,
            text VARCHAR(120) NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            decided_at DATETIME NULL,
            expires_at DATETIME NULL,
            live_days INT NOT NULL DEFAULT 7,
            reject_reason VARCHAR(200) NULL,
            INDEX idx_status (status, created_at),
            INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticker_posts'
               AND COLUMN_NAME IN ('expires_at', 'live_days', 'reject_reason')"
        );
        if ($found < 3) {
            try {
                db()->exec("ALTER TABLE ticker_posts
                    ADD COLUMN expires_at DATETIME NULL,
                    ADD COLUMN live_days INT NOT NULL DEFAULT 7,
                    ADD COLUMN reject_reason VARCHAR(200) NULL");
            } catch (Throwable $e) {
                try {
                    db()->exec("ALTER TABLE ticker_posts ADD COLUMN reject_reason VARCHAR(200) NULL");
                } catch (Throwable $e2) {
                    // колонка уже есть
                }
            }
        }
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function hasEmailColumns(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        $found = (int) scalar(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND COLUMN_NAME IN ('email', 'email_verified_at', 'email_code', 'email_code_at')"
        );
        if ($found < 4) {
            try {
                db()->exec("ALTER TABLE users
                    ADD COLUMN email VARCHAR(120) NULL,
                    ADD COLUMN email_verified_at DATETIME NULL,
                    ADD COLUMN email_code VARCHAR(8) NULL,
                    ADD COLUMN email_code_at DATETIME NULL");
                $found = 4;
            } catch (Throwable $e) {
                // нет прав на ALTER — работаем без почты
            }
        }
        $ok = $found >= 4;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function sendCodeMail(string $email, string $nick, string $code, bool $isRecovery = false): bool
{
    $host = $_SERVER['HTTP_HOST'] ?? 'chat-tom.ru';
    $from = 'noreply@' . preg_replace('/^www\./', '', $host);
    $title = $isRecovery ? 'Восстановление пароля — ЧАТ-ОБЩАГА' : 'Код подтверждения — ЧАТ-ОБЩАГА';
    $line = $isRecovery ? 'Код для смены пароля' : 'Код подтверждения регистрации';
    $subject = '=?UTF-8?B?' . base64_encode($title) . '?=';
    $message = '<p>Привет, ' . htmlspecialchars($nick, ENT_QUOTES, 'UTF-8') . '!</p>'
        . '<p>' . $line . ': <b style="font-size:22px">' . $code . '</b></p>'
        . '<p>Код действует 30 минут. Если это не ты — просто удали письмо.</p>';
    $headers = "MIME-Version: 1.0\r\n"
        . "Content-type: text/html; charset=utf-8\r\n"
        . 'From: =?UTF-8?B?' . base64_encode('ЧАТ-ОБЩАГА') . "?= <{$from}>\r\n";
    return @mail($email, $subject, $message, $headers);
}

function issueEmailCode(int $userId, string $email, string $nick, bool $isRecovery = false): bool
{
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    q('UPDATE users SET email_code = ?, email_code_at = UTC_TIMESTAMP() WHERE id = ?', [$code, $userId]);
    return sendCodeMail($email, $nick, $code, $isRecovery);
}

function maskEmail(string $email): string
{
    $parts = explode('@', $email);
    $name = $parts[0] ?? '';
    $domain = $parts[1] ?? '';
    $visible = mb_substr($name, 0, min(2, mb_strlen($name)));
    return $visible . str_repeat('*', max(2, mb_strlen($name) - 2)) . '@' . $domain;
}

function shapeMessage(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'nick' => array_key_exists('nick', $r) ? $r['nick'] : ($r['sender_nick'] ?? ''),
        'color' => (int) (array_key_exists('color', $r) ? $r['color'] : ($r['sender_color'] ?? 1)),
        'text' => $r['text'],
        'cipher' => empty($r['cipher']) ? null : (string) $r['cipher'],
        'time' => fmtTime($r['created_at']),
        'avatar' => (int) (array_key_exists('avatar', $r) ? $r['avatar'] : ($r['sender_avatar'] ?? 1)),
        'avatarUrl' => array_key_exists('avatar_url', $r) ? $r['avatar_url'] : ($r['sender_avatar_url'] ?? null),
    ];
}

function purgeUnverified(): void
{
    static $done = false;
    if ($done || !hasEmailColumns()) {
        return;
    }
    $done = true;
    try {
        $rows = db()->query(
            "SELECT id FROM users
             WHERE email_verified_at IS NULL
               AND email_code IS NOT NULL
               AND email_code_at IS NOT NULL
               AND email_code_at < UTC_TIMESTAMP() - INTERVAL 1 HOUR
               AND created_at > UTC_TIMESTAMP() - INTERVAL 1 DAY
               AND id NOT IN (SELECT DISTINCT user_id FROM messages WHERE user_id IS NOT NULL)
             LIMIT 50"
        )->fetchAll(PDO::FETCH_COLUMN);
        foreach ($rows as $id) {
            $id = (int) $id;
            q('DELETE FROM sessions WHERE user_id = ?', [$id]);
            q('DELETE FROM messages WHERE user_id = ?', [$id]);
            q('DELETE FROM users WHERE id = ?', [$id]);
        }
    } catch (Throwable $e) {
        // молча: чистка не должна ломать запрос
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = (string) param('action', '');

try {
    if (in_array($action, ['register', 'check_nick', 'check_email', 'login', 'me', 'feed'], true)) {
        purgeUnverified();
    }

    // --- Лента комнаты, список онлайн и общая статистика ---
    if ($method === 'GET' && $action === 'feed') {
        $room = (string) param('room', 'kurilka');
        if (!in_array($room, ROOMS, true)) {
            fail(400, 'Неизвестная комната');
        }

        $viewer = currentUser();
        if ($viewer) {
            touch_user($viewer['id'], param('here') === '1' ? $room : null);
        }

        $rows = q(
            'SELECT * FROM messages WHERE room = ? AND hidden_at IS NULL ORDER BY id DESC LIMIT 60',
            [$room]
        )->fetchAll();
        $messages = array_map('shapeMessage', array_reverse($rows));

        $online = array_map(static function (array $r): array {
            return [
                'nick' => $r['nick'],
                'color' => (int) $r['color'],
                'status' => $r['status'],
                'avatar' => (int) $r['avatar'],
                'avatarUrl' => $r['avatar_url'],
                'isAdmin' => (bool) $r['is_admin'],
            ];
        }, q(
            'SELECT nick, color, status, avatar, avatar_url, is_admin FROM users
             WHERE last_seen > UTC_TIMESTAMP() - INTERVAL ? SECOND AND room = ? AND is_admin = 0'
             . verifiedCond() . '
             ORDER BY last_seen DESC LIMIT 40',
            [ONLINE_SEC, $room]
        )->fetchAll());

        $typing = [];
        try {
            if (hasTypingColumns()) {
                foreach (q(
                    'SELECT nick, color FROM users
                     WHERE typing_room = ? AND typing_at > UTC_TIMESTAMP() - INTERVAL 6 SECOND LIMIT 5',
                    [$room]
                )->fetchAll() as $r) {
                    $typing[] = ['nick' => $r['nick'], 'color' => (int) $r['color']];
                }
            }
        } catch (Throwable $e) {
            $typing = [];
        }

        $counts = [];
        foreach (q(
            'SELECT room, COUNT(*) AS c FROM users
             WHERE last_seen > UTC_TIMESTAMP() - INTERVAL ? SECOND AND is_admin = 0'
             . verifiedCond() . ' GROUP BY room',
            [ONLINE_SEC]
        )->fetchAll() as $r) {
            $counts[$r['room']] = (int) $r['c'];
        }

        $allOnline = q(
            'SELECT SUM(is_admin = 0) AS c, MAX(is_admin) AS a FROM users
             WHERE last_seen > UTC_TIMESTAMP() - INTERVAL ? SECOND' . verifiedCond(),
            [ONLINE_SEC]
        )->fetch();

        $tickerPending = 0;
        if ($viewer && !empty($viewer['isAdmin']) && hasTickerTable()) {
            $tickerPending = (int) scalar("SELECT COUNT(*) FROM ticker_posts WHERE status = 'pending'");
        }

        out(200, [
            'messages' => $messages,
            'online' => $online,
            'tickerPending' => $tickerPending,
            'onlineTotal' => (int) ($allOnline['c'] ?? 0),
            'adminOnline' => (bool) ($allOnline['a'] ?? 0),
            'typing' => $typing,
            'roomCounts' => (object) $counts,
            'totalUsers' => (int) scalar('SELECT COUNT(*) FROM users WHERE 1' . verifiedCond()),
            'dayMessages' => (int) scalar(
                'SELECT COUNT(*) FROM messages WHERE hidden_at IS NULL AND created_at > UTC_TIMESTAMP() - INTERVAL 24 HOUR'
            ),
        ]);
    }

    // --- Печатает сейчас ---
    if ($method === 'POST' && $action === 'typing') {
        $user = currentUser();
        if (!$user) {
            out(200, ['ok' => true]);
        }
        $room = (string) param('room', $user['room']);
        if (!in_array($room, ROOMS, true)) {
            fail(400, 'Неизвестная комната');
        }
        if (hasTypingColumns()) {
            q(
                'UPDATE users SET typing_at = UTC_TIMESTAMP(), typing_room = ?, last_seen = UTC_TIMESTAMP()
                 WHERE id = ?',
                [$room, $user['id']]
            );
        }
        out(200, ['ok' => true]);
    }

    // --- Кто я ---
    if ($method === 'GET' && $action === 'me') {
        $user = requireUser();
        touch_user($user['id']);
        out(200, ['user' => $user]);
    }

    // --- Регистрация ---
    if ($method === 'POST' && $action === 'register') {
        $nick = trim((string) param('nick', ''));
        $password = (string) param('password', '');
        $color = (int) param('color', 1);
        $avatar = (int) param('avatar', 1);
        $room = (string) param('room', 'kurilka');

        if (!preg_match('/^[a-zA-Zа-яА-ЯёЁ0-9_]{3,18}$/u', $nick)) {
            fail(400, 'Ник: 3-18 символов, буквы, цифры и подчёркивание');
        }
        if (mb_strlen($password) < 5) {
            fail(400, 'Пароль от 5 символов');
        }
        if ($color < 1 || $color > 8) {
            $color = 1;
        }
        // Красный (2) — только для админа и коменданта
        if ($color === 2 && !isOwnerNick(mb_strtolower($nick))) {
            $color = 8;
        }
        if ($avatar < 1 || $avatar > 12) {
            $avatar = 1;
        }
        if (!in_array($room, ROOMS, true)) {
            $room = 'kurilka';
        }

        $lower = mb_strtolower($nick);
        if (one('SELECT id FROM users WHERE nick_lower = ?', [$lower])) {
            fail(409, 'Такой ник уже занят');
        }

        $uni = trim((string) param('uni', ''));
        if (!in_array($uni, UNI_LIST, true)) {
            $uni = null;
        }

        $email = mb_strtolower(trim((string) param('email', '')));
        $useEmail = hasEmailColumns();
        if ($useEmail) {
            if ($email === '') {
                fail(400, 'Без почты не заселим — на неё придёт код');
            }
            if (preg_match('/[а-яё]/ui', $email)) {
                fail(400, 'Только латинские буквы — переключи раскладку');
            }
            if (mb_strpos($email, '@') === false) {
                fail(400, 'В адресе не хватает знака @');
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
                fail(400, 'Адрес почты указан с ошибкой');
            }
            if (one('SELECT id FROM users WHERE email = ?', [$email])) {
                fail(409, 'Эту почту уже кто-то занял');
            }
        }

        if (hasUniColumn()) {
            q(
                'INSERT INTO users (nick, nick_lower, password_hash, color, status, room, avatar, is_admin, uni, created_at, last_seen)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                [$nick, $lower, password_hash($password, PASSWORD_DEFAULT), $color, 'только заселился', $room, $avatar,
                 isOwnerNick($lower) ? 1 : 0, $uni]
            );
        } else {
            q(
                'INSERT INTO users (nick, nick_lower, password_hash, color, status, room, avatar, is_admin, created_at, last_seen)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                [$nick, $lower, password_hash($password, PASSWORD_DEFAULT), $color, 'только заселился', $room, $avatar,
                 isOwnerNick($lower) ? 1 : 0]
            );
        }
        $newId = (int) db()->lastInsertId();
        $mailSent = false;
        if ($useEmail) {
            q('UPDATE users SET email = ?, last_seen = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE id = ?', [$email, $newId]);
            $mailSent = issueEmailCode($newId, $email, $nick);
        }
        $user = shapeUser(one('SELECT * FROM users WHERE id = ?', [$newId]));

        $new = bin2hex(random_bytes(24));
        q('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())', [$new, $user['id']]);
        rememberIp((int) $user['id']);
        out(200, ['user' => $user, 'token' => $new, 'needVerify' => $useEmail, 'mailSent' => $mailSent]);
    }

    // --- Проверка, свободен ли ник ---
    if ($method === 'GET' && $action === 'check_nick') {
        $nick = trim((string) param('nick', ''));
        if (!preg_match('/^[a-zA-Zа-яА-ЯёЁ0-9_]{3,18}$/u', $nick)) {
            out(200, ['free' => false, 'error' => 'Ник указан с ошибкой']);
        }
        $taken = (bool) one('SELECT id FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        out(200, $taken
            ? ['free' => false, 'error' => 'Такой ник уже занят']
            : ['free' => true]);
    }

    // --- Проверка, свободна ли почта ---
    if ($method === 'GET' && $action === 'check_email') {
        $email = mb_strtolower(trim((string) param('email', '')));
        if (!hasEmailColumns()) {
            out(200, ['free' => true]);
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[а-яё]/ui', $email)) {
            out(200, ['free' => false, 'error' => 'Адрес почты указан с ошибкой']);
        }
        $taken = (bool) one('SELECT id FROM users WHERE email = ?', [$email]);
        out(200, $taken
            ? ['free' => false, 'error' => 'Эту почту уже кто-то занял']
            : ['free' => true]);
    }

    // --- Отмена незавершённой регистрации ---
    if ($method === 'POST' && $action === 'cancel_register') {
        $me = requireUser();
        if (hasEmailColumns()) {
            $row = one('SELECT email_verified_at FROM users WHERE id = ?', [$me['id']]);
            if (empty($row['email_verified_at'])) {
                $uid = (int) $me['id'];
                q('DELETE FROM sessions WHERE user_id = ?', [$uid]);
                q('DELETE FROM messages WHERE user_id = ?', [$uid]);
                q('DELETE FROM users WHERE id = ?', [$uid]);
                out(200, ['ok' => true, 'deleted' => true]);
            }
        }
        out(200, ['ok' => true, 'deleted' => false]);
    }

    // --- Подтверждение почты кодом ---
    if ($method === 'POST' && $action === 'verify_email') {
        $me = requireUser();
        if (!hasEmailColumns()) {
            out(200, ['ok' => true]);
        }
        $code = preg_replace('/\D/', '', (string) param('code', ''));
        $row = one('SELECT email_code, email_code_at, email_verified_at FROM users WHERE id = ?', [$me['id']]);
        if (!empty($row['email_verified_at'])) {
            out(200, ['ok' => true]);
        }
        if (empty($row['email_code']) || $code === '' || !hash_equals((string) $row['email_code'], $code)) {
            fail(400, 'Код не подошёл — проверь письмо');
        }
        if (strtotime((string) $row['email_code_at'] . ' UTC') < time() - 1800) {
            fail(400, 'Код устарел — запроси новый');
        }
        q('UPDATE users SET email_verified_at = UTC_TIMESTAMP(), email_code = NULL, last_seen = UTC_TIMESTAMP() WHERE id = ?', [$me['id']]);
        out(200, ['ok' => true, 'user' => shapeUser(one('SELECT * FROM users WHERE id = ?', [$me['id']]))]);
    }

    // --- Повторная отправка кода ---
    if ($method === 'POST' && $action === 'resend_code') {
        $me = requireUser();
        if (!hasEmailColumns()) {
            out(200, ['ok' => true]);
        }
        $row = one('SELECT email, email_verified_at, email_code_at FROM users WHERE id = ?', [$me['id']]);
        if (!empty($row['email_verified_at'])) {
            out(200, ['ok' => true]);
        }
        if (empty($row['email'])) {
            fail(400, 'Почта не указана');
        }
        if (!empty($row['email_code_at']) && strtotime((string) $row['email_code_at'] . ' UTC') > time() - 60) {
            fail(429, 'Код уже отправлен — подожди минуту');
        }
        $sent = issueEmailCode((int) $me['id'], (string) $row['email'], (string) $me['nick']);
        out(200, ['ok' => true, 'mailSent' => $sent]);
    }

    // --- Восстановление по почте: выслать код ---
    if ($method === 'POST' && $action === 'recover_mail_code') {
        $nick = trim((string) param('nick', ''));
        if (!hasEmailColumns()) {
            fail(400, 'Восстановление по почте недоступно');
        }
        $row = one('SELECT id, nick, email, email_code_at FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        if (!$row) {
            fail(404, 'Такого жильца нет в журнале');
        }
        if (empty($row['email'])) {
            fail(404, 'У этого ника не указана почта — восстанови по секретному вопросу');
        }
        if (!empty($row['email_code_at']) && strtotime((string) $row['email_code_at'] . ' UTC') > time() - 60) {
            fail(429, 'Код уже отправлен — подожди минуту');
        }
        issueEmailCode((int) $row['id'], (string) $row['email'], (string) $row['nick'], true);
        out(200, ['ok' => true, 'email' => maskEmail((string) $row['email'])]);
    }

    // --- Восстановление по почте: сброс пароля кодом ---
    if ($method === 'POST' && $action === 'recover_mail_reset') {
        $nick = trim((string) param('nick', ''));
        $code = preg_replace('/\D/', '', (string) param('code', ''));
        $newPassword = (string) param('password', '');
        if (!hasEmailColumns()) {
            fail(400, 'Восстановление по почте недоступно');
        }
        if (mb_strlen($newPassword) < 5) {
            fail(400, 'Пароль от 5 символов');
        }
        $row = one('SELECT id, email_code, email_code_at FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        if (!$row || empty($row['email_code'])) {
            fail(404, 'Сначала запроси код на почту');
        }
        if ($code === '' || !hash_equals((string) $row['email_code'], $code)) {
            fail(400, 'Код не подошёл — проверь письмо');
        }
        if (strtotime((string) $row['email_code_at'] . ' UTC') < time() - 1800) {
            fail(400, 'Код устарел — запроси новый');
        }
        q('UPDATE users SET password_hash = ?, email_code = NULL, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?',
          [password_hash($newPassword, PASSWORD_DEFAULT), (int) $row['id']]);
        q('DELETE FROM sessions WHERE user_id = ?', [(int) $row['id']]);
        out(200, ['ok' => true]);
    }

    // --- Вход ---
    if ($method === 'POST' && $action === 'login') {
        $nick = trim((string) param('nick', ''));
        $password = (string) param('password', '');
        loginGuard($nick);
        $row = one('SELECT * FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        if (!$row || !password_verify($password, $row['password_hash'])) {
            loginFailed($nick);
            fail(401, 'Ник или пароль не подходят');
        }
        loginPassed($nick);
        if ($row['banned_at'] !== null) {
            fail(403, 'Ты выселен из общаги: ' . ($row['ban_reason'] ?: 'нарушение правил'));
        }
        if (hasEmailColumns() && empty($row['email_verified_at']) && !empty($row['email_code'])) {
            fail(403, 'Вы не зарегистрированы в чате');
        }
        if (isOwnerNick(mb_strtolower((string) $row['nick'])) && !$row['is_admin']) {
            q('UPDATE users SET is_admin = 1 WHERE id = ?', [(int) $row['id']]);
            $row['is_admin'] = 1;
        }
        $user = shapeUser($row);
        $new = bin2hex(random_bytes(24));
        q('DELETE FROM sessions WHERE created_at < UTC_TIMESTAMP() - INTERVAL 90 DAY');
        q('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())', [$new, $user['id']]);
        rememberIp((int) $user['id']);
        touch_user($user['id']);
        out(200, ['user' => $user, 'token' => $new]);
    }

    // --- Ушёл из вкладки: снимаем с онлайна ---
    if ($method === 'POST' && $action === 'away') {
        $user = currentUser();
        if ($user) {
            q('UPDATE users SET last_seen = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE id = ?', [$user['id']]);
        }
        out(200, ['ok' => true]);
    }

    // --- Выход ---
    if ($method === 'POST' && $action === 'logout') {
        $t = token();
        $user = currentUser();
        if ($user) {
            q('UPDATE users SET last_seen = UTC_TIMESTAMP() - INTERVAL 1 HOUR WHERE id = ?', [$user['id']]);
        }
        if ($t) {
            q('DELETE FROM sessions WHERE token = ?', [$t]);
        }
        out(200, ['ok' => true]);
    }

    // --- Отправка сообщения в комнату ---
    if ($method === 'POST' && $action === 'send') {
        $user = requireUser('Сначала займи ник');
        if (hasEmailColumns()) {
            $chk = one('SELECT email_verified_at, email_code FROM users WHERE id = ?', [$user['id']]);
            if (empty($chk['email_verified_at']) && !empty($chk['email_code'])) {
                fail(403, 'Вы не зарегистрированы в чате');
            }
        }
        $text = mb_substr(trim((string) param('text', '')), 0, 500);
        $room = (string) param('room', $user['room']);
        if ($text === '') {
            fail(400, 'Пустое сообщение');
        }
        if (!in_array($room, ROOMS, true)) {
            fail(400, 'Неизвестная комната');
        }
        if (!canEnterRoom($room, $user)) {
            fail(403, 'Этот этаж только для студентов своего вуза');
        }
        if (empty($user['isAdmin'])) {
            $flood = one(
                'SELECT COUNT(*) AS n FROM messages
                 WHERE user_id = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 10 SECOND',
                [$user['id']]
            );
            if ((int) ($flood['n'] ?? 0) >= 8) {
                logSecurity('flood', $user['nick'], 'Больше 8 сообщений за 10 секунд');
                fail(429, 'Не части — переведи дух на пару секунд');
            }
            $dup = one(
                'SELECT id FROM messages
                 WHERE user_id = ? AND text = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 20 SECOND
                 ORDER BY id DESC LIMIT 1',
                [$user['id'], $text]
            );
            if ($dup) {
                logSecurity('spam', $user['nick'], 'Повтор одного и того же сообщения');
                fail(429, 'Это уже было — не повторяйся');
            }
        }
        q(
            'INSERT INTO messages (room, user_id, nick, color, text, avatar, avatar_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [$room, $user['id'], $user['nick'], $user['color'], $text, $user['avatar'], $user['avatarUrl']]
        );
        $id = (int) db()->lastInsertId();
        touch_user($user['id'], $room);
        if (hasTypingColumns()) {
            q('UPDATE users SET typing_at = NULL, typing_room = NULL WHERE id = ?', [$user['id']]);
        }
        out(200, ['message' => [
            'id' => $id,
            'nick' => $user['nick'],
            'color' => $user['color'],
            'text' => $text,
            'time' => fmtTime(),
            'avatar' => $user['avatar'],
            'avatarUrl' => $user['avatarUrl'],
        ]]);
    }

    // --- Профиль (в т.ч. загрузка аватарки в папку uploads) ---
    if ($method === 'POST' && $action === 'profile') {
        $user = requireUser();
        $status = mb_substr(trim((string) param('status', '')), 0, 64);
        if ($status === '') {
            $status = 'молча наблюдает';
        }
        $color = (int) param('color', $user['color']);
        if ($color < 1 || $color > 8) {
            $color = $user['color'];
        }
        // Красный (2) — только для админа и коменданта
        if ($color === 2 && !isOwnerNick(mb_strtolower((string) $user['nick']))) {
            $color = 8;
        }
        $avatar = (int) param('avatar', $user['avatar']);
        if ($avatar < 1 || $avatar > 12) {
            $avatar = $user['avatar'];
        }

        $avatarUrl = $user['avatarUrl'];
        if (param('removeImage')) {
            $avatarUrl = null;
        } elseif ($image = param('image')) {
            [$head, $payload] = array_pad(explode(',', (string) $image, 2), 2, null);
            $raw = base64_decode($payload ?? $head, true);
            if ($raw === false) {
                fail(400, 'Не получилось прочитать картинку');
            }
            if (strlen($raw) > 2 * 1024 * 1024) {
                fail(400, 'Картинка тяжелее 2 МБ');
            }
            $ext = 'png';
            foreach (['jpeg' => 'jpg', 'jpg' => 'jpg', 'webp' => 'webp', 'gif' => 'gif'] as $needle => $val) {
                if (strpos((string) $head, $needle) !== false) {
                    $ext = $val;
                    break;
                }
            }
            $dir = __DIR__ . '/uploads';
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            $name = 'avatar-' . $user['id'] . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
            if (@file_put_contents($dir . '/' . $name, $raw) === false) {
                fail(500, 'Папка uploads недоступна для записи');
            }
            $avatarUrl = rtrim(cfg()['base_url'], '/') . '/uploads/' . $name;
        }

        q(
            'UPDATE users SET status = ?, color = ?, avatar = ?, avatar_url = ?, last_seen = UTC_TIMESTAMP()
             WHERE id = ?',
            [$status, $color, $avatar, $avatarUrl, $user['id']]
        );
        out(200, ['user' => shapeUser(one('SELECT * FROM users WHERE id = ?', [$user['id']]))]);
    }

    // --- Криптография: мои ключи ---
    if ($method === 'GET' && $action === 'keys_me') {
        $user = requireUser();
        if (!hasCryptoTable()) {
            out(200, ['bundle' => null, 'vault' => null, 'enabled' => false]);
        }
        $row = one('SELECT * FROM user_keys WHERE user_id = ?', [$user['id']]);
        out(200, [
            'enabled' => vaultPublicJwk() !== null,
            'vault' => vaultPublicJwk(),
            'bundle' => $row ? [
                'publicJwk' => (string) $row['public_jwk'],
                'privateEnc' => (string) $row['private_enc'],
                'salt' => (string) $row['salt'],
                'iv' => (string) $row['iv'],
            ] : null,
        ]);
    }

    // --- Криптография: сохранить свою пару ключей ---
    if ($method === 'POST' && $action === 'keys_save') {
        $user = requireUser();
        if (!hasCryptoTable()) {
            fail(500, 'Хранилище ключей недоступно');
        }
        $pub = (string) param('publicJwk', '');
        $priv = (string) param('privateEnc', '');
        $salt = (string) param('salt', '');
        $iv = (string) param('iv', '');
        if ($pub === '' || $priv === '' || $salt === '' || $iv === '') {
            fail(400, 'Ключ неполный');
        }
        q(
            'INSERT INTO user_keys (user_id, public_jwk, private_enc, salt, iv, created_at)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE public_jwk = VALUES(public_jwk), private_enc = VALUES(private_enc),
                                     salt = VALUES(salt), iv = VALUES(iv), created_at = UTC_TIMESTAMP()',
            [$user['id'], $pub, $priv, mb_substr($salt, 0, 64), mb_substr($iv, 0, 64)]
        );
        out(200, ['ok' => true]);
    }

    // --- Криптография: открытый ключ собеседника ---
    if ($method === 'GET' && $action === 'keys_peer') {
        requireUser();
        if (!hasCryptoTable()) {
            out(200, ['publicJwk' => null, 'userId' => null]);
        }
        $nick = trim((string) param('nick', ''));
        $other = one('SELECT id FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        if (!$other) {
            fail(404, 'Такого жильца нет');
        }
        $row = one('SELECT public_jwk FROM user_keys WHERE user_id = ?', [(int) $other['id']]);
        out(200, [
            'userId' => (int) $other['id'],
            'publicJwk' => $row ? (string) $row['public_jwk'] : null,
            'vault' => vaultPublicJwk(),
        ]);
    }

    // --- Список личных диалогов ---
    if ($method === 'GET' && $action === 'dialogs') {
        $user = requireUser();
        $me = $user['id'];
        $rows = q(
            'SELECT u.nick, u.color, u.avatar, u.avatar_url,
                    MAX(d.id) AS last_id,
                    SUM(CASE WHEN d.recipient_id = ? AND d.read_at IS NULL THEN 1 ELSE 0 END) AS unread,
                    TIMESTAMPDIFF(SECOND, MAX(u.last_seen), UTC_TIMESTAMP()) AS ago
             FROM direct_messages d
             JOIN users u ON u.id = CASE WHEN d.sender_id = ? THEN d.recipient_id ELSE d.sender_id END
             WHERE d.sender_id = ? OR d.recipient_id = ?
             GROUP BY u.id, u.nick, u.color, u.avatar, u.avatar_url
             ORDER BY last_id DESC LIMIT 30',
            [$me, $me, $me, $me]
        )->fetchAll();

        $dialogs = array_map(static function (array $r): array {
            $ago = $r['ago'] === null ? null : (int) $r['ago'];
            return [
                'nick' => $r['nick'],
                'color' => (int) $r['color'],
                'unread' => (int) $r['unread'],
                'avatar' => (int) $r['avatar'],
                'avatarUrl' => $r['avatar_url'],
                'online' => $ago !== null && $ago < ONLINE_SEC,
                'seenAgo' => $ago,
            ];
        }, $rows);

        out(200, [
            'dialogs' => $dialogs,
            'unread' => array_sum(array_column($dialogs, 'unread')),
        ]);
    }

    // --- Переписка с конкретным жильцом ---
    if ($method === 'GET' && $action === 'dm') {
        $user = requireUser();
        hasDmCipherColumn();
        $me = $user['id'];
        $withNick = trim((string) param('nick', ''));
        $other = one(
            'SELECT *, TIMESTAMPDIFF(SECOND, last_seen, UTC_TIMESTAMP()) AS ago
             FROM users WHERE nick_lower = ?',
            [mb_strtolower($withNick)]
        );
        if (!$other) {
            fail(404, 'Такого жильца нет');
        }

        $rows = q(
            'SELECT * FROM direct_messages
             WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
             ORDER BY id DESC LIMIT 80',
            [$me, $other['id'], $other['id'], $me]
        )->fetchAll();

        q(
            'UPDATE direct_messages SET read_at = UTC_TIMESTAMP()
             WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL',
            [$me, $other['id']]
        );
        touch_user($me);

        $ago = $other['ago'] === null ? null : (int) $other['ago'];
        out(200, [
            'peer' => [
                'nick' => $other['nick'],
                'color' => (int) $other['color'],
                'status' => $other['status'],
                'avatar' => (int) $other['avatar'],
                'avatarUrl' => $other['avatar_url'],
                'seenAgo' => $ago,
                'online' => $ago !== null && $ago < ONLINE_SEC,
            ],
            'messages' => array_map('shapeMessage', array_reverse($rows)),
        ]);
    }

    // --- Все личные сообщения пользователя (для общей ленты) ---
    if ($method === 'GET' && $action === 'dm_all') {
        $user = requireUser();
        $me = $user['id'];
        $rows = q(
            'SELECT d.*, u.nick AS peer_nick
             FROM direct_messages d
             JOIN users u ON u.id = CASE WHEN d.sender_id = ? THEN d.recipient_id ELSE d.sender_id END
             WHERE d.sender_id = ? OR d.recipient_id = ?
             ORDER BY d.id DESC LIMIT 80',
            [$me, $me, $me]
        )->fetchAll();
        $items = array_map(static function (array $r) use ($me): array {
            $m = shapeMessage($r);
            $m['peer'] = $r['peer_nick'];
            $m['outgoing'] = ((int) $r['sender_id']) === $me;
            return $m;
        }, array_reverse($rows));
        touch_user($me);
        out(200, ['messages' => $items]);
    }

    // --- Отправка личного сообщения ---
    if ($method === 'POST' && $action === 'dm_send') {
        $user = requireUser('Сначала займи ник');
        $toNick = trim((string) param('nick', ''));
        $cipher = (string) param('cipher', '');
        $text = mb_substr(trim((string) param('text', '')), 0, 500);
        if ($cipher !== '' && hasDmCipherColumn()) {
            if (mb_strlen($cipher) > 20000) {
                fail(400, 'Сообщение слишком длинное');
            }
            $text = '';
        } else {
            $cipher = '';
            if ($text === '') {
                fail(400, 'Пустое сообщение');
            }
        }
        $other = one('SELECT id FROM users WHERE nick_lower = ?', [mb_strtolower($toNick)]);
        if (!$other) {
            fail(404, 'Такого жильца нет');
        }
        if ((int) $other['id'] === $user['id']) {
            fail(400, 'Самому себе писать скучно');
        }
        if ($cipher !== '') {
            q(
                'INSERT INTO direct_messages
                 (sender_id, recipient_id, sender_nick, sender_color, text, cipher, sender_avatar, sender_avatar_url, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
                [$user['id'], (int) $other['id'], $user['nick'], $user['color'], '', $cipher, $user['avatar'], $user['avatarUrl']]
            );
        } else {
            q(
                'INSERT INTO direct_messages
                 (sender_id, recipient_id, sender_nick, sender_color, text, sender_avatar, sender_avatar_url, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
                [$user['id'], (int) $other['id'], $user['nick'], $user['color'], $text, $user['avatar'], $user['avatarUrl']]
            );
        }
        $id = (int) db()->lastInsertId();
        touch_user($user['id']);
        out(200, ['message' => [
            'id' => $id,
            'nick' => $user['nick'],
            'color' => $user['color'],
            'text' => $text,
            'cipher' => $cipher !== '' ? $cipher : null,
            'time' => fmtTime(),
            'avatar' => $user['avatar'],
            'avatarUrl' => $user['avatarUrl'],
        ]]);
    }

    // --- Звонки: передача сигнала собеседнику ---
    if ($method === 'POST' && $action === 'call_signal') {
        $user = requireUser();
        $toNick = trim((string) param('nick', ''));
        $callId = mb_substr(trim((string) param('callId', '')), 0, 64);
        $kind = mb_substr(trim((string) param('kind', '')), 0, 16);
        if (!in_array($kind, ['offer', 'answer', 'ice', 'hangup', 'decline'], true)) {
            fail(400, 'Неизвестный сигнал');
        }
        $other = one('SELECT id FROM users WHERE nick_lower = ?', [mb_strtolower($toNick)]);
        if (!$other) {
            fail(404, 'Такого жильца нет');
        }
        $payload = body()['payload'] ?? null;
        q(
            'INSERT INTO call_signals (sender_id, recipient_id, call_id, kind, payload, created_at)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [
                $user['id'],
                (int) $other['id'],
                $callId,
                $kind,
                $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE),
            ]
        );
        touch_user($user['id']);
        out(200, ['ok' => true]);
    }

    // --- Звонки: проверка входящих сигналов ---
    if ($method === 'GET' && $action === 'call_poll') {
        $user = requireUser();
        $me = $user['id'];
        $rows = q(
            'SELECT s.*, u.nick, u.color, u.avatar, u.avatar_url
             FROM call_signals s JOIN users u ON u.id = s.sender_id
             WHERE s.recipient_id = ? AND s.consumed = 0
               AND s.created_at > UTC_TIMESTAMP() - INTERVAL 2 MINUTE
             ORDER BY s.id LIMIT 40',
            [$me]
        )->fetchAll();

        if ($rows) {
            $ids = implode(',', array_map('intval', array_column($rows, 'id')));
            db()->exec("UPDATE call_signals SET consumed = 1 WHERE id IN ($ids)");
        }
        touch_user($me);

        out(200, ['signals' => array_map(static function (array $r): array {
            return [
                'id' => (int) $r['id'],
                'callId' => $r['call_id'],
                'kind' => $r['kind'],
                'payload' => $r['payload'] === null ? null : json_decode($r['payload'], true),
                'from' => [
                    'nick' => $r['nick'],
                    'color' => (int) $r['color'],
                    'avatar' => (int) $r['avatar'],
                    'avatarUrl' => $r['avatar_url'],
                ],
            ];
        }, $rows)]);
    }

    // --- Бегущая строка: одобренные объявления ---
    if ($method === 'GET' && $action === 'ticker') {
        $mode = setting('ticker_mode', 'mix');
        if ($mode === 'news' || $mode === 'off') {
            out(200, ['ticker' => [], 'mode' => $mode]);
        }
        if (!hasTickerTable()) {
            out(200, ['ticker' => [], 'mode' => $mode]);
        }
        $rows = q(
            "SELECT t.text, t.nick AS author_nick, u.nick AS user_nick,
                    COALESCE(u.color, 1) AS nick_color, COALESCE(u.is_admin, 0) AS by_admin
             FROM ticker_posts t LEFT JOIN users u ON u.id = t.user_id
             WHERE t.status = 'approved' AND (t.expires_at IS NULL OR t.expires_at > UTC_TIMESTAMP())
             ORDER BY t.decided_at DESC, t.id DESC LIMIT 10"
        )->fetchAll();
        out(200, ['ticker' => array_map(static function (array $r): array {
            $nick = !empty($r['by_admin'])
                ? 'ОТ КОМЕНДАНТА'
                : trim((string) ($r['user_nick'] ?? $r['author_nick'] ?? ''));
            return [
                'nick' => $nick,
                'color' => !empty($r['by_admin']) ? 0 : (int) ($r['nick_color'] ?? 1),
                'text' => (string) $r['text'],
            ];
        }, $rows), 'mode' => $mode]);
    }

    // --- Режим бегущей строки ---
    if ($method === 'GET' && $action === 'ticker_mode') {
        out(200, ['mode' => setting('ticker_mode', 'mix')]);
    }

    // --- Мои заявки в бегущую строку ---
    if ($method === 'GET' && $action === 'ticker_my') {
        $user = requireUser();
        if (!hasTickerTable()) {
            out(200, ['posts' => []]);
        }
        $rows = q(
            'SELECT id, text, status, reject_reason, created_at FROM ticker_posts WHERE user_id = ? ORDER BY id DESC LIMIT 20',
            [$user['id']]
        )->fetchAll();
        out(200, ['posts' => array_map(static function (array $r): array {
            return [
                'id' => (int) $r['id'],
                'text' => $r['text'],
                'status' => $r['status'],
                'reason' => $r['reject_reason'] ?? null,
                'time' => fmtTime($r['created_at']),
            ];
        }, $rows)]);
    }

    // --- Предложить строку (только студенты вузов) ---
    if ($method === 'POST' && $action === 'ticker_send') {
        $user = requireUser('Сначала займи ник');
        if (empty($user['isAdmin']) && !in_array((string) ($user['uni'] ?? ''), UNI_LIST, true)) {
            fail(403, 'Объявления в бегущую строку шлют только студенты вузов');
        }
        if (!hasTickerTable()) {
            fail(500, 'Бегущая строка пока недоступна');
        }
        $text = mb_substr(trim((string) param('text', '')), 0, 120);
        if (mb_strlen($text) < 3) {
            fail(400, 'Слишком короткое объявление');
        }
        $pending = (int) scalar(
            "SELECT COUNT(*) FROM ticker_posts WHERE user_id = ? AND status = 'pending'",
            [$user['id']]
        );
        if ($pending >= 3) {
            fail(429, 'У тебя уже 3 объявления на модерации — дождись ответа коменданта');
        }
        $dup = (int) scalar(
            "SELECT COUNT(*) FROM ticker_posts WHERE user_id = ? AND text = ? AND status <> 'rejected'",
            [$user['id'], $text]
        );
        if ($dup > 0) {
            fail(400, 'Такое объявление уже отправлено');
        }
        q(
            'INSERT INTO ticker_posts (user_id, nick, uni, text, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
            [$user['id'], $user['nick'], $user['uni'] ?? null, $text]
        );
        touch_user($user['id']);
        out(200, ['ok' => true]);
    }

    // --- Комендантская: только для владельца ---
    if (in_array($action, [
        'admin_users', 'admin_messages', 'admin_ban', 'admin_hide', 'admin_delete',
        'admin_ticker', 'admin_ticker_decide', 'admin_ticker_edit', 'admin_ticker_add',
        'admin_ticker_days', 'admin_ticker_mode', 'admin_security', 'admin_security_clear',
        'admin_vault', 'admin_vault_set', 'admin_dm_wipe', 'admin_dm_vault',
    ], true)) {
        $user = requireUser();
        $row = one('SELECT is_admin FROM users WHERE id = ?', [$user['id']]);
        if (!$row || !$row['is_admin']) {
            fail(403, 'Доступ только для владельца чата');
        }

        if ($method === 'GET' && $action === 'admin_ticker') {
            if (!hasTickerTable()) {
                out(200, ['posts' => []]);
            }
            $rows = q(
                "SELECT t.*, COALESCE(u.is_admin, 0) AS by_admin
                 FROM ticker_posts t LEFT JOIN users u ON u.id = t.user_id
                 ORDER BY (t.status = 'pending') DESC, t.id DESC LIMIT 200"
            )->fetchAll();
            out(200, ['posts' => array_map(static function (array $r): array {
                return [
                    'id' => (int) $r['id'],
                    'userId' => (int) $r['user_id'],
                    'nick' => $r['nick'],
                    'uni' => $r['uni'],
                    'text' => $r['text'],
                    'status' => $r['status'],
                    'byAdmin' => !empty($r['by_admin']),
                    'liveDays' => (int) ($r['live_days'] ?? 7),
                    'reason' => $r['reject_reason'] ?? null,
                    'expired' => !empty($r['expires_at']) && strtotime($r['expires_at'] . ' UTC') <= time(),
                    'expires' => empty($r['expires_at']) ? null : fmtTime($r['expires_at']),
                    'time' => fmtTime($r['created_at']),
                ];
            }, $rows)]);
        }

        if ($method === 'POST' && $action === 'admin_ticker_days') {
            if (!hasTickerTable()) {
                fail(500, 'Бегущая строка пока недоступна');
            }
            $id = (int) param('id', 0);
            $days = max(0, min(365, (int) param('days', 0)));
            if ($id <= 0) {
                fail(400, 'Не указано объявление');
            }
            if ($days > 0) {
                q(
                    'UPDATE ticker_posts SET live_days = ?,
                        expires_at = COALESCE(decided_at, created_at) + INTERVAL ' . $days . ' DAY WHERE id = ?',
                    [$days, $id]
                );
            } else {
                q('UPDATE ticker_posts SET live_days = 0, expires_at = NULL WHERE id = ?', [$id]);
            }
            $row = one('SELECT expires_at FROM ticker_posts WHERE id = ?', [$id]);
            out(200, [
                'ok' => true,
                'liveDays' => $days,
                'expires' => empty($row['expires_at']) ? null : fmtTime($row['expires_at']),
                'expired' => !empty($row['expires_at']) && strtotime($row['expires_at'] . ' UTC') <= time(),
            ]);
        }

        if ($method === 'POST' && $action === 'admin_ticker_add') {
            if (!hasTickerTable()) {
                fail(500, 'Бегущая строка пока недоступна');
            }
            $text = mb_substr(trim((string) param('text', '')), 0, 120);
            if (mb_strlen($text) < 3) {
                fail(400, 'Слишком короткий текст');
            }
            $days = max(0, min(365, (int) param('days', 7)));
            if ($days > 0) {
                q(
                    "INSERT INTO ticker_posts (user_id, nick, uni, text, status, created_at, decided_at, live_days, expires_at)
                     VALUES (?, ?, ?, ?, 'approved', UTC_TIMESTAMP(), UTC_TIMESTAMP(), ?, UTC_TIMESTAMP() + INTERVAL " . $days . " DAY)",
                    [$user['id'], $user['nick'], $user['uni'] ?? null, $text, $days]
                );
            } else {
                q(
                    "INSERT INTO ticker_posts (user_id, nick, uni, text, status, created_at, decided_at, live_days, expires_at)
                     VALUES (?, ?, ?, ?, 'approved', UTC_TIMESTAMP(), UTC_TIMESTAMP(), 0, NULL)",
                    [$user['id'], $user['nick'], $user['uni'] ?? null, $text]
                );
            }
            out(200, ['ok' => true, 'id' => (int) db()->lastInsertId()]);
        }

        if ($method === 'POST' && $action === 'admin_ticker_edit') {
            if (!hasTickerTable()) {
                fail(500, 'Бегущая строка пока недоступна');
            }
            $id = (int) param('id', 0);
            $text = mb_substr(trim((string) param('text', '')), 0, 120);
            if ($id <= 0) {
                fail(400, 'Не указано объявление');
            }
            if (mb_strlen($text) < 3) {
                fail(400, 'Слишком короткий текст');
            }
            q('UPDATE ticker_posts SET text = ? WHERE id = ?', [$text, $id]);
            out(200, ['ok' => true, 'text' => $text]);
        }

        if ($method === 'POST' && $action === 'admin_ticker_decide') {
            if (!hasTickerTable()) {
                fail(500, 'Бегущая строка пока недоступна');
            }
            $id = (int) param('id', 0);
            $decision = (string) param('decision', '');
            if ($id <= 0) {
                fail(400, 'Не указано объявление');
            }
            if ($decision === 'delete') {
                q('DELETE FROM ticker_posts WHERE id = ?', [$id]);
                out(200, ['ok' => true]);
            }
            if (!in_array($decision, ['approved', 'rejected', 'pending'], true)) {
                fail(400, 'Неизвестное решение');
            }
            $post = one('SELECT user_id, text FROM ticker_posts WHERE id = ?', [$id]);
            if ($decision === 'approved') {
                $days = (int) param('days', 0);
                if ($days <= 0) {
                    $row = one('SELECT live_days FROM ticker_posts WHERE id = ?', [$id]);
                    $days = (int) ($row['live_days'] ?? 7);
                }
                $days = max(0, min(365, $days));
                q(
                    'UPDATE ticker_posts SET status = ?, decided_at = UTC_TIMESTAMP(), live_days = ?,
                        expires_at = ' . ($days > 0 ? 'UTC_TIMESTAMP() + INTERVAL ' . $days . ' DAY' : 'NULL') . '
                     WHERE id = ?',
                    [$decision, $days, $id]
                );
                q('UPDATE ticker_posts SET reject_reason = NULL WHERE id = ?', [$id]);
                if ($post) {
                    $when = $days > 0 ? " Повисит {$days} дн." : ' Висит бессрочно.';
                    notifyFromAdmin(
                        (int) $post['user_id'],
                        'Твоё объявление одобрено и уже едет в бегущей строке: «' . $post['text'] . '».' . $when
                    );
                }
                out(200, ['ok' => true]);
            }
            $reason = mb_substr(trim((string) param('reason', '')), 0, 200);
            q(
                'UPDATE ticker_posts SET status = ?, decided_at = UTC_TIMESTAMP(), expires_at = NULL, reject_reason = ? WHERE id = ?',
                [$decision, $reason !== '' ? $reason : null, $id]
            );
            if ($decision === 'rejected' && $post) {
                notifyFromAdmin(
                    (int) $post['user_id'],
                    'Твоё объявление в бегущую строку отклонено: «' . $post['text'] . '».'
                        . ($reason !== '' ? ' Причина: ' . $reason : ' Причина не указана.')
                );
            }
            out(200, ['ok' => true]);
        }

        if ($method === 'POST' && $action === 'admin_ticker_mode') {
            $mode = (string) param('mode', '');
            if (!in_array($mode, ['news', 'posts', 'mix', 'off'], true)) {
                out(400, ['error' => 'Неизвестный режим строки']);
            }
            settingSet('ticker_mode', $mode);
            out(200, ['mode' => $mode]);
        }

        if ($method === 'GET' && $action === 'admin_vault') {
            if (!hasCryptoTable()) {
                out(200, ['vault' => null, 'messages' => 0]);
            }
            $row = one('SELECT fingerprint, created_at FROM vault_key WHERE id = 1');
            $cnt = hasDmCipherColumn()
                ? (int) scalar('SELECT COUNT(*) FROM direct_messages WHERE cipher IS NOT NULL')
                : 0;
            out(200, [
                'vault' => $row ? [
                    'fingerprint' => (string) $row['fingerprint'],
                    'since' => gmdate('d.m.Y H:i', tomskTs($row['created_at'])),
                ] : null,
                'messages' => $cnt,
            ]);
        }

        if ($method === 'POST' && $action === 'admin_vault_set') {
            if (!hasCryptoTable()) {
                fail(500, 'Хранилище ключей недоступно');
            }
            $pub = (string) param('publicJwk', '');
            $fp = mb_substr((string) param('fingerprint', ''), 0, 64);
            if ($pub === '' || $fp === '') {
                fail(400, 'Ключ неполный');
            }
            q(
                'INSERT INTO vault_key (id, public_jwk, fingerprint, created_at)
                 VALUES (1, ?, ?, UTC_TIMESTAMP())
                 ON DUPLICATE KEY UPDATE public_jwk = VALUES(public_jwk),
                                         fingerprint = VALUES(fingerprint),
                                         created_at = UTC_TIMESTAMP()',
                [$pub, $fp]
            );
            hasDmCipherColumn();
            logSecurity('vault_key', $user['nick'] ?? null, 'Установлен главный ключ шифрования');
            out(200, ['ok' => true]);
        }

        if ($method === 'POST' && $action === 'admin_dm_wipe') {
            $n = (int) scalar('SELECT COUNT(*) FROM direct_messages');
            db()->exec('DELETE FROM direct_messages');
            logSecurity('dm_wipe', $user['nick'] ?? null, 'Удалено личных сообщений: ' . $n);
            out(200, ['ok' => true, 'removed' => $n]);
        }

        if ($method === 'GET' && $action === 'admin_dm_vault') {
            if (!hasDmCipherColumn()) {
                out(200, ['messages' => []]);
            }
            $rows = q(
                "SELECT d.id, d.cipher, d.created_at, d.sender_nick,
                        r.nick AS to_nick
                 FROM direct_messages d
                 LEFT JOIN users r ON r.id = d.recipient_id
                 WHERE d.cipher IS NOT NULL
                 ORDER BY d.id DESC LIMIT 200"
            )->fetchAll();
            out(200, ['messages' => array_map(static function (array $r): array {
                return [
                    'id' => (int) $r['id'],
                    'from' => (string) $r['sender_nick'],
                    'to' => (string) ($r['to_nick'] ?? '—'),
                    'cipher' => (string) $r['cipher'],
                    'time' => gmdate('d.m.Y H:i', tomskTs($r['created_at'])),
                ];
            }, $rows)]);
        }

        if ($method === 'GET' && $action === 'admin_security') {
            if (!hasSecurityTable()) {
                out(200, ['events' => []]);
            }
            $rows = q(
                'SELECT * FROM security_log ORDER BY id DESC LIMIT 200'
            )->fetchAll();
            out(200, ['events' => array_map(static function (array $r): array {
                return [
                    'id' => (int) $r['id'],
                    'event' => (string) $r['event'],
                    'nick' => $r['nick'],
                    'ip' => (string) $r['ip'],
                    'note' => (string) ($r['note'] ?? ''),
                    'time' => gmdate('d.m.Y H:i', tomskTs($r['at'])),
                ];
            }, $rows)]);
        }

        if ($method === 'POST' && $action === 'admin_security_clear') {
            if (hasSecurityTable()) {
                q('DELETE FROM security_log');
            }
            out(200, ['ok' => true]);
        }

        if ($method === 'GET' && $action === 'admin_users') {
            hasIpColumns();
            $rows = q(
                'SELECT u.*, TIMESTAMPDIFF(SECOND, u.last_seen, UTC_TIMESTAMP()) AS ago,
                        (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id AND m.hidden_at IS NULL) AS msgs
                 FROM users u ORDER BY u.last_seen DESC LIMIT 200'
            )->fetchAll();
            out(200, ['users' => array_map(static function (array $r): array {
                $ago = $r['ago'] === null ? null : (int) $r['ago'];
                return [
                    'id' => (int) $r['id'],
                    'nick' => $r['nick'],
                    'color' => (int) $r['color'],
                    'status' => $r['status'],
                    'room' => $r['room'],
                    'since' => gmdate('d.m.Y', tomskTs($r['created_at'])),
                    'avatar' => (int) $r['avatar'],
                    'avatarUrl' => $r['avatar_url'],
                    'isAdmin' => (bool) $r['is_admin'],
                    'banned' => $r['banned_at'] !== null,
                    'banReason' => $r['ban_reason'],
                    'ip' => $r['last_ip'] ?? null,
                    'city' => $r['last_city'] ?? null,
                    'seenAgo' => $ago,
                    'online' => $ago !== null && $ago < ONLINE_SEC,
                    'messages' => (int) $r['msgs'],
                ];
            }, $rows)]);
        }

        if ($method === 'GET' && $action === 'admin_messages') {
            $room = (string) param('room', '');
            if (in_array($room, ROOMS, true)) {
                $rows = q(
                    'SELECT * FROM messages WHERE hidden_at IS NULL AND room = ? ORDER BY id DESC LIMIT 120',
                    [$room]
                )->fetchAll();
            } else {
                $rows = q('SELECT * FROM messages WHERE hidden_at IS NULL ORDER BY id DESC LIMIT 120')->fetchAll();
            }
            out(200, ['messages' => array_map(static function (array $r): array {
                return [
                    'id' => (int) $r['id'],
                    'room' => $r['room'],
                    'nick' => $r['nick'],
                    'color' => (int) $r['color'],
                    'text' => $r['text'],
                    'time' => fmtTime($r['created_at']),
                    'userId' => (int) $r['user_id'],
                ];
            }, $rows)]);
        }

        if ($method === 'POST' && $action === 'admin_hide') {
            $id = (int) param('id', 0);
            if (!$id) {
                fail(400, 'Не указано сообщение');
            }
            q('UPDATE messages SET hidden_at = UTC_TIMESTAMP() WHERE id = ?', [$id]);
            out(200, ['ok' => true]);
        }

        if ($method === 'POST' && $action === 'admin_delete') {
            $target = (int) param('id', 0);
            if (!$target) {
                fail(400, 'Не указан жилец');
            }
            if ($target === $user['id']) {
                fail(400, 'Себя удалять нельзя');
            }
            $t = one('SELECT is_admin FROM users WHERE id = ?', [$target]);
            if (!$t) {
                fail(404, 'Такого жильца нет');
            }
            if ($t['is_admin']) {
                fail(400, 'Нельзя удалять владельца');
            }
            foreach ([
                ['DELETE FROM sessions WHERE user_id = ?', [$target]],
                ['DELETE FROM messages WHERE user_id = ?', [$target]],
                ['DELETE FROM direct_messages WHERE sender_id = ? OR recipient_id = ?', [$target, $target]],
                ['DELETE FROM call_signals WHERE sender_id = ? OR recipient_id = ?', [$target, $target]],
            ] as $step) {
                try {
                    q($step[0], $step[1]);
                } catch (Throwable $e) {
                    // таблицы может не быть на старой базе — это не мешает удалить жильца
                }
            }
            try {
                q('DELETE FROM users WHERE id = ?', [$target]);
            } catch (Throwable $e) {
                fail(500, 'Не удалось удалить жильца: ' . $e->getMessage());
            }
            out(200, ['ok' => true]);
        }

        if ($method === 'POST' && $action === 'admin_ban') {
            $target = (int) param('id', 0);
            $ban = (bool) param('ban', false);
            $reason = mb_substr(trim((string) param('reason', '')), 0, 200);
            if (!$target) {
                fail(400, 'Не указан жилец');
            }
            if ($target === $user['id']) {
                fail(400, 'Себя блокировать нельзя');
            }
            $t = one('SELECT is_admin FROM users WHERE id = ?', [$target]);
            if ($t && $t['is_admin']) {
                fail(400, 'Нельзя блокировать владельца');
            }
            if ($ban) {
                q('UPDATE users SET banned_at = UTC_TIMESTAMP(), ban_reason = ? WHERE id = ?',
                  [$reason ?: null, $target]);
                q('DELETE FROM sessions WHERE user_id = ?', [$target]);
            } else {
                q('UPDATE users SET banned_at = NULL, ban_reason = NULL WHERE id = ?', [$target]);
            }
            out(200, ['ok' => true]);
        }
    }

    // --- Новости Томска (обновляются каждые 15 минут) ---
    if ($method === 'GET' && $action === 'news') {
        $cacheFile = sys_get_temp_dir() . '/obshaga_news.json';
        $todayKey = date('Y-m-d');
        $ttl = 900;

        if (is_readable($cacheFile)) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            $age = time() - (int) ($cached['ts'] ?? 0);
            if (is_array($cached) && !empty($cached['items']) && $age >= 0 && $age < $ttl) {
                out(200, ['news' => $cached['items']]);
            }
        }

        $fetch = static function (string $url): ?string {
            if (function_exists('curl_init')) {
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => 6,
                    CURLOPT_CONNECTTIMEOUT => 4,
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_USERAGENT => 'ObshagaChat/1.0',
                ]);
                $res = curl_exec($ch);
                $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                if (is_string($res) && $res !== '' && $code < 400) {
                    return $res;
                }
            }
            $ctx = stream_context_create(['http' => [
                'timeout' => 6,
                'header' => "User-Agent: ObshagaChat/1.0\r\n",
            ], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
            $res = @file_get_contents($url, false, $ctx);
            return is_string($res) && $res !== '' ? $res : null;
        };

        $items = [];
        $feeds = [
            'https://news.vtomske.ru/rss',
            'https://tomsk.gov.ru/rss',
            'https://www.tvtomsk.ru/rss.xml',
        ];
        foreach ($feeds as $feed) {
            $xml = $fetch($feed);
            if ($xml === null) {
                continue;
            }
            $doc = @simplexml_load_string($xml);
            if (!$doc || !isset($doc->channel->item)) {
                continue;
            }
            foreach ($doc->channel->item as $item) {
                $title = trim(html_entity_decode((string) $item->title, ENT_QUOTES, 'UTF-8'));
                if ($title === '') {
                    continue;
                }
                $title = mb_substr($title, 0, 120);
                if (!in_array($title, $items, true)) {
                    $items[] = $title;
                }
            }
        }
        if (count($items) > 1) {
            shuffle($items);
        }
        $items = array_slice($items, 0, 12);

        if ($items) {
            @file_put_contents(
                $cacheFile,
                json_encode(['day' => $todayKey, 'ts' => time(), 'items' => $items], JSON_UNESCAPED_UNICODE)
            );
        } elseif (is_readable($cacheFile)) {
            $old = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($old) && !empty($old['items'])) {
                $items = $old['items'];
            }
        }

        out(200, ['news' => $items]);
    }

    fail(400, 'Неизвестное действие');
} catch (Throwable $e) {
    error_log('chat api: ' . $e->getMessage());
    fail(500, 'Ошибка на сервере чата');
}