import base64
import json
import os
import re
import hashlib
import secrets

import boto3
import psycopg2

SCHEMA = 't_p16512527_chat_app_registratio'
ROOMS = ['kuhnya', 'kurilka', 'baraholka', 'ucheba', 'tomsk', 'znakomstva', 'flirt', 'sex', 'noch']
NICK_RE = re.compile(r'^[a-zA-Zа-яА-ЯёЁ0-9_]{3,18}$')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def esc(value: str) -> str:
    return str(value).replace("'", "''")


def hash_password(password: str, salt: str) -> str:
    return salt + '$' + hashlib.sha256((salt + password).encode('utf-8')).hexdigest()


def check_password(password: str, stored: str) -> bool:
    if '$' not in stored:
        return False
    salt = stored.split('$', 1)[0]
    return secrets.compare_digest(hash_password(password, salt), stored)


def respond(status: int, payload: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(payload, ensure_ascii=False), 'isBase64Encoded': False}


def user_row(row) -> dict:
    return {
        'id': row[0], 'nick': row[1], 'color': row[2], 'status': row[3],
        'room': row[4], 'since': row[5].strftime('%Y'), 'avatar': row[6],
        'avatarUrl': row[7] if len(row) > 7 else None,
    }


def sql_str(value):
    return 'NULL' if value is None else f"'{esc(value)}'"


def get_user_by_token(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id, u.nick, u.color, u.status, u.room, u.created_at, u.avatar, u.avatar_url FROM {SCHEMA}.sessions s "
        f"JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = '{esc(token)}'"
    )
    row = cur.fetchone()
    return user_row(row) if row else None


