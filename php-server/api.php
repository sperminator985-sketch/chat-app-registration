<?php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
ob_start();

require __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

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
const ONLINE_SEC = 45;
const OWNER_NICK = 'админ';

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
    ];
}

function currentUser(): ?array
{
    $t = token();
    if (!$t) {
        return null;
    }
    $r = one(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
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

function touch_user(int $id, ?string $room = null): void
{
    if ($room !== null) {
        q('UPDATE users SET last_seen = UTC_TIMESTAMP(), room = ? WHERE id = ?', [$room, $id]);
    } else {
        q('UPDATE users SET last_seen = UTC_TIMESTAMP() WHERE id = ?', [$id]);
    }
}

function shapeMessage(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'nick' => array_key_exists('nick', $r) ? $r['nick'] : ($r['sender_nick'] ?? ''),
        'color' => (int) (array_key_exists('color', $r) ? $r['color'] : ($r['sender_color'] ?? 1)),
        'text' => $r['text'],
        'time' => fmtTime($r['created_at']),
        'avatar' => (int) (array_key_exists('avatar', $r) ? $r['avatar'] : ($r['sender_avatar'] ?? 1)),
        'avatarUrl' => array_key_exists('avatar_url', $r) ? $r['avatar_url'] : ($r['sender_avatar_url'] ?? null),
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = (string) param('action', '');

try {
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
            ];
        }, q(
            'SELECT nick, color, status, avatar, avatar_url FROM users
             WHERE last_seen > UTC_TIMESTAMP() - INTERVAL ? SECOND
             ORDER BY last_seen DESC LIMIT 40',
            [ONLINE_SEC]
        )->fetchAll());

        $recent = array_map(static function (array $r): array {
            return [
                'nick' => $r['nick'],
                'color' => (int) $r['color'],
                'status' => $r['status'],
                'avatar' => (int) $r['avatar'],
                'avatarUrl' => $r['avatar_url'],
                'seenAgo' => $r['ago'] === null ? null : (int) $r['ago'],
            ];
        }, q(
            'SELECT nick, color, status, avatar, avatar_url,
                    TIMESTAMPDIFF(SECOND, last_seen, UTC_TIMESTAMP()) AS ago
             FROM users
             WHERE banned_at IS NULL
               AND last_seen <= UTC_TIMESTAMP() - INTERVAL ? SECOND
             ORDER BY last_seen DESC LIMIT 30',
            [ONLINE_SEC]
        )->fetchAll());

        $counts = [];
        foreach (q(
            'SELECT room, COUNT(*) AS c FROM users
             WHERE last_seen > UTC_TIMESTAMP() - INTERVAL ? SECOND GROUP BY room',
            [ONLINE_SEC]
        )->fetchAll() as $r) {
            $counts[$r['room']] = (int) $r['c'];
        }

        out(200, [
            'messages' => $messages,
            'online' => $online,
            'recent' => $recent,
            'roomCounts' => (object) $counts,
            'totalUsers' => (int) scalar('SELECT COUNT(*) FROM users'),
            'dayMessages' => (int) scalar(
                'SELECT COUNT(*) FROM messages WHERE hidden_at IS NULL AND created_at > UTC_TIMESTAMP() - INTERVAL 24 HOUR'
            ),
        ]);
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

        q(
            'INSERT INTO users (nick, nick_lower, password_hash, color, status, room, avatar, is_admin, created_at, last_seen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
            [$nick, $lower, password_hash($password, PASSWORD_DEFAULT), $color, 'только заселился', $room, $avatar,
             $lower === mb_strtolower(OWNER_NICK) ? 1 : 0]
        );
        $user = shapeUser(one('SELECT * FROM users WHERE id = ?', [(int) db()->lastInsertId()]));

        $new = bin2hex(random_bytes(24));
        q('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())', [$new, $user['id']]);
        out(200, ['user' => $user, 'token' => $new]);
    }

    // --- Вход ---
    if ($method === 'POST' && $action === 'login') {
        $nick = trim((string) param('nick', ''));
        $password = (string) param('password', '');
        $row = one('SELECT * FROM users WHERE nick_lower = ?', [mb_strtolower($nick)]);
        if (!$row || !password_verify($password, $row['password_hash'])) {
            fail(401, 'Ник или пароль не подходят');
        }
        if ($row['banned_at'] !== null) {
            fail(403, 'Ты выселен из общаги: ' . ($row['ban_reason'] ?: 'нарушение правил'));
        }
        $user = shapeUser($row);
        $new = bin2hex(random_bytes(24));
        q('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, UTC_TIMESTAMP())', [$new, $user['id']]);
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
        $text = mb_substr(trim((string) param('text', '')), 0, 500);
        $room = (string) param('room', $user['room']);
        if ($text === '') {
            fail(400, 'Пустое сообщение');
        }
        if (!in_array($room, ROOMS, true)) {
            fail(400, 'Неизвестная комната');
        }
        q(
            'INSERT INTO messages (room, user_id, nick, color, text, avatar, avatar_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [$room, $user['id'], $user['nick'], $user['color'], $text, $user['avatar'], $user['avatarUrl']]
        );
        $id = (int) db()->lastInsertId();
        touch_user($user['id'], $room);
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
        $text = mb_substr(trim((string) param('text', '')), 0, 500);
        if ($text === '') {
            fail(400, 'Пустое сообщение');
        }
        $other = one('SELECT id FROM users WHERE nick_lower = ?', [mb_strtolower($toNick)]);
        if (!$other) {
            fail(404, 'Такого жильца нет');
        }
        if ((int) $other['id'] === $user['id']) {
            fail(400, 'Самому себе писать скучно');
        }
        q(
            'INSERT INTO direct_messages
             (sender_id, recipient_id, sender_nick, sender_color, text, sender_avatar, sender_avatar_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            [$user['id'], (int) $other['id'], $user['nick'], $user['color'], $text, $user['avatar'], $user['avatarUrl']]
        );
        $id = (int) db()->lastInsertId();
        touch_user($user['id']);
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

    // --- Комендантская: только для владельца ---
    if (in_array($action, ['admin_users', 'admin_messages', 'admin_ban', 'admin_hide'], true)) {
        $user = requireUser();
        $row = one('SELECT is_admin FROM users WHERE id = ?', [$user['id']]);
        if (!$row || !$row['is_admin']) {
            fail(403, 'Доступ только для владельца чата');
        }

        if ($method === 'GET' && $action === 'admin_users') {
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

    fail(400, 'Неизвестное действие');
} catch (Throwable $e) {
    error_log('chat api: ' . $e->getMessage());
    fail(500, 'Ошибка на сервере чата');
}
