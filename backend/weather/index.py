import json
import urllib.request

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}

URL = (
    'https://api.open-meteo.com/v1/forecast'
    '?latitude=56.4977&longitude=84.9744&current=temperature_2m&timezone=Asia%2FTomsk'
)


def handler(event: dict, context) -> dict:
    """Текущая температура за окном в Томске для шапки сайта."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    with urllib.request.urlopen(URL, timeout=4) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    temp = round(data['current']['temperature_2m'])
    return {
        'statusCode': 200,
        'headers': {**CORS, 'Cache-Control': 'public, max-age=600'},
        'body': json.dumps({'temp': temp, 'city': 'Томск'}, ensure_ascii=False),
        'isBase64Encoded': False,
    }
