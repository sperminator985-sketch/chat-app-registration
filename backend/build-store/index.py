import json
import os
import hashlib
import boto3
from botocore.config import Config

KEY_HASH = '264772c7f7626fe40b8fcefb835ea97764f6ce1f2b17b178c549ad1af558baa7'
OBJECT_KEY = 'builds/chat-site-latest.zip'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Key',
    'Access-Control-Max-Age': '86400',
}


def respond(status: int, payload: dict) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps(payload, ensure_ascii=False), 'isBase64Encoded': False}


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4'),
    )


def cdn_url() -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{OBJECT_KEY}"


def handler(event: dict, context) -> dict:
    """Хранилище свежего билда сайта: выдаёт ссылку на архив (сайт + api.php) и принимает новую сборку."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    s3 = s3_client()

    if method == 'GET':
        try:
            head = s3.head_object(Bucket='files', Key=OBJECT_KEY)
        except Exception:
            return respond(404, {'error': 'Свежий билд ещё не загружен'})
        meta = head.get('Metadata') or {}
        if not head.get('LastModified') and head.get('ResponseMetadata', {}).get('HTTPHeaders', {}).get('last-modified'):
            from email.utils import parsedate_to_datetime
            head['LastModified'] = parsedate_to_datetime(head['ResponseMetadata']['HTTPHeaders']['last-modified'])
        return respond(200, {
            'url': cdn_url(),
            'size': head.get('ContentLength'),
            'updatedAt': head['LastModified'].isoformat() if head.get('LastModified') else None,
            'apiVersion': meta.get('api-version'),
        })

    if method == 'POST':
        headers = event.get('headers') or {}
        key = headers.get('X-Upload-Key') or headers.get('x-upload-key') or ''
        if hashlib.sha256(key.encode()).hexdigest() != KEY_HASH:
            return respond(403, {'error': 'Нет доступа'})
        body = json.loads(event.get('body') or '{}')
        api_version = str(body.get('apiVersion') or '')[:16]
        put_url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': 'files', 'Key': OBJECT_KEY, 'ContentType': 'application/zip', 'Metadata': {'api-version': api_version}},
            ExpiresIn=900,
        )
        return respond(200, {'putUrl': put_url, 'url': cdn_url(), 'headers': {'Content-Type': 'application/zip', 'x-amz-meta-api-version': api_version}})

    return respond(405, {'error': 'Метод не поддерживается'})
