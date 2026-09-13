<?php
require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$c = cfg();
if (($_GET['key'] ?? '') !== $c['install_key']) {
    http_response_code(403);
    exit("Неверный пароль установки.\nОткройте install.php?key=ВАШ_ПАРОЛЬ_ИЗ_CONFIG\n");
}

$sql = [];

$sql[] = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nick VARCHAR(32) NOT NULL,
    nick_lower VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    color TINYINT NOT NULL DEFAULT 1,
    status VARCHAR(64) NOT NULL DEFAULT 'только заселился',
    room VARCHAR(32) NOT NULL DEFAULT 'kurilka',
    avatar TINYINT NOT NULL DEFAULT 1,
    avatar_url VARCHAR(255) NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    uni VARCHAR(16) NULL,
    email VARCHAR(120) NULL,
    email_verified_at DATETIME NULL,
    email_code VARCHAR(8) NULL,
    email_code_at DATETIME NULL,
    banned_at DATETIME NULL,
    ban_reason VARCHAR(200) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    typing_at DATETIME NULL,
    typing_room VARCHAR(32) NULL,
    INDEX idx_last_seen (last_seen),
    INDEX idx_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room VARCHAR(32) NOT NULL,
    user_id INT NOT NULL,
    nick VARCHAR(32) NOT NULL,
    color TINYINT NOT NULL DEFAULT 1,
    text VARCHAR(500) NOT NULL,
    avatar TINYINT NOT NULL DEFAULT 1,
    avatar_url VARCHAR(255) NULL,
    hidden_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_id (room, id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS direct_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    sender_nick VARCHAR(32) NOT NULL,
    sender_color TINYINT NOT NULL DEFAULT 1,
    text VARCHAR(500) NOT NULL,
    sender_avatar TINYINT NOT NULL DEFAULT 1,
    sender_avatar_url VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    INDEX idx_pair (sender_id, recipient_id),
    INDEX idx_recipient (recipient_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS call_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    call_id VARCHAR(64) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    payload MEDIUMTEXT NULL,
    consumed TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_id, consumed, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS ticker_posts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS user_keys (
    user_id INT PRIMARY KEY,
    public_jwk TEXT NOT NULL,
    private_enc TEXT NOT NULL,
    salt VARCHAR(64) NOT NULL,
    iv VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS vault_key (
    id TINYINT PRIMARY KEY,
    public_jwk TEXT NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS private_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    guest_id INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'invited',
    created_at DATETIME NOT NULL,
    answered_at DATETIME NULL,
    closed_at DATETIME NULL,
    owner_seen DATETIME NULL,
    guest_seen DATETIME NULL,
    INDEX idx_owner (owner_id, status),
    INDEX idx_guest (guest_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS private_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_nick VARCHAR(32) NOT NULL,
    sender_color TINYINT NOT NULL DEFAULT 1,
    text VARCHAR(500) NOT NULL,
    cipher MEDIUMTEXT NULL,
    sender_avatar TINYINT NOT NULL DEFAULT 1,
    sender_avatar_url VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_room (room_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    nick VARCHAR(32) NULL,
    at DATETIME NOT NULL,
    INDEX idx_ip_at (ip, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$sql[] = "CREATE TABLE IF NOT EXISTS security_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event VARCHAR(24) NOT NULL,
    nick VARCHAR(32) NULL,
    ip VARCHAR(45) NOT NULL,
    note VARCHAR(160) NULL,
    at DATETIME NOT NULL,
    INDEX idx_at (at),
    INDEX idx_event (event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

foreach ($sql as $stmt) {
    db()->exec($stmt);
}

// Новые колонки для уже существующих установок
$addColumn = static function (string $table, string $column, string $definition): void {
    $found = (int) scalar(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{$table}' AND COLUMN_NAME = '{$column}'"
    );
    if ($found === 0) {
        db()->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
    }
};

$addColumn('direct_messages', 'cipher', 'MEDIUMTEXT NULL');
$addColumn('users', 'last_ip', 'VARCHAR(45) NULL');
$addColumn('users', 'last_city', 'VARCHAR(80) NULL');

$dir = __DIR__ . '/uploads';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}

echo "Готово! Таблицы созданы.\n\n";
echo "Шифрование личных сообщений: таблицы ключей готовы.\n";
echo "Приватные комнаты: готовы.\n";
echo "Журнал безопасности: готов.\n\n";
echo "Проверка связи с базой: пользователей — " . scalar('SELECT COUNT(*) FROM users') . "\n";
echo "Папка для аватарок: " . (is_dir($dir) && is_writable($dir) ? "ок\n" : "НЕ СОЗДАНА — создайте вручную папку uploads и дайте ей права на запись\n");
echo "\nТеперь УДАЛИТЕ файл install.php с хостинга.\n";
echo "Адрес сервера чата: " . cfg()['base_url'] . "/api.php\n";