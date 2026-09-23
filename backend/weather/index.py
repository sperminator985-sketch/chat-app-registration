import json
import os
import urllib.request

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

YANDEX_URL = 'https://api.weather.yandex.ru/graphql/query'
YANDEX_QUERY = '{ weatherByPoint(request: { lat: 56.4977, lon: 84.9744 }) { now { temperature } } }'
FALLBACK_URL = (
    'https://api.open-meteo.com/v1/forecast'
    '?latitude=56.4977&longitude=84.9744'
    '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTomsk'
)


def sky_from_code(code: int) -> str:
    if code == 0:
        return 'clear'
    if code in (1, 2):
        return 'partly'
    if code == 3:
        return 'cloudy'
    if code in (45, 48):
        return 'fog'
    if code in (95, 96, 99):
        return 'storm'
    if code in (71, 73, 75, 77, 85, 86):
        return 'snow'
    if code in (51, 53, 55, 56, 57):
        return 'drizzle'
    if code in (61, 63, 65, 66, 67, 80, 81, 82):
        return 'rain'
    return 'cloudy'


def from_yandex() -> int:
    key = os.environ.get('YANDEX_WEATHER_KEY')
    if not key:
        raise RuntimeError('no key')
    body = json.dumps({'query': YANDEX_QUERY}).encode('utf-8')
    req = urllib.request.Request(
        YANDEX_URL,
        data=body,
        headers={'X-Yandex-Weather-Key': key, 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return round(data['data']['weatherByPoint']['now']['temperature'])


def from_open_meteo() -> tuple:
    with urllib.request.urlopen(FALLBACK_URL, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    cur = data['current']
    return (
        round(cur['temperature_2m']),
        sky_from_code(int(cur.get('weather_code', 3))),
        bool(cur.get('is_day', 1)),
    )


def handler(event: dict, context) -> dict:
    """Текущая температура за окном в Томске для шапки сайта."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    source = 'open-meteo'
    reason = None
    try:
        temp, sky, is_day = from_open_meteo()
    except Exception as exc:
        reason = f'{type(exc).__name__}: {exc}'
        source = 'yandex'
        temp = from_yandex()
        sky = 'snow' if temp <= 0 else 'clear'
        is_day = True

    payload = {'temp': temp, 'city': 'Томск', 'source': source, 'sky': sky, 'isDay': is_day}
    if reason and (event.get('queryStringParameters') or {}).get('debug') == '1':
        payload['reason'] = reason

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Cache-Control': 'public, max-age=600'},
        'body': json.dumps(payload, ensure_ascii=False),
        'isBase64Encoded': False,
    }