def handler(event: dict, context) -> dict:
    """Чат «Общага»: регистрация, вход, профиль, сообщения по комнатам и список онлайн."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or ''
    action = params.get('action') or ''

    body = {}
    if event.get('body'):
        body = json.loads(event['body'])
    if not action:
        action = body.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor()

    try:
        if method == 'GET' and action == 'feed':
            room = params.get('room', 'kurilka')
            if room not in ROOMS:
                return respond(400, {'error': 'Неизвестная комната'})
            cur.execute(
                f"SELECT id, nick, color, text, created_at, avatar, avatar_url FROM {SCHEMA}.messages "
                f"WHERE room = '{esc(room)}' ORDER BY id DESC LIMIT 60"
            )
            rows = cur.fetchall()[::-1]
            messages = [
                {
                    'id': r[0], 'nick': r[1], 'color': r[2], 'text': r[3],
                    'time': r[4].strftime('%H:%M'), 'avatar': r[5], 'avatarUrl': r[6],
                }
                for r in rows
            ]
            cur.execute(
                f"SELECT nick, color, status, avatar, avatar_url FROM {SCHEMA}.users "
                f"WHERE last_seen > NOW() - INTERVAL '5 minutes' ORDER BY last_seen DESC LIMIT 40"
            )
            online = [
                {'nick': r[0], 'color': r[1], 'status': r[2], 'avatar': r[3], 'avatarUrl': r[4]}
                for r in cur.fetchall()
            ]
            cur.execute(
                f"SELECT room, COUNT(*) FROM {SCHEMA}.users "
                f"WHERE last_seen > NOW() - INTERVAL '5 minutes' GROUP BY room"
            )
            counts = {r[0]: r[1] for r in cur.fetchall()}
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
            total_users = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE created_at > NOW() - INTERVAL '24 hours'")
            day_messages = cur.fetchone()[0]
            return respond(200, {
                'messages': messages,
                'online': online,
                'roomCounts': counts,
                'totalUsers': total_users,
                'dayMessages': day_messages,
            })

        if method == 'GET' and action == 'me':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {user['id']}")
            return respond(200, {'user': user})

        if method == 'POST' and action == 'register':
            nick = (body.get('nick') or '').strip()
            password = body.get('password') or ''
            color = int(body.get('color') or 1)
            avatar = int(body.get('avatar') or 1)
            if avatar < 1 or avatar > 12:
                avatar = 1
            room = body.get('room') or 'kurilka'
            if not NICK_RE.match(nick):
                return respond(400, {'error': 'Ник: 3-18 символов, буквы, цифры и подчёркивание'})
            if len(password) < 5:
                return respond(400, {'error': 'Пароль от 5 символов'})
            if color < 1 or color > 8:
                color = 1
            if room not in ROOMS:
                room = 'kurilka'
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE nick_lower = '{esc(nick.lower())}'")
            if cur.fetchone():
                return respond(409, {'error': 'Такой ник уже занят'})
            pwd = hash_password(password, secrets.token_hex(8))
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (nick, nick_lower, password_hash, color, status, room, avatar) "
                f"VALUES ('{esc(nick)}', '{esc(nick.lower())}', '{esc(pwd)}', {color}, 'только заселился', '{esc(room)}', {avatar}) "
                f"RETURNING id, nick, color, status, room, created_at, avatar, avatar_url"
            )
            user = user_row(cur.fetchone())
            new_token = secrets.token_hex(24)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (token, user_id) VALUES ('{new_token}', {user['id']})")
            return respond(200, {'user': user, 'token': new_token})

        if method == 'POST' and action == 'login':
            nick = (body.get('nick') or '').strip()
            password = body.get('password') or ''
            cur.execute(
                f"SELECT id, nick, color, status, room, created_at, avatar, avatar_url, password_hash FROM {SCHEMA}.users "
                f"WHERE nick_lower = '{esc(nick.lower())}'"
            )
            row = cur.fetchone()
            if not row or not check_password(password, row[8]):
                return respond(401, {'error': 'Ник или пароль не подходят'})
            user = user_row(row)
            new_token = secrets.token_hex(24)
            cur.execute(f"INSERT INTO {SCHEMA}.sessions (token, user_id) VALUES ('{new_token}', {user['id']})")
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {user['id']}")
            return respond(200, {'user': user, 'token': new_token})

        if method == 'POST' and action == 'send':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Сначала займи ник'})
            text = (body.get('text') or '').strip()[:500]
            room = body.get('room') or user['room']
            if not text:
                return respond(400, {'error': 'Пустое сообщение'})
            if room not in ROOMS:
                return respond(400, {'error': 'Неизвестная комната'})
            cur.execute(
                f"INSERT INTO {SCHEMA}.messages (room, user_id, nick, color, text, avatar, avatar_url) "
                f"VALUES ('{esc(room)}', {user['id']}, '{esc(user['nick'])}', {user['color']}, '{esc(text)}', "
                f"{user['avatar']}, {sql_str(user['avatarUrl'])}) "
                f"RETURNING id, created_at"
            )
            mid, created = cur.fetchone()
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW(), room = '{esc(room)}' WHERE id = {user['id']}")
            return respond(200, {'message': {
                'id': mid, 'nick': user['nick'], 'color': user['color'], 'text': text,
                'time': created.strftime('%H:%M'), 'avatar': user['avatar'], 'avatarUrl': user['avatarUrl'],
            }})

        if method == 'POST' and action == 'profile':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            status = (body.get('status') or '').strip()[:64] or 'молча наблюдает'
            color = int(body.get('color') or user['color'])
            if color < 1 or color > 8:
                color = user['color']
            avatar = int(body.get('avatar') or user['avatar'])
            if avatar < 1 or avatar > 12:
                avatar = user['avatar']

            avatar_url = user['avatarUrl']
            image = body.get('image')
            if body.get('removeImage'):
                avatar_url = None
            elif image:
                header, _, payload = image.partition(',')
                raw = base64.b64decode(payload or header)
                if len(raw) > 2 * 1024 * 1024:
                    return respond(400, {'error': 'Картинка тяжелее 2 МБ'})
                ext = 'png'
                if 'jpeg' in header or 'jpg' in header:
                    ext = 'jpg'
                elif 'webp' in header:
                    ext = 'webp'
                elif 'gif' in header:
                    ext = 'gif'
                key = f"avatars/{user['id']}-{secrets.token_hex(6)}.{ext}"
                s3 = boto3.client(
                    's3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                )
                s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=f'image/{ext}')
                avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute(
                f"UPDATE {SCHEMA}.users SET status = '{esc(status)}', color = {color}, avatar = {avatar}, "
                f"avatar_url = {sql_str(avatar_url)}, last_seen = NOW() "
                f"WHERE id = {user['id']} RETURNING id, nick, color, status, room, created_at, avatar, avatar_url"
            )
            return respond(200, {'user': user_row(cur.fetchone())})

        if method == 'GET' and action == 'dialogs':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            me = user['id']
            cur.execute(
                f"SELECT u.nick, u.color, MAX(d.id) AS last_id, "
                f"SUM(CASE WHEN d.recipient_id = {me} AND d.read_at IS NULL THEN 1 ELSE 0 END) AS unread, u.avatar, u.avatar_url "
                f"FROM {SCHEMA}.direct_messages d "
                f"JOIN {SCHEMA}.users u ON u.id = CASE WHEN d.sender_id = {me} THEN d.recipient_id ELSE d.sender_id END "
                f"WHERE d.sender_id = {me} OR d.recipient_id = {me} "
                f"GROUP BY u.nick, u.color, u.avatar, u.avatar_url ORDER BY last_id DESC LIMIT 30"
            )
            dialogs = [
                {'nick': r[0], 'color': r[1], 'unread': int(r[3] or 0), 'avatar': r[4], 'avatarUrl': r[5]}
                for r in cur.fetchall()
            ]
            total_unread = sum(d['unread'] for d in dialogs)
            return respond(200, {'dialogs': dialogs, 'unread': total_unread})

        if method == 'GET' and action == 'dm':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            with_nick = (params.get('nick') or '').strip()
            cur.execute(
                f"SELECT id, nick, color, status, avatar, avatar_url FROM {SCHEMA}.users "
                f"WHERE nick_lower = '{esc(with_nick.lower())}'"
            )
            other = cur.fetchone()
            if not other:
                return respond(404, {'error': 'Такого жильца нет'})
            me = user['id']
            cur.execute(
                f"SELECT id, sender_nick, sender_color, text, created_at, sender_avatar, sender_avatar_url "
                f"FROM {SCHEMA}.direct_messages "
                f"WHERE (sender_id = {me} AND recipient_id = {other[0]}) "
                f"OR (sender_id = {other[0]} AND recipient_id = {me}) ORDER BY id DESC LIMIT 80"
            )
            rows = cur.fetchall()[::-1]
            cur.execute(
                f"UPDATE {SCHEMA}.direct_messages SET read_at = NOW() "
                f"WHERE recipient_id = {me} AND sender_id = {other[0]} AND read_at IS NULL"
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {me}")
            return respond(200, {
                'peer': {
                    'nick': other[1], 'color': other[2], 'status': other[3],
                    'avatar': other[4], 'avatarUrl': other[5],
                },
                'messages': [
                    {
                        'id': r[0], 'nick': r[1], 'color': r[2], 'text': r[3],
                        'time': r[4].strftime('%H:%M'), 'avatar': r[5], 'avatarUrl': r[6],
                    }
                    for r in rows
                ],
            })

        if method == 'POST' and action == 'dm_send':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Сначала займи ник'})
            to_nick = (body.get('nick') or '').strip()
            text = (body.get('text') or '').strip()[:500]
            if not text:
                return respond(400, {'error': 'Пустое сообщение'})
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE nick_lower = '{esc(to_nick.lower())}'")
            other = cur.fetchone()
            if not other:
                return respond(404, {'error': 'Такого жильца нет'})
            if other[0] == user['id']:
                return respond(400, {'error': 'Самому себе писать скучно'})
            cur.execute(
                f"INSERT INTO {SCHEMA}.direct_messages "
                f"(sender_id, recipient_id, sender_nick, sender_color, text, sender_avatar, sender_avatar_url) "
                f"VALUES ({user['id']}, {other[0]}, '{esc(user['nick'])}', {user['color']}, '{esc(text)}', "
                f"{user['avatar']}, {sql_str(user['avatarUrl'])}) "
                f"RETURNING id, created_at"
            )
            mid, created = cur.fetchone()
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {user['id']}")
            return respond(200, {'message': {
                'id': mid, 'nick': user['nick'], 'color': user['color'], 'text': text,
                'time': created.strftime('%H:%M'), 'avatar': user['avatar'], 'avatarUrl': user['avatarUrl'],
            }})

        if method == 'POST' and action == 'call_signal':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            to_nick = (body.get('nick') or '').strip()
            call_id = (body.get('callId') or '').strip()[:64]
            kind = (body.get('kind') or '').strip()[:16]
            payload = body.get('payload')
            if kind not in ('offer', 'answer', 'ice', 'hangup', 'decline'):
                return respond(400, {'error': 'Неизвестный сигнал'})
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE nick_lower = '{esc(to_nick.lower())}'")
            other = cur.fetchone()
            if not other:
                return respond(404, {'error': 'Такого жильца нет'})
            data = json.dumps(payload, ensure_ascii=False) if payload is not None else None
            cur.execute(
                f"INSERT INTO {SCHEMA}.call_signals (sender_id, recipient_id, call_id, kind, payload) "
                f"VALUES ({user['id']}, {other[0]}, '{esc(call_id)}', '{esc(kind)}', {sql_str(data)})"
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {user['id']}")
            return respond(200, {'ok': True})

        if method == 'GET' and action == 'call_poll':
            user = get_user_by_token(cur, token)
            if not user:
                return respond(401, {'error': 'Не авторизован'})
            me = user['id']
            cur.execute(
                f"SELECT s.id, s.call_id, s.kind, s.payload, u.nick, u.color, u.avatar, u.avatar_url "
                f"FROM {SCHEMA}.call_signals s JOIN {SCHEMA}.users u ON u.id = s.sender_id "
                f"WHERE s.recipient_id = {me} AND s.consumed = FALSE "
                f"AND s.created_at > NOW() - INTERVAL '2 minutes' ORDER BY s.id LIMIT 40"
            )
            rows = cur.fetchall()
            if rows:
                ids = ','.join(str(r[0]) for r in rows)
                cur.execute(f"UPDATE {SCHEMA}.call_signals SET consumed = TRUE WHERE id IN ({ids})")
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = NOW() WHERE id = {me}")
            return respond(200, {'signals': [
                {
                    'id': r[0], 'callId': r[1], 'kind': r[2],
                    'payload': json.loads(r[3]) if r[3] else None,
                    'from': {'nick': r[4], 'color': r[5], 'avatar': r[6], 'avatarUrl': r[7]},
                }
                for r in rows
            ]})

        if method == 'POST' and action == 'logout':
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET user_id = user_id WHERE token = '{esc(token)}'")
            return respond(200, {'ok': True})

        return respond(400, {'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()