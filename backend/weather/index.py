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

LAT = 56.48464
LON = 84.947649

YANDEX_URL = 'https://api.weather.yandex.ru/graphql/query'
YANDEX_FULL = (
    '{ weatherByPoint(request: { lat: %s, lon: %s }) {'
    ' now { temperature condition daytime }'
    ' forecast { days(limit: 1) { summary { day { temperature { min max } condition } } } }'
    ' } }' % (LAT, LON)
)
YANDEX_NOW = (
    '{ weatherByPoint(request: { lat: %s, lon: %s }) { now { temperature condition daytime } } }'
    % (LAT, LON)
)
YANDEX_MIN = '{ weatherByPoint(request: { lat: %s, lon: %s }) { now { temperature } } }' % (LAT, LON)

FALLBACK_URL = (
    'https://api.open-meteo.com/v1/forecast'
    f'?latitude={LAT}&longitude={LON}'
    '&current=temperature_2m,weather_code,is_day'
    '&daily=temperature_2m_min,temperature_2m_max,weather_code'
    '&forecast_days=1&timezone=Asia%2FTomsk'
)

SKY_TEXT = {
    'clear': 'ясно',
    'partly': 'переменная облачность',
    'cloudy': 'облачно',
    'fog': 'туман',
    'drizzle': 'морось',
    'rain': 'дождь',
    'snow': 'снег',
    'storm': 'гроза',
}


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


def sky_from_condition(value) -> str:
    if not value:
        return 'cloudy'
    c = str(value).lower().replace('_', '-')
    if 'thunder' in c or 'storm' in c:
        return 'storm'
    if 'snow' in c or 'hail' in c:
        return 'snow'
    if 'drizzle' in c:
        return 'drizzle'
    if 'rain' in c or 'shower' in c:
        return 'rain'
    if 'fog' in c or 'mist' in c or 'haze' in c:
        return 'fog'
    if 'partly' in c:
        return 'partly'
    if 'overcast' in c or 'cloudy' in c:
        return 'cloudy'
    if 'clear' in c:
        return 'clear'
    return 'cloudy'


def ask_yandex(query: str, key: str) -> dict:
    body = json.dumps({'query': query}).encode('utf-8')
    req = urllib.request.Request(
        YANDEX_URL,
        data=body,
        headers={'X-Yandex-Weather-Key': key, 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    if data.get('errors'):
        raise RuntimeError(str(data['errors'])[:200])
    point = (data.get('data') or {}).get('weatherByPoint')
    if not point:
        raise RuntimeError('empty answer')
    return point


def from_yandex() -> tuple:
    key = os.environ.get('YANDEX_WEATHER_KEY')
    if not key:
        raise RuntimeError('no key')

    point = None
    last = 'yandex failed'
    for query in (YANDEX_FULL, YANDEX_NOW, YANDEX_MIN):
        try:
            point = ask_yandex(query, key)
            break
        except Exception as exc:
            last = f'{type(exc).__name__}: {exc}'
    if not point:
        raise RuntimeError(last)

    now = point.get('now') or {}
    temp = round(float(now['temperature']))
    sky = sky_from_condition(now.get('condition')) if now.get('condition') else None
    daytime = str(now.get('daytime') or '').lower()
    is_day = True if daytime == '' else daytime.startswith('d')

    day = None
    try:
        days = ((point.get('forecast') or {}).get('days')) or []
        part = ((days[0].get('summary') or {}).get('day')) or {}
        temps = part.get('temperature') or {}
        day = {
            'min': round(float(temps['min'])),
            'max': round(float(temps['max'])),
            'sky': sky_from_condition(part.get('condition')) if part.get('condition') else (sky or 'cloudy'),
        }
    except Exception:
        day = None

    if sky is None:
        sky = 'snow' if temp <= 0 else 'clear'
    return temp, sky, is_day, day


def from_open_meteo() -> tuple:
    with urllib.request.urlopen(FALLBACK_URL, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    cur = data['current']
    daily = data.get('daily') or {}
    try:
        day = {
            'min': round(daily['temperature_2m_min'][0]),
            'max': round(daily['temperature_2m_max'][0]),
            'sky': sky_from_code(int(daily['weather_code'][0])),
        }
    except Exception:
        day = None
    return (
        round(cur['temperature_2m']),
        sky_from_code(int(cur.get('weather_code', 3))),
        bool(cur.get('is_day', 1)),
        day,
    )


def handler(event: dict, context) -> dict:
    """Текущая температура в Томске для шапки сайта: сначала Яндекс.Погода, при сбое — резервный источник."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    source = 'yandex'
    reason = None
    try:
        temp, sky, is_day, day = from_yandex()
    except Exception as exc:
        reason = f'{type(exc).__name__}: {exc}'
        source = 'open-meteo'
        temp, sky, is_day, day = from_open_meteo()

    if day is None and source == 'yandex':
        try:
            _, _, _, day = from_open_meteo()
        except Exception:
            day = None

    payload = {'temp': temp, 'city': 'Томск', 'source': source, 'sky': sky, 'isDay': is_day}
    if day:
        lo = f"+{day['min']}" if day['min'] > 0 else str(day['min'])
        hi = f"+{day['max']}" if day['max'] > 0 else str(day['max'])
        payload['day'] = day
        payload['dayText'] = f"Днём в Томске {lo}…{hi}, {SKY_TEXT.get(day['sky'], 'облачно')}"
    if reason and (event.get('queryStringParameters') or {}).get('debug') == '1':
        payload['reason'] = reason

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Cache-Control': 'public, max-age=900'},
        'body': json.dumps(payload, ensure_ascii=False),
        'isBase64Encoded': False,
    }