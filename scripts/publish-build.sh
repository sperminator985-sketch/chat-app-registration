#!/bin/sh
set -e
cd "$(dirname "$0")/.."
FN=$(jq -r '."build-store"' backend/func2url.json)
KEY=$(tr -d '\n' < scripts/.upload-key)
VER=$(grep -m1 "export const API_VERSION" src/lib/api.ts | sed -E "s/.*'([^']+)'.*/\1/")
OUT=/tmp/site-build
rm -rf "$OUT" /tmp/chat-site.zip
NODE_OPTIONS=--max-old-space-size=4096 npx vite build --outDir "$OUT" --emptyOutDir >/tmp/site-build.log 2>&1 || { tail -30 /tmp/site-build.log; exit 1; }
mkdir -p "$OUT/chat"
cp src/assets/server/api.php.txt "$OUT/chat/api.php"
( cd "$OUT" && python3 -c "
import os,zipfile
z=zipfile.ZipFile('/tmp/chat-site.zip','w',zipfile.ZIP_DEFLATED)
for r,_,fs in os.walk('.'):
    for f in fs:
        p=os.path.join(r,f)[2:]
        if not p.endswith('.zip'): z.write(p,p)
z.close()" )
RESP=$(curl -sS -X POST "$FN" -H "Content-Type: application/json" -H "X-Upload-Key: $KEY" -d "{\"apiVersion\":\"$VER\"}")
PUT=$(echo "$RESP" | jq -r .putUrl)
[ "$PUT" = "null" ] && { echo "$RESP"; exit 1; }
curl -sS -f -X PUT "$PUT" -H "Content-Type: application/zip" -H "x-amz-meta-api-version: $VER" --data-binary @/tmp/chat-site.zip
curl -sS "$FN"; echo
