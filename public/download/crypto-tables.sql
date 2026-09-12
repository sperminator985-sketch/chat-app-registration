-- ============================================================
--  Общажный чат — таблицы шифрования и журнала безопасности
--  Выполнять в phpMyAdmin: вкладка "SQL" -> вставить -> Вперёд
--  Безопасно: существующие таблицы и данные не затрагиваются,
--  скрипт можно запускать повторно.
-- ============================================================

-- 1. Ключи жильцов (личные ключи шифрования)
CREATE TABLE IF NOT EXISTS user_keys (
    user_id INT PRIMARY KEY,
    public_jwk TEXT NOT NULL,
    private_enc TEXT NOT NULL,
    salt VARCHAR(64) NOT NULL,
    iv VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Публичный ключ Сейфа коменданта
CREATE TABLE IF NOT EXISTS vault_key (
    id TINYINT PRIMARY KEY,
    public_jwk TEXT NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Попытки входа (защита от подбора пароля)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    nick VARCHAR(32) NULL,
    at DATETIME NOT NULL,
    INDEX idx_ip_at (ip, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Журнал безопасности
CREATE TABLE IF NOT EXISTS security_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event VARCHAR(24) NOT NULL,
    nick VARCHAR(32) NULL,
    ip VARCHAR(45) NOT NULL,
    note VARCHAR(160) NULL,
    at DATETIME NOT NULL,
    INDEX idx_at (at),
    INDEX idx_event (event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  5. Новые колонки в уже существующих таблицах.
--     Проверка через information_schema — повторный запуск
--     не вызовет ошибку "Duplicate column".
-- ============================================================

-- direct_messages.cipher — зашифрованное содержимое лички
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'direct_messages'
       AND COLUMN_NAME = 'cipher') = 0,
    'ALTER TABLE direct_messages ADD COLUMN cipher MEDIUMTEXT NULL',
    'DO 0'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.last_ip — для журнала безопасности
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'last_ip') = 0,
    'ALTER TABLE users ADD COLUMN last_ip VARCHAR(45) NULL',
    'DO 0'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.last_city — город по IP
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'last_city') = 0,
    'ALTER TABLE users ADD COLUMN last_city VARCHAR(80) NULL',
    'DO 0'));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
--  Готово. Проверить результат можно запросом:
--
--  SELECT TABLE_NAME FROM information_schema.TABLES
--  WHERE TABLE_SCHEMA = DATABASE()
--    AND TABLE_NAME IN ('user_keys','vault_key','login_attempts','security_log');
--
--  Должны вернуться все 4 строки.
-- ============================================================
