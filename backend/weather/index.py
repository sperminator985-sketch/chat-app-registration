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
    '?latitude=56.4977&longitude=84.9744&current=temperature_2m&timezone=Asia%2FTomsk'
)


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


def from_open_meteo() -> int:
    with urllib.request.urlopen(FALLBACK_URL, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return round(data['current']['temperature_2m'])


def handler(event: dict, context) -> dict:
    """Текущая температура за окном в Томске для шапки сайта."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    source = 'yandex'
    reason = None
    try:
        temp = from_yandex()
    except Exception as exc:
        reason = f'{type(exc).__name__}: {exc}'
        source = 'open-meteo'
        temp = from_open_meteo()

    payload = {'temp': temp, 'city': 'Томск', 'source': source}
    if reason and (event.get('queryStringParameters') or {}).get('debug') == '1':
        payload['reason'] = reason

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Cache-Control': 'public, max-age=600'},
        'body': json.dumps(payload, ensure_ascii=False),
        'isBase64Encoded': False,
    }