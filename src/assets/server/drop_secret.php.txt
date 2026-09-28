<?php
// Одноразовый скрипт: удаляет колонки секретного вопроса из таблицы users.
// Положи рядом с api.php, открой в браузере, затем УДАЛИ файл с сервера.

require __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$pdo = db();
$done = [];

foreach (['secret_question', 'secret_answer_hash'] as $col) {
    $exists = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
           AND COLUMN_NAME = '$col'"
    )->fetchColumn();

    if ($exists === 0) {
        $done[] = "$col — уже удалена";
        continue;
    }

    $pdo->exec("ALTER TABLE users DROP COLUMN `$col`");
    $done[] = "$col — удалена";
}

echo "Готово:\n" . implode("\n", $done) . "\n\nТеперь удали этот файл с сервера.\n";
