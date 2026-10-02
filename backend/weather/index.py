import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

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

TOMORROW_URL = (
    'https://api.open-meteo.com/v1/forecast'
    f'?latitude={LAT}&longitude={LON}'
    '&daily=temperature_2m_min,temperature_2m_max,weather_code,precipitation_sum,'
    'precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant'
    '&hourly=temperature_2m,relative_humidity_2m'
    '&start_date=%s&end_date=%s&timezone=Asia%%2FTomsk&wind_speed_unit=ms'
)

MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
          'сентября', 'октября', 'ноября', 'декабря']
WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
WIND_DIRS = ['северный', 'северо-восточный', 'восточный', 'юго-восточный',
             'южный', 'юго-западный', 'западный', 'северо-западный']

CODE_TEXT = {
    0: 'ясно', 1: 'преимущественно ясно', 2: 'переменная облачность', 3: 'пасмурно',
    45: 'туман', 48: 'туман с изморозью',
    51: 'слабая морось', 53: 'морось', 55: 'сильная морось', 56: 'ледяная морось', 57: 'ледяная морось',
    61: 'небольшой дождь', 63: 'дождь', 65: 'сильный дождь', 66: 'ледяной дождь', 67: 'ледяной дождь',
    71: 'небольшой снег', 73: 'снег', 75: 'сильный снег', 77: 'снежная крупа',
    80: 'кратковременный дождь', 81: 'ливень', 82: 'сильный ливень',
    85: 'снегопад', 86: 'сильный снегопад',
    95: 'гроза', 96: 'гроза с градом', 99: 'сильная гроза с градом',
}


def fmt_t(v: float) -> str:
    n = round(v)
    return f'+{n}' if n > 0 else str(n)


def span(values: list) -> str:
    lo, hi = fmt_t(min(values)), fmt_t(max(values))
    return lo if lo == hi else f'{lo}…{hi}'


def tomorrow_forecast() -> str:
    today = datetime.now(timezone(timedelta(hours=7))).date()
    day: date = today + timedelta(days=1)
    url = TOMORROW_URL % (day.isoformat(), day.isoformat())
    with urllib.request.urlopen(url, timeout=3.5) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    d = data['daily']
    temps = data['hourly']['temperature_2m']
    hum = [h for h in data['hourly']['relative_humidity_2m'] if h is not None]

    code = int(d['weather_code'][0])
    parts = [
        f"Завтра, {day.day} {MONTHS[day.month - 1]} ({WEEKDAYS[day.weekday()]}), в Томске "
        f"{CODE_TEXT.get(code, 'облачно')}",
        f'ночью {span(temps[0:6])}',
        f'утром {span(temps[6:12])}',
        f'днём {span(temps[12:18])}',
        f'вечером {span(temps[18:24])}',
    ]
    rain = float(d['precipitation_sum'][0] or 0)
    chance = d['precipitation_probability_max'][0]
    if rain >= 0.1:
        mm = f'{rain:.1f}'.replace('.', ',')
        parts.append(f'осадки {mm} мм' + (f' (вероятность {chance}%)' if chance is not None else ''))
    else:
        parts.append('без осадков')
    wind = round(float(d['wind_speed_10m_max'][0]))
    gust = round(float(d['wind_gusts_10m_max'][0]))
    direction = WIND_DIRS[int((float(d['wind_direction_10m_dominant'][0]) + 22.5) // 45) % 8]
    wind_text = f'ветер {direction} {wind} м/с'
    if gust > wind:
        wind_text += f', порывы до {gust} м/с'
    parts.append(wind_text)
    if hum:
        parts.append(f'влажность {min(hum)}–{max(hum)}%')
    return ', '.join(parts)


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

    pool = ThreadPoolExecutor(max_workers=1)
    tomorrow_job = pool.submit(tomorrow_forecast)

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
    try:
        payload['tomorrowText'] = tomorrow_job.result(timeout=3.8)
    except Exception:
        pass
    pool.shutdown(wait=False)
    if reason and (event.get('queryStringParameters') or {}).get('debug') == '1':
        payload['reason'] = reason

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Cache-Control': 'public, max-age=900'},
        'body': json.dumps(payload, ensure_ascii=False),
        'isBase64Encoded': False,
    }