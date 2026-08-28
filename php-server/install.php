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

foreach ($sql as $stmt) {
    db()->exec($stmt);
}

$dir = __DIR__ . '/uploads';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}

echo "Готово! Таблицы созданы.\n\n";
echo "Проверка связи с базой: пользователей — " . scalar('SELECT COUNT(*) FROM users') . "\n";
echo "Папка для аватарок: " . (is_dir($dir) && is_writable($dir) ? "ок\n" : "НЕ СОЗДАНА — создайте вручную папку uploads и дайте ей права на запись\n");
echo "\nТеперь УДАЛИТЕ файл install.php с хостинга.\n";
echo "Адрес сервера чата: " . cfg()['base_url'] . "/api.php\n";
